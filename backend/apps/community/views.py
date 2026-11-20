"""
RoadWatch Community Views
Provides Discussion Rooms, Public Review Polling, Civic Feedback Center,
and Ground Supervisor Field Inspection Audits reviewed by Authority Officers.
"""
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from bson import ObjectId
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework import status

from apps.core.db import (
    discussion_rooms_col, discussion_messages_col, polls_col, poll_votes_col,
    citizen_feedbacks_col, field_inspections_col, complaints_col,
    maintenance_tasks_col, users_col, parse_object_id, serialize_doc
)
from apps.core.utils import api_success, api_error, record_audit_log, send_notification
from apps.core.permissions import IsAuthenticatedMongo, IsAuthorityOfficer


# --- Helper: Seed initial discussion rooms and polls if collection is empty ---
def _ensure_default_community_content():
    r_col = discussion_rooms_col()
    if r_col.count_documents({}) == 0:
        now = datetime.now(timezone.utc)
        default_rooms = [
            {
                "title": "Ward 12 - Civic Highway & Road Safety Forum",
                "slug": "ward-12-forum",
                "category": "WARD_FORUM",
                "description": "Public community discussion on road quality, potholes, and traffic safety in Ward 12.",
                "is_public": True,
                "created_by": "SYSTEM",
                "created_at": now,
                "message_count": 3,
            },
            {
                "title": "Monsoon Defect Triage & Emergency Updates",
                "slug": "monsoon-triage",
                "category": "EMERGENCY_TRIAGE",
                "description": "Live communication channel for hazardous cave-ins, waterlogged roads, and immediate supervisor dispatches.",
                "is_public": True,
                "created_by": "SYSTEM",
                "created_at": now,
                "message_count": 2,
            },
            {
                "title": "Contractor & Municipal Operations Hub",
                "slug": "contractor-ops",
                "category": "CONTRACTOR_HUB",
                "description": "Operational coordination between PWD officers, ground supervisors, and verified maintenance contractors.",
                "is_public": True,
                "created_by": "SYSTEM",
                "created_at": now,
                "message_count": 2,
            },
        ]
        inserted = r_col.insert_many(default_rooms)
        room_ids = inserted.inserted_ids

        # Seed initial messages
        m_col = discussion_messages_col()
        m_col.insert_many([
            {
                "room_id": str(room_ids[0]),
                "user_name": "Priya Sharma",
                "user_role": "CITIZEN",
                "message": "Noticeable asphalt subsidence on Sector 4 main junction after heavy weekend rains. Reported with photos!",
                "created_at": now,
            },
            {
                "room_id": str(room_ids[0]),
                "user_name": "Ananya Sen",
                "user_role": "AUTHORITY_SUPERVISOR",
                "message": "Ground team has inspected the Sector 4 junction. Physical audit logged with 8.5cm cavity depth.",
                "created_at": now,
            },
            {
                "room_id": str(room_ids[0]),
                "user_name": "Rajesh Kumar",
                "user_role": "AUTHORITY_OFFICER",
                "message": "Work Order WO-2026-088 approved and assigned to Metro Road Infra with Hot Mix VG-30 overlay. SLA 48h.",
                "created_at": now,
            },
            {
                "room_id": str(room_ids[1]),
                "user_name": "Vikram Malhotra",
                "user_role": "CONTRACTOR_MANAGER",
                "message": "Compaction roller and 3 MT VG-30 batch dispatched to GT Road South. Expect live repair verification by 4 PM.",
                "created_at": now,
            },
            {
                "room_id": str(room_ids[1]),
                "user_name": "Rajesh Kumar",
                "user_role": "AUTHORITY_OFFICER",
                "message": "Remember all contractors must upload timestamped compaction roller logs with evidence photos.",
                "created_at": now,
            },
            {
                "room_id": str(room_ids[2]),
                "user_name": "Ananya Sen",
                "user_role": "AUTHORITY_SUPERVISOR",
                "message": "All field supervisors please sync your mobile GPS audits before submitting compaction clearance.",
                "created_at": now,
            },
            {
                "room_id": str(room_ids[2]),
                "user_name": "Vikram Malhotra",
                "user_role": "CONTRACTOR_MANAGER",
                "message": "Asphalt delivery temperature logged at 155°C. Compaction target verified.",
                "created_at": now,
            },
        ])

    p_col = polls_col()
    if p_col.count_documents({}) == 0:
        now = datetime.now(timezone.utc)
        default_polls = [
            {
                "title": "Rate the Newly Resurfaced Stretch on Grand Trunk Road (Ward 4)",
                "category": "REPAIR_QUALITY",
                "description": "How would you rate the asphalt smoothness, edge compaction, and ride quality after contractor completion?",
                "status": "ACTIVE",
                "options": [
                    {"id": "opt_5", "label": "⭐⭐⭐⭐⭐ Outstanding & Seamless Ride", "votes": 42},
                    {"id": "opt_4", "label": "⭐⭐⭐⭐ Well Compacted, Minor Rumble", "votes": 28},
                    {"id": "opt_3", "label": "⭐⭐⭐ Acceptable, Needs Line Marking", "votes": 12},
                    {"id": "opt_1", "label": "⭐ Rough, Aggregate Chipping Detected", "votes": 4},
                ],
                "total_votes": 86,
                "created_at": now,
            },
            {
                "title": "Which Arterial Corridor Requires Priority Resurfacing Next Quarter?",
                "category": "BUDGET_PRIORITY",
                "description": "Cast your civic vote to prioritize the municipal asphalt budget allocation for Q1 2027:",
                "status": "ACTIVE",
                "options": [
                    {"id": "metro_junc", "label": "Main Metro Rail Junction & Market Link (Heavy Traffic)", "votes": 65},
                    {"id": "hospital_bypass", "label": "Civil Hospital Emergency Access By-Pass", "votes": 53},
                    {"id": "industrial_ring", "label": "Sector 9 Freight & Industrial Ring Road", "votes": 19},
                    {"id": "school_blvd", "label": "University Campus & School Corridor Boulevard", "votes": 27},
                ],
                "total_votes": 164,
                "created_at": now,
            },
        ]
        p_col.insert_many(default_polls)

    f_col = citizen_feedbacks_col()
    if f_col.count_documents({}) == 0:
        now = datetime.now(timezone.utc)
        f_col.insert_many([
            {
                "user_name": "Priya Sharma",
                "user_role": "CITIZEN",
                "category": "ROAD_QUALITY",
                "rating": 5,
                "title": "Quick response on GT Road pothole",
                "comments": "Reported on Monday via AI scan, supervisor verified on Tuesday, and road was resurfaced by Thursday. Very transparent!",
                "ward": "Ward 4",
                "created_at": now,
            },
            {
                "user_name": "Rahul Verma",
                "user_role": "CITIZEN",
                "category": "CIVIC_TRANSPARENCY",
                "rating": 4,
                "title": "Great tracking features",
                "comments": "The explainable priority formula and live map give citizens genuine visibility into municipal road works.",
                "ward": "Ward 12",
                "created_at": now,
            },
        ])


# --- 1. DISCUSSION ROOMS ---

class DiscussionRoomsListView(APIView):
    """
    List discussion rooms and create new discussion rooms.
    Open to authenticated users and public browsing.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        _ensure_default_community_content()
        col = discussion_rooms_col()
        rooms = list(col.find({}).sort("created_at", -1))
        return api_success({"items": [serialize_doc(r) for r in rooms], "total": len(rooms)})

    def post(self, request):
        if not (request.user and request.user.is_authenticated):
            return api_error("Authentication required to create a discussion room.", "UNAUTHORIZED", status_code=status.HTTP_401_UNAUTHORIZED)

        data = request.data or {}
        title = (data.get("title") or "").strip()
        category = (data.get("category") or "GENERAL").strip()
        description = (data.get("description") or "").strip()
        complaint_id = data.get("complaint_id")

        if not title:
            return api_error("Room title is required.", "MISSING_TITLE")

        now = datetime.now(timezone.utc)
        doc = {
            "title": title,
            "category": category,
            "description": description,
            "complaint_id": complaint_id,
            "is_public": True,
            "created_by": request.user.name,
            "created_by_id": request.user.id,
            "created_by_role": request.user.role,
            "created_at": now,
            "message_count": 0,
        }

        col = discussion_rooms_col()
        res = col.insert_one(doc)
        doc["_id"] = res.inserted_id

        return api_success(serialize_doc(doc), message="Discussion room created successfully.", status_code=status.HTTP_201_CREATED)


class DiscussionRoomMessagesView(APIView):
    """
    List and post messages inside a specific discussion room.
    """
    permission_classes = [AllowAny]

    def get(self, request, room_id):
        _ensure_default_community_content()
        col = discussion_messages_col()
        messages = list(col.find({"room_id": str(room_id)}).sort("created_at", 1).limit(200))
        return api_success({"items": [serialize_doc(m) for m in messages], "total": len(messages)})

    def post(self, request, room_id):
        if not (request.user and request.user.is_authenticated):
            return api_error("Authentication required to post messages.", "UNAUTHORIZED", status_code=status.HTTP_401_UNAUTHORIZED)

        data = request.data or {}
        message_text = (data.get("message") or "").strip()
        if not message_text:
            return api_error("Message text cannot be empty.", "EMPTY_MESSAGE")

        now = datetime.now(timezone.utc)
        msg_doc = {
            "room_id": str(room_id),
            "user_id": request.user.id,
            "user_name": request.user.name,
            "user_role": request.user.role,
            "message": message_text,
            "created_at": now,
        }

        m_col = discussion_messages_col()
        res = m_col.insert_one(msg_doc)
        msg_doc["_id"] = res.inserted_id

        # Increment message count on room
        r_oid = parse_object_id(room_id)
        if r_oid:
            discussion_rooms_col().update_one({"_id": r_oid}, {"$inc": {"message_count": 1}})

        return api_success(serialize_doc(msg_doc), message="Message posted.", status_code=status.HTTP_201_CREATED)


# --- 2. PUBLIC REVIEW POLLING & FEEDBACK CENTER ---

class PollsListView(APIView):
    """
    List public review polls and community budgeting votes.
    Includes vote counts, percentage distribution, and user's vote state.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        _ensure_default_community_content()
        p_col = polls_col()
        polls = list(p_col.find({}).sort("created_at", -1))

        # Check if user has already voted
        user_votes = {}
        if request.user and request.user.is_authenticated:
            v_col = poll_votes_col()
            user_vote_records = list(v_col.find({"user_id": request.user.id}))
            for uv in user_vote_records:
                user_votes[str(uv.get("poll_id"))] = uv.get("option_id")

        results = []
        for p in polls:
            p_serialized = serialize_doc(p)
            pid = p_serialized["id"]
            p_serialized["user_voted_option"] = user_votes.get(pid)
            results.append(p_serialized)

        return api_success({"items": results, "total": len(results)})


class PollVoteView(APIView):
    """
    Cast a citizen vote on a public review poll.
    Restricted to authenticated users (1 vote per user per poll).
    """
    permission_classes = [IsAuthenticatedMongo]

    def post(self, request, poll_id):
        p_oid = parse_object_id(poll_id)
        if not p_oid:
            return api_error("Invalid poll ID.", "INVALID_ID")

        p_col = polls_col()
        poll = p_col.find_one({"_id": p_oid})
        if not poll:
            return api_error("Poll not found.", "NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)

        if poll.get("status") != "ACTIVE":
            return api_error("This poll is closed.", "POLL_CLOSED")

        option_id = (request.data.get("option_id") or "").strip()
        if not option_id:
            return api_error("Option ID is required.", "MISSING_OPTION")

        # Validate that option exists in poll
        options = poll.get("options", [])
        opt_match = next((o for o in options if o.get("id") == option_id), None)
        if not opt_match:
            return api_error("Invalid option choice for this poll.", "INVALID_OPTION")

        # Check double voting
        v_col = poll_votes_col()
        existing_vote = v_col.find_one({"poll_id": str(poll_id), "user_id": request.user.id})
        now = datetime.now(timezone.utc)

        if existing_vote:
            # Change vote: decrement previous option, increment new option
            prev_option_id = existing_vote.get("option_id")
            if prev_option_id != option_id:
                p_col.update_one(
                    {"_id": p_oid, "options.id": prev_option_id},
                    {"$inc": {"options.$.votes": -1}}
                )
                p_col.update_one(
                    {"_id": p_oid, "options.id": option_id},
                    {"$inc": {"options.$.votes": 1}}
                )
                v_col.update_one(
                    {"_id": existing_vote["_id"]},
                    {"$set": {"option_id": option_id, "updated_at": now}}
                )
        else:
            # New vote
            p_col.update_one(
                {"_id": p_oid, "options.id": option_id},
                {"$inc": {"options.$.votes": 1, "total_votes": 1}}
            )
            v_col.insert_one({
                "poll_id": str(poll_id),
                "user_id": request.user.id,
                "user_name": request.user.name,
                "user_role": request.user.role,
                "option_id": option_id,
                "created_at": now,
            })

        updated_poll = p_col.find_one({"_id": p_oid})
        res_data = serialize_doc(updated_poll)
        res_data["user_voted_option"] = option_id

        return api_success(res_data, message="Vote recorded successfully!")


class CitizenFeedbackView(APIView):
    """
    List and submit civic feedback and ratings on road infrastructure.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        _ensure_default_community_content()
        f_col = citizen_feedbacks_col()
        feedbacks = list(f_col.find({}).sort("created_at", -1).limit(50))

        # Calculate average rating
        total_count = f_col.count_documents({})
        pipeline = [{"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}}}]
        agg = list(f_col.aggregate(pipeline))
        avg_rating = round(agg[0]["avg_rating"], 1) if agg else 4.5

        return api_success({
            "items": [serialize_doc(f) for f in feedbacks],
            "total": total_count,
            "avg_rating": avg_rating,
        })

    def post(self, request):
        if not (request.user and request.user.is_authenticated):
            return api_error("Authentication required to submit feedback.", "UNAUTHORIZED", status_code=status.HTTP_401_UNAUTHORIZED)

        data = request.data or {}
        rating = int(data.get("rating") or 5)
        rating = max(1, min(5, rating))
        title = (data.get("title") or "").strip()
        comments = (data.get("comments") or "").strip()
        category = (data.get("category") or "ROAD_QUALITY").strip()
        ward = (data.get("ward") or "").strip()

        if not comments:
            return api_error("Feedback comments cannot be empty.", "EMPTY_FEEDBACK")

        now = datetime.now(timezone.utc)
        doc = {
            "user_id": request.user.id,
            "user_name": request.user.name,
            "user_role": request.user.role,
            "rating": rating,
            "category": category,
            "title": title or f"Citizen Rating: {rating} Stars",
            "comments": comments,
            "ward": ward or "All Wards",
            "created_at": now,
        }

        f_col = citizen_feedbacks_col()
        res = f_col.insert_one(doc)
        doc["_id"] = res.inserted_id

        return api_success(serialize_doc(doc), message="Thank you! Your feedback has been recorded.", status_code=status.HTTP_201_CREATED)


# --- 3. SUPERVISOR FIELD INSPECTION & GROUND TRIAGE AUDIT ---
# Solidifies the hierarchy: Supervisor audits on site & recommends work orders; Officer issues executive sign-off!

class SupervisorFieldInspectionView(APIView):
    """
    Field inspections performed by Authority Supervisors on the ground.
    Supervisors physically inspect damage, record depth/width/stagnation,
    and submit Work Order Recommendations to the Authority Officer.
    """
    permission_classes = [IsAuthenticatedMongo]

    def get(self, request):
        f_col = field_inspections_col()
        complaint_id = request.GET.get("complaint_id")
        query: Dict[str, Any] = {}
        if complaint_id:
            query["complaint_id"] = complaint_id

        inspections = list(f_col.find(query).sort("created_at", -1))
        return api_success({"items": [serialize_doc(i) for i in inspections], "total": len(inspections)})

    def post(self, request):
        # Only Supervisors or Super Admins can submit ground field inspections
        if not (request.user.has_role("AUTHORITY_SUPERVISOR") or request.user.is_super_admin):
            return api_error(
                "Access restricted: Physical on-site field inspections are conducted by Authority Supervisors.",
                "FORBIDDEN",
                status_code=status.HTTP_403_FORBIDDEN
            )

        data = request.data or {}
        complaint_id = data.get("complaint_id")
        if not complaint_id:
            return api_error("Complaint ID is required for field inspection.", "MISSING_COMPLAINT_ID")

        c_oid = parse_object_id(complaint_id)
        complaint = complaints_col().find_one({"_id": c_oid}) if c_oid else None
        if not complaint:
            return api_error("Referenced road defect complaint not found.", "NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)

        measured_depth_cm = float(data.get("measured_depth_cm") or 0.0)
        measured_width_cm = float(data.get("measured_width_cm") or 0.0)
        water_stagnation = bool(data.get("water_stagnation", False))
        traffic_impact = data.get("traffic_impact_rating") or "HIGH_IMPACT"
        recommended_action = data.get("recommended_action") or "HOT_MIX_OVERLAY"
        estimated_tonnage = float(data.get("estimated_bitumen_tonnage") or 2.0)
        notes = (data.get("supervisor_notes") or "").strip()

        now = datetime.now(timezone.utc)
        doc = {
            "complaint_id": str(complaint_id),
            "complaint_reference": complaint.get("public_reference", "N/A"),
            "supervisor_id": request.user.id,
            "supervisor_name": request.user.name,
            "supervisor_role": request.user.role,
            "measured_depth_cm": measured_depth_cm,
            "measured_width_cm": measured_width_cm,
            "water_stagnation": water_stagnation,
            "traffic_impact_rating": traffic_impact,
            "recommended_action": recommended_action,
            "estimated_bitumen_tonnage": estimated_tonnage,
            "supervisor_notes": notes,
            "status": "PENDING_OFFICER_APPROVAL",
            "created_at": now,
        }

        f_col = field_inspections_col()
        res = f_col.insert_one(doc)
        doc["_id"] = res.inserted_id

        # Update complaint with supervisor inspection tag
        complaints_col().update_one(
            {"_id": c_oid},
            {"$set": {
                "field_inspection_completed": True,
                "latest_inspection_id": str(res.inserted_id),
                "supervisor_measured_depth_cm": measured_depth_cm,
            }}
        )

        record_audit_log(
            request.user.id,
            "SUPERVISOR_FIELD_INSPECTION_SUBMITTED",
            "complaints",
            str(complaint_id),
            {"inspection_id": str(res.inserted_id), "depth": measured_depth_cm, "recommended": recommended_action}
        )

        return api_success(
            serialize_doc(doc),
            message="On-site field audit successfully recorded. Forwarded to Authority Officer for executive work order issuance.",
            status_code=status.HTTP_201_CREATED
        )


class OfficerFieldInspectionReviewView(APIView):
    """
    Executive review executed exclusively by Authority Officers (or Admins).
    The Officer reviews the Supervisor's physical field inspection and authorizes
    the official municipal work order to the contractor.
    """
    permission_classes = [IsAuthenticatedMongo]

    def patch(self, request, inspection_id):
        if not (request.user.has_role("AUTHORITY_OFFICER") or request.user.is_super_admin):
            return api_error(
                "Access restricted: Work Order authorization and inspection reviews are executed by Authority Officers.",
                "FORBIDDEN",
                status_code=status.HTTP_403_FORBIDDEN
            )

        i_oid = parse_object_id(inspection_id)
        if not i_oid:
            return api_error("Invalid inspection ID.", "INVALID_ID")

        f_col = field_inspections_col()
        inspection = f_col.find_one({"_id": i_oid})
        if not inspection:
            return api_error("Field inspection record not found.", "NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)

        data = request.data or {}
        decision = (data.get("decision") or "APPROVE_WORK_ORDER").upper()
        officer_notes = (data.get("officer_notes") or "").strip()
        assigned_contractor_id = data.get("contractor_id")
        contractor_name = data.get("contractor_name") or "Metro Road Infra Ltd"

        now = datetime.now(timezone.utc)
        update_fields: Dict[str, Any] = {
            "officer_id": request.user.id,
            "officer_name": request.user.name,
            "officer_review_at": now,
            "officer_notes": officer_notes,
            "status": "APPROVED_WORK_ORDER_ISSUED" if decision == "APPROVE_WORK_ORDER" else "REJECTED_RE_INSPECT",
        }

        f_col.update_one({"_id": i_oid}, {"$set": update_fields})

        # Update complaint and work order
        complaint_id = inspection.get("complaint_id")
        c_oid = parse_object_id(complaint_id)
        if c_oid and decision == "APPROVE_WORK_ORDER":
            complaints_col().update_one(
                {"_id": c_oid},
                {"$set": {
                    "status": "ASSIGNED",
                    "work_order_authorized": True,
                    "authorized_by_officer": request.user.name,
                    "assigned_contractor_name": contractor_name,
                }}
            )

        record_audit_log(
            request.user.id,
            f"OFFICER_REVIEW_{decision}",
            "field_inspections",
            str(inspection_id),
            {"decision": decision, "notes": officer_notes}
        )

        updated_doc = f_col.find_one({"_id": i_oid})
        return api_success(
            serialize_doc(updated_doc),
            message=f"Field audit reviewed by Authority Officer: {decision.replace('_', ' ')}."
        )
