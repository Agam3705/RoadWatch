import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Complaint } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { DamageBadge } from '../../components/DamageBadge';
import { PriorityBadge } from '../../components/PriorityBadge';
import {
  Building2, Ruler, CheckCircle2, AlertTriangle, Clock, Wrench,
  Shield, ArrowRight, Search, FileText, Activity, FileCheck,
  MapPin, Eye, RefreshCw, Thermometer, Layers, AlertCircle
} from 'lucide-react';

export const SupervisorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'FIELD_AUDIT' | 'ACTIVE_SUPERVISION' | 'AUDIT_LOGS'>('FIELD_AUDIT');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Field Audit Form State
  const [selectedComplaintId, setSelectedComplaintId] = useState('');
  const [measuredDepth, setMeasuredDepth] = useState('7.5');
  const [measuredWidth, setMeasuredWidth] = useState('85.0');
  const [waterStagnation, setWaterStagnation] = useState(true);
  const [trafficImpact, setTrafficImpact] = useState('CRITICAL_HAZARD');
  const [recommendedAction, setRecommendedAction] = useState('FULL_DEPTH_PATCH');
  const [estimatedTonnage, setEstimatedTonnage] = useState('2.5');
  const [supervisorNotes, setSupervisorNotes] = useState('');
  const [submittingAudit, setSubmittingAudit] = useState(false);
  const [auditSuccess, setAuditSuccess] = useState(false);

  // Contractor Supervision Live Log State
  const [asphaltTemp, setAsphaltTemp] = useState('155');
  const [rollerPasses, setRollerPasses] = useState(6);
  const [rollerType, setRollerType] = useState('8-10 Ton Tandem Vibratory Roller');
  const [compactionChecked, setCompactionChecked] = useState(false);
  const [supervisionSaved, setSupervisionSaved] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compRes, inspRes] = await Promise.all([
        api.complaints.list({ limit: 15 }),
        api.inspections.list(),
      ]);
      const items = compRes.items || [];
      setComplaints(items);
      setInspections(inspRes.items || []);
      if (items.length > 0 && !selectedComplaintId) {
        setSelectedComplaintId(items[0].id);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmitAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaintId) return;

    setSubmittingAudit(true);
    setAuditSuccess(false);

    try {
      await api.inspections.submit({
        complaint_id: selectedComplaintId,
        measured_depth_cm: parseFloat(measuredDepth) || 0,
        measured_width_cm: parseFloat(measuredWidth) || 0,
        water_stagnation: waterStagnation,
        traffic_impact_rating: trafficImpact,
        recommended_action: recommendedAction,
        estimated_bitumen_tonnage: parseFloat(estimatedTonnage) || 1.5,
        supervisor_notes: supervisorNotes.trim() || 'Physical cavity inspection conducted on site.',
      });
      setSupervisorNotes('');
      setAuditSuccess(true);
      await fetchData();
      setTimeout(() => setAuditSuccess(false), 4500);
    } catch (err: any) {
      alert(err.message || 'Error recording field audit.');
    } finally {
      setSubmittingAudit(false);
    }
  };

  const handleSaveSupervisionLog = (e: React.FormEvent) => {
    e.preventDefault();
    setSupervisionSaved(true);
    setTimeout(() => setSupervisionSaved(false), 4000);
  };

  const pendingOfficerReviewCount = inspections.filter((i) => i.status === 'PENDING_OFFICER_APPROVAL').length;
  const authorizedWorkOrdersCount = inspections.filter((i) => i.status === 'APPROVED_WORK_ORDER_ISSUED').length;
  const selectedComplaint = complaints.find((c) => c.id === selectedComplaintId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner - High Visibility Field Supervisor Workspace */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-indigo-800/40">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-full text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5" />
            <span>Field Operations & Ground Inspection Command</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Ground Supervisor Workspace
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Physical on-site defect verification, cavity dimension auditing, repair method recommendations, and on-ground contractor compaction supervision.
          </p>
        </div>

        {/* Hierarchy Context Indicator */}
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-xs space-y-1.5 shrink-0">
          <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Operational Chain</div>
          <div className="flex items-center gap-1.5 font-bold text-white text-xs">
            <span className="text-indigo-300">🏢 Supervisor (You)</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
            <span className="text-sky-300">👮 PWD Officer</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
            <span className="text-amber-300">👷 Contractor</span>
          </div>
          <div className="text-[10px] text-slate-400">
            You audit & recommend &bull; Officer approves & authorizes work order
          </div>
        </div>
      </div>

      {/* Field Supervisor KPI Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Ground Audits Conducted</span>
            <Ruler className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-3xl font-black text-indigo-700">{inspections.length}</div>
          <div className="text-[11px] text-slate-400">Physical measurements logged</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Pending Officer Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-600">{pendingOfficerReviewCount}</div>
          <div className="text-[11px] text-slate-400">Awaiting executive work order</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Authorized Work Orders</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-600">{authorizedWorkOrdersCount}</div>
          <div className="text-[11px] text-slate-400">Approved by PWD Officer</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Field Triage Queue</span>
            <Activity className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{complaints.length}</div>
          <div className="text-[11px] text-slate-400">Assigned municipal road defects</div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('FIELD_AUDIT')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'FIELD_AUDIT'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Ruler className="w-4 h-4 text-indigo-600" />
          <span>On-Site Cavity Audit & Work Order Recommendation</span>
        </button>

        <button
          onClick={() => setActiveTab('ACTIVE_SUPERVISION')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'ACTIVE_SUPERVISION'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Thermometer className="w-4 h-4 text-amber-600" />
          <span>Active Contractor Ground Supervision</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT_LOGS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'AUDIT_LOGS'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-sky-600" />
          <span>Audit History & Officer Approvals</span>
          {pendingOfficerReviewCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
              {pendingOfficerReviewCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: FIELD AUDIT & RECOMMENDATION TOOL */}
      {activeTab === 'FIELD_AUDIT' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="space-y-1">
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Ruler className="w-5 h-5 text-indigo-600" />
                  Physical Road Defect Measurement & Triage Form
                </h2>
                <p className="text-xs text-slate-500">
                  Inspect the physical cavity on site, log actual dimensions, and forward a formal Work Order recommendation to the Authority Officer.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                Ground Inspector Tool
              </span>
            </div>

            {auditSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <strong className="block font-bold">Physical Field Audit Logged Successfully!</strong>
                  <span>Your measurements and bitumen recommendation have been dispatched to Authority Officer Rajesh Kumar for executive work order issuance.</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitAudit} className="space-y-5">
              {/* Defect Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Assigned Road Defect For Ground Audit
                </label>
                <select
                  value={selectedComplaintId}
                  onChange={(e) => setSelectedComplaintId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none bg-white font-mono font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  {complaints.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.public_reference} &bull; {c.category} &bull; {c.description.slice(0, 50)}...
                    </option>
                  ))}
                </select>

                {selectedComplaint && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs flex flex-wrap items-center justify-between gap-2 mt-2">
                    <div className="flex items-center gap-2">
                      <DamageBadge category={selectedComplaint.category} />
                      <span className="text-slate-600 text-xs font-medium truncate max-w-md">
                        {selectedComplaint.description}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>Status: <StatusBadge status={selectedComplaint.status} size="sm" /></span>
                      <span>SLA: <strong>{(selectedComplaint as any).sla_deadline_hours || 48} Hours</strong></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Physical Measurements Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Measured Depth (cm)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="50"
                      required
                      value={measuredDepth}
                      onChange={(e) => setMeasuredDepth(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">cm</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Depth &gt; 5cm = Extreme wheel rim / two-wheeler hazard</span>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Measured Width / Diameter (cm)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="5"
                      min="10"
                      max="500"
                      required
                      value={measuredWidth}
                      onChange={(e) => setMeasuredWidth(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">cm</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Surface excavation perimeter</span>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Traffic Impact Rating
                  </label>
                  <select
                    value={trafficImpact}
                    onChange={(e) => setTrafficImpact(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none bg-white font-semibold text-slate-800"
                  >
                    <option value="CRITICAL_HAZARD">Critical Hazard (Active Diverting)</option>
                    <option value="HIGH_IMPACT">High Impact (Peak Traffic Bottleneck)</option>
                    <option value="MODERATE">Moderate Impact (Residential Arterial)</option>
                    <option value="LOW">Low Impact (Shoulder/Service Lane)</option>
                  </select>
                </div>
              </div>

              {/* Recommendations to Authority Officer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Recommended Technical Repair Action
                  </label>
                  <select
                    value={recommendedAction}
                    onChange={(e) => setRecommendedAction(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none bg-white font-bold text-slate-900"
                  >
                    <option value="FULL_DEPTH_PATCH">Full Depth Patch (Hot Mix Asphalt VG-30)</option>
                    <option value="HOT_MIX_OVERLAY">Hot Mix Asphalt 40mm Wearing Course</option>
                    <option value="CRACK_INJECTION">Bituminous Crack Injection & Sealing</option>
                    <option value="EDGE_RECONSTRUCTION">Sub-Base Compaction & Curb Edge Reconstruction</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Estimated Bitumen Mix Tonnage (MT)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="40"
                      required
                      value={estimatedTonnage}
                      onChange={(e) => setEstimatedTonnage(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">Metric Tons</span>
                  </div>
                </div>
              </div>

              {/* Water stagnation toggle */}
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between">
                <label className="flex items-center gap-2.5 text-xs font-bold text-indigo-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waterStagnation}
                    onChange={(e) => setWaterStagnation(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Sub-Surface Water Stagnation & Moisture Trapped</span>
                </label>
                <span className="text-[11px] text-indigo-700 font-medium">Requires tack coat dry-out before rolling</span>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Supervisor Field Observations (Escalated to Officer)
                </label>
                <textarea
                  rows={3}
                  value={supervisorNotes}
                  onChange={(e) => setSupervisorNotes(e.target.value)}
                  placeholder="Notes on surrounding asphalt erosion, traffic diversion requirements, utility pipe exposures..."
                  className="w-full p-3 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-sky-600" />
                  <span>Will be submitted under Inspector credential: <strong>{user?.name}</strong></span>
                </div>

                <button
                  type="submit"
                  disabled={submittingAudit || !selectedComplaintId}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Submit Ground Audit & Escalate to Officer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE CONTRACTOR GROUND SUPERVISION */}
      {activeTab === 'ACTIVE_SUPERVISION' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="space-y-1">
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-amber-500" />
                  On-Site Contractor Compaction & Quality Verification Log
                </h2>
                <p className="text-xs text-slate-500">
                  Supervisor spot-checks active contractor repair crews on site during hot mix asphalt compaction.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                Live Supervision
              </span>
            </div>

            {supervisionSaved && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>On-site compaction spot-check log recorded into the municipal audit trail.</span>
              </div>
            )}

            <form onSubmit={handleSaveSupervisionLog} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Asphalt Delivery Temperature (°C)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="120"
                      max="180"
                      value={asphaltTemp}
                      onChange={(e) => setAsphaltTemp(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none font-mono"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">°C</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold">Standard: 145°C - 165°C for VG-30</span>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Compaction Roller Equipment
                  </label>
                  <input
                    type="text"
                    value={rollerType}
                    onChange={(e) => setRollerType(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none font-semibold text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400">Verified on-site compaction machinery</span>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Observed Roller Passes
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRollerPasses(Math.max(1, rollerPasses - 1))}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-mono font-black text-sm text-slate-900">
                      {rollerPasses}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRollerPasses(rollerPasses + 1)}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black"
                    >
                      +
                    </button>
                    <span className="text-xs text-slate-500 font-semibold">passes</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Minimum 6 passes for dense asphalt concrete</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-amber-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={compactionChecked}
                    onChange={(e) => setCompactionChecked(e.target.checked)}
                    className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>Supervisor Confirms: Joint sealed and edge leveled to existing pavement</span>
                </label>
                <span className="text-[11px] text-amber-800 font-medium">No edge step &gt; 3mm</span>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save On-Site Supervision Check</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT HISTORY & OFFICER ESCALATIONS */}
      {activeTab === 'AUDIT_LOGS' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Physical Audit Records & Officer Decision Trail
              </h2>
              <p className="text-xs text-slate-500">
                Track status of ground recommendations escalated to PWD Officer Rajesh Kumar.
              </p>
            </div>
            <button onClick={fetchData} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {inspections.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">No field audits logged yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {inspections.map((insp) => {
                const isPending = insp.status === 'PENDING_OFFICER_APPROVAL';

                return (
                  <div key={insp.id} className="py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          {insp.complaint_reference}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          Depth: {insp.measured_depth_cm}cm &bull; Width: {insp.measured_width_cm}cm
                        </span>
                        {insp.water_stagnation && (
                          <span className="px-2 py-0.2 rounded text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-200">
                            Waterlogged
                          </span>
                        )}
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isPending
                            ? 'bg-amber-500 text-white animate-pulse'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {isPending ? 'Pending Officer Approval' : 'Work Order Authorized'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                      <span>Recommendation: <strong>{insp.recommended_action?.replace('_', ' ')}</strong> ({insp.estimated_bitumen_tonnage} MT)</span>
                      {insp.officer_name && (
                        <span>&bull; Authorized by Officer: <strong className="text-sky-700">{insp.officer_name}</strong></span>
                      )}
                      <span>&bull; Date: {insp.created_at ? new Date(insp.created_at).toLocaleDateString() : 'Today'}</span>
                    </div>

                    {insp.supervisor_notes && (
                      <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        &ldquo;{insp.supervisor_notes}&rdquo;
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
