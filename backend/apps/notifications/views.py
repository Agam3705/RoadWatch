"""
RoadWatch Notifications Views
Endpoints for user notifications, unread count badge, and mark-as-read actions.
"""
from datetime import datetime
from typing import Dict, Any
from rest_framework.views import APIView
from rest_framework import status
from apps.core.db import notifications_col, users_col, parse_object_id, serialize_doc
from apps.core.utils import api_success, api_error, record_audit_log, send_notification
from apps.core.permissions import IsAuthenticatedMongo


class NotificationListView(APIView):
    permission_classes = [IsAuthenticatedMongo]

    def get(self, request):
        cursor = notifications_col().find(
            {"user_id": request.user.id}
        ).sort("created_at", -1).limit(50)
        items = [serialize_doc(doc) for doc in cursor]
        unread_count = notifications_col().count_documents({"user_id": request.user.id, "read_at": None})
        return api_success({"items": items, "unread_count": unread_count})


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticatedMongo]

    def post(self, request, notification_id):
        n_id = parse_object_id(notification_id)
        notifications_col().update_one(
            {"_id": n_id, "user_id": request.user.id},
            {"$set": {"read_at": datetime.utcnow()}}
        )
        return api_success(message="Notification marked as read.")


class NotificationReadAllView(APIView):
    permission_classes = [IsAuthenticatedMongo]

    def post(self, request):
        notifications_col().update_many(
            {"user_id": request.user.id, "read_at": None},
            {"$set": {"read_at": datetime.utcnow()}}
        )
        return api_success(message="All notifications marked as read.")


class NotificationUnreadCountView(APIView):
    permission_classes = [IsAuthenticatedMongo]

    def get(self, request):
        unread_count = notifications_col().count_documents({"user_id": request.user.id, "read_at": None})
        return api_success({"unread_count": unread_count})


class AdminBroadcastNotificationView(APIView):
    """
    Send targeted or global notifications to citizens, officers, contractors, or individual users.
    Accessible to Super Admins and Authority Supervisors.
    """
    permission_classes = [IsAuthenticatedMongo]

    def post(self, request):
        if not (request.user.is_super_admin or request.user.has_role("AUTHORITY_SUPERVISOR")):
            return api_error("Access restricted to platform administrators and authority supervisors.", "FORBIDDEN", status_code=status.HTTP_403_FORBIDDEN)

        data = request.data or {}
        target_type = (data.get("target_type") or "GLOBAL").upper()
        target_role = data.get("target_role")
        target_user_id = data.get("target_user_id") or data.get("user_id")
        target_email = (data.get("target_email") or "").strip().lower()
        title = (data.get("title") or "").strip()
        message = (data.get("message") or "").strip()
        notif_type = data.get("type", "ANNOUNCEMENT").upper()
        priority = data.get("priority", "NORMAL").upper()

        if not title:
            return api_error("Notification title is required.", "MISSING_TITLE")
        if not message:
            return api_error("Notification message is required.", "MISSING_MESSAGE")

        users_db = users_col()
        notifs_db = notifications_col()
        now = datetime.utcnow()
        recipient_ids = []

        if target_type == "GLOBAL":
            cursor = users_db.find({"account_status": "ACTIVE"}, {"_id": 1})
            recipient_ids = [str(u["_id"]) for u in cursor]
        elif target_type == "ROLE":
            if not target_role:
                return api_error("Target role is required when target_type is ROLE.", "MISSING_ROLE")
            cursor = users_db.find({"role": target_role, "account_status": "ACTIVE"}, {"_id": 1})
            recipient_ids = [str(u["_id"]) for u in cursor]
        elif target_type == "USER":
            query = {}
            if target_user_id:
                oid = parse_object_id(target_user_id)
                if oid:
                    query["_id"] = oid
            elif target_email:
                query["email"] = target_email

            if not query:
                return api_error("Target user ID or email is required for individual notifications.", "MISSING_TARGET_USER")

            target_user = users_db.find_one(query, {"_id": 1})
            if not target_user:
                return api_error("Target user not found.", "USER_NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)
            recipient_ids = [str(target_user["_id"])]
        else:
            return api_error("Invalid target_type. Must be GLOBAL, ROLE, or USER.", "INVALID_TARGET_TYPE")

        if not recipient_ids:
            return api_success({"dispatched_count": 0}, message="No active recipients found for specified criteria.")

        docs = [
            {
                "user_id": uid,
                "type": notif_type,
                "title": title,
                "body": message,
                "metadata": {
                    "priority": priority,
                    "sender_id": request.user.id,
                    "sender_name": request.user.name,
                    "target_type": target_type,
                },
                "read_at": None,
                "delivery_status": "DELIVERED",
                "created_at": now,
            }
            for uid in recipient_ids
        ]

        notifs_db.insert_many(docs)

        record_audit_log(
            request.user.id,
            "NOTIFICATION_DISPATCHED",
            "notifications",
            None,
            {
                "target_type": target_type,
                "target_role": target_role,
                "recipients_count": len(recipient_ids),
                "title": title
            }
        )

        return api_success(
            {
                "dispatched_count": len(recipient_ids),
                "target_type": target_type,
                "title": title
            },
            message=f"Successfully dispatched notification to {len(recipient_ids)} recipient(s)."
        )
