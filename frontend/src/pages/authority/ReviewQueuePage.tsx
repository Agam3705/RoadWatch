import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Complaint } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { DamageBadge } from '../../components/DamageBadge';
import { PriorityBadge } from '../../components/PriorityBadge';
import { ClipboardList, Filter, Search, ArrowRight, Shield } from 'lucide-react';

export const ReviewQueuePage: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [tab, setTab] = useState<'pending' | 'approved' | 'all'>('pending');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (tab === 'pending') params.status = 'SUBMITTED';
    else if (tab === 'approved') params.status = 'APPROVED';
    if (category) params.category = category;

    api.complaints.list(params).then((res) => {
      // Sort priority score descending
      const sorted = (res.items || []).sort(
        (a, b) => (b.priority?.score || 0) - (a.priority?.score || 0)
      );
      setComplaints(sorted);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [tab, category]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-200">
            Triage & Operational Queue
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Authority Review & Priority Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Inspect AI predictions, confirm damage classifications, and approve work orders based on formula priority scores.
          </p>
        </div>

        {/* Status Tab Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setTab('pending')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              tab === 'pending' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600'
            }`}
          >
            Awaiting Review
          </button>
          <button
            onClick={() => setTab('approved')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              tab === 'approved' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600'
            }`}
          >
            Approved for Dispatch
          </button>
          <button
            onClick={() => setTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              tab === 'all' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600'
            }`}
          >
            All Reports
          </button>
        </div>
      </div>

      {/* Main Review Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-500">
            Found <strong className="text-slate-900">{complaints.length}</strong> reports in queue
          </span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg outline-none bg-white font-medium"
          >
            <option value="">All Categories</option>
            <option value="POTHOLE">Potholes</option>
            <option value="LONGITUDINAL_CRACK">Longitudinal Cracks</option>
            <option value="ALLIGATOR_CRACK">Alligator Cracks</option>
            <option value="SUBSIDENCE">Subsidence</option>
          </select>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading queue...</div>
        ) : complaints.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">No reports found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase border-y border-slate-200 font-bold">
                <tr>
                  <th className="py-3 px-4">Tracking Ref</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Report Details</th>
                  <th className="py-3 px-4">AI Scan</th>
                  <th className="py-3 px-4">Priority (P)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{c.public_reference}</td>
                    <td className="py-3 px-4"><DamageBadge category={c.category} /></td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-800 line-clamp-1">{c.description}</div>
                      <div className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="py-3 px-4">
                      {c.ai_prediction ? (
                        <span className="px-2 py-0.5 bg-sky-50 text-sky-800 font-mono font-semibold rounded text-[11px] border border-sky-200">
                          {c.ai_prediction.predictions[0]?.class || 'SCANNED'} ({(c.ai_prediction.predictions[0]?.confidence * 100 || 90).toFixed(0)}%)
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Pending AI</span>
                      )}
                    </td>
                    <td className="py-3 px-4"><PriorityBadge priority={c.priority} level={c.citizen_severity} /></td>
                    <td className="py-3 px-4"><StatusBadge status={c.status} size="sm" /></td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/authority/review/${c.id}`}
                        className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg transition-colors inline-flex items-center gap-1 shadow-2xs"
                      >
                        <span>Review</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
