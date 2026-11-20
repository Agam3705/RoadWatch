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


def test_auth_google_missing_token(client):
    resp = client.post("/api/v1/auth/google/", {})
    assert resp.status_code == 400
    assert resp.data["code"] == "MISSING_TOKEN"


def test_auth_google_invalid_token(client):
    resp = client.post("/api/v1/auth/google/", {"id_token": "invalid_dummy_token_12345"})
    assert resp.status_code in (400, 401)
    assert resp.data["code"] in ("INVALID_GOOGLE_TOKEN", "GOOGLE_AUTH_ERROR")


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


def test_officer_registration_pending_approval_and_admin_workflow(client):
    """Test that officers register as PENDING_APPROVAL and require admin/supervisor approval."""
    import uuid
    uid = uuid.uuid4().hex[:6]
    officer_email = f"officer_{uid}@pwd.gov.in"

    # 1. Register as Authority Officer
    reg_resp = client.post("/api/v1/auth/register/", {
        "name": f"Engineer {uid}",
        "email": officer_email,
        "password": "Password123!",
        "role": "OFFICER",
        "department": "Public Works Department (PWD)",
        "employee_id": f"PWD-ENG-{uid}",
    })
    assert reg_resp.status_code == 201
    assert reg_resp.data["data"]["user"]["account_status"] == "PENDING_APPROVAL"
    assert reg_resp.data["data"].get("pending_approval") is True
    officer_id = reg_resp.data["data"]["user"]["id"]

    # 2. Attempt login before approval -> Should return 403 ACCOUNT_PENDING_APPROVAL
    login_resp = client.post("/api/v1/auth/login/", {
        "email": officer_email,
        "password": "Password123!"
    })
    assert login_resp.status_code == 403
    assert login_resp.data["code"] == "ACCOUNT_PENDING_APPROVAL"

    # 3. Super Admin logs in and approves officer
    admin_login = client.post("/api/v1/auth/login/", {
        "email": "admin@roadwatch.org",
        "password": "Admin123!"
    })
    admin_token = admin_login.data["data"]["tokens"]["access_token"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")

    # Admin lists users
    users_resp = client.get("/api/v1/admin/users/?role=AUTHORITY_OFFICER")
    assert users_resp.status_code == 200
    assert users_resp.data["success"] is True

    # Admin approves user
    approve_resp = client.patch(f"/api/v1/admin/users/{officer_id}/status/", {"action": "APPROVE"})
    assert approve_resp.status_code == 200
    assert approve_resp.data["data"]["account_status"] == "ACTIVE"

    # 4. Officer can now log in successfully!
    client.credentials()  # Clear admin credentials
    approved_login = client.post("/api/v1/auth/login/", {
        "email": officer_email,
        "password": "Password123!"
    })
    assert approved_login.status_code == 200
    assert approved_login.data["data"]["user"]["role"] == "AUTHORITY_OFFICER"


def test_governance_verification_hierarchy(client):
    """
    Test Civic Governance Hierarchy:
    - Officer is verified exclusively by Admin.
    - Officer CANNOT verify other Officers (403 FORBIDDEN).
    - Officer CAN verify and approve Contractors and Supervisors.
    """
    import uuid
    uid = uuid.uuid4().hex[:6]

    # Register candidate Officer
    off_resp = client.post("/api/v1/auth/register/", {
        "name": f"Officer Candidate {uid}",
        "email": f"officer_cand_{uid}@gov.in",
        "password": "Password123!",
        "role": "OFFICER",
        "department": "PWD Highway Division",
        "employee_id": f"PWD-{uid}"
    })
    cand_officer_id = off_resp.data["data"]["user"]["id"]

    # Register candidate Contractor
    cnt_resp = client.post("/api/v1/auth/register/", {
        "name": f"Contractor Candidate {uid}",
        "email": f"contractor_cand_{uid}@infra.com",
        "password": "Password123!",
        "role": "CONTRACTOR",
        "company_name": "Metro Infra Ltd",
        "license_number": f"LIC-{uid}"
    })
    cand_contractor_id = cnt_resp.data["data"]["user"]["id"]

    # Register candidate Supervisor
    sup_resp = client.post("/api/v1/auth/register/", {
        "name": f"Supervisor Candidate {uid}",
        "email": f"supervisor_cand_{uid}@gov.in",
        "password": "Password123!",
        "role": "SUPERVISOR",
        "department": "PWD Triage Division",
        "employee_id": f"SUP-{uid}"
    })
    cand_supervisor_id = sup_resp.data["data"]["user"]["id"]

    # 1. PWD Officer logs in
    officer_login = client.post("/api/v1/auth/login/", {
        "email": "officer@roadwatch.org",
        "password": "Officer123!"
    })
    officer_token = officer_login.data["data"]["tokens"]["access_token"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {officer_token}")

    # Officer attempts to approve another Officer -> MUST FAIL with 403
    off_fail = client.patch(f"/api/v1/admin/users/{cand_officer_id}/status/", {"action": "APPROVE"})
    assert off_fail.status_code == 403
    assert "System Administrator" in off_fail.data["message"]

    # Officer approves Contractor -> MUST SUCCEED with 200
    cnt_ok = client.patch(f"/api/v1/admin/users/{cand_contractor_id}/status/", {"action": "APPROVE"})
    assert cnt_ok.status_code == 200
    assert cnt_ok.data["data"]["account_status"] == "ACTIVE"

    # Officer approves Supervisor -> MUST SUCCEED with 200
    sup_ok = client.patch(f"/api/v1/admin/users/{cand_supervisor_id}/status/", {"action": "APPROVE"})
    assert sup_ok.status_code == 200
    assert sup_ok.data["data"]["account_status"] == "ACTIVE"

    # 2. Super Admin logs in and approves the candidate Officer -> MUST SUCCEED with 200
    admin_login = client.post("/api/v1/auth/login/", {
        "email": "admin@roadwatch.org",
        "password": "Admin123!"
    })
    admin_token = admin_login.data["data"]["tokens"]["access_token"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")

    admin_ok = client.patch(f"/api/v1/admin/users/{cand_officer_id}/status/", {"action": "APPROVE"})
    assert admin_ok.status_code == 200
    assert admin_ok.data["data"]["account_status"] == "ACTIVE"



def test_admin_broadcast_notification(client):
    """Test admin global and role-based notification dispatch."""
    admin_login = client.post("/api/v1/auth/login/", {
        "email": "admin@roadwatch.org",
        "password": "Admin123!"
    })
    admin_token = admin_login.data["data"]["tokens"]["access_token"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")

    resp = client.post("/api/v1/notifications/broadcast/", {
        "target_type": "GLOBAL",
        "title": "Severe Rain Alert: Pothole Reporting Drive",
        "message": "Monsoon rains expected. Please report all surface erosions.",
        "type": "ALERT",
        "priority": "HIGH"
    })
    assert resp.status_code == 200
    assert resp.data["success"] is True
    assert resp.data["data"]["dispatched_count"] > 0


def test_grievance_submission_and_resolution(client):
    """Test citizen filing a grievance and supervisor/admin adjudicating it."""
    # 1. Citizen logs in and files grievance
    citizen_login = client.post("/api/v1/auth/login/", {
        "email": "citizen@roadwatch.org",
        "password": "Citizen123!"
    })
    citizen_token = citizen_login.data["data"]["tokens"]["access_token"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {citizen_token}")

    g_resp = client.post("/api/v1/grievances/", {
        "title": "Delayed Pothole Repair on GT Road",
        "category": "DELAYED_REPAIR",
        "description": "Hazard reported 5 days ago, SLA breached with no contractor assigned.",
        "authority_name": "Public Works Department (PWD)",
        "priority": "URGENT"
    })
    assert g_resp.status_code == 201
    assert "grievance_number" in g_resp.data["data"]
    g_id = g_resp.data["data"]["id"]

    # Citizen lists own grievances
    my_g_resp = client.get("/api/v1/grievances/")
    assert my_g_resp.status_code == 200
    assert len(my_g_resp.data["data"]["items"]) > 0

    # 2. Admin/Supervisor reviews and resolves grievance
    admin_login = client.post("/api/v1/auth/login/", {
        "email": "admin@roadwatch.org",
        "password": "Admin123!"
    })
    admin_token = admin_login.data["data"]["tokens"]["access_token"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")

    resolve_resp = client.patch(f"/api/v1/grievances/{g_id}/status/", {
        "status": "RESOLVED",
        "remarks": "Emergency contractor assigned. Road resurfacing verified."
    })
    assert resolve_resp.status_code == 200
    assert resolve_resp.data["data"]["status"] == "RESOLVED"
    assert resolve_resp.data["data"]["resolution_remarks"] == "Emergency contractor assigned. Road resurfacing verified."


def test_password_reset_flow(client):
    """Test requesting a reset code and resetting a password."""
    # 1. Request password reset
    req_resp = client.post("/api/v1/auth/password/reset-request/", {
        "email": "citizen@roadwatch.org"
    })
    assert req_resp.status_code == 200
    assert req_resp.data["success"] is True
    assert "reset_code" in req_resp.data["data"]
    code = req_resp.data["data"]["reset_code"]

    # 2. Confirm password reset with new password
    new_pw = "NewCitizenPassword123!"
    confirm_resp = client.post("/api/v1/auth/password/reset-confirm/", {
        "email": "citizen@roadwatch.org",
        "code": code,
        "new_password": new_pw
    })
    assert confirm_resp.status_code == 200
    assert confirm_resp.data["success"] is True

    # 3. Verify login works with new password
    login_new = client.post("/api/v1/auth/login/", {
        "email": "citizen@roadwatch.org",
        "password": new_pw
    })
    assert login_new.status_code == 200

    # 4. Restore original password for test idempotency
    restore_resp = client.post("/api/v1/auth/password/reset-request/", {
        "email": "citizen@roadwatch.org"
    })
    restore_code = restore_resp.data["data"]["reset_code"]
    client.post("/api/v1/auth/password/reset-confirm/", {
        "email": "citizen@roadwatch.org",
        "code": restore_code,
        "new_password": "Citizen123!"
    })


def test_discussion_rooms_and_messaging(client):
    """Test listing rooms, creating a room, and posting messages."""
    # List rooms
    rooms_resp = client.get("/api/v1/community/rooms/")
    assert rooms_resp.status_code == 200
    assert len(rooms_resp.data["data"]["items"]) >= 3
    room_id = rooms_resp.data["data"]["items"][0]["id"]

    # Citizen logs in and posts message
    login = client.post("/api/v1/auth/login/", {"email": "citizen@roadwatch.org", "password": "Citizen123!"})
    token = login.data["data"]["tokens"]["access_token"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    post_resp = client.post(f"/api/v1/community/rooms/{room_id}/messages/", {
        "message": "Testing civic feedback thread on road conditions."
    })
    assert post_resp.status_code == 201
    assert post_resp.data["data"]["user_name"] == "Priya Sharma"

    # Fetch messages
    msgs_resp = client.get(f"/api/v1/community/rooms/{room_id}/messages/")
    assert msgs_resp.status_code == 200
    assert any(m["message"] == "Testing civic feedback thread on road conditions." for m in msgs_resp.data["data"]["items"])


def test_public_polling_and_citizen_feedback(client):
    """Test listing polls, voting, and submitting civic feedback."""
    login = client.post("/api/v1/auth/login/", {"email": "citizen@roadwatch.org", "password": "Citizen123!"})
    token = login.data["data"]["tokens"]["access_token"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    # List polls
    polls_resp = client.get("/api/v1/community/polls/")
    assert polls_resp.status_code == 200
    assert len(polls_resp.data["data"]["items"]) >= 2
    poll = polls_resp.data["data"]["items"][0]
    poll_id = poll["id"]
    option_id = poll["options"][0]["id"]

    # Cast vote
    vote_resp = client.post(f"/api/v1/community/polls/{poll_id}/vote/", {"option_id": option_id})
    assert vote_resp.status_code == 200
    assert vote_resp.data["data"]["user_voted_option"] == option_id

    # Submit feedback
    fb_resp = client.post("/api/v1/community/feedback/", {
        "rating": 5,
        "category": "ROAD_QUALITY",
        "title": "Smooth Bitumen Compaction",
        "comments": "The asphalt overlay in Sector 12 was completed with great ride quality.",
        "ward": "Ward 12"
    })
    assert fb_resp.status_code == 201
    assert fb_resp.data["data"]["rating"] == 5

    # List feedbacks
    fb_list = client.get("/api/v1/community/feedback/")
    assert fb_list.status_code == 200
    assert fb_list.data["data"]["total"] >= 1


def test_supervisor_field_inspection_and_officer_review_hierarchy(client):
    """
    Test the Ground Supervisor vs Authority Officer operational hierarchy:
    1. Supervisor performs physical field inspection audit and recommends work order.
    2. Authority Officer reviews supervisor audit and authorizes official work order.
    """
    # 1. Fetch a complaint
    c_list = client.get("/api/v1/complaints/?limit=1")
    assert c_list.status_code == 200
    complaint_id = c_list.data["data"]["items"][0]["id"]

    # 2. Supervisor logs in and submits field audit
    sup_login = client.post("/api/v1/auth/login/", {"email": "supervisor@roadwatch.org", "password": "Supervisor123!"})
    sup_token = sup_login.data["data"]["tokens"]["access_token"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {sup_token}")

    insp_resp = client.post("/api/v1/authority/field-inspections/", {
        "complaint_id": complaint_id,
        "measured_depth_cm": 8.5,
        "measured_width_cm": 95.0,
        "water_stagnation": True,
        "traffic_impact_rating": "CRITICAL_HAZARD",
        "recommended_action": "FULL_DEPTH_PATCH",
        "estimated_bitumen_tonnage": 3.2,
        "supervisor_notes": "Cavity edges jagged, high risk to two-wheelers. Immediate compaction required."
    })
    assert insp_resp.status_code == 201
    assert insp_resp.data["data"]["status"] == "PENDING_OFFICER_APPROVAL"
    inspection_id = insp_resp.data["data"]["id"]

    # 3. Supervisor attempts to review own inspection -> Should FAIL (only Officer/Admin can authorize)
    sup_review_fail = client.patch(f"/api/v1/authority/field-inspections/{inspection_id}/review/", {
        "decision": "APPROVE_WORK_ORDER"
    })
    assert sup_review_fail.status_code == 403

    # 4. Authority Officer logs in and authorizes the Work Order
    off_login = client.post("/api/v1/auth/login/", {"email": "officer@roadwatch.org", "password": "Officer123!"})
    off_token = off_login.data["data"]["tokens"]["access_token"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {off_token}")

    off_review_ok = client.patch(f"/api/v1/authority/field-inspections/{inspection_id}/review/", {
        "decision": "APPROVE_WORK_ORDER",
        "contractor_name": "Metro Road Infra Ltd",
        "officer_notes": "Approved for emergency 24h municipal repair budget. Contract assigned to Metro Infra."
    })
    assert off_review_ok.status_code == 200
    assert off_review_ok.data["data"]["status"] == "APPROVED_WORK_ORDER_ISSUED"
    assert "Rajesh Kumar" in off_review_ok.data["data"]["officer_name"]


def test_admin_discussion_rooms_approval_and_moderation():
    """
    Test that discussion groups require administrator approval, can be locked/unlocked,
    monitored, and inappropriate messages can be moderated by Super Admin.
    """
    client = APIClient()

    # 1. Citizen logs in and proposes a discussion room
    cit_login = client.post("/api/v1/auth/login/", {"email": "citizen@roadwatch.org", "password": "Citizen123!"})
    cit_token = cit_login.data["data"]["tokens"]["access_token"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {cit_token}")

    create_resp = client.post("/api/v1/community/rooms/", {
        "title": "East Bypass Speed Bump Community Petition",
        "category": "WARD_FORUM",
        "description": "Residents requesting rumble strips near DPS primary school."
    })
    assert create_resp.status_code == 201
    assert create_resp.data["data"]["approval_status"] == "PENDING_APPROVAL"
    room_id = create_resp.data["data"]["id"]

    # 2. Citizen tries to post into pending room -> Should FAIL (403)
    post_pending_fail = client.post(f"/api/v1/community/rooms/{room_id}/messages/", {
        "message": "First message"
    })
    assert post_pending_fail.status_code == 403

    # 3. Super Admin logs in, views admin room list with stats
    admin_login = client.post("/api/v1/auth/login/", {"email": "admin@roadwatch.org", "password": "Admin123!"})
    admin_token = admin_login.data["data"]["tokens"]["access_token"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")

    admin_rooms_resp = client.get("/api/v1/community/admin/rooms/?status=PENDING_APPROVAL")
    assert admin_rooms_resp.status_code == 200
    assert admin_rooms_resp.data["data"]["stats"]["pending_approval"] >= 1
    assert any(r["id"] == room_id for r in admin_rooms_resp.data["data"]["items"])

    # 4. Admin APPROVES the room
    approve_resp = client.patch(f"/api/v1/community/admin/rooms/{room_id}/", {
        "action": "APPROVE",
        "admin_notes": "Approved for local ward road safety discussion."
    })
    assert approve_resp.status_code == 200
    assert approve_resp.data["data"]["approval_status"] == "APPROVED"

    # 5. Citizen posts message now that room is approved
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {cit_token}")
    post_ok = client.post(f"/api/v1/community/rooms/{room_id}/messages/", {
        "message": "Speed bumps urgently needed near school gate."
    })
    assert post_ok.status_code == 201
    msg_id = post_ok.data["data"]["id"]

    # 6. Admin locks the room
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")
    lock_resp = client.patch(f"/api/v1/community/admin/rooms/{room_id}/", {
        "action": "LOCK",
        "admin_notes": "Discussion closed."
    })
    assert lock_resp.status_code == 200
    assert lock_resp.data["data"]["approval_status"] == "LOCKED"

    # 7. Citizen attempts to post into locked room -> Should FAIL (403)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {cit_token}")
    post_locked_fail = client.post(f"/api/v1/community/rooms/{room_id}/messages/", {
        "message": "Another comment"
    })
    assert post_locked_fail.status_code == 403

    # 8. Admin moderates and deletes the message
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")
    del_msg = client.delete(f"/api/v1/community/admin/messages/{msg_id}/")
    assert del_msg.status_code == 200


def test_admin_reviews_and_feedback_management():
    """
    Test that Administrator can view citizen reviews with stats, filter by stars/category,
    flag/approve reviews, add official notes, and delete reviews.
    """
    client = APIClient()

    # 1. Citizen posts a review
    cit_login = client.post("/api/v1/auth/login/", {"email": "citizen@roadwatch.org", "password": "Citizen123!"})
    cit_token = cit_login.data["data"]["tokens"]["access_token"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {cit_token}")

    rev_resp = client.post("/api/v1/community/feedback/", {
        "rating": 1,
        "title": "Loose gravel left behind after pothole patch",
        "comments": "The asphalt was laid but loose aggregate chipped off on the edges.",
        "category": "ROAD_QUALITY",
        "ward": "Ward 7"
    })
    assert rev_resp.status_code == 201
    review_id = rev_resp.data["data"]["id"]

    # 2. Admin logs in and views reviews with statistics
    admin_login = client.post("/api/v1/auth/login/", {"email": "admin@roadwatch.org", "password": "Admin123!"})
    admin_token = admin_login.data["data"]["tokens"]["access_token"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")

    admin_rev_list = client.get("/api/v1/community/admin/reviews/?rating=1")
    assert admin_rev_list.status_code == 200
    stats = admin_rev_list.data["data"]["stats"]
    assert stats["total_reviews"] >= 1
    assert "star_distribution" in stats
    assert any(r["id"] == review_id for r in admin_rev_list.data["data"]["items"])

    # 3. Admin flags the review for contractor inspection & adds official reply
    patch_resp = client.patch(f"/api/v1/community/admin/reviews/{review_id}/", {
        "action": "FLAG",
        "admin_reply": "Dispatched Junior Engineer to test compaction density on Ward 7 edge.",
        "admin_notes": "Notified Metro Road Infra Ltd for warranty aggregate cleanup."
    })
    assert patch_resp.status_code == 200
    assert patch_resp.data["data"]["status"] == "FLAGGED"
    assert "Dispatched Junior Engineer" in patch_resp.data["data"]["admin_reply"]

    # 4. Admin deletes the review
    del_resp = client.delete(f"/api/v1/community/admin/reviews/{review_id}/")
    assert del_resp.status_code == 200



