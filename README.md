# RoadWatch: AI-Assisted Geospatial Road Condition Monitoring & Maintenance Accountability Platform

> **Civic Technology / GovTech / Smart Infrastructure Platform**  
> *Designed and implemented strictly in adherence to the Full Product Requirements Document (PRD).*

---

## 1. Executive Summary & Product Architecture

RoadWatch connects citizens, municipal public works authorities (P.W.D.), road maintenance contractors, and administrators into an integrated, auditable civic infrastructure operations platform.

- **Frontend**: React 18 + Vite + Tailwind CSS + Lucide Icons + Leaflet GIS.
- **Backend**: Django 6 + Django REST Framework with PyMongo repository pattern (MongoDB-native; zero relational database dependency).
- **Database**: MongoDB 8.3 with spherical `2dsphere` geospatial indexes on GeoJSON Point, LineString, and Polygon documents.
- **AI Computer Vision Service**: Python + FastAPI + OpenCV + YOLO-compatible road damage detection model (potholes, longitudinal cracks, alligator cracking, subsidence, rutting) and image quality validator (blur, exposure, dimensions).
- **Decision Intelligence Engine**: Explainable Priority formula $P = 0.35S + 0.25T + 0.20V + 0.20R$ with human-in-the-loop review.
- **Pavement Analytics**: Road Quality Index $RQI = 100 - (0.40D + 0.25U + 0.20F + 0.15A)$.
- **Persistent Media Storage**: Render persistent disk or local disk (`MEDIA_ROOT`); **zero AWS S3 bucket dependency**.
- **Deployment Topology**: Vercel (Frontend) & Render (Backend API, AI Microservice, Background Worker, Redis).

---

## 2. Pre-Seeded Demo User Accounts

The system includes pre-seeded accounts and an **Instant 1-Click Demo Switcher** directly in the top navigation bar:

| Role | Email | Password | Name / Jurisdiction |
| :--- | :--- | :--- | :--- |
| **Citizen Reporter** | `citizen@roadwatch.org` | `Citizen123!` | Priya Sharma (Citizen) |
| **Authority Officer** | `officer@roadwatch.org` | `Officer123!` | Rajesh Kumar (P.W.D. Officer - Ward 12 & 15) |
| **Authority Supervisor**| `supervisor@roadwatch.org`| `Supervisor123!`| Ananya Desai (Chief Municipal Engineer) |
| **Contractor Manager** | `contractor@roadwatch.org` | `Contractor123!` | Vikram Malhotra (Apex Infra Roads & Civils) |
| **Super Administrator** | `admin@roadwatch.org` | `Admin123!` | System Administrator (Full Platform Governance) |

---

## 3. Quick Start Guide (Local Development)

### Prerequisites
- Python 3.11+ (tested on Python 3.14)
- Node.js 18+ (tested on Node v26)
- MongoDB 7.0+ (running locally on `mongodb://localhost:27017/`)

### Option A: Local Native Execution

#### 1. Start MongoDB
Ensure MongoDB is running locally on port 27017:
```bash
# Verify connection
mongod --version
```

#### 2. Backend & Database Seeding
```bash
# From repository root
cd backend

# Activate virtual environment
..\venv\Scripts\activate   # On Windows
# or source ../venv/bin/activate on Linux/macOS

# Seed realistic database records (roads, jurisdictions, complaints with AI detections, work orders)
python seed_data.py

# Run Django REST API (port 8000)
python manage.py runserver 8000
```

#### 3. AI Computer Vision Microservice (Optional / Separate Process)
```bash
cd ai_service
uvicorn main:app --host 0.0.0.0 --port 8001
# Note: If this microservice is offline, the Django backend automatically falls back
# to its internal in-process OpenCV detection pipeline seamlessly!
```

#### 4. Frontend Application
```bash
cd frontend
npm install
npm run dev
# App will be accessible at: http://localhost:5173
```

---

### Option B: Docker Compose (One-Command Full Stack)

```bash
docker-compose up --build
```
This boots up MongoDB, Redis, the FastAPI AI microservice, the Django REST API, and the React Vite frontend together.

---

## 4. Key Workflows & Features Implemented

### 4.1 Citizen Reporting Journey
1. **Guided Defect Submission**: Interactive damage category picker (Pothole, Longitudinal Crack, Alligator Crack, Subsidence, Rutting, Debris).
2. **Interactive GIS Location Picker**: Pinpoint on Leaflet map with address coordinates and one-click "Use My GPS" geolocation.
3. **Live Duplicate Detection Drawer**: Geospatial radius query searches nearby reports within 300m in real-time. Citizens can choose to "Support Existing Report" (avoiding duplicate records while increasing corroboration $R$) or continue with a new submission.
4. **Multi-Photo Upload**: Safe image validation, EXIF sanitization, persistent disk storage, and immediate automated AI scan.

### 4.2 AI Damage Detection & Decision Intelligence
- **OpenCV Quality Check**: Laplacian variance blur scoring ($< 75$ flagged as blurry), mean pixel intensity exposure checks ($< 35$ dark, $> 235$ overexposed).
- **Defect Detection**: Bounding box extraction with confidence scores, defect area calculation, and severity classification.
- **Explainable Priority Score Formula**:
  $$P = 0.35S + 0.25T + 0.20V + 0.20R$$
  - $S$: Assessed Damage Severity (Critical=95, High=75, Medium=50, Low=25)
  - $T$: Road Classification Importance (Highway=95, Arterial=85, Collector=65, Local=40)
  - $V$: Vulnerable Infrastructure Proximity (Schools/Hospitals within 500m = 85, otherwise 30)
  - $R$: Independent Citizen Corroboration ($(\text{supporters} + 1) \times 20$, capped at 100)
- **Human-in-the-Loop Override**: Officers can accept, modify, or dismiss AI predictions with mandatory reasons preserved for model drift governance.

### 4.3 Maintenance Work Orders & Contractor Execution
- **Work Order Dispatch**: Authority officers generate task references (`WO-2026-XXXXXX`) assigned to accredited contractor organizations with deadlines and budgets.
- **Contractor Actions**: Accept or decline assignment with reason, log daily progress percentage, and report blockers.
- **Repair Completion Evidence**: Multi-photo upload of after-repair patches with work logs and on-site coordinates.
- **Contractor Self-Verification Prevention**: **Strictly enforced server-side** (contractors are prohibited from verifying their own repair work).

### 4.4 Verification & Accountability Closure
- **Before/After Evidence Comparison**: Side-by-side or interactive split-overlay slider comparing the citizen's original defect photo with the contractor's repair photo.
- **Authority Verification**: Accept (transitions task to `VERIFIED` and complaint to `RESOLVED`) or Reject (marks `REWORK_REQUIRED` and reopens complaint).
- **Citizen Feedback**: Citizens who reported or supported the issue can rate the repair (1–5 stars) and confirm whether the road is genuinely fixed.

### 4.5 Road Quality Index (RQI)
- Algorithmic pavement indicator:
  $$RQI = 100 - (0.40D + 0.25U + 0.20F + 0.15A)$$
  - $D$: Damage burden (40%)
  - $U$: Unresolved issue burden (25%)
  - $F$: Recurrence frequency in same segment (20%)
  - $A$: Age backlog burden (15%)

---

## 5. Automated Test Suite

Run the automated backend test suite:
```bash
cd backend
pytest -v tests/test_api.py
```

### Verified Test Cases:
1. `test_health_check`: Database ping, persistent storage check.
2. `test_auth_login_invalid`: Proper 401 unauthorized handling.
3. `test_auth_login_valid`: JWT token issuance, user profile parsing.
4. `test_priority_score_formula`: $P = 0.35S + 0.25T + 0.20V + 0.20R$ mathematical verification.
5. `test_geospatial_nearby_query`: Spherical 2dsphere proximity search.
6. `test_complaints_list_and_public_sanitization`: Privacy by design (strips private citizen email/phone in public queries).
7. `test_citizen_report_submission`: GeoJSON coordinates and public tracking reference generation.
8. `test_citizen_support_workflow`: Citizen corroboration and duplicate voting prevention.
9. `test_contractor_self_verification_prohibited`: Enforces server-side security rule that contractors cannot approve their own repairs.
10. `test_road_quality_index_calculation`: Validates RQI formula calculation and component deductions.

---

## 6. Cloud Deployment Instructions

### Frontend on Vercel
1. Connect your repository to Vercel.
2. Set root directory to `frontend/` (or use the root `vercel.json`).
3. Set environment variable:
   - `VITE_API_BASE_URL`: `https://roadwatch-api.onrender.com/api/v1`
4. Deploy! Rewrites and SPA deep-linking are preconfigured in `vercel.json`.

### Backend & AI Service on Render
1. In Render Dashboard, click **New > Blueprint**.
2. Select your repository (`render.yaml` will be auto-detected).
3. Provide your `MONGODB_URI` (from MongoDB Atlas).
4. Render will automatically spin up:
   - `roadwatch-backend` with a 10GB persistent disk mounted at `/var/data/media`
   - `roadwatch-ai-service` standard microservice
   - `roadwatch-redis` private cache/broker
5. Database migrations/indexes will initialize automatically on deployment!
