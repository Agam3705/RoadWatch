from django.urls import path
from apps.community.views import (
    DiscussionRoomsListView, DiscussionRoomMessagesView,
    PollsListView, PollVoteView, CitizenFeedbackView,
    SupervisorFieldInspectionView, OfficerFieldInspectionReviewView
)

urlpatterns = [
    # Discussion Rooms
    path("community/rooms/", DiscussionRoomsListView.as_view(), name="community-rooms-list"),
    path("community/rooms/<str:room_id>/messages/", DiscussionRoomMessagesView.as_view(), name="community-room-messages"),

    # Public Review Polling & Civic Feedback
    path("community/polls/", PollsListView.as_view(), name="community-polls-list"),
    path("community/polls/<str:poll_id>/vote/", PollVoteView.as_view(), name="community-poll-vote"),
    path("community/feedback/", CitizenFeedbackView.as_view(), name="community-feedback"),

    # Ground Supervisor vs Authority Officer Governance Inspections
    path("authority/field-inspections/", SupervisorFieldInspectionView.as_view(), name="supervisor-field-inspections"),
    path("authority/field-inspections/<str:inspection_id>/review/", OfficerFieldInspectionReviewView.as_view(), name="officer-field-inspection-review"),
]
