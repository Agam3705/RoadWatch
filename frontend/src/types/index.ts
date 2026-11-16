export type UserRole = 
  | 'CITIZEN' 
  | 'AUTHORITY_OFFICER' 
  | 'AUTHORITY_SUPERVISOR' 
  | 'CONTRACTOR_MANAGER' 
  | 'CONTRACTOR_FIELD' 
  | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  roles: UserRole[];
  account_status: string;
  is_email_verified: boolean;
  organization_ids?: string[];
  jurisdiction_ids?: string[];
}

export type ComplaintStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'REQUESTED_INFORMATION'
  | 'APPROVED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'PENDING_VERIFICATION'
  | 'RESOLVED'
  | 'REOPENED'
  | 'REJECTED'
  | 'DISPUTED'
  | 'CLOSED'
  | 'WITHDRAWN';

export type DamageCategory =
  | 'POTHOLE'
  | 'LONGITUDINAL_CRACK'
  | 'ALLIGATOR_CRACK'
  | 'RUTTING'
  | 'SUBSIDENCE'
  | 'DEBRIS'
  | 'STREETLIGHT_POLE_DAMAGE'
  | 'DRAINAGE_OVERFLOW'
  | 'OTHER';

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface PriorityScore {
  score: number;
  band: SeverityLevel;
  is_emergency: boolean;
  formula_version: string;
  calculated_at: string;
  components: {
    severity_score: number;
    severity_level: string;
    road_importance_score: number;
    road_type: string;
    vulnerability_score: number;
    corroboration_score: number;
    support_count: number;
  };
  weights: {
    severity: number;
    road_importance: number;
    vulnerability: number;
    corroboration: number;
  };
}

export interface ImageMetadata {
  id?: string;
  url: string;
  storage_path: string;
  width?: number;
  height?: number;
  file_size?: number;
  format?: string;
}

export interface AIPrediction {
  id?: string;
  job_id: string;
  model_name: string;
  model_version: string;
  image_quality: {
    suitable: boolean;
    quality_score: number;
    blur_score?: number;
    brightness?: number;
    flags: string[];
    resolution?: string;
  };
  predictions: Array<{
    class: DamageCategory;
    confidence: number;
    box: [number, number, number, number];
    area_percentage: number;
  }>;
  geometry: Array<{
    type: string;
    class: string;
    coordinates: [number, number, number, number];
    confidence: number;
  }>;
  severity_estimate: {
    level: SeverityLevel;
    score: number;
    method: string;
    damage_area_percentage?: number;
  };
  human_review?: {
    status: 'PENDING_REVIEW' | 'ACCEPTED' | 'MODIFIED' | 'DISMISSED';
    reviewed_by?: string;
    reviewed_at?: string;
    corrected_category?: string;
    corrected_severity?: string;
    comments?: string;
  };
  processing_ms: number;
  warnings: string[];
}

export interface Complaint {
  id: string;
  public_reference: string;
  reporter_id?: string;
  road_id?: string;
  jurisdiction_id?: string;
  category: DamageCategory;
  description: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  citizen_severity: SeverityLevel;
  authority_assessment?: {
    decision?: string;
    severity?: SeverityLevel;
    category?: DamageCategory;
    reviewed_by?: string;
    reviewer_name?: string;
    reviewed_at?: string;
    reason?: string;
  };
  priority: PriorityScore;
  support_count: number;
  status: ComplaintStatus;
  visibility: string;
  images: ImageMetadata[];
  ai_prediction?: AIPrediction;
  has_supported?: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceTask {
  id: string;
  task_reference: string;
  complaint_id: string;
  complaint_reference?: string;
  title: string;
  instructions?: string;
  contractor_org_id?: string;
  contractor_name?: string;
  assigned_by?: string;
  status: 'DRAFT' | 'ASSIGNED' | 'ACCEPTED' | 'DECLINED' | 'IN_PROGRESS' | 'COMPLETION_SUBMITTED' | 'VERIFIED' | 'REWORK_REQUIRED';
  deadline: string;
  estimated_cost?: number;
  actual_cost?: number;
  progress_percentage: number;
  progress_logs?: Array<{
    progress_percentage: number;
    note: string;
    logged_by: string;
    timestamp: string;
  }>;
  blockers?: Array<{
    blocker: string;
    reported_at: string;
    reported_by: string;
  }>;
  complaint?: Complaint;
  evidence?: Array<{
    id: string;
    storage_path: string;
    file_metadata: ImageMetadata;
    evidence_type: string;
    work_notes?: string;
    location?: string;
    submitted_by?: string;
    submitted_at: string;
  }>;
  verifications?: Array<{
    decision: string;
    reviewer_name?: string;
    comments?: string;
    is_fixed?: boolean;
    rating?: number;
    created_at: string;
  }>;
  created_at: string;
  completion_submitted_at?: string;
  verified_at?: string;
}

export interface Road {
  id: string;
  name: string;
  external_road_id?: string;
  road_type: 'HIGHWAY' | 'ARTERIAL' | 'COLLECTOR' | 'LOCAL' | 'RESIDENTIAL';
  jurisdiction_id?: string;
  geometry: {
    type: 'LineString';
    coordinates: Array<[number, number]>;
  };
}

export interface Jurisdiction {
  id: string;
  name: string;
  code: string;
  authority_org_id?: string;
  boundary?: {
    type: 'Polygon';
    coordinates: Array<Array<[number, number]>>;
  };
}

export interface RoadQualityRecord {
  road_id: string;
  road_name: string;
  road_type: string;
  rqi_score: number;
  condition_band: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
  formula_version: string;
  total_defects: number;
  open_defects: number;
  resolved_defects: number;
  components: {
    damage_burden_D: number;
    unresolved_burden_U: number;
    recurrence_F: number;
    age_burden_A: number;
  };
  calculated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  read_at?: string;
  created_at: string;
}
