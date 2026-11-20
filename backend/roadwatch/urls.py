"""
RoadWatch Primary URL Configuration
All APIs are versioned under /api/v1/ as required by PRD Section 12.1.
"""
from django.urls import path, include
from apps.core.views import HealthCheckView, MediaServeView

urlpatterns = [
    # Core Health & Media
    path("api/v1/health/", HealthCheckView.as_view(), name="health-check"),
    path("api/v1/media/<path:file_path>", MediaServeView.as_view(), name="media-serve"),

    # Application Modules
    path("api/v1/", include("apps.authentication.urls")),
    path("api/v1/", include("apps.complaints.urls")),
    path("api/v1/", include("apps.geospatial.urls")),
    path("api/v1/", include("apps.ai_service.urls")),
    path("api/v1/", include("apps.maintenance.urls")),
    path("api/v1/", include("apps.analytics.urls")),
    path("api/v1/", include("apps.notifications.urls")),
    path("api/v1/", include("apps.grievances.urls")),
    path("api/v1/", include("apps.community.urls")),
]
