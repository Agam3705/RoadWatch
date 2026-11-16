"""
RoadWatch Complaints Views
REST API endpoints for complaint reporting, listing, inspection, status changes,
community support, duplicate discovery, and authority review.
"""
from datetime import datetime
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny
from rest_framework import status

from apps.core.db import (
    complaints_col, complaint_images_col, status_history_col,
    duplicate_links_col, complaint_supports_col, ai_predictions_col,
    parse_object_id, serialize_doc
)
from apps.core.utils import api_success, api_error, record_audit_log
from apps.core.permissions import IsAuthenticatedMongo, IsAuthority
from apps.core.storage import save_uploaded_media
from apps.complaints.services import (
    create_complaint, transition_status, support_complaint,
    find_nearby_complaints
)
from apps.ai_service.priority_engine import calculate_priority_score
from apps.ai_service.client import analyze_complaint_image


def sanitize_for_public(doc: dict) -> dict:
    """Removes sensitive citizen and internal data for public endpoints."""
    clean = dict(doc)
    clean.pop("reporter_id", None)
    clean.pop("internal_notes", None)
    if "reporter" in clean:
        clean["reporter"] = {"name": "Citizen Reporter"}
    return clean


class ComplaintListCreateView(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticatedMongo()]
        return [AllowAny()]

    def get(self, request):
        query = {}
        status_filter = request.query_params.get("status")
        category_filter = request.query_params.get("category")
        severity_filter = request.query_params.get("severity")
        jurisdiction_filter = request.query_params.get("jurisdiction_id")
        road_filter = request.query_params.get("road_id")
        my_reports = request.query_params.get("my_reports", "false").lower() == "true"
        search = request.query_params.get("search")

        if status_filter:
            query["status"] = status_filter.upper()
        if category_filter:
            query["category"] = category_filter.upper()
        if severity_filter:
            query["citizen_severity"] = severity_filter.upper()
        if jurisdiction_filter:
            query["jurisdiction_id"] = jurisdiction_filter
        if road_filter:
            query["road_id"] = road_filter

        # If user requests "my_reports", filter by reporter_id
        if my_reports:
            if not request.user or not request.user.is_authenticated:
                return api_error("Authentication required to view your reports.", "AUTH_REQUIRED", status_code=status.HTTP_401_UNAUTHORIZED)
            query["reporter_id"] = request.user.id

        if search:
            query["$or"] = [
                {"public_reference": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"category": {"$regex": search, "$options": "i"}},
            ]

        # Authority scoped filtering
        if request.user and request.user.is_authenticated and request.user.is_authority and not request.user.is_super_admin:
            if request.user.jurisdiction_ids:
                query["jurisdiction_id"] = {"$in": list(request.user.jurisdiction_ids)}

        limit = min(100, int(request.query_params.get("limit", 50)))
        skip = int(request.query_params.get("skip", 0))

        cursor = complaints_col().find(query).sort("created_at", -1).skip(skip).limit(limit)
        results = [serialize_doc(doc) for doc in cursor]

        # Sanitize if unauthenticated public visitor
        if not (request.user and request.user.is_authenticated):
            results = [sanitize_for_public(r) for r in results]

        total = complaints_col().count_documents(query)

        return api_success({
            "items": results,
            "total": total,
            "skip": skip,
            "limit": limit,
        })

    def post(self, request):
        data = request.data or {}
        category = data.get("category", "POTHOLE")
        description = data.get("description", "").strip()
        lng = data.get("longitude")
        lat = data.get("latitude")
        citizen_severity = data.get("citizen_severity", "MEDIUM")
        road_id = data.get("road_id")
        jurisdiction_id = data.get("jurisdiction_id")
        is_near_vulnerable = str(data.get("is_near_vulnerable", "false")).lower() in ("true", "1")

        if lng is None or lat is None:
            return api_error("Coordinates (longitude and latitude) are required.", "MISSING_COORDINATES")

        try:
            lng_f = float(lng)
            lat_f = float(lat)
        except ValueError:
            return api_error("Invalid coordinate format.", "INVALID_COORDINATES")

        # Collect uploaded files (supporting single or multiple images)
        files = request.FILES.getlist("images")
        if not files and "image" in request.FILES:
            files = [request.FILES["image"]]

        complaint = create_complaint(
            reporter_id=request.user.id,
            category=category,
            description=description,
            longitude=lng_f,
            latitude=lat_f,
            citizen_severity=citizen_severity,
            road_id=road_id,
            jurisdiction_id=jurisdiction_id,
            uploaded_files=files,
            is_near_vulnerable=is_near_vulnerable,
        )

        return api_success(
            complaint,
            message="Road defect complaint submitted successfully.",
            status_code=status.HTTP_201_CREATED
        )


class ComplaintDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, complaint_id):
        obj_id = parse_object_id(complaint_id)
        doc = complaints_col().find_one({"_id": obj_id}) if obj_id else None
        if not doc:
            # Try public reference lookup (e.g. RW-2026-123456)
            doc = complaints_col().find_one({"public_reference": complaint_id})

        if not doc:
            return api_error("Complaint not found.", "NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)

        result = serialize_doc(doc)

        # Attach images
        images_cursor = complaint_images_col().find({"complaint_id": str(doc["_id"])})
        result["images"] = [serialize_doc(img) for img in images_cursor]

        # Attach AI prediction if available
        pred = ai_predictions_col().find_one({"complaint_id": str(doc["_id"])})
        result["ai_prediction"] = serialize_doc(pred)

        # Check if current user has supported
        result["has_supported"] = False
        if request.user and request.user.is_authenticated:
            supp = complaint_supports_col().find_one({
                "complaint_id": str(doc["_id"]),
                "citizen_id": request.user.id
            })
            result["has_supported"] = bool(supp)
        else:
            result = sanitize_for_public(result)

        return api_success(result)

    def patch(self, request, complaint_id):
        if not (request.user and request.user.is_authenticated):
            return api_error("Authentication required.", "AUTH_REQUIRED", status_code=status.HTTP_401_UNAUTHORIZED)

        obj_id = parse_object_id(complaint_id)
        doc = complaints_col().find_one({"_id": obj_id}) if obj_id else None
        if not doc:
            return api_error("Complaint not found.", "NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)

        is_owner = str(doc.get("reporter_id")) == request.user.id
        if not is_owner and not request.user.is_authority:
            return api_error("You do not have permission to edit this complaint.", "FORBIDDEN", status_code=status.HTTP_403_FORBIDDEN)

        # Only allow description/category edit if not yet in progress
        data = request.data or {}
        update_fields = {}
        for f in ["description", "category", "citizen_severity"]:
            if f in data:
                update_fields[f] = data[f]

        if update_fields:
            update_fields["updated_at"] = datetime.utcnow()
            complaints_col().update_one({"_id": obj_id}, {"$set": update_fields})
            record_audit_log(request.user.id, "COMPLAINT_UPDATED", "complaints", complaint_id, update_fields)

        updated_doc = complaints_col().find_one({"_id": obj_id})
        return api_success(serialize_doc(updated_doc), message="Complaint updated successfully.")


class ComplaintHistoryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, complaint_id):
        cursor = status_history_col().find({
            "entity_type": "complaints",
            "entity_id": str(complaint_id),
        }).sort("timestamp", 1)
        history = [serialize_doc(h) for h in cursor]
        return api_success(history)


class ComplaintSupportView(APIView):
    permission_classes = [IsAuthenticatedMongo]

    def post(self, request, complaint_id):
        success, msg, new_count = support_complaint(complaint_id, request.user.id)
        if not success:
            return api_error(msg, "SUPPORT_FAILED")
        return api_success({"support_count": new_count, "has_supported": True}, message=msg)

    def delete(self, request, complaint_id):
        complaint_supports_col().delete_one({
            "complaint_id": str(complaint_id),
            "citizen_id": request.user.id
        })
        complaints_col().update_one(
            {"_id": parse_object_id(complaint_id)},
            {"$inc": {"support_count": -1}}
        )
        return api_success({"has_supported": False}, message="Support removed.")


class ComplaintReviewView(APIView):
    """Authority Review Action (PRD Section 5.3 & 6.1)"""
    permission_classes = [IsAuthority]

    def post(self, request, complaint_id):
        data = request.data or {}
        action = data.get("action", "APPROVE").upper()  # APPROVE, REJECT, REQUEST_INFO
        reason = data.get("reason", "").strip()
        authority_severity = data.get("severity")
        corrected_category = data.get("category")

        target_status = "APPROVED" if action == "APPROVE" else "REJECTED" if action == "REJECT" else "REQUESTED_INFORMATION"

        if action == "REJECT" and not reason:
            return api_error("Rejection reason is required.", "MISSING_REASON")

        obj_id = parse_object_id(complaint_id)
        complaint = complaints_col().find_one({"_id": obj_id})
        if not complaint:
            return api_error("Complaint not found.", "NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)

        # Update authority assessment
        update_set = {
            "authority_assessment": {
                "decision": action,
                "reviewed_by": request.user.id,
                "reviewer_name": getattr(request.user, "name", "Officer"),
                "reviewed_at": datetime.utcnow().isoformat(),
                "severity": authority_severity or complaint.get("citizen_severity"),
                "category": corrected_category or complaint.get("category"),
                "reason": reason,
            }
        }

        # If category or severity corrected, update priority recommendation
        if authority_severity or corrected_category:
            new_p = calculate_priority_score(
                severity_level=authority_severity or complaint.get("citizen_severity", "MEDIUM"),
                support_count=complaint.get("support_count", 0),
            )
            update_set["priority"] = new_p

        complaints_col().update_one({"_id": obj_id}, {"$set": update_set})

        success, msg, updated = transition_status(complaint_id, target_status, request.user, reason)
        if not success:
            return api_error(msg, "TRANSITION_FAILED")

        return api_success(updated, message=f"Complaint marked as {target_status}.")


class ComplaintReopenView(APIView):
    """Citizen or Authority Reopen Workflow (PRD Section 5.3 & 6.3)"""
    permission_classes = [IsAuthenticatedMongo]

    def post(self, request, complaint_id):
        reason = (request.data.get("reason") or "").strip()
        if not reason:
            return api_error("Reason for reopening is mandatory.", "MISSING_REASON")

        success, msg, updated = transition_status(complaint_id, "REOPENED", request.user, reason)
        if not success:
            return api_error(msg, "REOPEN_FAILED")

        return api_success(updated, message="Complaint successfully reopened.")


class ComplaintDuplicateCandidatesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, complaint_id):
        obj_id = parse_object_id(complaint_id)
        doc = complaints_col().find_one({"_id": obj_id}) if obj_id else None
        if not doc:
            return api_error("Complaint not found.", "NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)

        coords = doc.get("location", {}).get("coordinates", [0, 0])
        candidates = find_nearby_complaints(coords[0], coords[1], radius_meters=300.0, exclude_id=complaint_id)
        return api_success(candidates)


class ComplaintDuplicateLinkView(APIView):
    permission_classes = [IsAuthority]

    def post(self, request, complaint_id):
        target_id = request.data.get("target_complaint_id")
        decision = request.data.get("decision", "CONFIRMED_DUPLICATE")
        notes = request.data.get("notes", "")

        if not target_id:
            return api_error("Target complaint ID is required.", "MISSING_TARGET")

        link_doc = {
            "source_complaint_id": str(complaint_id),
            "target_complaint_id": str(target_id),
            "decision": decision,
            "notes": notes,
            "reviewed_by": request.user.id,
            "created_at": datetime.utcnow(),
        }
        duplicate_links_col().insert_one(link_doc)

        record_audit_log(
            request.user.id,
            "COMPLAINT_DUPLICATE_LINKED",
            "complaints",
            complaint_id,
            {"target_id": target_id, "decision": decision}
        )

        return api_success(message="Complaints successfully linked as duplicates.")


class ComplaintUploadImageView(APIView):
    permission_classes = [IsAuthenticatedMongo]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, complaint_id):
        if "image" not in request.FILES:
            return api_error("Image file is required.", "MISSING_FILE")

        file_obj = request.FILES["image"]
        try:
            rel_path, meta = save_uploaded_media(file_obj, subfolder="complaints")
            img_doc = {
                "complaint_id": str(complaint_id),
                "storage_path": rel_path,
                "file_metadata": meta,
                "image_type": "SUPPLEMENTAL_EVIDENCE",
                "uploaded_by": request.user.id,
                "created_at": datetime.utcnow(),
            }
            res = complaint_images_col().insert_one(img_doc)
            meta["id"] = str(res.inserted_id)

            complaints_col().update_one(
                {"_id": parse_object_id(complaint_id)},
                {"$push": {"images": meta}}
            )

            # Trigger AI analysis on supplemental image
            ai_pred = analyze_complaint_image(complaint_id, meta["id"], rel_path)

            return api_success({"image": meta, "ai_prediction": ai_pred}, message="Image uploaded and analyzed successfully.")
        except Exception as e:
            return api_error(str(e), "UPLOAD_FAILED")
