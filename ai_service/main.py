"""
RoadWatch AI Service - FastAPI Application
Provides endpoints for road damage inference, image quality checks, and health monitoring.
"""
import uuid
import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from quality import assess_image_quality
from detector import detect_road_damage, MODEL_NAME, MODEL_VERSION

app = FastAPI(
    title="RoadWatch AI Damage Detection Service",
    version=MODEL_VERSION,
    description="Microservice for automated road infrastructure damage classification and severity estimation."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "RoadWatch AI Service",
        "model_name": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "supported_classes": [
            "POTHOLE", "LONGITUDINAL_CRACK", "ALLIGATOR_CRACK", 
            "RUTTING", "SUBSIDENCE", "DEBRIS"
        ],
    }


@app.post("/predict")
async def predict_damage(
    file: UploadFile = File(...),
    job_id: Optional[str] = Form(None),
):
    if not job_id:
        job_id = f"ai-job-{uuid.uuid4().hex[:12]}"

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty image payload received.")

    np_arr = np.frombuffer(content, np.uint8)
    image_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if image_bgr is None:
        return {
            "job_id": job_id,
            "status": "FAILED",
            "model_name": MODEL_NAME,
            "model_version": MODEL_VERSION,
            "error": "Failed to decode image. Unsupported format or corrupted file.",
            "image_quality": {"suitable": False, "flags": ["CORRUPTED_FILE"]},
            "predictions": [],
            "geometry": [],
            "severity_estimate": {"level": "LOW", "score": 0.0},
            "processing_ms": 0,
            "warnings": ["Image cannot be decoded by OpenCV."],
        }

    # 1. Image Quality Assessment
    quality_result = assess_image_quality(image_bgr)

    # 2. Defect Detection
    detection_result = detect_road_damage(image_bgr)

    warnings = list(detection_result.get("warnings", []))
    if not quality_result["suitable"]:
        warnings.append(f"Image quality is suboptimal: {', '.join(quality_result['flags'])}")

    return {
        "job_id": job_id,
        "status": "COMPLETED",
        "model_name": detection_result["model_name"],
        "model_version": detection_result["model_version"],
        "image_quality": quality_result,
        "predictions": detection_result["predictions"],
        "geometry": detection_result["geometry"],
        "severity_estimate": detection_result["severity_estimate"],
        "processing_ms": detection_result["processing_ms"],
        "warnings": warnings,
    }


@app.post("/validate-image")
async def validate_image(file: UploadFile = File(...)):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty image payload received.")

    np_arr = np.frombuffer(content, np.uint8)
    image_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if image_bgr is None:
        return {
            "valid": False,
            "error": "Cannot decode image file",
            "suitable": False,
            "flags": ["CORRUPTED_FILE"]
        }

    quality = assess_image_quality(image_bgr)
    return {
        "valid": True,
        "suitable": quality["suitable"],
        "quality_score": quality["quality_score"],
        "flags": quality["flags"],
        "resolution": quality["resolution"],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
