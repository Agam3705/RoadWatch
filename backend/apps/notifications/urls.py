from django.urls import path
from apps.notifications.views import (
    NotificationListView, NotificationMarkReadView,
    NotificationReadAllView, NotificationUnreadCountView,
    AdminBroadcastNotificationView
)

urlpatterns = [
    path("notifications/", NotificationListView.as_view(), name="notification-list"),
    path("notifications/broadcast/", AdminBroadcastNotificationView.as_view(), name="notification-broadcast"),
    path("notifications/<str:notification_id>/read/", NotificationMarkReadView.as_view(), name="notification-mark-read"),
    path("notifications/read-all/", NotificationReadAllView.as_view(), name="notification-read-all"),
    path("notifications/unread-count/", NotificationUnreadCountView.as_view(), name="notification-unread-count"),
]
