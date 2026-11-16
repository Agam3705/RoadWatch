from django.urls import path
from apps.complaints.views import (
    ComplaintListCreateView, ComplaintDetailView, ComplaintHistoryView,
    ComplaintSupportView, ComplaintReviewView, ComplaintReopenView,
    ComplaintDuplicateCandidatesView, ComplaintDuplicateLinkView,
    ComplaintUploadImageView
)

urlpatterns = [
    path("complaints/", ComplaintListCreateView.as_view(), name="complaint-list-create"),
    path("complaints/<str:complaint_id>/", ComplaintDetailView.as_view(), name="complaint-detail"),
    path("complaints/<str:complaint_id>/history/", ComplaintHistoryView.as_view(), name="complaint-history"),
    path("complaints/<str:complaint_id>/support/", ComplaintSupportView.as_view(), name="complaint-support"),
    path("complaints/<str:complaint_id>/review/", ComplaintReviewView.as_view(), name="complaint-review"),
    path("complaints/<str:complaint_id>/reopen/", ComplaintReopenView.as_view(), name="complaint-reopen"),
    path("complaints/<str:complaint_id>/duplicate-candidates/", ComplaintDuplicateCandidatesView.as_view(), name="complaint-duplicate-candidates"),
    path("complaints/<str:complaint_id>/duplicate-links/", ComplaintDuplicateLinkView.as_view(), name="complaint-duplicate-links"),
    path("complaints/<str:complaint_id>/images/", ComplaintUploadImageView.as_view(), name="complaint-upload-image"),
]
