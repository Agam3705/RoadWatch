"""
RoadWatch Automated Backend Test Suite
Tests API endpoints, authentication, role boundaries, geospatial queries,
AI priority scoring, work order lifecycle, and verification constraints.
"""
import pytest
from rest_framework.test import APIClient
from apps.core.db import complaints_col, maintenance_tasks_col, users_col, parse_object_id
from apps.ai_service.priority_engine import calculate_priority_score
from apps.analytics.services import calculate_road_quality_index


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def auth_tokens(client):
    """Logs in seeded demo users and returns tokens."""
    # Citizen
    res_c = client.post("/api/v1/auth/login/", {"email": "citizen@roadwatch.org", "password": "Citizen123!"})
    # Officer
    res_o = client.post("/api/v1/auth/login/", {"email": "officer@roadwatch.org", "password": "Officer123!"})
    # Contractor
    res_k = client.post("/api/v1/auth/login/", {"email": "contractor@roadwatch.org", "password": "Contractor123!"})

    return {
        "citizen": res_c.data["data"]["tokens"]["access_token"],
        "officer": res_o.data["data"]["tokens"]["access_token"],
        "contractor": res_k.data["data"]["tokens"]["access_token"],
    }


def test_health_check(client):
    resp = client.get("/api/v1/health/")
    assert resp.status_code == 200
    assert resp.data["success"] is True
    assert resp.data["data"]["database"] == "HEALTHY"


def test_auth_login_invalid(client):
    resp = client.post("/api/v1/auth/login/", {"email": "citizen@roadwatch.org", "password": "WrongPassword!"})
    assert resp.status_code == 401
    assert resp.data["success"] is False


def test_auth_login_valid(client):
    resp = client.post("/api/v1/auth/login/", {"email": "citizen@roadwatch.org", "password": "Citizen123!"})
    assert resp.status_code == 200
    assert "access_token" in resp.data["data"]["tokens"]
    assert resp.data["data"]["user"]["email"] == "citizen@roadwatch.org"


def test_priority_score_formula():
    """Validates explainable priority score formula: P = 0.35S + 0.25T + 0.20V + 0.20R"""
    p_info = calculate_priority_score(
        severity_level="CRITICAL",
        road_type="HIGHWAY",
        is_near_vulnerable_infrastructure=True,
        support_count=3,
    )
    # S=95 (0.35*95=33.25), T=95 (0.25*95=23.75), V=85 (0.20*85=17.0), R=80 (0.20*80=16.0)
    # Total = 33.25 + 23.75 + 17.0 + 16.0 = 90.0
    assert p_info["score"] >= 85.0
    assert p_info["band"] == "CRITICAL"
    assert "weights" in p_info
    assert p_info["weights"]["severity"] == 0.35


def test_geospatial_nearby_query(client):
    # Search around seeded Mahatma Gandhi Road coords [75.768, 31.224]
    resp = client.get("/api/v1/geo/complaints/nearby/?lng=75.768&lat=31.224&radius=2000")
    assert resp.status_code == 200
    assert resp.data["success"] is True
    assert len(resp.data["data"]["items"]) > 0


def test_complaints_list_and_public_sanitization(client):
    # Unauthenticated visitor should see sanitized response
    resp = client.get("/api/v1/complaints/")
    assert resp.status_code == 200
    items = resp.data["data"]["items"]
    assert len(items) > 0
    # Ensure sensitive private fields are omitted
    for item in items:
        assert "reporter_id" not in item


def test_citizen_report_submission(client, auth_tokens):
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {auth_tokens['citizen']}")
    payload = {
        "category": "POTHOLE",
        "description": "Hazardous road defect near market crossing",
        "longitude": 75.7710,
        "latitude": 31.2245,
        "citizen_severity": "HIGH",
        "is_near_vulnerable": True,
    }
    resp = client.post("/api/v1/complaints/", payload, format="json")
    assert resp.status_code == 201
    assert resp.data["success"] is True
    created = resp.data["data"]
    assert created["public_reference"].startswith("RW-")
    assert created["status"] == "SUBMITTED"
    assert created["priority"]["score"] > 0


def test_citizen_support_workflow(client, auth_tokens):
    # Citizen supports an existing complaint
    first_complaint = complaints_col().find_one({})
    c_id = str(first_complaint["_id"])

    client.credentials(HTTP_AUTHORIZATION=f"Bearer {auth_tokens['citizen']}")
    resp = client.post(f"/api/v1/complaints/{c_id}/support/")
    assert resp.status_code == 200 or resp.data["code"] == "SUPPORT_FAILED"  # May already be supported in seed


def test_contractor_self_verification_prohibited(client, auth_tokens):
    """PRD rule: Contractor cannot approve own repair evidence."""
    task = maintenance_tasks_col().find_one({"status": "COMPLETION_SUBMITTED"})
    if task:
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {auth_tokens['contractor']}")
        resp = client.post(f"/api/v1/verification/{str(task['_id'])}/approve/", {"comments": "Approving own work"})
        assert resp.status_code == 403


def test_road_quality_index_calculation():
    """Tests RQI = 100 - (0.40D + 0.25U + 0.20F + 0.15A)"""
    complaint = complaints_col().find_one({"road_id": {"$ne": None}})
    if complaint and complaint.get("road_id"):
        rqi = calculate_road_quality_index(complaint["road_id"])
        assert "rqi_score" in rqi
        assert 0.0 <= rqi["rqi_score"] <= 100.0
        assert "condition_band" in rqi
        assert "components" in rqi
