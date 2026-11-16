"""
RoadWatch Maintenance Domain Services
Work orders, contractor assignments, progress tracking, evidence handling, and verification.
"""
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple

from apps.core.db import (
    maintenance_tasks_col, repair_evidence_col, verifications_col,
    complaints_col, organizations_col, parse_object_id, serialize_doc
)
from apps.core.utils import record_audit_log, record_status_history, send_notification
from apps.complaints.services import transition_status


def generate_task_reference() -> str:
    year = datetime.utcnow().year
    rand_id = uuid.uuid4().hex[:6].upper()
    return f"WO-{year}-{rand_id}"


def create_work_order(
    complaint_id: str,
    authority_user,
    title: str,
    contractor_org_id: Optional[str] = None,
    deadline_days: int = 14,
    instructions: str = "",
    estimated_cost: float = 0.0,
) -> Dict[str, Any]:
    c_doc = complaints_col().find_one({"_id": parse_object_id(complaint_id)})
    if not c_doc:
        raise ValueError("Complaint not found.")

    now = datetime.utcnow()
    deadline = now + timedelta(days=deadline_days)
    task_ref = generate_task_reference()

    task_doc = {
        "task_reference": task_ref,
        "complaint_id": str(complaint_id),
        "complaint_reference": c_doc.get("public_reference"),
        "title": title or f"Repair road defect at {c_doc.get('public_reference')}",
        "instructions": instructions,
        "contractor_org_id": str(contractor_org_id) if contractor_org_id else None,
        "contractor_name": None,
        "assigned_by": authority_user.id,
        "status": "ASSIGNED" if contractor_org_id else "DRAFT",
        "deadline": deadline,
        "estimated_cost": estimated_cost,
        "actual_cost": 0.0,
        "progress_percentage": 0,
        "progress_logs": [],
        "blockers": [],
        "created_at": now,
        "updated_at": now,
        "assignment_history": [],
    }

    if contractor_org_id:
        org = organizations_col().find_one({"_id": parse_object_id(contractor_org_id)})
        if org:
            task_doc["contractor_name"] = org.get("name")
        task_doc["assignment_history"].append({
            "contractor_org_id": str(contractor_org_id),
            "assigned_at": now.isoformat(),
            "assigned_by": authority_user.id,
            "status": "ASSIGNED",
        })

    res = maintenance_tasks_col().insert_one(task_doc)
    task_id = str(res.inserted_id)

    # Transition complaint status to ASSIGNED if approved
    if c_doc.get("status") in ("APPROVED", "SUBMITTED", "UNDER_REVIEW"):
        transition_status(complaint_id, "ASSIGNED", authority_user, reason=f"Work order {task_ref} created and assigned.")

    record_status_history(
        entity_type="maintenance_tasks",
        entity_id=task_id,
        previous_status="NONE",
        new_status=task_doc["status"],
        actor_id=authority_user.id,
        actor_name=getattr(authority_user, "name", "Authority Officer"),
        reason=f"Work order generated with reference {task_ref}",
    )

    record_audit_log(
        authority_user.id,
        "WORK_ORDER_CREATED",
        "maintenance_tasks",
        task_id,
        {"task_reference": task_ref, "contractor_org_id": contractor_org_id}
    )

    return serialize_doc(maintenance_tasks_col().find_one({"_id": res.inserted_id}))
