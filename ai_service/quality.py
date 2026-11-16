"""
RoadWatch AI Service - Image Quality Assessment Module
Checks for blurriness, darkness, overexposure, and basic dimensional validity.
"""
from typing import Dict, Any, List
import cv2
import numpy as np


def assess_image_quality(image_bgr: np.ndarray) -> Dict[str, Any]:
    flags: List[str] = []
    height, width = image_bgr.shape[:2]

    if height < 100 or width < 100:
        flags.append("LOW_RESOLUTION")

    # Convert to grayscale for analysis
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)

    # 1. Blur assessment via Laplacian variance
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    is_blurry = laplacian_var < 75.0
    if is_blurry:
        flags.append("BLURRY")

    # 2. Lighting / Exposure assessment
    mean_intensity = float(np.mean(gray))
    is_dark = mean_intensity < 35.0
    is_washed_out = mean_intensity > 235.0

    if is_dark:
        flags.append("TOO_DARK")
    elif is_washed_out:
        flags.append("TOO_BRIGHT")

    # 3. Overall quality score calculation (0 - 100)
    quality_score = 100.0
    if is_blurry:
        quality_score -= 35.0
    if is_dark or is_washed_out:
        quality_score -= 35.0
    if "LOW_RESOLUTION" in flags:
        quality_score -= 20.0

    # Bounded between 10.0 and 100.0
    quality_score = max(10.0, min(100.0, quality_score))
    suitable_for_inference = len(flags) == 0 or (len(flags) == 1 and not is_dark)

    return {
        "suitable": suitable_for_inference,
        "quality_score": round(quality_score, 1),
        "blur_score": round(laplacian_var, 2),
        "brightness": round(mean_intensity, 2),
        "flags": flags,
        "resolution": f"{width}x{height}",
    }
