import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Complaint } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { DamageBadge } from '../../components/DamageBadge';
import { PriorityBadge } from '../../components/PriorityBadge';
import {
  PlusCircle, MapPin, CheckCircle2, Clock, ThumbsUp, ArrowRight, AlertCircle
} from 'lucide-react';

export const CitizenDashboard: React.FC = () => {
  const { user } = useAuth();
  const [myReports, setMyReports] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.complaints.list({ my_reports: 'true' })
      .then((res) => setMyReports(res.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalReports = myReports.length;
  const resolvedCount = myReports.filter((r) => r.status === 'RESOLVED').length;
  const pendingCount = myReports.filter((r) => r.status !== 'RESOLVED' && r.status !== 'REJECTED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-700 via-sky-700 to-sky-600 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold">
            <span>Citizen Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome back, {user?.name || 'Citizen'}!
          </h1>
          <p className="text-xs sm:text-sm text-sky-100 max-w-xl">
            Track your reported road defects, follow contractor progress, and verify that repairs meet safety standards.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/grievances"
            className="px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm border border-white/20 backdrop-blur-md transition-colors flex items-center gap-1.5"
          >
            <AlertCircle className="w-4 h-4 text-rose-300" />
            <span>Grievance Portal</span>
          </Link>
          <Link
            to="/report"
            className="px-5 py-3 rounded-2xl bg-white text-brand-700 hover:bg-sky-50 font-bold text-xs sm:text-sm shadow-lg transition-transform hover:scale-105 flex items-center gap-2 shrink-0"
          >
            <PlusCircle className="w-5 h-5 text-brand-600" />
            <span>Report New Defect</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-500">My Total Reports</div>
          <div className="text-3xl font-black text-slate-900">{totalReports}</div>
          <div className="text-[11px] text-slate-400">All submitted community issues</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-500">Active / Under Repair</div>
          <div className="text-3xl font-black text-brand-600">{pendingCount}</div>
          <div className="text-[11px] text-brand-700 font-medium">Under review or contractor repair</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-500">Verified & Resolved</div>
          <div className="text-3xl font-black text-emerald-600">{resolvedCount}</div>
          <div className="text-[11px] text-emerald-700 font-medium">Completed and inspected</div>
        </div>
      </div>

      {/* My Reports List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-slate-900">My Reported Road Defects</h2>
            <p className="text-xs text-slate-500">Real-time status updates and contractor activity</p>
          </div>
          <Link to="/map" className="text-xs font-bold text-brand-600 hover:underline">
            View on Map &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading your reports...</div>
        ) : myReports.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <MapPin className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No defects reported yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Notice a dangerous pothole, cracking, or street flooding? Be the first to report it and make your community safer.
            </p>
            <Link
              to="/report"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white font-bold text-xs rounded-xl hover:bg-brand-700 transition-colors"
            >
              <PlusCircle className="w-4 h-4" /> Report an Issue Now
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {myReports.map((c) => (
              <div key={c.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 p-2 rounded-xl transition-colors">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-slate-900">{c.public_reference}</span>
                    <DamageBadge category={c.category} />
                    <StatusBadge status={c.status} size="sm" />
                  </div>
                  <p className="text-xs font-semibold text-slate-800 line-clamp-1">{c.description}</p>
                  <div className="text-[11px] text-slate-400 flex items-center gap-3">
                    <span>Reported {new Date(c.created_at).toLocaleDateString()}</span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1 text-slate-600">
                      <ThumbsUp className="w-3 h-3 text-brand-600" /> {c.support_count || 0} Supporters
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <PriorityBadge priority={c.priority} level={c.citizen_severity} />
                  <Link
                    to={`/complaints/${c.id || c.public_reference}`}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                  >
                    <span>Timeline</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
