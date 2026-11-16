"""
RoadWatch Core Views
Health checks and persistent media streaming.
"""
import mimetypes
from pathlib import Path
from django.http import FileResponse, Http404
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework import status
from django.conf import settings

from apps.core.db import get_mongo_client, init_indexes
from apps.core.utils import api_success, api_error
from apps.core.storage import get_absolute_path


class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        db_status = "HEALTHY"
        try:
            client = get_mongo_client()
            client.admin.command("ping")
        except Exception as e:
            db_status = f"UNHEALTHY ({str(e)})"

        media_status = "WRITABLE" if Path(settings.MEDIA_ROOT).is_dir() else "NOT_FOUND"

        return api_success({
            "status": "UP" if db_status == "HEALTHY" else "DEGRADED",
            "service": "RoadWatch Django API",
            "database": db_status,
            "media_storage": media_status,
            "version": "2026.11.1-prod",
        })


class MediaServeView(APIView):
    """Safely streams media from persistent storage disk."""
    permission_classes = [AllowAny]

    def get(self, request, file_path):
        try:
            abs_path = get_absolute_path(file_path)
            if not abs_path.is_file():
                raise Http404("Media file not found.")

            content_type, _ = mimetypes.guess_type(str(abs_path))
            return FileResponse(open(abs_path, "rb"), content_type=content_type or "image/jpeg")
        except Exception:
            raise Http404("Media file not found or invalid.")
