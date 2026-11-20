"""
Seed Repairs for Officer Verification
Seeds high-quality contractor repair completions awaiting official P.W.D. Officer verification.
"""
import os
import sys
from pathlib import Path
from datetime import datetime, timedelta
import numpy as np
import cv2

# Set up Django environment
sys.path.insert(0, str(Path(__file__).resolve().parent))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "roadwatch.settings")

import django
django.setup()

from django.conf import settings
from apps.core.db import (
    complaints_col, maintenance_tasks_col, repair_evidence_col,
    status_history_col, users_col, organizations_col, roads_col,
    jurisdictions_col, complaint_images_col, parse_object_id
)
from apps.ai_service.priority_engine import calculate_priority_score


def generate_defect_image(filename: str, defect_type: str, title: str) -> str:
    """Generates an image of a road defect."""
    width, height = 800, 600
    img = np.random.randint(110, 135, (height, width, 3), dtype=np.uint8)

    folder_path = Path(settings.MEDIA_ROOT) / "complaints" / "seed"
    folder_path.mkdir(parents=True, exist_ok=True)
    target_path = folder_path / filename

    if defect_type == "POTHOLE":
        # Dark deep pothole cavity
        cv2.ellipse(img, (400, 300), (160, 100), 12, 0, 360, (35, 35, 35), -1)
        cv2.ellipse(img, (390, 290), (135, 80), 12, 0, 360, (20, 20, 20), -1)
        cv2.ellipse(img, (410, 310), (170, 110), 12, 0, 360, (65, 65, 65), 3)
        # Cracked debris around perimeter
        for _ in range(8):
            x1 = np.random.randint(300, 500)
            y1 = np.random.randint(220, 380)
            cv2.line(img, (x1, y1), (x1 + np.random.randint(-30, 30), y1 + np.random.randint(-30, 30)), (25, 25, 25), 2)
    elif defect_type == "SUBSIDENCE":
        # Sinking depression trench
        cv2.ellipse(img, (400, 320), (280, 70), -5, 0, 360, (50, 50, 50), -1)
        cv2.ellipse(img, (400, 320), (250, 50), -5, 0, 360, (30, 30, 30), -1)
        cv2.line(img, (120, 310), (680, 310), (25, 25, 25), 4)
    elif defect_type == "ALLIGATOR_CRACK":
        # Heavy fatigue alligator cracks
        for _ in range(35):
            x1, y1 = np.random.randint(180, 620), np.random.randint(150, 450)
            x2, y2 = x1 + np.random.randint(-50, 50), y1 + np.random.randint(-50, 50)
            cv2.line(img, (x1, y1), (x2, y2), (28, 28, 28), 3)
            # Connecting spiderweb lines
            cv2.line(img, (x2, y2), (x2 + np.random.randint(-30, 30), y2 + np.random.randint(-30, 30)), (35, 35, 35), 2)
    else:  # MANHOLE_DEFECT
        # Sunken manhole rim
        cv2.circle(img, (400, 300), 110, (40, 40, 40), -1)
        cv2.circle(img, (400, 300), 95, (25, 25, 25), -1)
        cv2.circle(img, (400, 300), 115, (75, 75, 75), 4)
        # Manhole grate ribs
        for angle in range(0, 180, 30):
            rad = np.deg2rad(angle)
            dx = int(80 * np.cos(rad))
            dy = int(80 * np.sin(rad))
            cv2.line(img, (400 - dx, 300 - dy), (400 + dx, 300 + dy), (55, 55, 55), 3)

    # Defect badge header
    cv2.rectangle(img, (0, 0), (800, 45), (15, 23, 42), -1)
    cv2.putText(img, f"DEFECT INSPECTION: {defect_type} - {title[:40]}", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (56, 189, 248), 2)
    cv2.putText(img, "ROADWATCH CIVIC DEFECT LOG - AWAITING REPAIR AUDIT", (20, 580), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 200, 200), 1)

    cv2.imwrite(str(target_path), img)
    return f"complaints/seed/{filename}"


def generate_repair_image(filename: str, defect_type: str, title: str) -> str:
    """Generates an image of a completed road repair with fresh asphalt patch and compaction markings."""
    width, height = 800, 600
    img = np.random.randint(110, 135, (height, width, 3), dtype=np.uint8)

    folder_path = Path(settings.MEDIA_ROOT) / "evidence" / "seed"
    folder_path.mkdir(parents=True, exist_ok=True)
    target_path = folder_path / filename

    if defect_type == "POTHOLE":
        # Fresh dark asphalt patch with clean saw-cut rectangular perimeter
        cv2.rectangle(img, (220, 170), (580, 430), (45, 45, 45), -1)
        # Sealant perimeter line
        cv2.rectangle(img, (218, 168), (582, 432), (20, 20, 20), 3)
        # Roller compaction marks
        cv2.line(img, (240, 230), (560, 230), (52, 52, 52), 2)
        cv2.line(img, (240, 300), (560, 300), (52, 52, 52), 2)
        cv2.line(img, (240, 370), (560, 370), (52, 52, 52), 2)
    elif defect_type == "SUBSIDENCE":
        # Full-width highway asphalt overlay strip
        cv2.rectangle(img, (60, 220), (740, 420), (42, 42, 42), -1)
        cv2.rectangle(img, (58, 218), (742, 422), (18, 18, 18), 3)
        # Center lane line re-applied
        cv2.line(img, (200, 320), (280, 320), (255, 255, 255), 5)
        cv2.line(img, (360, 320), (440, 320), (255, 255, 255), 5)
        cv2.line(img, (520, 320), (600, 320), (255, 255, 255), 5)
    elif defect_type == "ALLIGATOR_CRACK":
        # Smooth resurfaced wearing course
        cv2.rectangle(img, (120, 130), (680, 470), (46, 46, 46), -1)
        cv2.rectangle(img, (118, 128), (682, 472), (22, 22, 22), 3)
        # Fresh asphalt aggregate texture
        for _ in range(80):
            rx, ry = np.random.randint(140, 660), np.random.randint(150, 450)
            cv2.circle(img, (rx, ry), 1, (65, 65, 65), -1)
    else:  # MANHOLE_DEFECT
        # Raised elevated manhole with clean circular concrete collar and flush asphalt ring
        cv2.circle(img, (400, 300), 140, (48, 48, 48), -1)
        cv2.circle(img, (400, 300), 125, (160, 160, 165), 8)  # Concrete collar
        cv2.circle(img, (400, 300), 110, (30, 30, 30), -1)
        cv2.circle(img, (400, 300), 95, (22, 22, 22), -1)
        cv2.circle(img, (400, 300), 112, (15, 15, 15), 3)

    # Completed repair badge header
    cv2.rectangle(img, (0, 0), (800, 45), (6, 78, 59), -1)
    cv2.putText(img, f"COMPLETED REPAIR: {defect_type} - {title[:40]}", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (167, 243, 208), 2)
    cv2.putText(img, "ROADWATCH OFFICIAL CONTRACTOR EVIDENCE - PENDING OFFICER VERIFICATION", (20, 580), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (220, 255, 220), 1)

    cv2.imwrite(str(target_path), img)
    return f"evidence/seed/{filename}"


def seed_repairs():
    print("Seeding Repairs for Officer Verification...")
    now = datetime.utcnow()

    # Lookups
    officer = users_col().find_one({"role": "AUTHORITY_OFFICER"})
    if not officer:
        print("Officer user not found. Please ensure users are seeded.")
        return
    officer_id = str(officer["_id"])
    officer_name = officer.get("name", "Rajesh Kumar (P.W.D. Officer)")

    contractor_user = users_col().find_one({"role": "CONTRACTOR_MANAGER"})
    contractor_user_id = str(contractor_user["_id"]) if contractor_user else officer_id

    citizen_user = users_col().find_one({"role": "CITIZEN"})
    citizen_user_id = str(citizen_user["_id"]) if citizen_user else officer_id

    contractor_org = organizations_col().find_one({"type": "CONTRACTOR"})
    contractor_org_id = str(contractor_org["_id"]) if contractor_org else "CONTRACTOR_ORG_001"
    contractor_name = contractor_org.get("name", "Apex Infra Roads & Civils Ltd.") if contractor_org else "Apex Infra Roads & Civils Ltd."

    jurisdiction = jurisdictions_col().find_one({})
    jurisdiction_id = str(jurisdiction["_id"]) if jurisdiction else "JURISDICTION_001"

    roads = list(roads_col().find({}))
    r1_id = str(roads[0]["_id"]) if len(roads) > 0 else "ROAD_001"
    r2_id = str(roads[1]["_id"]) if len(roads) > 1 else r1_id
    r3_id = str(roads[2]["_id"]) if len(roads) > 2 else r1_id

    repairs_data = [
        {
            "task_ref": "WO-2026-A94101",
            "complaint_ref": "RW-2026-100214",
            "title": "Full-Depth Pothole Patching & Sub-Base Compaction",
            "defect_type": "POTHOLE",
            "road_id": r1_id,
            "road_name": "Mahatma Gandhi Marg (Arterial)",
            "instructions": "Milling of fractured asphalt edges, tack coat application with RS-1 bitumen, 50mm compacted WBM aggregate base, and hot-mix VG-30 wearing course.",
            "work_notes": "Cavity milled to 85mm sound base, air-blast cleaned, applied RS-1 rapid setting emulsion tack coat at 0.35 kg/m2. Filled with 50mm compacted WBM aggregate base and 35mm hot-mix asphalt (VG-30). Compacted using 8-ton vibratory roller with 98.2% Marshall compaction density achieved. Transverse joints sealed with hot-poured elastomeric compound.",
            "location_coords": [75.7682, 31.2241],
            "location_str": "75.7682, 31.2241 (Central Ring Junction)",
            "estimated_cost": 45000.0,
            "actual_cost": 42000.0,
            "hours_ago": 3,
            "defect_img": "rw-2026-100214.jpg",
            "repair_img": "repaired_100214.jpg",
        },
        {
            "task_ref": "WO-2026-T82015",
            "complaint_ref": "RW-2026-218491",
            "title": "Trench Subsidence Re-excavation & Biaxial Geogrid Stabilization",
            "defect_type": "SUBSIDENCE",
            "road_id": r2_id,
            "road_name": "Northern Bypass Ring Road (Expressway)",
            "instructions": "Excavate settled utility trench section, install biaxial geogrid reinforcement sheet, place compacted stone aggregates in 60mm lifts, and pave 60mm dense bituminous macadam.",
            "work_notes": "Excavated 180mm settled utility trench zone across 6-meter span. Laid high-strength biaxial geogrid reinforcement sheet, followed by 120mm graded crushed stone aggregate compacted in two 60mm lifts. Laid 60mm dense bituminous macadam surface course and machine-rolled flush with highway carriageway. Nuclear density gauge test confirmed 99.1% sub-base stability.",
            "location_coords": [75.7820, 31.2385],
            "location_str": "75.7820, 31.2385 (Bypass Mile Marker 14)",
            "estimated_cost": 78000.0,
            "actual_cost": 74500.0,
            "hours_ago": 6,
            "defect_img": "rw-2026-218491.jpg",
            "repair_img": "repaired_218491.jpg",
        },
        {
            "task_ref": "WO-2026-C61944",
            "complaint_ref": "RW-2026-330582",
            "title": "Cold Milling of Alligator Cracking Zone & SAMI Membrane Overlay",
            "defect_type": "ALLIGATOR_CRACK",
            "road_id": r3_id,
            "road_name": "Station Approach Road (Collector)",
            "instructions": "Cold mill top 45mm fractured fatigue cracks over 15x3m carriageway, apply stress absorbing membrane interlayer (SAMI), spray CSS-1h polymer emulsion, and overlay stone matrix asphalt.",
            "work_notes": "Cold-milled 45mm fractured top asphalt course over 15x3m section. Installed Stress Absorbing Membrane Interlayer (SAMI) to arrest reflective cracking. Sprayed CSS-1h polymer emulsion and placed 45mm stone matrix asphalt (SMA-13) wearing course. Edge lines thermal-sealed to prevent water ingress. Friction test score: 68 BPN.",
            "location_coords": [75.7595, 31.2180],
            "location_str": "75.7595, 31.2180 (Near Terminal Cargo Gate)",
            "estimated_cost": 92000.0,
            "actual_cost": 89000.0,
            "hours_ago": 12,
            "defect_img": "rw-2026-330582.jpg",
            "repair_img": "repaired_330582.jpg",
        },
        {
            "task_ref": "WO-2026-M44129",
            "complaint_ref": "RW-2026-419208",
            "title": "Cast Iron Manhole Frame Elevation & M40 Concrete Collar",
            "defect_type": "MANHOLE_DEFECT",
            "road_id": r1_id,
            "road_name": "Mahatma Gandhi Marg (Arterial)",
            "instructions": "Hydraulically elevate sunken manhole frame to match highway crown, cast rapid-hardening M40 concrete structural collar, and pave perimeter with dense hot-mix bitumen.",
            "work_notes": "Hydraulically elevated sunken manhole rim by 48mm to precisely match highway crown contour. Cast 200mm high-early-strength M40 rapid-hardening concrete collar around perimeter with rebar reinforcement. Surfaced surrounding zone with fine-graded hot-mix asphalt and sealed joint with rubberized bitumen mastic. Traffic reopened after 4 hours curing.",
            "location_coords": [75.7640, 31.2215],
            "location_str": "75.7640, 31.2215 (Opposite District Central Library)",
            "estimated_cost": 38000.0,
            "actual_cost": 36500.0,
            "hours_ago": 18,
            "defect_img": "rw-2026-419208.jpg",
            "repair_img": "repaired_419208.jpg",
        },
    ]

    seeded_tasks = []

    for r in repairs_data:
        # 1. Generate defect and repair sample images
        rel_def_path = generate_defect_image(r["defect_img"], r["defect_type"], r["title"])
        rel_rep_path = generate_repair_image(r["repair_img"], r["defect_type"], r["title"])

        def_metadata = {
            "url": f"/api/v1/media/{rel_def_path}",
            "storage_path": rel_def_path,
            "width": 800,
            "height": 600,
            "file_size": 185000,
            "format": "JPEG",
        }

        rep_metadata = {
            "url": f"/api/v1/media/{rel_rep_path}",
            "storage_path": rel_rep_path,
            "width": 800,
            "height": 600,
            "file_size": 178000,
            "format": "JPEG",
        }

        c_time = now - timedelta(days=7, hours=r["hours_ago"])
        submitted_at = now - timedelta(hours=r["hours_ago"])

        # 2. Upsert Complaint in PENDING_VERIFICATION
        existing_c = complaints_col().find_one({"public_reference": r["complaint_ref"]})
        c_doc = {
            "public_reference": r["complaint_ref"],
            "reporter_id": citizen_user_id,
            "road_id": r["road_id"],
            "jurisdiction_id": jurisdiction_id,
            "category": r["defect_type"],
            "description": f"Road hazard at {r['road_name']}: {r['title']}. Requires urgent contractor repair.",
            "location": {
                "type": "Point",
                "coordinates": r["location_coords"],
            },
            "citizen_severity": "CRITICAL" if r["defect_type"] in ("POTHOLE", "SUBSIDENCE") else "HIGH",
            "authority_assessment": {
                "decision": "APPROVED",
                "severity": "CRITICAL" if r["defect_type"] in ("POTHOLE", "SUBSIDENCE") else "HIGH",
                "category": r["defect_type"],
                "reviewed_by": officer_id,
                "reviewer_name": officer_name,
                "reviewed_at": (c_time + timedelta(hours=4)).isoformat(),
            },
            "priority": {
                "score": 82.5 if r["defect_type"] == "POTHOLE" else 76.0,
                "band": "HIGH",
                "is_emergency": r["defect_type"] == "POTHOLE",
                "calculated_at": c_time.isoformat(),
            },
            "support_count": 9,
            "status": "PENDING_VERIFICATION",
            "visibility": "PUBLIC_SUMMARY",
            "images": [def_metadata],
            "created_at": c_time,
            "updated_at": submitted_at,
        }

        if existing_c:
            complaints_col().update_one({"_id": existing_c["_id"]}, {"$set": c_doc})
            complaint_id = str(existing_c["_id"])
        else:
            res_c = complaints_col().insert_one(c_doc)
            complaint_id = str(res_c.inserted_id)

        # 3. Upsert Maintenance Task in COMPLETION_SUBMITTED
        existing_t = maintenance_tasks_col().find_one({"task_reference": r["task_ref"]})
        t_doc = {
            "task_reference": r["task_ref"],
            "complaint_id": complaint_id,
            "complaint_reference": r["complaint_ref"],
            "title": r["title"],
            "instructions": r["instructions"],
            "contractor_org_id": contractor_org_id,
            "contractor_name": contractor_name,
            "assigned_by": officer_id,
            "status": "COMPLETION_SUBMITTED",
            "deadline": now + timedelta(days=4),
            "estimated_cost": r["estimated_cost"],
            "actual_cost": r["actual_cost"],
            "progress_percentage": 100,
            "progress_logs": [
                {
                    "progress_percentage": 25,
                    "note": "Work order mobilized. Area cordoned off with safety cones and warning boards.",
                    "logged_by": contractor_user_id,
                    "timestamp": (c_time + timedelta(days=2)).isoformat(),
                },
                {
                    "progress_percentage": 70,
                    "note": "Sub-base excavation and base compaction completed. Tack coat sprayed.",
                    "logged_by": contractor_user_id,
                    "timestamp": (c_time + timedelta(days=4)).isoformat(),
                },
                {
                    "progress_percentage": 100,
                    "note": r["work_notes"],
                    "logged_by": contractor_user_id,
                    "timestamp": submitted_at.isoformat(),
                },
            ],
            "created_at": c_time + timedelta(days=1),
            "completion_submitted_at": submitted_at,
            "updated_at": submitted_at,
        }

        if existing_t:
            maintenance_tasks_col().update_one({"_id": existing_t["_id"]}, {"$set": t_doc})
            task_id = str(existing_t["_id"])
        else:
            res_t = maintenance_tasks_col().insert_one(t_doc)
            task_id = str(res_t.inserted_id)

        # 4. Upsert Repair Evidence
        existing_ev = repair_evidence_col().find_one({"task_id": task_id})
        ev_doc = {
            "task_id": task_id,
            "complaint_id": complaint_id,
            "storage_path": rel_rep_path,
            "file_metadata": rep_metadata,
            "evidence_type": "AFTER_REPAIR_PHOTO",
            "work_notes": r["work_notes"],
            "location": r["location_str"],
            "submitted_by": contractor_user_id,
            "submitted_at": submitted_at,
        }

        if existing_ev:
            repair_evidence_col().update_one({"_id": existing_ev["_id"]}, {"$set": ev_doc})
        else:
            repair_evidence_col().insert_one(ev_doc)

        # 5. Insert Status History log
        status_history_col().insert_one({
            "entity_type": "maintenance_tasks",
            "entity_id": task_id,
            "previous_status": "IN_PROGRESS",
            "new_status": "COMPLETION_SUBMITTED",
            "actor_id": contractor_user_id,
            "actor_name": "Vikram Malhotra (Contractor)",
            "reason": "Submitted completion photos and density logs for official PWD verification.",
            "timestamp": submitted_at,
        })

        seeded_tasks.append((r["task_ref"], r["complaint_ref"], r["title"], r["road_name"]))

    print(f"Successfully seeded {len(seeded_tasks)} repairs for verification!")
    for t_ref, c_ref, title, road in seeded_tasks:
        print(f"  - [{t_ref}] Linked to {c_ref} on {road}: {title}")


if __name__ == "__main__":
    seed_repairs()
