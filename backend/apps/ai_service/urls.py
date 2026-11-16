from django.urls import path
from apps.ai_service.views import (
    AIJobDetailView, ComplaintPredictionsView, PredictionReviewView, AIGovernanceView
)

urlpatterns = [
    path("ai/jobs/<str:job_id>/", AIJobDetailView.as_view(), name="ai-job-detail"),
    path("complaints/<str:complaint_id>/predictions/", ComplaintPredictionsView.as_view(), name="complaint-predictions"),
    path("ai/predictions/<str:prediction_id>/review/", PredictionReviewView.as_view(), name="ai-prediction-review"),
    path("admin/ai-governance/", AIGovernanceView.as_view(), name="admin-ai-governance"),
]
