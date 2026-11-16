"""
RoadWatch Maintenance Views
Endpoints for work order dispatch, contractor execution, progress tracking,
evidence submission, and authority/citizen verification.
"""
from datetime import datetime
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny
from rest_framework import status

from apps.core.db import (
    maintenance_tasks_col, repair_evidence_col, verifications_col,
    complaints_col, organizations_col, complaint_images_col,
    parse_object_id, serialize_doc
)
from apps.core.utils import (
    api_success, api_error, record_audit_log, record_status_history, send_notification
)
from apps.core.permissions import IsAuthenticatedMongo, IsAuthority, IsContractor
from apps.core.storage import save_uploaded_media
from apps.maintenance.services import create_work_order
from apps.complaints.services import transition_status


class MaintenanceTaskListCreateView(APIView):
    permission_classes = [IsAuthority]

    def get(self, request):
        query = {}
        status_param = request.query_params.get("status")
        complaint_id = request.query_params.get("complaint_id")
        contractor_org_id = request.query_params.get("contractor_org_id")

        if status_param:
            query["status"] = status_param.upper()
        if complaint_id:
            query["complaint_id"] = complaint_id
        if contractor_org_id:
            query["contractor_org_id"] = contractor_org_id

        tasks = list(maintenance_tasks_col().find(query).sort("created_at", -1))
        return api_success(tasks)

    def post(self, request):
        data = request.data or {}
        complaint_id = data.get("complaint_id")
        title = data.get("title", "")
        contractor_org_id = data.get("contractor_org_id")
        deadline_days = int(data.get("deadline_days", 14))
        instructions = data.get("instructions", "")
        estimated_cost = float(data.get("estimated_cost", 0.0))

        if not complaint_id:
            return api_error("Complaint ID is required.", "MISSING_COMPLAINT_ID")

        try:
            task = create_work_order(
                complaint_id=complaint_id,
                authority_user=request.user,
                title=title,
                contractor_org_id=contractor_org_id,
                deadline_days=deadline_days,
                instructions=instructions,
                estimated_cost=estimated_cost,
            )
            return api_success(task, message="Work order created successfully.", status_code=status.HTTP_201_CREATED)
        except Exception as e:
            return api_error(str(e), "CREATE_FAILED")


class TaskAssignContractorView(APIView):
    permission_classes = [IsAuthority]

    def post(self, request, task_id):
        contractor_org_id = request.data.get("contractor_org_id")
        if not contractor_org_id:
            return api_error("Contractor organization ID is required.", "MISSING_ORG_ID")

        org = organizations_col().find_one({"_id": parse_object_id(contractor_org_id)})
        if not org:
            return api_error("Contractor organization not found.", "NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)

        t_id = parse_object_id(task_id)
        now = datetime.utcnow()

        maintenance_tasks_col().update_one(
            {"_id": t_id},
            {
                "$set": {
                    "contractor_org_id": str(contractor_org_id),
                    "contractor_name": org.get("name"),
                    "status": "ASSIGNED",
                    "updated_at": now,
                },
                "$push": {
                    "assignment_history": {
                        "contractor_org_id": str(contractor_org_id),
                        "contractor_name": org.get("name"),
                        "assigned_at": now.isoformat(),
                        "assigned_by": request.user.id,
                        "status": "ASSIGNED",
                    }
                }
            }
        )

        record_status_history("maintenance_tasks", task_id, "DRAFT", "ASSIGNED", request.user.id, request.user.name, f"Assigned to {org.get('name')}")
        record_audit_log(request.user.id, "TASK_ASSIGNED", "maintenance_tasks", task_id, {"contractor": org.get("name")})

        updated = maintenance_tasks_col().find_one({"_id": t_id})
        return api_success(updated, message=f"Task assigned to {org.get('name')}.")


class ContractorTasksListView(APIView):
    """Tasks visible to contractor users."""
    permission_classes = [IsContractor]

    def get(self, request):
        query = {}
        # Filter by contractor organization memberships unless super admin
        if not request.user.is_super_admin:
            if not request.user.organization_ids:
                return api_success([])
            query["contractor_org_id"] = {"$in": list(request.user.organization_ids)}

        status_param = request.query_params.get("status")
        if status_param:
            query["status"] = status_param.upper()

        tasks = list(maintenance_tasks_col().find(query).sort("deadline", 1))
        return api_success(tasks)


class ContractorTaskDetailView(APIView):
    permission_classes = [IsAuthenticatedMongo]

    def get(self, request, task_id):
        t_id = parse_object_id(task_id)
        task = maintenance_tasks_col().find_one({"_id": t_id})
        if not task:
            return api_error("Maintenance task not found.", "NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)

        result = serialize_doc(task)

        # Attach original complaint details
        complaint = complaints_col().find_one({"_id": parse_object_id(task.get("complaint_id"))})
        result["complaint"] = serialize_doc(complaint)

        # Attach repair evidence
        evidence_cursor = repair_evidence_col().find({"task_id": str(task["_id"])})
        result["evidence"] = [serialize_doc(e) for e in evidence_cursor]

        # Attach verification records
        verif_cursor = verifications_col().find({"task_id": str(task["_id"])})
        result["verifications"] = [serialize_doc(v) for v in verif_cursor]

        return api_success(result)


class ContractorTaskAcceptView(APIView):
    permission_classes = [IsContractor]

    def post(self, request, task_id):
        t_id = parse_object_id(task_id)
        task = maintenance_tasks_col().find_one({"_id": t_id})
        if not task:
            return api_error("Task not found.", "NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)

        maintenance_tasks_col().update_one(
            {"_id": t_id},
            {"$set": {"status": "ACCEPTED", "accepted_at": datetime.utcnow(), "updated_at": datetime.utcnow()}}
        )
        record_status_history("maintenance_tasks", task_id, task.get("status", "ASSIGNED"), "ACCEPTED", request.user.id, request.user.name, "Accepted by contractor")
        return api_success(message="Task accepted.")


class ContractorTaskDeclineView(APIView):
    permission_classes = [IsContractor]

    def post(self, request, task_id):
        reason = (request.data.get("reason") or "").strip()
        if not reason:
            return api_error("Decline reason is mandatory.", "MISSING_REASON")

        t_id = parse_object_id(task_id)
        task = maintenance_tasks_col().find_one({"_id": t_id})
        if not task:
            return api_error("Task not found.", "NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)

        maintenance_tasks_col().update_one(
            {"_id": t_id},
            {"$set": {"status": "DECLINED", "decline_reason": reason, "updated_at": datetime.utcnow()}}
        )
        record_status_history("maintenance_tasks", task_id, task.get("status", "ASSIGNED"), "DECLINED", request.user.id, request.user.name, reason)
        return api_success(message="Task declined. Authority will be notified for reassignment.")


class ContractorTaskProgressView(APIView):
    permission_classes = [IsContractor]

    def post(self, request, task_id):
        data = request.data or {}
        progress_pct = int(data.get("progress_percentage", 0))
        note = (data.get("note") or "").strip()
        blocker = (data.get("blocker") or "").strip()

        t_id = parse_object_id(task_id)
        task = maintenance_tasks_col().find_one({"_id": t_id})
        if not task:
            return api_error("Task not found.", "NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)

        now = datetime.utcnow()
        new_status = "IN_PROGRESS" if progress_pct > 0 else task.get("status", "ACCEPTED")

        update_ops = {
            "$set": {
                "progress_percentage": min(100, max(0, progress_pct)),
                "status": new_status,
                "updated_at": now,
            },
            "$push": {
                "progress_logs": {
                    "progress_percentage": progress_pct,
                    "note": note,
                    "logged_by": request.user.id,
                    "timestamp": now.isoformat(),
                }
            }
        }

        if blocker:
            update_ops["$push"]["blockers"] = {
                "blocker": blocker,
                "reported_at": now.isoformat(),
                "reported_by": request.user.id,
            }

        maintenance_tasks_col().update_one({"_id": t_id}, update_ops)

        # Update linked complaint status to IN_PROGRESS if not already
        complaint_id = task.get("complaint_id")
        if complaint_id:
            transition_status(complaint_id, "IN_PROGRESS", request.user, reason=f"Contractor work progress {progress_pct}%: {note}")

        return api_success(message="Work progress updated successfully.")


class ContractorSubmitEvidenceView(APIView):
    """Submits completion evidence (after-repair photos and notes)."""
    permission_classes = [IsContractor]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, task_id):
        t_id = parse_object_id(task_id)
        task = maintenance_tasks_col().find_one({"_id": t_id})
        if not task:
            return api_error("Task not found.", "NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)

        notes = request.data.get("work_notes", "")
        repair_location = request.data.get("repair_location")

        files = request.FILES.getlist("images")
        if not files and "image" in request.FILES:
            files = [request.FILES["image"]]

        if not files:
            return api_error("At least one after-repair photograph is required as completion evidence.", "MISSING_EVIDENCE_PHOTO")

        saved_evidence = []
        now = datetime.utcnow()

        for f in files:
            try:
                rel_path, meta = save_uploaded_media(f, subfolder="evidence")
                ev_doc = {
                    "task_id": str(task_id),
                    "complaint_id": str(task.get("complaint_id")),
                    "storage_path": rel_path,
                    "file_metadata": meta,
                    "evidence_type": "AFTER_REPAIR_PHOTO",
                    "work_notes": notes,
                    "location": repair_location,
                    "submitted_by": request.user.id,
                    "submitted_at": now,
                }
                res = repair_evidence_col().insert_one(ev_doc)
                meta["id"] = str(res.inserted_id)
                saved_evidence.append(meta)
            except Exception as e:
                return api_error(f"Failed to process evidence image: {str(e)}", "UPLOAD_FAILED")

        # Update task state to COMPLETION_SUBMITTED
        maintenance_tasks_col().update_one(
            {"_id": t_id},
            {
                "$set": {
                    "status": "COMPLETION_SUBMITTED",
                    "progress_percentage": 100,
                    "completion_submitted_at": now,
                    "updated_at": now,
                }
            }
        )

        # Update linked complaint state to PENDING_VERIFICATION
        complaint_id = task.get("complaint_id")
        if complaint_id:
            transition_status(complaint_id, "PENDING_VERIFICATION", request.user, reason="Contractor submitted completion evidence.")

        record_status_history("maintenance_tasks", task_id, task.get("status", "IN_PROGRESS"), "COMPLETION_SUBMITTED", request.user.id, request.user.name, "Submitted repair evidence")
        record_audit_log(request.user.id, "REPAIR_EVIDENCE_SUBMITTED", "maintenance_tasks", task_id, {"evidence_count": len(saved_evidence)})

        return api_success({"evidence": saved_evidence}, message="Repair completion evidence submitted successfully. Awaiting verification.")


class VerificationPendingListView(APIView):
    """Lists tasks awaiting verification."""
    permission_classes = [IsAuthenticatedMongo]

    def get(self, request):
        tasks = list(maintenance_tasks_col().find({"status": "COMPLETION_SUBMITTED"}).sort("completion_submitted_at", -1))
        results = []
        for t in tasks:
            t_ser = serialize_doc(t)
            # Attach original complaint image and repair evidence image for before/after comparison
            c_doc = complaints_col().find_one({"_id": parse_object_id(t.get("complaint_id"))})
            t_ser["complaint"] = serialize_doc(c_doc)

            ev = list(repair_evidence_col().find({"task_id": str(t["_id"])}))
            t_ser["evidence"] = serialize_doc(ev)
            results.append(t_ser)

        return api_success(results)


class VerificationApproveView(APIView):
    """Authority approves repair evidence and officially marks complaint RESOLVED."""
    permission_classes = [IsAuthority]

    def post(self, request, task_id):
        t_id = parse_object_id(task_id)
        task = maintenance_tasks_col().find_one({"_id": t_id})
        if not task:
            return api_error("Task not found.", "NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)

        # PRD Constraint: Contractor cannot verify their own work
        if task.get("contractor_org_id") in request.user.organization_ids and not request.user.is_super_admin:
            return api_error("Contractors are prohibited from verifying their own repair work.", "FORBIDDEN_SELF_VERIFICATION", status_code=status.HTTP_403_FORBIDDEN)

        comments = request.data.get("comments", "")
        now = datetime.utcnow()

        verif_doc = {
            "task_id": str(task_id),
            "complaint_id": str(task.get("complaint_id")),
            "reviewer_id": request.user.id,
            "reviewer_name": getattr(request.user, "name", "Authority Officer"),
            "decision": "ACCEPTED",
            "comments": comments,
            "created_at": now,
        }
        verifications_col().insert_one(verif_doc)

        maintenance_tasks_col().update_one(
            {"_id": t_id},
            {"$set": {"status": "VERIFIED", "verified_at": now, "updated_at": now}}
        )

        # Mark linked complaint RESOLVED
        complaint_id = task.get("complaint_id")
        if complaint_id:
            transition_status(complaint_id, "RESOLVED", request.user, reason=f"Repair verified and accepted: {comments}")

        record_status_history("maintenance_tasks", task_id, "COMPLETION_SUBMITTED", "VERIFIED", request.user.id, request.user.name, comments)
        record_audit_log(request.user.id, "REPAIR_VERIFIED_ACCEPTED", "maintenance_tasks", task_id, {"decision": "ACCEPTED"})

        return api_success(message="Repair evidence approved. Work order marked VERIFIED and complaint RESOLVED.")


class VerificationRejectView(APIView):
    """Authority rejects repair evidence, requiring rework or reopening complaint."""
    permission_classes = [IsAuthority]

    def post(self, request, task_id):
        reason = (request.data.get("reason") or "").strip()
        if not reason:
            return api_error("Rejection reason is required.", "MISSING_REASON")

        t_id = parse_object_id(task_id)
        task = maintenance_tasks_col().find_one({"_id": t_id})
        if not task:
            return api_error("Task not found.", "NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)

        now = datetime.utcnow()
        verif_doc = {
            "task_id": str(task_id),
            "complaint_id": str(task.get("complaint_id")),
            "reviewer_id": request.user.id,
            "reviewer_name": getattr(request.user, "name", "Authority Officer"),
            "decision": "REJECTED",
            "comments": reason,
            "created_at": now,
        }
        verifications_col().insert_one(verif_doc)

        maintenance_tasks_col().update_one(
            {"_id": t_id},
            {"$set": {"status": "REWORK_REQUIRED", "updated_at": now}}
        )

        complaint_id = task.get("complaint_id")
        if complaint_id:
            transition_status(complaint_id, "REOPENED", request.user, reason=f"Repair rejected during verification: {reason}")

        record_status_history("maintenance_tasks", task_id, "COMPLETION_SUBMITTED", "REWORK_REQUIRED", request.user.id, request.user.name, reason)
        record_audit_log(request.user.id, "REPAIR_VERIFIED_REJECTED", "maintenance_tasks", task_id, {"reason": reason})

        return api_success(message="Repair evidence rejected. Task returned for rework.")


class CitizenVerificationFeedbackView(APIView):
    """Allows citizens who reported or supported an issue to provide repair verification feedback."""
    permission_classes = [IsAuthenticatedMongo]

    def post(self, request, task_id):
        data = request.data or {}
        is_fixed = str(data.get("is_fixed", "true")).lower() in ("true", "1")
        rating = int(data.get("rating", 5))  # 1 to 5 stars
        comments = data.get("comments", "").strip()

        t_id = parse_object_id(task_id)
        task = maintenance_tasks_col().find_one({"_id": t_id})
        if not task:
            return api_error("Task not found.", "NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)

        feedback_doc = {
            "task_id": str(task_id),
            "complaint_id": str(task.get("complaint_id")),
            "citizen_id": request.user.id,
            "citizen_name": getattr(request.user, "name", "Citizen"),
            "is_fixed": is_fixed,
            "rating": rating,
            "comments": comments,
            "created_at": datetime.utcnow(),
        }

        verifications_col().insert_one(feedback_doc)

        # If citizen signals "not fixed", flag the task for supervisor review
        if not is_fixed:
            maintenance_tasks_col().update_one(
                {"_id": t_id},
                {"$set": {"citizen_disputed": True, "updated_at": datetime.utcnow()}}
            )

        return api_success(message="Citizen verification feedback recorded. Thank you for making our roads safer!")
