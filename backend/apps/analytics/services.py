"""
RoadWatch Analytics Domain Services
Calculates Road Quality Index (RQI), contractor performance metrics, and area indicators.
PRD Section 7.6 Formula:
RQI = 100 - (0.40D + 0.25U + 0.20F + 0.15A)
Where:
D = Normalized damage burden (0 - 100)
U = Unresolved issue burden (0 - 100)
F = Recurrence frequency (0 - 100)
A = Age of unresolved complaints (0 - 100)
"""
from datetime import datetime, timedelta
from typing import Dict, Any, List
from apps.core.db import (
    roads_col, complaints_col, maintenance_tasks_col,
    verifications_col, organizations_col, parse_object_id, serialize_doc
)

RQI_FORMULA_VERSION = "rqi-v1.0"


def calculate_road_quality_index(road_id: str) -> Dict[str, Any]:
    obj_id = parse_object_id(road_id)
    road = roads_col().find_one({"_id": obj_id})
    if not road:
        return {"error": "Road not found."}

    complaints = list(complaints_col().find({"road_id": str(road_id)}))
    total_count = len(complaints)

    if total_count == 0:
        return {
            "road_id": str(road_id),
            "road_name": road.get("name", "Unnamed Road"),
            "road_type": road.get("road_type", "LOCAL"),
            "rqi_score": 100.0,
            "condition_band": "EXCELLENT",
            "formula_version": RQI_FORMULA_VERSION,
            "total_defects": 0,
            "open_defects": 0,
            "components": {"damage_burden": 0, "unresolved_burden": 0, "recurrence": 0, "age_burden": 0},
            "data_coverage": "NO_REPORTED_DEFECTS",
        }

    open_complaints = [c for c in complaints if c.get("status") not in ("RESOLVED", "REJECTED", "CLOSED")]
    open_count = len(open_complaints)

    # 1. Damage Burden (D): Normalized severity of defects
    sev_weights = {"CRITICAL": 100, "HIGH": 75, "MEDIUM": 50, "LOW": 25}
    total_sev_points = sum(sev_weights.get(c.get("citizen_severity", "MEDIUM"), 50) for c in complaints)
    d = min(100.0, (total_sev_points / max(1, total_count * 100)) * 100.0)

    # 2. Unresolved Burden (U): Ratio of open defects
    u = min(100.0, (open_count / max(1, total_count)) * 100.0)

    # 3. Recurrence Frequency (F): Repeated defects on same road
    f = min(100.0, max(0.0, (total_count - 1) * 20.0))

    # 4. Age of Unresolved Defects (A)
    now = datetime.utcnow()
    total_age_days = 0
    for c in open_complaints:
        created = c.get("created_at") or now
        age_days = (now - created).days if isinstance(created, datetime) else 5
        total_age_days += age_days

    avg_age = total_age_days / max(1, open_count) if open_count > 0 else 0
    a = min(100.0, (avg_age / 30.0) * 100.0)  # >30 days backlog = 100% burden

    # RQI calculation
    raw_deduction = (0.40 * d) + (0.25 * u) + (0.20 * f) + (0.15 * a)
    score = round(max(10.0, min(100.0, 100.0 - raw_deduction)), 1)

    if score >= 80.0:
        band = "GOOD"
    elif score >= 60.0:
        band = "FAIR"
    elif score >= 40.0:
        band = "POOR"
    else:
        band = "CRITICAL"

    return {
        "road_id": str(road_id),
        "road_name": road.get("name", "Unnamed Road"),
        "road_type": road.get("road_type", "LOCAL"),
        "jurisdiction_id": str(road.get("jurisdiction_id", "")),
        "rqi_score": score,
        "condition_band": band,
        "formula_version": RQI_FORMULA_VERSION,
        "total_defects": total_count,
        "open_defects": open_count,
        "resolved_defects": total_count - open_count,
        "components": {
            "damage_burden_D": round(d, 1),
            "unresolved_burden_U": round(u, 1),
            "recurrence_F": round(f, 1),
            "age_burden_A": round(a, 1),
            "avg_unresolved_age_days": round(avg_age, 1),
        },
        "weights": {"D": 0.40, "U": 0.25, "F": 0.20, "A": 0.15},
        "calculated_at": now.isoformat(),
    }


def get_contractor_kpis(contractor_org_id: str) -> Dict[str, Any]:
    tasks = list(maintenance_tasks_col().find({"contractor_org_id": str(contractor_org_id)}))
    total_assigned = len(tasks)

    if total_assigned == 0:
        return {
            "contractor_org_id": str(contractor_org_id),
            "total_assigned": 0,
            "completed_count": 0,
            "on_time_completion_pct": 100.0,
            "avg_days_to_complete": 0.0,
            "verification_acceptance_pct": 100.0,
            "rework_rate_pct": 0.0,
        }

    completed_tasks = [t for t in tasks if t.get("status") in ("VERIFIED", "COMPLETION_SUBMITTED")]
    verified_tasks = [t for t in tasks if t.get("status") == "VERIFIED"]
    rework_tasks = [t for t in tasks if t.get("status") == "REWORK_REQUIRED"]

    on_time_count = 0
    total_completion_days = 0

    for t in completed_tasks:
        created = t.get("created_at")
        completion = t.get("completion_submitted_at") or t.get("verified_at")
        deadline = t.get("deadline")

        if created and completion and isinstance(created, datetime) and isinstance(completion, datetime):
            days = (completion - created).total_seconds() / 86400.0
            total_completion_days += days

        if deadline and completion and isinstance(deadline, datetime) and isinstance(completion, datetime):
            if completion <= deadline:
                on_time_count += 1
        else:
            on_time_count += 1

    completed_len = len(completed_tasks)
    avg_days = round(total_completion_days / max(1, completed_len), 1)
    on_time_pct = round((on_time_count / max(1, completed_len)) * 100.0, 1)

    reviewed_len = len(verified_tasks) + len(rework_tasks)
    acceptance_pct = round((len(verified_tasks) / max(1, reviewed_len)) * 100.0, 1) if reviewed_len > 0 else 100.0
    rework_pct = round((len(rework_tasks) / max(1, reviewed_len)) * 100.0, 1) if reviewed_len > 0 else 0.0

    return {
        "contractor_org_id": str(contractor_org_id),
        "total_assigned": total_assigned,
        "completed_count": completed_len,
        "verified_count": len(verified_tasks),
        "rework_count": len(rework_tasks),
        "on_time_completion_pct": on_time_pct,
        "avg_days_to_complete": avg_days,
        "verification_acceptance_pct": acceptance_pct,
        "rework_rate_pct": rework_pct,
    }
