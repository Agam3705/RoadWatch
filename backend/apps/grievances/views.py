"""
RoadWatch Grievances Module Views
Citizen grievance redressal against delayed repairs, poor workmanship, false claims, and administrative malpractice.
"""
from datetime import datetime
from typing import Dict, Any, Optional
from rest_framework.views import APIView
from rest_framework import status
from apps.core.db import grievances_col, complaints_col, parse_object_id, serialize_doc
from apps.core.utils import api_success, api_error, record_audit_log, send_notification
from apps.core.permissions import IsAuthenticatedMongo, IsSuperAdmin, IsAuthoritySupervisor


class GrievanceListCreateView(APIView):
    permission_classes = [IsAuthenticatedMongo]

    def get(self, request):
        col = grievances_col()
        is_admin_or_supervisor = (
            request.user.is_super_admin or
            request.user.has_role("AUTHORITY_SUPERVISOR")
        )

        query: Dict[str, Any] = {}
        if not is_admin_or_supervisor:
            # Citizens only see their own filed grievances
            query["citizen_id"] = request.user.id
        else:
            status_filter = request.GET.get("status")
            category_filter = request.GET.get("category")
            q = request.GET.get("q", "").strip()

            if status_filter and status_filter != "ALL":
                query["status"] = status_filter
            if category_filter and category_filter != "ALL":
                query["category"] = category_filter
            if q:
                regex_q = {"$regex": q, "$options": "i"}
                query["$or"] = [
                    {"grievance_number": regex_q},
                    {"title": regex_q},
                    {"description": regex_q},
                    {"citizen_name": regex_q},
                    {"authority_name": regex_q},
                    {"complaint_id": regex_q},
                ]

        total_count = col.count_documents(query)
        cursor = col.find(query).sort("created_at", -1).limit(100)
        items = [serialize_doc(doc) for doc in cursor]

        # Calculate high level stats
        stats = {
            "total": total_count,
            "filed": col.count_documents({**({"citizen_id": request.user.id} if not is_admin_or_supervisor else {}), "status": "FILED"}),
            "under_investigation": col.count_documents({**({"citizen_id": request.user.id} if not is_admin_or_supervisor else {}), "status": "UNDER_INVESTIGATION"}),
            "action_taken": col.count_documents({**({"citizen_id": request.user.id} if not is_admin_or_supervisor else {}), "status": "ACTION_TAKEN"}),
            "resolved": col.count_documents({**({"citizen_id": request.user.id} if not is_admin_or_supervisor else {}), "status": "RESOLVED"}),
        }

        return api_success({"items": items, "total": total_count, "stats": stats})

    def post(self, request):
        data = request.data or {}
        title = (data.get("title") or "").strip()
        category = (data.get("category") or "OTHER").strip().upper()
        description = (data.get("description") or "").strip()
        complaint_id = (data.get("complaint_id") or "").strip()
        authority_name = (data.get("authority_name") or "Public Works Department").strip()
        location_text = (data.get("location_text") or data.get("location") or "").strip()
        priority = (data.get("priority") or "NORMAL").strip().upper()
        evidence_urls = data.get("evidence_urls", [])

        if not title:
            return api_error("Grievance subject/title is required.", "MISSING_TITLE")
        if not description:
            return api_error("Detailed description of grievance is required.", "MISSING_DESCRIPTION")

        valid_categories = {
            "DELAYED_REPAIR", "POOR_WORKMANSHIP", "FALSE_COMPLETION",
            "UNMARKED_HAZARD", "CORRUPTION_NEGLIGENCE", "OTHER"
        }
        if category not in valid_categories:
            category = "OTHER"

        col = grievances_col()
        now = datetime.utcnow()
        count = col.count_documents({}) + 1
        grievance_number = f"GRV-{now.year}-{count + 10000:05d}"

        # If a complaint ID is provided, verify it exists or link details
        complaint_details = None
        if complaint_id:
            c_doc = complaints_col().find_one({"complaint_number": complaint_id}) or complaints_col().find_one({"_id": parse_object_id(complaint_id)})
            if c_doc:
                complaint_details = {
                    "complaint_number": c_doc.get("complaint_number"),
                    "title": c_doc.get("title"),
                    "road_name": c_doc.get("location", {}).get("road_name", ""),
                    "status": c_doc.get("status"),
                }

        doc = {
            "grievance_number": grievance_number,
            "citizen_id": request.user.id,
            "citizen_name": request.user.name,
            "citizen_email": request.user.email,
            "citizen_phone": getattr(request.user, "phone", ""),
            "title": title,
            "category": category,
            "description": description,
            "complaint_id": complaint_id,
            "complaint_details": complaint_details,
            "authority_name": authority_name,
            "location_text": location_text,
            "priority": priority,
            "evidence_urls": evidence_urls if isinstance(evidence_urls, list) else [],
            "status": "FILED",
            "assigned_investigator": None,
            "resolution_remarks": None,
            "resolution_date": None,
            "status_history": [
                {
                    "status": "FILED",
                    "actor_id": request.user.id,
                    "actor_name": request.user.name,
                    "timestamp": now,
                    "notes": "Citizen submitted grievance report.",
                }
            ],
            "created_at": now,
            "updated_at": now,
        }

        res = col.insert_one(doc)
        g_id = str(res.inserted_id)

        record_audit_log(
            request.user.id,
            "GRIEVANCE_FILED",
            "grievances",
            g_id,
            {"grievance_number": grievance_number, "category": category}
        )

        # Notify citizen of filing confirmation
        send_notification(
            request.user.id,
            "GRIEVANCE_FILED",
            f"Grievance Filed: {grievance_number}",
            f"Your grievance report '{title}' has been registered and submitted to {authority_name} for formal investigation.",
            {"grievance_id": g_id, "grievance_number": grievance_number}
        )

        doc["id"] = g_id
        doc.pop("_id", None)

        return api_success(
            serialize_doc(doc),
            message=f"Grievance report successfully registered under reference {grievance_number}.",
            status_code=status.HTTP_201_CREATED
        )


class GrievanceDetailView(APIView):
    permission_classes = [IsAuthenticatedMongo]

    def get(self, request, grievance_id):
        col = grievances_col()
        oid = parse_object_id(grievance_id)
        query = {"_id": oid} if oid else {"grievance_number": grievance_id}

        doc = col.find_one(query)
        if not doc:
            return api_error("Grievance report not found.", "NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)

        is_admin_or_supervisor = (
            request.user.is_super_admin or
            request.user.has_role("AUTHORITY_SUPERVISOR", "AUTHORITY_OFFICER")
        )

        if not is_admin_or_supervisor and doc.get("citizen_id") != request.user.id:
            return api_error("You do not have permission to view this grievance.", "FORBIDDEN", status_code=status.HTTP_403_FORBIDDEN)

        return api_success(serialize_doc(doc))


class GrievanceStatusUpdateView(APIView):
    """
    Update grievance status, assign an investigating officer, or write resolution remarks.
    Accessible to Super Admins and Authority Supervisors.
    """
    permission_classes = [IsAuthenticatedMongo]

    def patch(self, request, grievance_id):
        if not (request.user.is_super_admin or request.user.has_role("AUTHORITY_SUPERVISOR", "AUTHORITY_OFFICER")):
            return api_error("Access restricted to authority supervisors, officers, and administrators.", "FORBIDDEN", status_code=status.HTTP_403_FORBIDDEN)

        col = grievances_col()
        oid = parse_object_id(grievance_id)
        query = {"_id": oid} if oid else {"grievance_number": grievance_id}

        g_doc = col.find_one(query)
        if not g_doc:
            return api_error("Grievance report not found.", "NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)

        data = request.data or {}
        new_status = (data.get("status") or "").upper()
        remarks = (data.get("remarks") or data.get("resolution_remarks") or "").strip()
        investigator = (data.get("assigned_investigator") or "").strip()

        valid_statuses = {"FILED", "UNDER_INVESTIGATION", "ACTION_TAKEN", "RESOLVED", "REJECTED"}
        if new_status and new_status not in valid_statuses:
            return api_error(f"Invalid status. Must be one of {valid_statuses}", "INVALID_STATUS")

        now = datetime.utcnow()
        update_fields: Dict[str, Any] = {"updated_at": now}

        if new_status:
            update_fields["status"] = new_status
            if new_status in ("RESOLVED", "REJECTED"):
                update_fields["resolution_date"] = now

        if remarks:
            update_fields["resolution_remarks"] = remarks

        if investigator:
            update_fields["assigned_investigator"] = investigator

        history_entry = {
            "status": new_status or g_doc.get("status"),
            "actor_id": request.user.id,
            "actor_name": request.user.name,
            "timestamp": now,
            "notes": remarks or f"Status transitioned to {new_status}",
        }

        col.update_one(
            {"_id": g_doc["_id"]},
            {
                "$set": update_fields,
                "$push": {"status_history": history_entry}
            }
        )

        # Notify complainant citizen of status update
        citizen_id = g_doc.get("citizen_id")
        if citizen_id:
            send_notification(
                citizen_id,
                "GRIEVANCE_STATUS_UPDATE",
                f"Grievance {g_doc.get('grievance_number')} Status: {new_status or 'Updated'}",
                f"Your grievance report '{g_doc.get('title')}' status is now {new_status}. {remarks}",
                {"grievance_id": str(g_doc["_id"]), "status": new_status}
            )

        record_audit_log(
            request.user.id,
            "GRIEVANCE_STATUS_UPDATED",
            "grievances",
            str(g_doc["_id"]),
            {"new_status": new_status, "remarks": remarks}
        )

        updated_doc = col.find_one({"_id": g_doc["_id"]})
        return api_success(
            serialize_doc(updated_doc),
            message=f"Grievance status updated to {new_status or g_doc.get('status')}."
        )
