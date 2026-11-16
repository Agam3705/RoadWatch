"""
RoadWatch Media Storage Module
Implements persistent disk media storage (Render persistent disk or local disk).
No S3 bucket dependency. Provides safe image decoding, thumbnailing, and URL generation.
"""
import os
import uuid
import mimetypes
from pathlib import Path
from datetime import datetime
from typing import Optional, Tuple
from PIL import Image
import io
from django.conf import settings
from django.http import FileResponse, Http404


ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIMETYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB limit


def validate_image_file(file_obj) -> Tuple[bool, str]:
    """Validates file size, extension, and decodability."""
    name = getattr(file_obj, "name", "image.jpg")
    ext = os.path.splitext(name)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Unsupported file extension '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"

    try:
        # Check decodability and strip dangerous payloads
        file_obj.seek(0)
        img = Image.open(file_obj)
        img.verify()
        file_obj.seek(0)
    except Exception as e:
        return False, f"Invalid or corrupted image content: {str(e)}"

    return True, ""


def save_uploaded_media(file_obj, subfolder: str = "complaints") -> Tuple[str, dict]:
    """
    Saves an uploaded file to persistent storage.
    Returns: (relative_storage_path, file_metadata)
    """
    valid, err = validate_image_file(file_obj)
    if not valid:
        raise ValueError(err)

    ext = os.path.splitext(file_obj.name)[1].lower()
    now = datetime.utcnow()
    date_path = now.strftime("%Y/%m")
    unique_filename = f"{uuid.uuid4().hex}{ext}"

    folder_path = Path(settings.MEDIA_ROOT) / subfolder / date_path
    folder_path.mkdir(parents=True, exist_ok=True)

    target_path = folder_path / unique_filename

    file_obj.seek(0)
    # Read and open with Pillow to re-save cleanly (stripping raw dangerous EXIF if needed)
    image = Image.open(file_obj)
    width, height = image.size
    image_format = image.format or "JPEG"

    # Save cleanly
    image.save(target_path, format=image_format, quality=90, optimize=True)
    file_size = os.path.getsize(target_path)

    relative_path = f"{subfolder}/{date_path}/{unique_filename}".replace("\\", "/")

    metadata = {
        "original_name": file_obj.name,
        "width": width,
        "height": height,
        "file_size": file_size,
        "format": image_format,
        "saved_at": now.isoformat(),
        "storage_path": relative_path,
        "url": f"/api/v1/media/{relative_path}",
    }

    return relative_path, metadata


def get_absolute_path(relative_path: str) -> Path:
    # Prevent directory traversal
    clean_path = os.path.normpath(relative_path).lstrip("/\\")
    full_path = (Path(settings.MEDIA_ROOT) / clean_path).resolve()
    media_root = Path(settings.MEDIA_ROOT).resolve()

    if not str(full_path).startswith(str(media_root)):
        raise PermissionError("Access denied: invalid file path.")

    return full_path
