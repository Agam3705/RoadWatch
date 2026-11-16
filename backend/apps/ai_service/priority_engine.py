"""
RoadWatch Decision Intelligence - Priority & Escalation Engine
Calculates explainable priority recommendation score based on PRD Section 7.5:
P = 0.35S + 0.25T + 0.20V + 0.20R
Where:
S = Assessed damage severity (0 - 100)
T = Road importance / classification (0 - 100)
V = Proximity to vulnerable infrastructure (0 - 100)
R = Independent corroboration / citizen support (0 - 100)
"""
from datetime import datetime
from typing import Dict, Any, Optional

PRIORITY_FORMULA_VERSION = "priority-v1.0"

ROAD_IMPORTANCE_MAP = {
    "EXPRESSWAY": 100.0,
    "HIGHWAY": 95.0,
    "ARTERIAL": 85.0,
    "COLLECTOR": 65.0,
    "LOCAL": 40.0,
    "RESIDENTIAL": 35.0,
    "ALLEY": 20.0,
    "OTHER": 25.0,
}

SEVERITY_SCORE_MAP = {
    "CRITICAL": 95.0,
    "HIGH": 75.0,
    "MEDIUM": 50.0,
    "LOW": 25.0,
}


def calculate_priority_score(
    severity_level: str = "MEDIUM",
    road_type: str = "LOCAL",
    is_near_vulnerable_infrastructure: bool = False,
    support_count: int = 0,
    emergency_override: bool = False,
) -> Dict[str, Any]:
    # 1. Damage Severity (S)
    s = SEVERITY_SCORE_MAP.get(severity_level.upper(), 50.0)

    # 2. Road Importance (T)
    t = ROAD_IMPORTANCE_MAP.get(road_type.upper(), 40.0)

    # 3. Vulnerability Proximity (V)
    v = 85.0 if is_near_vulnerable_infrastructure else 30.0

    # 4. Corroboration (R)
    # 1 citizen report = 20, 2 = 40, 3 = 60, 4 = 80, 5+ = 100
    r = min(100.0, max(20.0, float(support_count + 1) * 20.0))

    # Calculate weighted score
    raw_score = (0.35 * s) + (0.25 * t) + (0.20 * v) + (0.20 * r)
    score = round(min(100.0, max(0.0, raw_score)), 1)

    # Priority Band Assignment
    if score >= 85.0:
        band = "CRITICAL"
    elif score >= 70.0:
        band = "HIGH"
    elif score >= 45.0:
        band = "MEDIUM"
    else:
        band = "LOW"

    # Emergency escalation check
    is_emergency = emergency_override or (s >= 90.0 and t >= 80.0)

    return {
        "score": score,
        "band": band,
        "is_emergency": is_emergency,
        "formula_version": PRIORITY_FORMULA_VERSION,
        "calculated_at": datetime.utcnow().isoformat(),
        "components": {
            "severity_score": s,
            "severity_level": severity_level,
            "road_importance_score": t,
            "road_type": road_type,
            "vulnerability_score": v,
            "corroboration_score": r,
            "support_count": support_count,
        },
        "weights": {
            "severity": 0.35,
            "road_importance": 0.25,
            "vulnerability": 0.20,
            "corroboration": 0.20,
        },
    }
