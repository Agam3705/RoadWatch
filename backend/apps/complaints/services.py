"""
RoadWatch Complaints Domain Service
Encapsulates complaint lifecycle, state machine transitions, duplicate detection,
priority calculation, and media storage.
"""
import uuid
import random
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from bson import ObjectId

from apps.core.db import (
    complaints_col, complaint_images_col, complaint_supports_col,
    duplicate_links_col, roads_col, jurisdictions_col,
    parse_object_id, serialize_doc
)
from apps.core.storage import save_uploaded_media
from apps.core.utils import record_audit_log, record_status_history, send_notification
from apps.ai_service.priority_engine import calculate_priority_score
from apps.ai_service.client import analyze_complaint_image


# State Machine Transition Rules (PRD Table 6.3)
PERMITTED_TRANSITIONS = {
    "SUBMITTED": ["UNDER_REVIEW", "REJECTED", "REQUESTED_INFORMATION"],
    "UNDER_REVIEW": ["APPROVED", "REJECTED", "REQUESTED_INFORMATION"],
    "REQUESTED_INFORMATION": ["UNDER_REVIEW", "WITHDRAWN"],
    "APPROVED": ["ASSIGNED", "IN_PROGRESS", "CLOSED_NO_ACTION"],
    "ASSIGNED": ["IN_PROGRESS", "APPROVED", "ESCALATED"],
    "IN_PROGRESS": ["PENDING_VERIFICATION", "ESCALATED"],
    "PENDING_VERIFICATION": ["RESOLVED", "REOPENED", "DISPUTED"],
    "RESOLVED": ["REOPENED"],
    "REOPENED": ["UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS"],
    "REJECTED": ["REVIEWED_ON_APPEAL", "CLOSED"],
    "DISPUTED": ["REOPENED", "RESOLVED", "ESCALATED"],
    "CLOSED": [],
    "WITHDRAWN": [],
}


def generate_public_reference() -> str:
    year = datetime.utcnow().year
    rand_id = random.randint(100000, 999999)
    return f"RW-{year}-{rand_id}"


def find_nearby_complaints(
    longitude: float,
    latitude: float,
    radius_meters: float = 250.0,
    exclude_id: Optional[str] = None,
    category: Optional[str] = None,
) -> List[Dict[str, Any]]:
    query: Dict[str, Any] = {
        "location": {
            "$nearSphere": {
                "$geometry": {
                    "type": "Point",
                    "coordinates": [longitude, latitude],
                },
                "$maxDistance": radius_meters,
            }
        }
    }

    if exclude_id:
        obj_id = parse_object_id(exclude_id)
        if obj_id:
            query["_id"] = {"$ne": obj_id}

    if category:
        query["category"] = category

    cursor = complaints_col().find(query).limit(10)
    return [serialize_doc(doc) for doc in cursor]


def create_complaint(
    reporter_id: str,
    category: str,
    description: str,
    longitude: float,
    latitude: float,
    citizen_severity: str = "MEDIUM",
    road_id: Optional[str] = None,
    jurisdiction_id: Optional[str] = None,
    uploaded_files: Optional[List[Any]] = None,
    is_near_vulnerable: bool = False,
) -> Dict[str, Any]:
    ref = generate_public_reference()
    now = datetime.utcnow()

    # Resolve road and jurisdiction if not provided
    road_type = "LOCAL"
    if road_id:
        r_doc = roads_col().find_one({"_id": parse_object_id(road_id)})
        if r_doc:
            road_type = r_doc.get("road_type", "LOCAL")
            if not jurisdiction_id:
                jurisdiction_id = str(r_doc.get("jurisdiction_id", ""))

    # If jurisdiction not found, attempt geospatial point-in-polygon resolution
    if not jurisdiction_id:
        j_doc = jurisdictions_col().find_one({
            "boundary": {
                "$geoIntersects": {
                    "$geometry": {"type": "Point", "coordinates": [longitude, latitude]}
                }
            }
        })
        if j_doc:
            jurisdiction_id = str(j_doc["_id"])

    # Initial Priority Calculation (PRD 7.5: P = 0.35S + 0.25T + 0.20V + 0.20R)
    priority_info = calculate_priority_score(
        severity_level=citizen_severity,
        road_type=road_type,
        is_near_vulnerable_infrastructure=is_near_vulnerable,
        support_count=0,
    )

    complaint_doc = {
        "public_reference": ref,
        "reporter_id": str(reporter_id),
        "road_id": str(road_id) if road_id else None,
        "jurisdiction_id": str(jurisdiction_id) if jurisdiction_id else None,
        "category": category.upper(),
        "description": description,
        "location": {
            "type": "Point",
            "coordinates": [float(longitude), float(latitude)],
        },
        "citizen_severity": citizen_severity.upper(),
        "ai_assessment_id": None,
        "authority_assessment": None,
        "priority": priority_info,
        "support_count": 0,
        "status": "SUBMITTED",
        "visibility": "PUBLIC_SUMMARY",
        "images": [],
        "created_at": now,
        "updated_at": now,
    }

    res = complaints_col().insert_one(complaint_doc)
    complaint_id = str(res.inserted_id)

    # Initial status history
    record_status_history(
        entity_type="complaints",
        entity_id=complaint_id,
        previous_status="NONE",
        new_status="SUBMITTED",
        actor_id=str(reporter_id),
        actor_name="Citizen Reporter",
        reason="Initial complaint submission",
    )

    record_audit_log(
        actor_id=str(reporter_id),
        action="COMPLAINT_CREATED",
        entity_type="complaints",
        entity_id=complaint_id,
        metadata={"public_reference": ref, "category": category},
    )

    # Handle media uploads & trigger AI analysis
    stored_images = []
    if uploaded_files:
        for idx, file_obj in enumerate(uploaded_files):
            try:
                rel_path, meta = save_uploaded_media(file_obj, subfolder="complaints")
                img_doc = {
                    "complaint_id": complaint_id,
                    "storage_path": rel_path,
                    "file_metadata": meta,
                    "image_type": "CITIZEN_SUBMISSION",
                    "uploaded_by": str(reporter_id),
                    "created_at": now,
                }
                img_res = complaint_images_col().insert_one(img_doc)
                img_id = str(img_res.inserted_id)
                meta["id"] = img_id
                stored_images.append(meta)

                # Trigger AI Analysis on first image
                if idx == 0:
                    try:
                        ai_pred = analyze_complaint_image(complaint_id, img_id, rel_path)
                        if ai_pred:
                            complaints_col().update_one(
                                {"_id": parse_object_id(complaint_id)},
                                {"$set": {"ai_assessment_id": ai_pred["id"]}}
                            )
                    except Exception as ai_err:
                        pass
            except Exception as e:
                # Log but do not block complaint submission
                pass

    if stored_images:
        complaints_col().update_one(
            {"_id": parse_object_id(complaint_id)},
            {"$set": {"images": stored_images}}
        )

    # Search duplicate candidates
    duplicates = find_nearby_complaints(longitude, latitude, radius_meters=200.0, exclude_id=complaint_id)

    final_doc = complaints_col().find_one({"_id": parse_object_id(complaint_id)})
    result = serialize_doc(final_doc)
    result["duplicate_candidates"] = duplicates
    return result


def transition_status(
    complaint_id: str,
    target_status: str,
    actor_user,
    reason: str = "",
) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    obj_id = parse_object_id(complaint_id)
    doc = complaints_col().find_one({"_id": obj_id}) if obj_id else None
    if not doc:
        return False, "Complaint not found.", None

    current_status = doc.get("status", "SUBMITTED")
    target_status = target_status.upper()

    allowed = PERMITTED_TRANSITIONS.get(current_status, [])
    # Allow SuperAdmin to override with audit
    if target_status not in allowed and not actor_user.is_super_admin:
        return False, f"Illegal status transition from '{current_status}' to '{target_status}'. Allowed: {allowed}", None

    now = datetime.utcnow()
    complaints_col().update_one(
        {"_id": obj_id},
        {"$set": {"status": target_status, "updated_at": now}}
    )

    record_status_history(
        entity_type="complaints",
        entity_id=complaint_id,
        previous_status=current_status,
        new_status=target_status,
        actor_id=actor_user.id,
        actor_name=getattr(actor_user, "name", "Authority Officer"),
        reason=reason,
    )

    record_audit_log(
        actor_id=actor_user.id,
        action="COMPLAINT_STATUS_TRANSITION",
        entity_type="complaints",
        entity_id=complaint_id,
        metadata={"from": current_status, "to": target_status, "reason": reason},
    )

    # Notify reporter
    reporter_id = doc.get("reporter_id")
    if reporter_id and reporter_id != actor_user.id:
        send_notification(
            user_id=reporter_id,
            notif_type="STATUS_UPDATE",
            title=f"Report {doc.get('public_reference')} Update",
            body=f"Your complaint status changed to {target_status}." + (f" Note: {reason}" if reason else ""),
            metadata={"complaint_id": complaint_id, "status": target_status},
        )

    updated = complaints_col().find_one({"_id": obj_id})
    return True, "Status updated successfully.", serialize_doc(updated)


def support_complaint(complaint_id: str, citizen_id: str) -> Tuple[bool, str, int]:
    obj_id = parse_object_id(complaint_id)
    doc = complaints_col().find_one({"_id": obj_id}) if obj_id else None
    if not doc:
        return False, "Complaint not found.", 0

    # Check unique support
    existing = complaint_supports_col().find_one({
        "complaint_id": str(complaint_id),
        "citizen_id": str(citizen_id),
    })
    if existing:
        return False, "You have already supported this road defect report.", doc.get("support_count", 0)

    complaint_supports_col().insert_one({
        "complaint_id": str(complaint_id),
        "citizen_id": str(citizen_id),
        "created_at": datetime.utcnow(),
    })

    # Increment count
    complaints_col().update_one({"_id": obj_id}, {"$inc": {"support_count": 1}})
    new_doc = complaints_col().find_one({"_id": obj_id})
    new_count = new_doc.get("support_count", 1)

    # Recalculate priority with higher corroboration R
    severity = new_doc.get("citizen_severity", "MEDIUM")
    priority_calc = calculate_priority_score(
        severity_level=severity,
        road_type="LOCAL",
        support_count=new_count,
    )
    complaints_col().update_one({"_id": obj_id}, {"$set": {"priority": priority_calc}})

    record_audit_log(citizen_id, "COMPLAINT_SUPPORTED", "complaints", complaint_id)
    return True, "Report supported successfully.", new_count
