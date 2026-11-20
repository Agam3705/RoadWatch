import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Complaint } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { DamageBadge } from '../../components/DamageBadge';
import { PriorityBadge } from '../../components/PriorityBadge';
import {
  Shield, CheckSquare, Wrench, AlertTriangle, ArrowRight,
  ClipboardList, CheckCircle2, XCircle, TrendingUp, BarChart3, Layers,
  Users, UserCheck, UserX, Clock, Search, Filter, Building2,
  RefreshCw, AlertCircle, Phone, Mail, Award, Ruler, Check, FileCheck
} from 'lucide-react';

export const AuthorityDashboard: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'OPERATIONS' | 'VERIFICATIONS' | 'FIELD_AUDITS'>('OPERATIONS');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Personnel & Profile Verification State
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [personnelStats, setPersonnelStats] = useState<any>(null);
  const [personnelLoading, setPersonnelLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'CONTRACTOR' | 'SUPERVISOR'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED'>('PENDING_APPROVAL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; user: any | null; notes: string }>({
    open: false,
    user: null,
    notes: '',
  });

  // Field Inspections State (Supervisor Ground Audits & Officer Work Orders)
  const [inspections, setInspections] = useState<any[]>([]);
  const [inspectionsLoading, setInspectionsLoading] = useState(false);
  const [selectedComplaintId, setSelectedComplaintId] = useState('');
  const [measuredDepth, setMeasuredDepth] = useState('8.0');
  const [measuredWidth, setMeasuredWidth] = useState('90.0');
  const [waterStagnation, setWaterStagnation] = useState(true);
  const [trafficImpact, setTrafficImpact] = useState('CRITICAL_HAZARD');
  const [recommendedAction, setRecommendedAction] = useState('FULL_DEPTH_PATCH');
  const [estimatedTonnage, setEstimatedTonnage] = useState('2.5');
  const [supervisorNotes, setSupervisorNotes] = useState('');
  const [submittingAudit, setSubmittingAudit] = useState(false);
  const [auditSuccess, setAuditSuccess] = useState(false);

  const fetchOverviewAndComplaints = () => {
    Promise.all([
      api.complaints.list({ limit: 10 }),
      api.analytics.overview(),
    ]).then(([compRes, overRes]) => {
      setComplaints(compRes.items || []);
      setOverview(overRes);
      if (compRes.items && compRes.items.length > 0 && !selectedComplaintId) {
        setSelectedComplaintId(compRes.items[0].id);
      }
    }).catch(() => {})
      .finally(() => setLoading(false));
  };

  const fetchPersonnel = () => {
    setPersonnelLoading(true);
    const params: any = {};
    if (searchQuery) params.q = searchQuery;
    if (statusFilter !== 'ALL') params.status = statusFilter;

    if (roleFilter === 'CONTRACTOR') {
      params.role = 'CONTRACTOR_MANAGER';
    } else if (roleFilter === 'SUPERVISOR') {
      params.role = 'AUTHORITY_SUPERVISOR';
    }

    api.admin.users(params).then((res) => {
      const relevant = (res.items || []).filter((u: any) =>
        ['CONTRACTOR_MANAGER', 'CONTRACTOR_FIELD', 'CONTRACTOR', 'AUTHORITY_SUPERVISOR'].includes(u.role)
      );
      setPersonnel(relevant);
      setPersonnelStats(res.stats || null);
    }).catch(() => {})
      .finally(() => setPersonnelLoading(false));
  };

  const fetchInspections = () => {
    setInspectionsLoading(true);
    api.inspections.list().then((res) => {
      setInspections(res.items || []);
    }).catch(() => {})
      .finally(() => setInspectionsLoading(false));
  };

  useEffect(() => {
    fetchOverviewAndComplaints();
    fetchPersonnel();
    fetchInspections();
  }, []);

  useEffect(() => {
    if (activeTab === 'VERIFICATIONS') {
      fetchPersonnel();
    } else if (activeTab === 'FIELD_AUDITS') {
      fetchInspections();
    }
  }, [activeTab, roleFilter, statusFilter, searchQuery]);

  // Handle Supervisor submitting a physical field audit
  const handleSubmitFieldAudit = async (e: React.FormEvent) => {
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
        supervisor_notes: supervisorNotes.trim() || 'Physical cavity audit conducted on site.',
      });
      setSupervisorNotes('');
      setAuditSuccess(true);
      fetchInspections();
      fetchOverviewAndComplaints();
      setTimeout(() => setAuditSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || 'Error recording field audit.');
    } finally {
      setSubmittingAudit(false);
    }
  };

  // Handle Officer authorizing a work order based on supervisor's audit
  const handleOfficerAuthorizeWorkOrder = async (inspection: any) => {
    const contractorName = prompt('Enter Contractor Name to assign this Municipal Work Order:', 'Metro Road Infra Ltd');
    if (!contractorName) return;

    const notes = prompt('Enter Work Order Authorization Remarks / Budget Code:', 'Approved under Q4 Municipal Road Fund. 48h emergency SLA.');
    if (notes === null) return;

    setActionLoading(inspection.id);
    try {
      await api.inspections.review(inspection.id, {
        decision: 'APPROVE_WORK_ORDER',
        contractor_name: contractorName,
        officer_notes: notes,
      });
      alert(`Work Order officially authorized and assigned to ${contractorName}!`);
      fetchInspections();
      fetchOverviewAndComplaints();
    } catch (err: any) {
      alert(err.message || 'Error authorizing work order.');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'VERIFICATIONS') {
      fetchPersonnel();
    } else if (activeTab === 'FIELD_AUDITS') {
      fetchInspections();
    }
  }, [activeTab, roleFilter, statusFilter, searchQuery]);

  const handleApprove = async (user: any) => {
    if (!confirm(`Approve and activate ${user.role.replace('_', ' ')} registration for ${user.name}?`)) return;
    setActionLoading(user.id);
    try {
      await api.admin.updateUserStatus(user.id, 'APPROVE');
      alert(`Successfully approved ${user.name} (${user.role.replace('_', ' ')}). An activation notice was dispatched.`);
      fetchPersonnel();
    } catch (err: any) {
      alert(err.message || 'Error approving candidate profile.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectDialog.user) return;
    setActionLoading(rejectDialog.user.id);
    try {
      await api.admin.updateUserStatus(rejectDialog.user.id, 'REJECT', { notes: rejectDialog.notes });
      alert(`Registration for ${rejectDialog.user.name} marked as REJECTED.`);
      setRejectDialog({ open: false, user: null, notes: '' });
      fetchPersonnel();
    } catch (err: any) {
      alert(err.message || 'Error rejecting candidate.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (user: any) => {
    const isSuspended = user.account_status === 'SUSPENDED';
    const action = isSuspended ? 'ACTIVATE' : 'SUSPEND';
    const reason = prompt(`Enter reason for ${action.toLowerCase()}ing ${user.name}:`, isSuspended ? 'Compliance verified' : 'SLA breach or credential audit');
    if (reason === null) return;

    setActionLoading(user.id);
    try {
      await api.admin.updateUserStatus(user.id, action, { notes: reason });
      alert(`User status updated to ${action === 'ACTIVATE' ? 'ACTIVE' : 'SUSPENDED'}.`);
      fetchPersonnel();
    } catch (err: any) {
      alert(err.message || 'Error updating status.');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingReviewCount = complaints.filter((c) => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW').length;
  const inProgressCount = complaints.filter((c) => c.status === 'IN_PROGRESS' || c.status === 'ASSIGNED').length;
  const pendingVerificationCount = complaints.filter((c) => c.status === 'PENDING_VERIFICATION').length;
  const pendingPersonnelCount = (personnelStats?.pending_contractors || 0) + (personnelStats?.pending_supervisors || 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-500/20 text-sky-400 border border-sky-400/30 rounded-full text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" />
            <span>P.W.D. Municipal Operations Command</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Authority Command Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Triage citizen submissions, dispatch accountable work orders, verify completed repairs, and manage & approve municipal contractors and supervisors.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/authority/review-queue"
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <ClipboardList className="w-4 h-4" /> Review Queue
          </Link>
          <Link
            to="/authority/verification"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <CheckSquare className="w-4 h-4" /> Verify Repairs
          </Link>
        </div>
      </div>

      {/* Main Mode Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('OPERATIONS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'OPERATIONS'
              ? 'bg-white text-brand-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Road Defect Triage & Operations</span>
        </button>

        <button
          onClick={() => setActiveTab('FIELD_AUDITS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'FIELD_AUDITS'
              ? 'bg-white text-brand-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Ruler className="w-4 h-4 text-indigo-600" />
          <span>Ground Audits & Work Order Dispatch</span>
          {inspections.filter((i) => i.status === 'PENDING_OFFICER_APPROVAL').length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-black">
              {inspections.filter((i) => i.status === 'PENDING_OFFICER_APPROVAL').length} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('VERIFICATIONS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'VERIFICATIONS'
              ? 'bg-white text-brand-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4 text-emerald-600" />
          <span>Personnel & Profile Verification</span>
          {pendingPersonnelCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black animate-pulse">
              {pendingPersonnelCount} Pending
            </span>
          )}
        </button>
      </div>

      {activeTab === 'OPERATIONS' && (
        <>
          {/* KPI Counters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              to="/authority/review-queue"
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1 hover:border-brand-400 transition-colors"
            >
              <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
                <span>Pending Review</span>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              </div>
              <div className="text-3xl font-black text-amber-600">
                {overview?.pending_review_complaints ?? pendingReviewCount}
              </div>
              <div className="text-[11px] text-slate-400">Needs officer triage & approval</div>
            </Link>

            <Link
              to="/authority/verification"
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1 hover:border-brand-400 transition-colors"
            >
              <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
                <span>Pending Verification</span>
                <span className="w-2 h-2 rounded-full bg-sky-500" />
              </div>
              <div className="text-3xl font-black text-brand-600">
                {overview?.pending_verification ?? pendingVerificationCount}
              </div>
              <div className="text-[11px] text-slate-400">Repair photos submitted</div>
            </Link>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
                <span>Active Work Orders</span>
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
              </div>
              <div className="text-3xl font-black text-slate-900">
                {overview?.in_progress_complaints ?? inProgressCount}
              </div>
              <div className="text-[11px] text-slate-400">With contractors</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
                <span>Resolution Rate</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <div className="text-3xl font-black text-emerald-600">
                {overview?.resolution_rate_pct ?? '83.3'}%
              </div>
              <div className="text-[11px] text-slate-400">Verified & closed</div>
            </div>
          </div>

          {/* Priority Triage Queue Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-brand-600" />
                  Priority Triage & Review Queue
                </h2>
                <p className="text-xs text-slate-500">Sorted by explainable Priority Score: P = 0.35S + 0.25T + 0.20V + 0.20R</p>
              </div>
              <Link to="/authority/review-queue" className="text-xs font-bold text-brand-600 hover:underline">
                View All Reports &rarr;
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase border-y border-slate-200 font-bold">
                  <tr>
                    <th className="py-3 px-4">Ref #</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Priority Score</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {complaints.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{c.public_reference}</td>
                      <td className="py-3 px-4"><DamageBadge category={c.category} /></td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs truncate">{c.description}</td>
                      <td className="py-3 px-4"><PriorityBadge priority={c.priority} level={c.citizen_severity} /></td>
                      <td className="py-3 px-4"><StatusBadge status={c.status} size="sm" /></td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/authority/review/${c.id}`}
                          className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold rounded-lg transition-colors"
                        >
                          Inspect &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: GROUND AUDITS & WORK ORDER DISPATCH */}
      {activeTab === 'FIELD_AUDITS' && (
        <div className="space-y-6">
          {/* Governance Hierarchy Banner */}
          <div className="bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 border border-indigo-200 rounded-3xl p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-600 text-white rounded-lg">
                    <Ruler className="w-4 h-4" />
                  </span>
                  <h2 className="text-base font-black text-slate-900">
                    Ground Triage Audits & Executive Work Order Dispatch
                  </h2>
                </div>
                <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                  <strong>Authority Supervisor</strong> conducts physical on-site cavity audits and recommends technical repair methods.
                  <strong> Authority Officer</strong> evaluates the field audit, signs off on municipal budget, and authorizes official work orders to contractors.
                </p>
              </div>

              <div className="bg-white/90 p-3 rounded-2xl border border-indigo-100 text-xs shrink-0 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operational Workflow</div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                  <span className="text-indigo-700 font-bold">🏢 Supervisor (Field Audit)</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="text-sky-700 font-bold">👮 Officer (Work Order)</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="text-emerald-700 font-bold">👷 Contractor (Repair)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Supervisor Physical Inspection Submission Desk */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-indigo-600" />
                  Log Physical On-Site Field Audit & Recommend Work Order
                </h3>
                <p className="text-xs text-slate-500">
                  Executed by Field Supervisors on site prior to contractor assignment.
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                Supervisor Desk
              </span>
            </div>

            {auditSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Physical field audit logged! Forwarded to Authority Officer for work order authorization.</span>
              </div>
            )}

            <form onSubmit={handleSubmitFieldAudit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Select Target Defect</label>
                  <select
                    value={selectedComplaintId}
                    onChange={(e) => setSelectedComplaintId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none bg-white font-mono"
                  >
                    {complaints.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.public_reference} &bull; {c.category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Measured Depth (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="50"
                    value={measuredDepth}
                    onChange={(e) => setMeasuredDepth(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                    placeholder="e.g. 8.5"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Measured Width (cm)</label>
                  <input
                    type="number"
                    step="5"
                    min="10"
                    max="500"
                    value={measuredWidth}
                    onChange={(e) => setMeasuredWidth(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                    placeholder="e.g. 95"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Traffic Impact Rating</label>
                  <select
                    value={trafficImpact}
                    onChange={(e) => setTrafficImpact(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none bg-white"
                  >
                    <option value="CRITICAL_HAZARD">Critical Hazard (Immediate)</option>
                    <option value="HIGH_IMPACT">High Traffic Impact</option>
                    <option value="MODERATE">Moderate Impact</option>
                    <option value="LOW">Low / Shoulder Lane</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Recommended Repair Method</label>
                  <select
                    value={recommendedAction}
                    onChange={(e) => setRecommendedAction(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none bg-white font-semibold text-slate-800"
                  >
                    <option value="FULL_DEPTH_PATCH">Full Depth Patch (Bitumen VG-30)</option>
                    <option value="HOT_MIX_OVERLAY">Hot Mix Asphalt 40mm Overlay</option>
                    <option value="CRACK_INJECTION">Bituminous Crack Injection</option>
                    <option value="EDGE_RECONSTRUCTION">Shoulder & Curb Edge Reconstruction</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Est. Bitumen Mix (MT)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="50"
                    value={estimatedTonnage}
                    onChange={(e) => setEstimatedTonnage(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                    placeholder="e.g. 2.5"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Supervisor On-Site Notes</label>
                <textarea
                  rows={2}
                  value={supervisorNotes}
                  onChange={(e) => setSupervisorNotes(e.target.value)}
                  placeholder="Record cavity characteristics, moisture levels, traffic diversion recommendations..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waterStagnation}
                    onChange={(e) => setWaterStagnation(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Active Water Stagnation Detected (Accelerated Erosion Risk)</span>
                </label>

                <button
                  type="submit"
                  disabled={submittingAudit || !selectedComplaintId}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Submit Audit & Forward to Officer</span>
                </button>
              </div>
            </form>
          </div>

          {/* List of Submitted Field Audits */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-brand-600" />
                  Field Inspection Records & Work Order Status
                </h3>
                <p className="text-xs text-slate-500">
                  Supervisors submit audits &bull; Authority Officers authorize contractor work orders.
                </p>
              </div>
              <button
                onClick={fetchInspections}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {inspectionsLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading inspection audits...</div>
            ) : inspections.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">No field audits logged yet. Submit one using the form above.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {inspections.map((insp) => {
                  const isPending = insp.status === 'PENDING_OFFICER_APPROVAL';

                  return (
                    <div
                      key={insp.id}
                      className="py-4 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                            {insp.complaint_reference}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            Depth: {insp.measured_depth_cm} cm &bull; Width: {insp.measured_width_cm} cm
                          </span>
                          {insp.water_stagnation && (
                            <span className="px-2 py-0.2 rounded text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-200">
                              Waterlogged
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              isPending
                                ? 'bg-amber-500 text-white'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {isPending ? 'Pending Officer Approval' : 'Work Order Authorized'}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                          <span>🏢 Inspected by: <strong>{insp.supervisor_name}</strong></span>
                          <span>&bull; Action: <strong>{insp.recommended_action?.replace('_', ' ')}</strong> ({insp.estimated_bitumen_tonnage} MT)</span>
                          {insp.officer_name && (
                            <span>&bull; 👮 Authorized by: <strong className="text-sky-700">{insp.officer_name}</strong></span>
                          )}
                        </div>

                        {insp.supervisor_notes && (
                          <div className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                            &ldquo;{insp.supervisor_notes}&rdquo;
                          </div>
                        )}
                      </div>

                      {/* Action for Officer */}
                      <div className="shrink-0">
                        {isPending && (
                          <button
                            onClick={() => handleOfficerAuthorizeWorkOrder(insp)}
                            disabled={actionLoading === insp.id}
                            className="px-3.5 py-2 bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span>Authorize Municipal Work Order</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PERSONNEL & PROFILE VERIFICATION */}
      {activeTab === 'VERIFICATIONS' && (
        /* PERSONNEL & PROFILE VERIFICATION TAB */
        <div className="space-y-6">
          {/* Governance Hierarchy Info Banner */}
          <div className="bg-gradient-to-r from-sky-50 via-indigo-50 to-amber-50 border border-sky-200 rounded-3xl p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-brand-600 text-white rounded-lg">
                    <Shield className="w-4 h-4" />
                  </span>
                  <h2 className="text-base font-black text-slate-900">
                    Authority Officer: Personnel Verification & Management Desk
                  </h2>
                </div>
                <p className="text-xs text-slate-600 max-w-2xl">
                  You hold authority to verify, approve, and oversee <strong>Contractors</strong> and <strong>Supervisors</strong> within your municipal jurisdiction.
                  Your own officer credentials are authenticated and accredited by the <strong>System Administrator</strong>.
                </p>
              </div>

              {/* Hierarchy mini-pill */}
              <div className="bg-white/80 backdrop-blur-xs p-3 rounded-2xl border border-slate-200 text-xs space-y-1 shrink-0">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approval Protocol</div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                  <span>🛡️ Admin</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="text-sky-700 font-bold">👮 Officer</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="text-emerald-700 font-bold">🏢 Supervisors & 👷 Contractors</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
                <span>Pending Profile Verifications</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-3xl font-black text-amber-600">
                {pendingPersonnelCount}
              </div>
              <div className="text-[11px] text-slate-400">
                {personnelStats?.pending_contractors || 0} Contractors &bull; {personnelStats?.pending_supervisors || 0} Supervisors
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
                <span>Active Supervisors</span>
                <Building2 className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-3xl font-black text-indigo-700">
                {personnel.filter((p) => p.role === 'AUTHORITY_SUPERVISOR' && p.account_status === 'ACTIVE').length}
              </div>
              <div className="text-[11px] text-slate-400">Triage & ground coordination</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
                <span>Active Contractors</span>
                <Wrench className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-black text-emerald-700">
                {personnel.filter((p) => p.role.includes('CONTRACTOR') && p.account_status === 'ACTIVE').length}
              </div>
              <div className="text-[11px] text-slate-400">Maintenance execution units</div>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search name, email, company, license..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            {/* Role Filter Buttons */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              <button
                onClick={() => setRoleFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  roleFilter === 'ALL'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Personnel
              </button>
              <button
                onClick={() => setRoleFilter('CONTRACTOR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  roleFilter === 'CONTRACTOR'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                Contractors
              </button>
              <button
                onClick={() => setRoleFilter('SUPERVISOR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  roleFilter === 'SUPERVISOR'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Supervisors
              </button>

              <div className="h-5 w-px bg-slate-200 mx-1" />

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg outline-none bg-white text-slate-700"
              >
                <option value="PENDING_APPROVAL">Pending Verification</option>
                <option value="ACTIVE">Active Directory</option>
                <option value="ALL">All Statuses</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <button
                onClick={fetchPersonnel}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                title="Refresh List"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Personnel Verification List / Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {personnelLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Loading personnel verification records...
              </div>
            ) : personnel.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <UserCheck className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No personnel records found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {statusFilter === 'PENDING_APPROVAL'
                    ? 'All contractor and supervisor registrations have been reviewed. No pending verifications.'
                    : 'Try adjusting your search criteria or role filters.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {personnel.map((p) => {
                  const isContractor = p.role.includes('CONTRACTOR');
                  const isPending = p.account_status === 'PENDING_APPROVAL';
                  const isSuspended = p.account_status === 'SUSPENDED';

                  return (
                    <div
                      key={p.id}
                      className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
                    >
                      {/* Candidate Identity */}
                      <div className="space-y-1.5 max-w-md">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                              isContractor
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {isContractor ? <Wrench className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                          </span>
                          <span className="font-black text-slate-900 text-sm">{p.name}</span>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isContractor
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                            }`}
                          >
                            {p.role.replace('_', ' ')}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isPending
                                ? 'bg-amber-500 text-white'
                                : p.account_status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : p.account_status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {p.account_status}
                          </span>
                        </div>

                        {/* Contact & Agency credentials */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1 font-mono text-slate-700">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {p.email}
                          </span>
                          {p.phone_number && (
                            <span className="flex items-center gap-1 text-slate-600">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {p.phone_number}
                            </span>
                          )}
                        </div>

                        {/* Submitted Credentials */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                          {p.company_name && (
                            <span className="px-2 py-0.5 bg-slate-100 rounded-md text-slate-700 font-semibold border border-slate-200">
                              🏢 {p.company_name}
                            </span>
                          )}
                          {p.department && (
                            <span className="px-2 py-0.5 bg-slate-100 rounded-md text-slate-700 font-semibold border border-slate-200">
                              🏛️ {p.department}
                            </span>
                          )}
                          {p.license_number && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-900 rounded-md font-mono font-bold border border-amber-200">
                              📜 Lic: {p.license_number}
                            </span>
                          )}
                          {p.employee_id && (
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-900 rounded-md font-mono font-bold border border-indigo-200">
                              🪪 ID: {p.employee_id}
                            </span>
                          )}
                          {p.jurisdiction && (
                            <span className="px-2 py-0.5 bg-sky-50 text-sky-800 rounded-md font-medium border border-sky-200">
                              📍 {p.jurisdiction}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Controls for Officer */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isPending ? (
                          <>
                            <button
                              onClick={() => handleApprove(p)}
                              disabled={actionLoading === p.id}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Verify & Approve</span>
                            </button>

                            <button
                              onClick={() => setRejectDialog({ open: true, user: p, notes: '' })}
                              disabled={actionLoading === p.id}
                              className="px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Reject</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleSuspend(p)}
                            disabled={actionLoading === p.id}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 ${
                              isSuspended
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>{isSuspended ? 'Reactivate Profile' : 'Suspend Account'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rejection Notes Modal */}
      {rejectDialog.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Reject {rejectDialog.user?.role.replace('_', ' ')} Registration
                </h3>
                <p className="text-xs text-slate-500">Applicant: {rejectDialog.user?.name}</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Rejection Reason (Dispatched to Applicant)
              </label>
              <textarea
                rows={3}
                value={rejectDialog.notes}
                onChange={(e) => setRejectDialog({ ...rejectDialog, notes: e.target.value })}
                placeholder="e.g. Contractor license number LIC-MUNI-999 is expired or does not match municipal registry records."
                className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectDialog({ open: false, user: null, notes: '' })}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={actionLoading === rejectDialog.user?.id}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
