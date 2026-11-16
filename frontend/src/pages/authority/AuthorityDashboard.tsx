import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Complaint } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { DamageBadge } from '../../components/DamageBadge';
import { PriorityBadge } from '../../components/PriorityBadge';
import {
  Shield, CheckSquare, Wrench, AlertTriangle, ArrowRight,
  ClipboardList, CheckCircle2, TrendingUp, BarChart3, Layers
} from 'lucide-react';

export const AuthorityDashboard: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.complaints.list({ limit: 10 }),
      api.analytics.overview(),
    ]).then(([compRes, overRes]) => {
      setComplaints(compRes.items || []);
      setOverview(overRes);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pendingReviewCount = complaints.filter((c) => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW').length;
  const inProgressCount = complaints.filter((c) => c.status === 'IN_PROGRESS' || c.status === 'ASSIGNED').length;
  const pendingVerificationCount = complaints.filter((c) => c.status === 'PENDING_VERIFICATION').length;

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
            Triage citizen submissions, inspect AI damage scans, dispatch accountable maintenance work orders, and verify contractor repair evidence.
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
    </div>
  );
};
