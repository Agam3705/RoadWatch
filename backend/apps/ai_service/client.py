"""
RoadWatch AI Service Client
Handles communication with FastAPI AI service with seamless fallback to in-process OpenCV detector.
Persists results in ai_jobs and ai_predictions collections.
"""
import os
import time
import uuid
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

import httpx
from django.conf import settings
from apps.core.db import ai_jobs_col, ai_predictions_col, parse_object_id, serialize_doc
from apps.core.storage import get_absolute_path

logger = logging.getLogger(__name__)


def run_local_vision_analysis(abs_image_path: str, job_id: str) -> Dict[str, Any]:
    """Runs computer vision detector in-process when microservice is offline."""
    import cv2
    from ai_service.quality import assess_image_quality
    from ai_service.detector import detect_road_damage, MODEL_NAME, MODEL_VERSION

    img = cv2.imread(abs_image_path)
    if img is None:
        return {
            "job_id": job_id,
            "status": "FAILED",
            "model_name": MODEL_NAME,
            "model_version": MODEL_VERSION,
            "error": "Failed to read image file from disk.",
            "predictions": [],
            "geometry": [],
            "image_quality": {"suitable": False, "flags": ["UNREADABLE"]},
            "severity_estimate": {"level": "LOW", "score": 25.0},
            "processing_ms": 0,
            "warnings": ["Local fallback failed to read image."],
        }

    quality = assess_image_quality(img)
    detection = detect_road_damage(img)

    return {
        "job_id": job_id,
        "status": "COMPLETED",
        "model_name": detection["model_name"],
        "model_version": detection["model_version"],
        "image_quality": quality,
        "predictions": detection["predictions"],
        "geometry": detection["geometry"],
        "severity_estimate": detection["severity_estimate"],
        "processing_ms": detection["processing_ms"],
        "warnings": detection.get("warnings", []),
    }


def analyze_complaint_image(
    complaint_id: str,
    image_id: str,
    relative_storage_path: str,
) -> Dict[str, Any]:
    """
    Main orchestration entrypoint to analyze a complaint image.
    Creates an ai_job record, executes inference via microservice or fallback,
    and records the ai_prediction.
    """
    job_id = f"job-{uuid.uuid4().hex[:12]}"
    now = datetime.utcnow()

    # 1. Register queued AI job
    job_doc = {
        "job_id": job_id,
        "complaint_id": str(complaint_id),
        "image_id": str(image_id),
        "status": "PROCESSING",
        "queued_at": now,
        "completed_at": None,
        "error": None,
    }
    ai_jobs_col().insert_one(job_doc)

    abs_path = str(get_absolute_path(relative_storage_path))

    inference_result: Optional[Dict[str, Any]] = None

    # 2. Try HTTP call to FastAPI AI microservice
    try:
        url = f"{settings.AI_SERVICE_URL.rstrip('/')}/predict"
        with open(abs_path, "rb") as f:
            files = {"file": (os.path.basename(abs_path), f, "image/jpeg")}
            data = {"job_id": job_id}
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(url, files=files, data=data)
                if resp.status_code == 200:
                    inference_result = resp.json()
    except Exception as e:
        logger.info(f"AI Service HTTP endpoint not responding ({e}). Using in-process vision fallback.")

    # 3. Fallback to local detector if microservice failed or was unreachable
    if not inference_result or inference_result.get("status") != "COMPLETED":
        inference_result = run_local_vision_analysis(abs_path, job_id)

    completed_at = datetime.utcnow()
    is_completed = inference_result.get("status") == "COMPLETED"

    # 4. Update ai_jobs document
    ai_jobs_col().update_one(
        {"job_id": job_id},
        {
            "$set": {
                "status": "COMPLETED" if is_completed else "FAILED",
                "completed_at": completed_at,
                "model_version": inference_result.get("model_version"),
                "error": inference_result.get("error"),
            }
        }
    )

    # 5. Persist prediction in ai_predictions collection
    pred_doc = {
        "job_id": job_id,
        "complaint_id": str(complaint_id),
        "image_id": str(image_id),
        "model_name": inference_result.get("model_name"),
        "model_version": inference_result.get("model_version"),
        "predictions": inference_result.get("predictions", []),
        "geometry": inference_result.get("geometry", []),
        "image_quality": inference_result.get("image_quality", {}),
        "severity_estimate": inference_result.get("severity_estimate", {}),
        "processing_ms": inference_result.get("processing_ms", 0),
        "warnings": inference_result.get("warnings", []),
        "human_review": {
            "status": "PENDING_REVIEW",  # PENDING_REVIEW, ACCEPTED, MODIFIED, DISMISSED
            "reviewed_by": None,
            "reviewed_at": None,
            "corrected_category": None,
            "corrected_severity": None,
            "comments": None,
        },
        "created_at": completed_at,
    }
    ai_predictions_col().insert_one(pred_doc)

    return serialize_doc(pred_doc)
