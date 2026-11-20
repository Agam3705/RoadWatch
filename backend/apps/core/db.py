"""
RoadWatch Core Database Module
Provides PyMongo connection pooling, collections handles, indexes initialization,
and document serialization utilities.
"""
import logging
from typing import Any, Dict, Optional, Union
from datetime import datetime
from bson import ObjectId
from pymongo import MongoClient, ASCENDING, DESCENDING, GEOSPHERE
from django.conf import settings

logger = logging.getLogger(__name__)

_mongo_client: Optional[MongoClient] = None


def get_mongo_client() -> MongoClient:
    global _mongo_client
    if _mongo_client is None:
        _mongo_client = MongoClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=20000,
            connectTimeoutMS=15000,
            socketTimeoutMS=30000,
            maxPoolSize=50,
            minPoolSize=5,
        )
    return _mongo_client


def get_db():
    client = get_mongo_client()
    return client[settings.MONGODB_DATABASE]


def get_collection(name: str):
    db = get_db()
    return db[name]


# Explicit collection accessors matching PRD Section 11.2
def users_col():
    return get_collection("users")

def organizations_col():
    return get_collection("organizations")

def memberships_col():
    return get_collection("memberships")

def jurisdictions_col():
    return get_collection("jurisdictions")

def roads_col():
    return get_collection("roads")

def complaints_col():
    return get_collection("complaints")

def complaint_images_col():
    return get_collection("complaint_images")

def ai_jobs_col():
    return get_collection("ai_jobs")

def ai_predictions_col():
    return get_collection("ai_predictions")

def duplicate_links_col():
    return get_collection("duplicate_links")

def complaint_supports_col():
    return get_collection("complaint_supports")

def maintenance_tasks_col():
    return get_collection("maintenance_tasks")

def repair_evidence_col():
    return get_collection("repair_evidence")

def verifications_col():
    return get_collection("verifications")

def status_history_col():
    return get_collection("status_history")

def notifications_col():
    return get_collection("notifications")

def grievances_col():
    return get_collection("grievances")


def discussion_rooms_col():
    return get_collection("discussion_rooms")


def discussion_messages_col():
    return get_collection("discussion_messages")


def polls_col():
    return get_collection("polls")


def poll_votes_col():
    return get_collection("poll_votes")


def citizen_feedbacks_col():
    return get_collection("citizen_feedbacks")


def field_inspections_col():
    return get_collection("field_inspections")


def road_quality_records_col():
    return get_collection("road_quality_records")

def audit_logs_col():
    return get_collection("audit_logs")

def system_settings_col():
    return get_collection("system_settings")


def init_indexes():
    """
    Initializes all necessary MongoDB indexes as required by PRD Section 11.4:
    - 2dsphere index on complaints.location
    - 2dsphere index on roads.geometry
    - 2dsphere index on jurisdictions.boundary
    - unique index on users.email
    - unique index on complaints.public_reference
    - unique compound index on complaint_supports.(complaint_id, citizen_id)
    - query indexes on maintenance_tasks, status_history, audit_logs
    """
    try:
        db = get_db()

        # Users indexes
        db.users.create_index([("email", ASCENDING)], unique=True)
        db.users.create_index([("created_at", DESCENDING)])

        # Organizations indexes
        db.organizations.create_index([("name", ASCENDING)])
        db.organizations.create_index([("verification_status", ASCENDING)])

        # Memberships indexes
        db.memberships.create_index([("user_id", ASCENDING), ("organization_id", ASCENDING)])
        db.memberships.create_index([("role", ASCENDING)])

        # Jurisdictions indexes
        db.jurisdictions.create_index([("code", ASCENDING)], unique=True)
        db.jurisdictions.create_index([("boundary", GEOSPHERE)])

        # Roads indexes
        db.roads.create_index([("external_road_id", ASCENDING)], unique=True, sparse=True)
        db.roads.create_index([("jurisdiction_id", ASCENDING)])
        db.roads.create_index([("geometry", GEOSPHERE)])

        # Complaints indexes
        db.complaints.create_index([("location", GEOSPHERE)])
        db.complaints.create_index([("public_reference", ASCENDING)], unique=True)
        db.complaints.create_index([("status", ASCENDING), ("category", ASCENDING), ("created_at", DESCENDING)])
        db.complaints.create_index([("reporter_id", ASCENDING)])
        db.complaints.create_index([("jurisdiction_id", ASCENDING)])
        db.complaints.create_index([("priority.score", DESCENDING)])

        # Complaint supports index (unique per citizen & complaint)
        db.complaint_supports.create_index(
            [("complaint_id", ASCENDING), ("citizen_id", ASCENDING)],
            unique=True
        )

        # Maintenance tasks indexes
        db.maintenance_tasks.create_index([("task_reference", ASCENDING)], unique=True)
        db.maintenance_tasks.create_index([("complaint_id", ASCENDING)])
        db.maintenance_tasks.create_index([("contractor_org_id", ASCENDING), ("status", ASCENDING), ("deadline", ASCENDING)])

        # Status history indexes
        db.status_history.create_index([("entity_type", ASCENDING), ("entity_id", ASCENDING), ("timestamp", DESCENDING)])

        # Audit logs indexes
        db.audit_logs.create_index([("entity_type", ASCENDING), ("entity_id", ASCENDING)])
        db.audit_logs.create_index([("actor_id", ASCENDING), ("timestamp", DESCENDING)])

        # Notifications index
        db.notifications.create_index([("user_id", ASCENDING), ("read_at", ASCENDING), ("created_at", DESCENDING)])

        # Road Quality Records index
        db.road_quality_records.create_index([("road_id", ASCENDING), ("calculated_at", DESCENDING)])
        db.road_quality_records.create_index([("jurisdiction_id", ASCENDING), ("calculated_at", DESCENDING)])

        # Grievances indexes
        db.grievances.create_index([("grievance_number", ASCENDING)], unique=True)
        db.grievances.create_index([("citizen_id", ASCENDING), ("created_at", DESCENDING)])
        db.grievances.create_index([("status", ASCENDING), ("created_at", DESCENDING)])
        db.grievances.create_index([("category", ASCENDING)])

        logger.info("Successfully verified and created all MongoDB indexes.")
        return True
    except Exception as e:
        logger.error(f"Error initializing MongoDB indexes: {e}")
        return False


def parse_object_id(val: Any) -> Optional[ObjectId]:
    if isinstance(val, ObjectId):
        return val
    if isinstance(val, str) and ObjectId.is_valid(val):
        return ObjectId(val)
    return None


def serialize_doc(doc: Any) -> Any:
    """Recursively serialize BSON documents into JSON-friendly dicts."""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        result = {}
        for k, v in doc.items():
            if k == "_id":
                result["id"] = str(v)
            elif isinstance(v, ObjectId):
                result[k] = str(v)
            elif isinstance(v, datetime):
                result[k] = v.isoformat()
            elif isinstance(v, (dict, list)):
                result[k] = serialize_doc(v)
            else:
                result[k] = v
        return result
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, datetime):
        return doc.isoformat()
    return doc
