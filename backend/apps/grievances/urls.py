from django.urls import path
from apps.grievances.views import (
    GrievanceListCreateView,
    GrievanceDetailView,
    GrievanceStatusUpdateView,
)

urlpatterns = [
    path("grievances/", GrievanceListCreateView.as_view(), name="grievances-list-create"),
    path("grievances/<str:grievance_id>/", GrievanceDetailView.as_view(), name="grievance-detail"),
    path("grievances/<str:grievance_id>/status/", GrievanceStatusUpdateView.as_view(), name="grievance-status-update"),
]
