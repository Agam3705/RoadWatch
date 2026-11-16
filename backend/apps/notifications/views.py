"""
RoadWatch Notifications Views
Endpoints for user notifications, unread count badge, and mark-as-read actions.
"""
from datetime import datetime
from rest_framework.views import APIView
from rest_framework import status
from apps.core.db import notifications_col, parse_object_id, serialize_doc
from apps.core.utils import api_success, api_error
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
