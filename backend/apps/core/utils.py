"""
RoadWatch Core Utilities
Response helpers, audit logging, status transition tracking, and notifications.
"""
from datetime import datetime
from typing import Any, Dict, Optional, List
from rest_framework.response import Response
from rest_framework import status
from apps.core.db import audit_logs_col, status_history_col, notifications_col, parse_object_id, serialize_doc


def api_success(data: Any = None, message: str = "Success", status_code: int = status.HTTP_200_OK):
    return Response(
        {
            "success": True,
            "message": message,
            "data": serialize_doc(data),
        },
        status=status_code
    )


def api_error(message: str, code: str = "ERROR", errors: Any = None, status_code: int = status.HTTP_400_BAD_REQUEST):
    return Response(
        {
            "success": False,
            "code": code,
            "message": message,
            "errors": errors or [],
        },
        status=status_code
    )


def record_audit_log(
    actor_id: Optional[str],
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
):
    try:
        col = audit_logs_col()
        doc = {
            "actor_id": actor_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": str(entity_id) if entity_id else None,
            "metadata": metadata or {},
            "timestamp": datetime.utcnow(),
        }
        col.insert_one(doc)
    except Exception as e:
        # Never break main request on audit log insertion failure
        pass


def record_status_history(
    entity_type: str,
    entity_id: str,
    previous_status: str,
    new_status: str,
    actor_id: Optional[str] = None,
    actor_name: Optional[str] = None,
    reason: Optional[str] = None,
):
    try:
        col = status_history_col()
        doc = {
            "entity_type": entity_type,
            "entity_id": str(entity_id),
            "previous_status": previous_status,
            "new_status": new_status,
            "actor_id": actor_id,
            "actor_name": actor_name or "System",
            "reason": reason or "",
            "timestamp": datetime.utcnow(),
        }
        col.insert_one(doc)
    except Exception as e:
        pass


def send_notification(
    user_id: str,
    notif_type: str,
    title: str,
    body: str,
    metadata: Optional[Dict[str, Any]] = None,
):
    try:
        col = notifications_col()
        doc = {
            "user_id": str(user_id),
            "type": notif_type,
            "title": title,
            "body": body,
            "metadata": metadata or {},
            "read_at": None,
            "delivery_status": "DELIVERED",
            "created_at": datetime.utcnow(),
        }
        col.insert_one(doc)
    except Exception as e:
        pass
