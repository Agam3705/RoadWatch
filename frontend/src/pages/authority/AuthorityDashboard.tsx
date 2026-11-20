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
  const [activeTab, setActiveTab] = useState<'OPERATIONS' | 'WORK_ORDERS' | 'VERIFICATIONS' | 'SLA_PERFORMANCE'>('OPERATIONS');
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

  // Executive Work Order State (Reviewing incoming Supervisor Audits & Assigning Contractors)
  const [inspections, setInspections] = useState<any[]>([]);
  const [inspectionsLoading, setInspectionsLoading] = useState(false);
  const [workOrderDialog, setWorkOrderDialog] = useState<{
    open: boolean;
    inspection: any | null;
    contractorName: string;
    budgetCode: string;
    slaHours: number;
    officerNotes: string;
  }>({
    open: false,
    inspection: null,
    contractorName: 'Metro Road Infra Ltd',
    budgetCode: 'MUNI-2026-PWD-409-Q4',
    slaHours: 48,
    officerNotes: 'Authorized under municipal road restoration budget. Contractor must adhere to VG-30 compaction standards.',
  });

  const fetchOverviewAndComplaints = () => {
    Promise.all([
      api.complaints.list({ limit: 10 }),
      api.analytics.overview(),
    ]).then(([compRes, overRes]) => {
      setComplaints(compRes.items || []);
      setOverview(overRes);
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
    } else if (activeTab === 'WORK_ORDERS') {
      fetchInspections();
    }
  }, [activeTab, roleFilter, statusFilter, searchQuery]);

  // Handle Officer opening the Work Order Authorization modal
  const handleOpenWorkOrderDialog = (inspection: any) => {
    const defaultBudget = `MUNI-PWD-${new Date().getFullYear()}-${(inspection.complaint_reference || '001').replace(/[^0-9]/g, '').slice(-3) || '101'}`;
    setWorkOrderDialog({
      open: true,
      inspection,
      contractorName: 'Metro Road Infra Ltd',
      budgetCode: defaultBudget,
      slaHours: inspection.traffic_impact_rating === 'CRITICAL_HAZARD' ? 24 : 48,
      officerNotes: `Work order authorized under municipal road maintenance fund. Physical cavity depth (${inspection.measured_depth_cm}cm) verified on site by Supervisor ${inspection.supervisor_name}.`,
    });
  };

  // Confirm official Work Order issuance to contractor
  const handleConfirmWorkOrder = async () => {
    if (!workOrderDialog.inspection) return;
    setActionLoading(workOrderDialog.inspection.id);
    try {
      await api.inspections.review(workOrderDialog.inspection.id, {
        decision: 'APPROVE_WORK_ORDER',
        contractor_name: workOrderDialog.contractorName,
        officer_notes: `[Budget: ${workOrderDialog.budgetCode}] [SLA: ${workOrderDialog.slaHours}h] ${workOrderDialog.officerNotes}`,
      });
      alert(`Work Order officially authorized and assigned to ${workOrderDialog.contractorName}!`);
      setWorkOrderDialog((prev) => ({ ...prev, open: false, inspection: null }));
      fetchInspections();
      fetchOverviewAndComplaints();
    } catch (err: any) {
      alert(err.message || 'Error authorizing work order.');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Officer requesting re-inspection if supervisor measurements require scrutiny
  const handleRejectInspection = async (inspection: any) => {
    const reason = prompt(
      'Enter reason for requesting re-inspection by Supervisor:',
      'Cavity depth measurement requires physical re-verification. Re-inspect road sub-base.'
    );
    if (!reason) return;

    setActionLoading(inspection.id);
    try {
      await api.inspections.review(inspection.id, {
        decision: 'REJECT_RE_INSPECT',
        officer_notes: reason,
      });
      alert('Inspection flagged for physical re-audit by Field Supervisor.');
      fetchInspections();
    } catch (err: any) {
      alert(err.message || 'Error rejecting inspection.');
    } finally {
      setActionLoading(null);
    }
  };

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
      {/* Top Banner - Executive Officer Command Center */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-500/20 text-sky-400 border border-sky-400/30 rounded-full text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" />
            <span>P.W.D. Executive Officer Command Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Divisional Operations & Work Order Command
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Executive authority desk: triage road defects, authorize contractor work orders from field supervisor audits, accredit contractor & supervisor licenses, and enforce municipal SLAs.
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
          onClick={() => setActiveTab('WORK_ORDERS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'WORK_ORDERS'
              ? 'bg-white text-brand-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-4 h-4 text-sky-600" />
          <span>Work Order Authorizations</span>
          {inspections.filter((i) => i.status === 'PENDING_OFFICER_APPROVAL').length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-sky-600 text-white text-[10px] font-black animate-pulse">
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
          <span>Personnel Accreditation</span>
          {pendingPersonnelCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black animate-pulse">
              {pendingPersonnelCount} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('SLA_PERFORMANCE')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'SLA_PERFORMANCE'
              ? 'bg-white text-brand-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-purple-600" />
          <span>Contractor SLAs & Durability</span>
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

      {/* TAB 2: EXECUTIVE WORK ORDER ISSUANCE DESK */}
      {activeTab === 'WORK_ORDERS' && (
        <div className="space-y-6">
          {/* Governance Hierarchy Banner */}
          <div className="bg-gradient-to-r from-sky-50 via-indigo-50 to-emerald-50 border border-sky-200 rounded-3xl p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-brand-600 text-white rounded-lg">
                    <FileCheck className="w-4 h-4" />
                  </span>
                  <h2 className="text-base font-black text-slate-900">
                    Executive Work Order Issuance & Ground Audit Clearance
                  </h2>
                </div>
                <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                  Field Supervisors inspect physical cavity measurements and recommend technical repair methods.
                  As <strong>Authority Officer</strong>, you evaluate the supervisor's physical telemetry, sign off on municipal road funds, and legally authorize official work orders to contractors.
                </p>
              </div>

              <div className="bg-white/90 p-3 rounded-2xl border border-sky-100 text-xs shrink-0 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Statutory Hierarchy</div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                  <span className="text-indigo-700 font-bold">🏢 Supervisor (Ground Audit)</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="text-sky-700 font-bold">👮 Officer (Work Order Sign-Off)</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="text-emerald-700 font-bold">👷 Contractor (Execution)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
                <span>Audits Awaiting Work Order</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-3xl font-black text-amber-600">
                {inspections.filter((i) => i.status === 'PENDING_OFFICER_APPROVAL').length}
              </div>
              <div className="text-[11px] text-slate-400">Submitted by Field Supervisors</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
                <span>Authorized Work Orders</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-black text-emerald-600">
                {inspections.filter((i) => i.status === 'APPROVED_WORK_ORDER_ISSUED').length}
              </div>
              <div className="text-[11px] text-slate-400">Officially dispatched to contractors</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
                <span>Active Paving Contractors</span>
                <Wrench className="w-4 h-4 text-brand-500" />
              </div>
              <div className="text-3xl font-black text-brand-600">3 Firms</div>
              <div className="text-[11px] text-slate-400">Accredited municipal vendors</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
                <span>Triage SLA Compliance</span>
                <Award className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-3xl font-black text-purple-600">97.4%</div>
              <div className="text-[11px] text-slate-400">&lt; 24h work order dispatch</div>
            </div>
          </div>

          {/* List of Incoming Supervisor Ground Audits */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-brand-600" />
                  Supervisor Ground Audits & Work Order Authorization Queue
                </h3>
                <p className="text-xs text-slate-500">
                  Review cavity dimensions measured on site by Junior Engineers & Field Supervisors to authorize municipal tenders.
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
              <div className="py-12 text-center text-xs text-slate-400">Loading ground inspection records...</div>
            ) : inspections.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No ground inspection audits found. When supervisors submit physical cavity measurements from the field, they will appear here for executive work order authorization.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {inspections.map((insp) => {
                  const isPending = insp.status === 'PENDING_OFFICER_APPROVAL';

                  return (
                    <div
                      key={insp.id}
                      className="py-5 hover:bg-slate-50/70 transition-colors flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                            {insp.complaint_reference}
                          </span>
                          <span className="text-xs font-black text-slate-800">
                            Laser Depth: <span className="text-rose-600">{insp.measured_depth_cm} cm</span> &bull; Width: <span className="text-slate-900">{insp.measured_width_cm} cm</span>
                          </span>
                          {insp.water_stagnation && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-1">
                              💧 Waterlogged Cavity
                            </span>
                          )}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              isPending
                                ? 'bg-amber-500 text-white animate-pulse'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {isPending ? 'Pending Officer Approval' : 'Work Order Authorized'}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                          <span className="font-medium">
                            🏢 Inspected On-Site by: <strong className="text-indigo-700">{insp.supervisor_name}</strong> ({insp.supervisor_role?.replace('_', ' ') || 'Supervisor'})
                          </span>
                          <span>&bull;</span>
                          <span>
                            Recommended Action: <strong className="text-slate-800">{insp.recommended_action?.replace('_', ' ')}</strong>
                          </span>
                          <span>&bull;</span>
                          <span>
                            Est. Bitumen Mix: <strong className="text-slate-800">{insp.estimated_bitumen_tonnage} MT</strong>
                          </span>
                          {insp.officer_name && (
                            <>
                              <span>&bull;</span>
                              <span>
                                👮 Authorized by: <strong className="text-sky-700 font-bold">{insp.officer_name}</strong>
                              </span>
                            </>
                          )}
                        </div>

                        {insp.supervisor_notes && (
                          <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl">
                            <span className="font-bold text-slate-500 text-[10px] uppercase block">Supervisor Field Findings:</span>
                            &ldquo;{insp.supervisor_notes}&rdquo;
                          </div>
                        )}

                        {insp.officer_notes && (
                          <div className="text-xs text-emerald-900 bg-emerald-50 border border-emerald-200/80 p-2.5 rounded-xl">
                            <span className="font-bold text-emerald-700 text-[10px] uppercase block">Executive Work Order Sign-Off:</span>
                            {insp.officer_notes}
                          </div>
                        )}
                      </div>

                      {/* Executive Actions for Officer */}
                      <div className="shrink-0 flex items-center gap-2">
                        {isPending ? (
                          <>
                            <button
                              onClick={() => handleOpenWorkOrderDialog(insp)}
                              disabled={actionLoading === insp.id}
                              className="px-4 py-2.5 bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                            >
                              <Shield className="w-4 h-4" />
                              <span>Authorize Work Order</span>
                            </button>
                            <button
                              onClick={() => handleRejectInspection(insp)}
                              disabled={actionLoading === insp.id}
                              className="px-3 py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded-xl text-xs font-bold transition-all border border-slate-200"
                              title="Request field supervisor to re-measure cavity"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Tender Dispatched</span>
                          </span>
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

      {/* TAB 4: CONTRACTOR SLAS & DURABILITY PERFORMANCE */}
      {activeTab === 'SLA_PERFORMANCE' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-50 via-slate-50 to-indigo-50 border border-purple-200 rounded-3xl p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-purple-600 text-white rounded-lg">
                    <BarChart3 className="w-4 h-4" />
                  </span>
                  <h2 className="text-base font-black text-slate-900">
                    Contractor Performance, SLA Adherence & Durability Oversight
                  </h2>
                </div>
                <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                  As Executive PWD Officer, you monitor contracted paving firms, evaluate post-repair durability ratings, and enforce financial penalty deductions for SLA breaches.
                </p>
              </div>

              <div className="bg-white/90 p-3 rounded-2xl border border-purple-100 text-xs shrink-0 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Statutory Penalty Scale</div>
                <div className="text-[11px] font-bold text-slate-700">
                  <span>🚨 Breach &gt; 48h: 5% Retainage Deduction</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contractor Performance Scorecards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                name: 'Metro Road Infra Ltd',
                grade: 'Grade A+',
                license: 'LIC-PWD-2024-001',
                rating: 4.9,
                totalJobs: 54,
                slaRate: '98.5%',
                avgTime: '18.4 hrs',
                activeOrders: 2,
                status: 'EXCELLENT',
                specialty: 'Bituminous VG-30 Heavy Corridors',
              },
              {
                name: 'Apex Paving & Civil Works',
                grade: 'Grade A',
                license: 'LIC-PWD-2023-089',
                rating: 4.6,
                totalJobs: 38,
                slaRate: '94.2%',
                avgTime: '26.1 hrs',
                activeOrders: 1,
                status: 'COMPLIANT',
                specialty: 'Hot-Mix Overlay & Urban Roads',
              },
              {
                name: 'Shiv Shakti Road Infrastructure',
                grade: 'Grade B+',
                license: 'LIC-MUNI-2025-412',
                rating: 4.1,
                totalJobs: 21,
                slaRate: '88.9%',
                avgTime: '34.8 hrs',
                activeOrders: 1,
                status: 'AUDIT_WARNING',
                specialty: 'Crack Injection & Micro-Surfacing',
              },
            ].map((c) => (
              <div key={c.name} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 hover:border-brand-400 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                      {c.grade}
                    </span>
                    <h3 className="font-black text-slate-900 text-sm pt-1">{c.name}</h3>
                    <div className="text-[11px] font-mono text-slate-400">{c.license}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    c.status === 'EXCELLENT'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : c.status === 'COMPLIANT'
                      ? 'bg-sky-100 text-sky-800 border border-sky-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {c.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  Specialty: <strong className="text-slate-700">{c.specialty}</strong>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">SLA Adherence</span>
                    <span className="font-black text-emerald-700 text-base">{c.slaRate}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Durability Rating</span>
                    <span className="font-black text-amber-600 text-base">⭐ {c.rating} / 5.0</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Avg Resolution</span>
                    <span className="font-bold text-slate-800 text-xs">{c.avgTime}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Active Orders</span>
                    <span className="font-bold text-slate-800 text-xs">{c.activeOrders} Work Orders</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => alert(`Municipal Quality Audit Notice dispatched to ${c.name}. Contractor must upload compaction test certificates.`)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                  >
                    Issue Performance Inspection Notice
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Work Order Authorization Modal */}
      {workOrderDialog.open && workOrderDialog.inspection && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Authorize Municipal Work Order
                  </h3>
                  <p className="text-xs text-slate-500">
                    Complaint Ref: <strong className="font-mono text-slate-700">{workOrderDialog.inspection.complaint_reference}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWorkOrderDialog((prev) => ({ ...prev, open: false, inspection: null }))}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Supervisor's Ground Audit Summary */}
            <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  Supervisor Ground Telemetry
                </span>
                <span className="text-[10px] font-mono text-indigo-700 font-bold">
                  Audited by {workOrderDialog.inspection.supervisor_name}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-indigo-900 pt-1">
                <div>Cavity Depth: <strong>{workOrderDialog.inspection.measured_depth_cm} cm</strong></div>
                <div>Cavity Width: <strong>{workOrderDialog.inspection.measured_width_cm} cm</strong></div>
                <div>Recommended Action: <strong>{workOrderDialog.inspection.recommended_action?.replace('_', ' ')}</strong></div>
                <div>Bitumen Mix: <strong>{workOrderDialog.inspection.estimated_bitumen_tonnage} MT</strong></div>
              </div>
              {workOrderDialog.inspection.supervisor_notes && (
                <div className="text-[11px] text-indigo-800 italic pt-1 border-t border-indigo-200/60">
                  &ldquo;{workOrderDialog.inspection.supervisor_notes}&rdquo;
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Select Accredited Contractor Firm
                </label>
                <select
                  value={workOrderDialog.contractorName}
                  onChange={(e) => setWorkOrderDialog({ ...workOrderDialog, contractorName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none bg-white font-semibold text-slate-800"
                >
                  <option value="Metro Road Infra Ltd">Metro Road Infra Ltd (Grade A+ &bull; Lic: LIC-PWD-2024-001)</option>
                  <option value="Apex Paving & Civil Works">Apex Paving & Civil Works (Grade A &bull; Lic: LIC-PWD-2023-089)</option>
                  <option value="Shiv Shakti Road Infrastructure">Shiv Shakti Road Infrastructure (Grade B+ &bull; Lic: LIC-MUNI-2025-412)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Municipal Budget Code
                  </label>
                  <input
                    type="text"
                    value={workOrderDialog.budgetCode}
                    onChange={(e) => setWorkOrderDialog({ ...workOrderDialog, budgetCode: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Guaranteed SLA Window
                  </label>
                  <select
                    value={workOrderDialog.slaHours}
                    onChange={(e) => setWorkOrderDialog({ ...workOrderDialog, slaHours: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none bg-white font-semibold"
                  >
                    <option value={24}>24 Hours (Emergency Corridor)</option>
                    <option value={48}>48 Hours (Standard Arterial)</option>
                    <option value={72}>72 Hours (Residential Road)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Executive Officer Remarks & Technical Mandate
                </label>
                <textarea
                  rows={2}
                  value={workOrderDialog.officerNotes}
                  onChange={(e) => setWorkOrderDialog({ ...workOrderDialog, officerNotes: e.target.value })}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setWorkOrderDialog((prev) => ({ ...prev, open: false, inspection: null }))}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmWorkOrder}
                disabled={actionLoading === workOrderDialog.inspection?.id}
                className="px-5 py-2.5 bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <Shield className="w-4 h-4" />
                <span>Sign & Issue Work Order</span>
              </button>
            </div>
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
