"""
RoadWatch Database Seeder
Seeds MongoDB with realistic jurisdictions, roads, users, organizations,
memberships, complaints with AI detections, maintenance tasks, and repair evidence.
"""
import os
import sys
from pathlib import Path
from datetime import datetime, timedelta
import numpy as np
import cv2

# Ensure Django settings are loaded
sys.path.insert(0, str(Path(__file__).resolve().parent))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "roadwatch.settings")

import django
django.setup()

from apps.core.db import (
    init_indexes, users_col, organizations_col, memberships_col,
    jurisdictions_col, roads_col, complaints_col, complaint_images_col,
    ai_predictions_col, ai_jobs_col, maintenance_tasks_col,
    repair_evidence_col, verifications_col, status_history_col,
    complaint_supports_col, get_db
)
from apps.authentication.jwt_auth import hash_password
from apps.ai_service.priority_engine import calculate_priority_score
from apps.core.storage import save_uploaded_media
from django.conf import settings


def generate_sample_road_image(filename: str, defect_type: str = "POTHOLE", is_repaired: bool = False) -> str:
    """Generates a realistic asphalt texture with road defect or repaired patch."""
    width, height = 800, 600
    # Base asphalt color with random grain
    img = np.random.randint(110, 135, (height, width, 3), dtype=np.uint8)

    rel_folder = "evidence" if is_repaired else "complaints"
    folder_path = Path(settings.MEDIA_ROOT) / rel_folder / "seed"
    folder_path.mkdir(parents=True, exist_ok=True)
    target_path = folder_path / filename

    if is_repaired:
        # Draw clean asphalt patch with fresh dark asphalt and sealant line
        cv2.rectangle(img, (240, 180), (560, 420), (55, 55, 55), -1)
        cv2.rectangle(img, (238, 178), (562, 422), (30, 30, 30), 2)
        cv2.putText(img, "ROADWATCH REPAIRED EVIDENCE", (30, 560), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (240, 240, 240), 2)
    else:
        # Draw road defect
        if defect_type == "POTHOLE":
            cv2.ellipse(img, (400, 300), (140, 90), 15, 0, 360, (40, 40, 40), -1)
            cv2.ellipse(img, (390, 290), (120, 75), 15, 0, 360, (25, 25, 25), -1)
            cv2.ellipse(img, (410, 310), (150, 95), 15, 0, 360, (70, 70, 70), 3)
        elif defect_type == "ALLIGATOR_CRACK":
            for _ in range(12):
                x1, y1 = np.random.randint(250, 550), np.random.randint(200, 400)
                x2, y2 = x1 + np.random.randint(-40, 40), y1 + np.random.randint(-40, 40)
                cv2.line(img, (x1, y1), (x2, y2), (30, 30, 30), 3)
        else:
            cv2.line(img, (150, 320), (650, 280), (35, 35, 35), 4)

        cv2.putText(img, f"DEFECT: {defect_type}", (30, 560), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (220, 220, 220), 2)

    cv2.imwrite(str(target_path), img)
    return f"{rel_folder}/seed/{filename}"


def seed_database():
    print("1. Initializing MongoDB indexes...")
    init_indexes()

    db = get_db()
    print("Clearing existing sample data...")
    collections_to_clean = [
        "users", "organizations", "memberships", "jurisdictions", "roads",
        "complaints", "complaint_images", "ai_jobs", "ai_predictions",
        "maintenance_tasks", "repair_evidence", "verifications",
        "status_history", "complaint_supports", "notifications"
    ]
    for c in collections_to_clean:
        db[c].delete_many({})

    now = datetime.utcnow()

    print("2. Seeding Organizations...")
    gmpwd_id = organizations_col().insert_one({
        "name": "Greater Metropolitan Public Works Department (GMPWD)",
        "type": "AUTHORITY",
        "registration_number": "GOV-PW-2026-001",
        "contact_email": "authority@gmpwd.gov.in",
        "verification_status": "VERIFIED",
        "created_at": now,
    }).inserted_id

    apex_infra_id = organizations_col().insert_one({
        "name": "Apex Infra Roads & Civils Ltd.",
        "type": "CONTRACTOR",
        "registration_number": "CORP-CN-2026-884",
        "contact_email": "operations@apexinfra.com",
        "verification_status": "VERIFIED",
        "created_at": now,
    }).inserted_id

    urban_pave_id = organizations_col().insert_one({
        "name": "Urban Pavements & Infrastructure",
        "type": "CONTRACTOR",
        "registration_number": "CORP-CN-2026-412",
        "contact_email": "contact@urbanpave.com",
        "verification_status": "VERIFIED",
        "created_at": now,
    }).inserted_id

    print("3. Seeding Jurisdictions...")
    # Seed Wards with GeoJSON Polygon boundaries
    ward_12_id = jurisdictions_col().insert_one({
        "name": "Ward 12 - Central Business & Transit Corridor",
        "code": "WARD-12",
        "authority_org_id": str(gmpwd_id),
        "boundary": {
            "type": "Polygon",
            "coordinates": [[
                [75.7500, 31.2100],
                [75.7900, 31.2100],
                [75.7900, 31.2400],
                [75.7500, 31.2400],
                [75.7500, 31.2100],
            ]]
        },
        "created_at": now,
    }).inserted_id

    ward_15_id = jurisdictions_col().insert_one({
        "name": "Ward 15 - North Industrial & Expressway Zone",
        "code": "WARD-15",
        "authority_org_id": str(gmpwd_id),
        "boundary": {
            "type": "Polygon",
            "coordinates": [[
                [75.7300, 31.2400],
                [75.7900, 31.2400],
                [75.7900, 31.2700],
                [75.7300, 31.2700],
                [75.7300, 31.2400],
            ]]
        },
        "created_at": now,
    }).inserted_id

    print("4. Seeding Road Segments...")
    road_mg_id = roads_col().insert_one({
        "name": "Mahatma Gandhi Marg (Arterial)",
        "external_road_id": "ROAD-MG-01",
        "road_type": "ARTERIAL",
        "jurisdiction_id": str(ward_12_id),
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [75.7550, 31.2200],
                [75.7650, 31.2230],
                [75.7750, 31.2260],
                [75.7850, 31.2280],
            ]
        },
        "created_at": now,
    }).inserted_id

    road_ring_id = roads_col().insert_one({
        "name": "Northern Bypass Ring Road (Expressway)",
        "external_road_id": "ROAD-RING-02",
        "road_type": "HIGHWAY",
        "jurisdiction_id": str(ward_15_id),
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [75.7350, 31.2500],
                [75.7550, 31.2520],
                [75.7750, 31.2550],
                [75.7850, 31.2580],
            ]
        },
        "created_at": now,
    }).inserted_id

    road_station_id = roads_col().insert_one({
        "name": "Station Approach Road (Collector)",
        "external_road_id": "ROAD-STATION-03",
        "road_type": "COLLECTOR",
        "jurisdiction_id": str(ward_12_id),
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [75.7600, 31.2150],
                [75.7680, 31.2210],
                [75.7720, 31.2290],
            ]
        },
        "created_at": now,
    }).inserted_id

    print("5. Seeding Users and Role Memberships...")
    # Citizen
    citizen_id = users_col().insert_one({
        "email": "citizen@roadwatch.org",
        "password_hash": hash_password("Citizen123!"),
        "name": "Priya Sharma",
        "phone": "+91 98765 43210",
        "role": "CITIZEN",
        "account_status": "ACTIVE",
        "is_email_verified": True,
        "created_at": now,
    }).inserted_id

    # Authority Officer
    officer_id = users_col().insert_one({
        "email": "officer@roadwatch.org",
        "password_hash": hash_password("Officer123!"),
        "name": "Rajesh Kumar (P.W.D. Officer)",
        "phone": "+91 98111 22334",
        "role": "AUTHORITY_OFFICER",
        "account_status": "ACTIVE",
        "is_email_verified": True,
        "created_at": now,
    }).inserted_id

    memberships_col().insert_one({
        "user_id": str(officer_id),
        "organization_id": str(gmpwd_id),
        "role": "AUTHORITY_OFFICER",
        "jurisdiction_ids": [str(ward_12_id), str(ward_15_id)],
        "status": "ACTIVE",
        "created_at": now,
    })

    # Authority Supervisor
    supervisor_id = users_col().insert_one({
        "email": "supervisor@roadwatch.org",
        "password_hash": hash_password("Supervisor123!"),
        "name": "Ananya Desai (Chief Engineer)",
        "phone": "+91 98222 33445",
        "role": "AUTHORITY_SUPERVISOR",
        "account_status": "ACTIVE",
        "is_email_verified": True,
        "created_at": now,
    }).inserted_id

    memberships_col().insert_one({
        "user_id": str(supervisor_id),
        "organization_id": str(gmpwd_id),
        "role": "AUTHORITY_SUPERVISOR",
        "jurisdiction_ids": [str(ward_12_id), str(ward_15_id)],
        "status": "ACTIVE",
        "created_at": now,
    })

    # Contractor Manager
    contractor_id = users_col().insert_one({
        "email": "contractor@roadwatch.org",
        "password_hash": hash_password("Contractor123!"),
        "name": "Vikram Malhotra (Apex Infra)",
        "phone": "+91 98333 44556",
        "role": "CONTRACTOR_MANAGER",
        "account_status": "ACTIVE",
        "is_email_verified": True,
        "created_at": now,
    }).inserted_id

    memberships_col().insert_one({
        "user_id": str(contractor_id),
        "organization_id": str(apex_infra_id),
        "role": "CONTRACTOR_MANAGER",
        "jurisdiction_ids": [str(ward_12_id), str(ward_15_id)],
        "status": "ACTIVE",
        "created_at": now,
    })

    # Super Admin
    admin_id = users_col().insert_one({
        "email": "admin@roadwatch.org",
        "password_hash": hash_password("Admin123!"),
        "name": "System Administrator",
        "phone": "+91 99999 00000",
        "role": "SUPER_ADMIN",
        "account_status": "ACTIVE",
        "is_email_verified": True,
        "created_at": now,
    }).inserted_id

    print("6. Seeding Realistic Complaints & AI Predictions...")
    complaints_data = [
        {
            "ref": "RW-2026-100214",
            "category": "POTHOLE",
            "description": "Deep dangerous pothole near Central Junction causing vehicle bottoming out and water accumulation.",
            "coords": [75.7682, 31.2241],
            "severity": "CRITICAL",
            "status": "PENDING_VERIFICATION",
            "road_id": str(road_mg_id),
            "jurisdiction_id": str(ward_12_id),
            "supports": 6,
            "days_ago": 6,
        },
        {
            "ref": "RW-2026-100215",
            "category": "LONGITUDINAL_CRACK",
            "description": "Severe longitudinal fissure expanding along the fast lane of Ring Road Expressway.",
            "coords": [75.7510, 31.2520],
            "severity": "HIGH",
            "status": "IN_PROGRESS",
            "road_id": str(road_ring_id),
            "jurisdiction_id": str(ward_15_id),
            "supports": 3,
            "days_ago": 4,
        },
        {
            "ref": "RW-2026-100216",
            "category": "ALLIGATOR_CRACK",
            "description": "Extensive crocodile / alligator pattern cracking near Railway Station bus bay.",
            "coords": [75.7634, 31.2185],
            "severity": "HIGH",
            "status": "APPROVED",
            "road_id": str(road_station_id),
            "jurisdiction_id": str(ward_12_id),
            "supports": 4,
            "days_ago": 3,
        },
        {
            "ref": "RW-2026-100217",
            "category": "POTHOLE",
            "description": "Medium cavity near pedestrian crosswalk on Mahatma Gandhi Marg.",
            "coords": [75.7720, 31.2255],
            "severity": "MEDIUM",
            "status": "UNDER_REVIEW",
            "road_id": str(road_mg_id),
            "jurisdiction_id": str(ward_12_id),
            "supports": 1,
            "days_ago": 1,
        },
        {
            "ref": "RW-2026-100218",
            "category": "SUBSIDENCE",
            "description": "Depressed trench settling after recent pipe repair work on Station Road.",
            "coords": [75.7660, 31.2220],
            "severity": "HIGH",
            "status": "RESOLVED",
            "road_id": str(road_station_id),
            "jurisdiction_id": str(ward_12_id),
            "supports": 5,
            "days_ago": 12,
        },
        {
            "ref": "RW-2026-100219",
            "category": "POTHOLE",
            "description": "Citizen reported new pothole forming after monsoon rain.",
            "coords": [75.7695, 31.2248],
            "severity": "MEDIUM",
            "status": "SUBMITTED",
            "road_id": str(road_mg_id),
            "jurisdiction_id": str(ward_12_id),
            "supports": 2,
            "days_ago": 0,
        },
    ]

    complaint_ids_map = {}

    for c in complaints_data:
        c_time = now - timedelta(days=c["days_ago"])
        road_type = "HIGHWAY" if "Ring" in c["road_id"] else "ARTERIAL" if "mg" in c["road_id"] else "COLLECTOR"
        p_score = calculate_priority_score(
            severity_level=c["severity"],
            road_type=road_type,
            support_count=c["supports"],
        )

        # Generate sample defect image
        filename = f"{c['ref'].lower()}.jpg"
        rel_img_path = generate_sample_road_image(filename, defect_type=c["category"], is_repaired=False)

        img_metadata = {
            "url": f"/api/v1/media/{rel_img_path}",
            "storage_path": rel_img_path,
            "width": 800,
            "height": 600,
            "file_size": 184500,
            "format": "JPEG",
        }

        c_doc = {
            "public_reference": c["ref"],
            "reporter_id": str(citizen_id),
            "road_id": c["road_id"],
            "jurisdiction_id": c["jurisdiction_id"],
            "category": c["category"],
            "description": c["description"],
            "location": {
                "type": "Point",
                "coordinates": c["coords"],
            },
            "citizen_severity": c["severity"],
            "authority_assessment": {
                "decision": "APPROVED" if c["status"] in ("APPROVED", "ASSIGNED", "IN_PROGRESS", "PENDING_VERIFICATION", "RESOLVED") else None,
                "severity": c["severity"],
                "category": c["category"],
                "reviewed_by": str(officer_id),
                "reviewer_name": "Rajesh Kumar (P.W.D. Officer)",
                "reviewed_at": (c_time + timedelta(hours=4)).isoformat(),
            } if c["status"] not in ("SUBMITTED", "UNDER_REVIEW") else None,
            "priority": p_score,
            "support_count": c["supports"],
            "status": c["status"],
            "visibility": "PUBLIC_SUMMARY",
            "images": [img_metadata],
            "created_at": c_time,
            "updated_at": c_time,
        }

        res = complaints_col().insert_one(c_doc)
        c_id = str(res.inserted_id)
        complaint_ids_map[c["ref"]] = c_id

        # Insert complaint image document
        complaint_images_col().insert_one({
            "complaint_id": c_id,
            "storage_path": rel_img_path,
            "file_metadata": img_metadata,
            "image_type": "CITIZEN_SUBMISSION",
            "uploaded_by": str(citizen_id),
            "created_at": c_time,
        })

        # Insert AI prediction
        ai_predictions_col().insert_one({
            "job_id": f"ai-job-{c['ref']}",
            "complaint_id": c_id,
            "model_name": "RoadWatch-YOLOv8-CivilDamages",
            "model_version": "2026.11.1-prod",
            "image_quality": {
                "suitable": True,
                "quality_score": 96.0,
                "blur_score": 128.4,
                "brightness": 120.2,
                "flags": [],
                "resolution": "800x600",
            },
            "predictions": [
                {
                    "class": c["category"],
                    "confidence": 0.94,
                    "box": [220, 180, 580, 420],
                    "area_percentage": 14.8,
                }
            ],
            "geometry": [
                {
                    "type": "BoundingBox",
                    "class": c["category"],
                    "coordinates": [220, 180, 580, 420],
                    "confidence": 0.94,
                }
            ],
            "severity_estimate": {
                "level": c["severity"],
                "score": 85.0 if c["severity"] == "CRITICAL" else 75.0 if c["severity"] == "HIGH" else 50.0,
                "method": "geometry_and_damage_density",
                "damage_area_percentage": 14.8,
            },
            "human_review": {
                "status": "ACCEPTED" if c["status"] in ("APPROVED", "ASSIGNED", "IN_PROGRESS", "PENDING_VERIFICATION", "RESOLVED") else "PENDING_REVIEW",
                "reviewed_by": str(officer_id) if c["status"] != "SUBMITTED" else None,
                "reviewed_at": (c_time + timedelta(hours=4)).isoformat() if c["status"] != "SUBMITTED" else None,
            },
            "processing_ms": 38,
            "warnings": [],
            "created_at": c_time + timedelta(seconds=15),
        })

        # Insert initial status history
        status_history_col().insert_one({
            "entity_type": "complaints",
            "entity_id": c_id,
            "previous_status": "NONE",
            "new_status": "SUBMITTED",
            "actor_id": str(citizen_id),
            "actor_name": "Priya Sharma",
            "reason": "Report submitted",
            "timestamp": c_time,
        })

    print("7. Seeding Maintenance Tasks, Repair Evidence & Verifications...")
    # Work Order 1: For RW-2026-100214 (Pending Verification)
    c1_id = complaint_ids_map["RW-2026-100214"]
    rep_img_path = generate_sample_road_image("repaired_100214.jpg", defect_type="POTHOLE", is_repaired=True)
    rep_metadata = {
        "url": f"/api/v1/media/{rep_img_path}",
        "storage_path": rep_img_path,
        "width": 800,
        "height": 600,
        "file_size": 172000,
        "format": "JPEG",
    }

    t1_id = maintenance_tasks_col().insert_one({
        "task_reference": "WO-2026-A94101",
        "complaint_id": c1_id,
        "complaint_reference": "RW-2026-100214",
        "title": "Excavate cavity, apply cold-mix asphalt, compact and seal surface",
        "instructions": "Ensure clean edges, tack coat application, minimum 50mm compacted depth, and level finish with existing road camber.",
        "contractor_org_id": str(apex_infra_id),
        "contractor_name": "Apex Infra Roads & Civils Ltd.",
        "assigned_by": str(officer_id),
        "status": "COMPLETION_SUBMITTED",
        "deadline": now + timedelta(days=5),
        "estimated_cost": 45000.0,
        "actual_cost": 42000.0,
        "progress_percentage": 100,
        "progress_logs": [
            {"progress_percentage": 30, "note": "Area barricaded, broken asphalt milled out", "logged_by": str(contractor_id), "timestamp": (now - timedelta(days=3)).isoformat()},
            {"progress_percentage": 75, "note": "Base aggregate laid and tack coat sprayed", "logged_by": str(contractor_id), "timestamp": (now - timedelta(days=2)).isoformat()},
            {"progress_percentage": 100, "note": "Asphalt compacted with 8-ton vibratory roller and sealed", "logged_by": str(contractor_id), "timestamp": (now - timedelta(days=1)).isoformat()},
        ],
        "created_at": now - timedelta(days=5),
        "completion_submitted_at": now - timedelta(days=1),
        "updated_at": now - timedelta(days=1),
    }).inserted_id

    # Evidence for WO-1
    repair_evidence_col().insert_one({
        "task_id": str(t1_id),
        "complaint_id": c1_id,
        "storage_path": rep_img_path,
        "file_metadata": rep_metadata,
        "evidence_type": "AFTER_REPAIR_PHOTO",
        "work_notes": "Completed full-depth repair with hot bitumen mix. Traffic reopened after curing.",
        "location": "75.7682, 31.2241",
        "submitted_by": str(contractor_id),
        "submitted_at": now - timedelta(days=1),
    })

    # Work Order 2: For RW-2026-100218 (Resolved and Verified)
    c2_id = complaint_ids_map["RW-2026-100218"]
    rep2_img_path = generate_sample_road_image("repaired_100218.jpg", defect_type="SUBSIDENCE", is_repaired=True)
    rep2_metadata = {
        "url": f"/api/v1/media/{rep2_img_path}",
        "storage_path": rep2_img_path,
        "width": 800,
        "height": 600,
        "file_size": 178000,
        "format": "JPEG",
    }

    t2_id = maintenance_tasks_col().insert_one({
        "task_reference": "WO-2026-B81230",
        "complaint_id": c2_id,
        "complaint_reference": "RW-2026-100218",
        "title": "Sub-base compaction and trench leveling",
        "instructions": "Re-stabilize sub-base to prevent recurring settlement near pipe joint.",
        "contractor_org_id": str(apex_infra_id),
        "contractor_name": "Apex Infra Roads & Civils Ltd.",
        "assigned_by": str(officer_id),
        "status": "VERIFIED",
        "deadline": now - timedelta(days=2),
        "estimated_cost": 65000.0,
        "actual_cost": 61500.0,
        "progress_percentage": 100,
        "created_at": now - timedelta(days=10),
        "completion_submitted_at": now - timedelta(days=3),
        "verified_at": now - timedelta(days=2),
        "updated_at": now - timedelta(days=2),
    }).inserted_id

    repair_evidence_col().insert_one({
        "task_id": str(t2_id),
        "complaint_id": c2_id,
        "storage_path": rep2_img_path,
        "file_metadata": rep2_metadata,
        "evidence_type": "AFTER_REPAIR_PHOTO",
        "work_notes": "Settlement raised, re-compacted with sub-base gravel and sealed.",
        "submitted_by": str(contractor_id),
        "submitted_at": now - timedelta(days=3),
    })

    # Verification approval for WO-2
    verifications_col().insert_one({
        "task_id": str(t2_id),
        "complaint_id": c2_id,
        "reviewer_id": str(officer_id),
        "reviewer_name": "Rajesh Kumar (P.W.D. Officer)",
        "decision": "ACCEPTED",
        "comments": "Inspected on-site. Surface is level and meets municipal standards.",
        "created_at": now - timedelta(days=2),
    })

    # Citizen feedback for WO-2
    verifications_col().insert_one({
        "task_id": str(t2_id),
        "complaint_id": c2_id,
        "citizen_id": str(citizen_id),
        "citizen_name": "Priya Sharma",
        "is_fixed": True,
        "rating": 5,
        "comments": "Great work! The road dip is completely gone, very smooth ride now.",
        "created_at": now - timedelta(days=1),
    })

    # Work Order 3: For RW-2026-100215 (In Progress)
    c3_id = complaint_ids_map["RW-2026-100215"]
    maintenance_tasks_col().insert_one({
        "task_reference": "WO-2026-C77412",
        "complaint_id": c3_id,
        "complaint_reference": "RW-2026-100215",
        "title": "Seal longitudinal crack with elastomeric bitumen compound",
        "instructions": "Route crack to 15mm width, air blast debris, fill with hot-pour polymer modified sealant.",
        "contractor_org_id": str(apex_infra_id),
        "contractor_name": "Apex Infra Roads & Civils Ltd.",
        "assigned_by": str(officer_id),
        "status": "IN_PROGRESS",
        "deadline": now + timedelta(days=7),
        "estimated_cost": 28000.0,
        "progress_percentage": 45,
        "progress_logs": [
            {"progress_percentage": 45, "note": "Night lane closure approved. Crack routed and prepped for sealant pouring tonight.", "logged_by": str(contractor_id), "timestamp": now.isoformat()}
        ],
        "created_at": now - timedelta(days=2),
        "updated_at": now,
    })

    print("==================================================")
    print("RoadWatch database successfully seeded!")
    print("==================================================")
    print("Demo User Accounts Available:")
    print("  1. Citizen:               citizen@roadwatch.org       / Citizen123!")
    print("  2. Authority Officer:     officer@roadwatch.org       / Officer123!")
    print("  3. Authority Supervisor:  supervisor@roadwatch.org    / Supervisor123!")
    print("  4. Contractor Manager:    contractor@roadwatch.org    / Contractor123!")
    print("  5. Super Administrator:   admin@roadwatch.org         / Admin123!")
    print("==================================================")


if __name__ == "__main__":
    seed_database()
