from django.urls import path
from apps.community.views import (
    DiscussionRoomsListView, DiscussionRoomMessagesView,
    PollsListView, PollVoteView, CitizenFeedbackView,
    SupervisorFieldInspectionView, OfficerFieldInspectionReviewView,
    AdminDiscussionRoomsManagementView, AdminDiscussionRoomDetailView,
    AdminDiscussionMessageModerationView, AdminReviewsManagementView,
    AdminReviewDetailView
)

urlpatterns = [
    # Discussion Rooms (Public & Citizen)
    path("community/rooms/", DiscussionRoomsListView.as_view(), name="community-rooms-list"),
    path("community/rooms/<str:room_id>/messages/", DiscussionRoomMessagesView.as_view(), name="community-room-messages"),

    # Public Review Polling & Civic Feedback
    path("community/polls/", PollsListView.as_view(), name="community-polls-list"),
    path("community/polls/<str:poll_id>/vote/", PollVoteView.as_view(), name="community-poll-vote"),
    path("community/feedback/", CitizenFeedbackView.as_view(), name="community-feedback"),

    # Ground Supervisor vs Authority Officer Governance Inspections
    path("authority/field-inspections/", SupervisorFieldInspectionView.as_view(), name="supervisor-field-inspections"),
    path("authority/field-inspections/<str:inspection_id>/review/", OfficerFieldInspectionReviewView.as_view(), name="officer-field-inspection-review"),

    # Administrator Community & Civic Review Moderation
    path("community/admin/rooms/", AdminDiscussionRoomsManagementView.as_view(), name="admin-discussion-rooms-management"),
    path("community/admin/rooms/<str:room_id>/", AdminDiscussionRoomDetailView.as_view(), name="admin-discussion-room-detail"),
    path("community/admin/messages/", AdminDiscussionMessageModerationView.as_view(), name="admin-discussion-messages-list"),
    path("community/admin/messages/<str:message_id>/", AdminDiscussionMessageModerationView.as_view(), name="admin-discussion-message-moderation"),
    path("community/admin/reviews/", AdminReviewsManagementView.as_view(), name="admin-reviews-management"),
    path("community/admin/reviews/<str:review_id>/", AdminReviewDetailView.as_view(), name="admin-review-detail"),
]
