import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { MaintenanceTask } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { Wrench, CheckCircle2, Clock, AlertTriangle, ArrowRight, Camera } from 'lucide-react';

export const ContractorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.contractor.myTasks(statusFilter)
      .then((data) => {
        setTasks(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [statusFilter]);

  const assignedCount = tasks.filter((t) => t.status === 'ASSIGNED').length;
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ACCEPTED').length;
  const verifiedCount = tasks.filter((t) => t.status === 'VERIFIED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold">
            <Wrench className="w-3.5 h-3.5 text-amber-300" />
            <span>Contractor Maintenance Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Assigned Work Orders & Execution
          </h1>
          <p className="text-xs sm:text-sm text-amber-100 max-w-xl">
            Logged in as <strong className="text-white">{user?.name}</strong>. Accept maintenance assignments, log daily progress, and submit after-repair photographic evidence.
          </p>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-500">New Assignments Pending</div>
          <div className="text-3xl font-black text-amber-600">{assignedCount}</div>
          <div className="text-[11px] text-slate-400">Requires acceptance or decline</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-500">Active In-Progress</div>
          <div className="text-3xl font-black text-brand-600">{inProgressCount}</div>
          <div className="text-[11px] text-slate-400">On-site repair underway</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-500">Verified Completed Repairs</div>
          <div className="text-3xl font-black text-emerald-600">{verifiedCount}</div>
          <div className="text-[11px] text-emerald-700 font-medium">Passed municipal inspection</div>
        </div>
      </div>

      {/* Tasks Queue Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900">Work Order Queue</h2>
            <p className="text-xs text-slate-500">Tasks assigned by Municipal P.W.D.</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg outline-none bg-white font-medium"
            >
              <option value="">All Statuses</option>
              <option value="ASSIGNED">Assigned (New)</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETION_SUBMITTED">Completion Submitted</option>
              <option value="VERIFIED">Verified</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading work orders...</div>
        ) : tasks.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No work orders currently assigned.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tasks.map((t) => (
              <div key={t.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 p-2 rounded-xl transition-colors">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-slate-900">{t.task_reference}</span>
                    <StatusBadge status={t.status} size="sm" />
                    <span className="text-[11px] font-mono text-brand-700 bg-sky-50 px-2 py-0.5 rounded">
                      Ref: {t.complaint_reference}
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800">{t.title}</h3>
                  <div className="text-[11px] text-slate-500 flex items-center gap-3">
                    <span>Deadline: {new Date(t.deadline).toLocaleDateString()}</span>
                    <span>&bull;</span>
                    <span>Progress: {t.progress_percentage || 0}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {t.status === 'IN_PROGRESS' || t.status === 'ACCEPTED' ? (
                    <Link
                      to={`/contractor/submit-evidence/${t.id}`}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" /> Submit Evidence
                    </Link>
                  ) : null}

                  <Link
                    to={`/contractor/tasks/${t.id}`}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                  >
                    <span>Manage</span>
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
