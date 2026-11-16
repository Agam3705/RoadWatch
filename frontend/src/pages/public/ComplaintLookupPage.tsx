import React, { useState } from 'react';
import { api } from '../../api/client';
import { Complaint } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { DamageBadge } from '../../components/DamageBadge';
import { PriorityBadge } from '../../components/PriorityBadge';
import { Search, MapPin, Calendar, Clock, CheckCircle2 } from 'lucide-react';

export const ComplaintLookupPage: React.FC = () => {
  const [refInput, setRefInput] = useState('');
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refInput.trim()) return;

    setLoading(true);
    setError('');
    setComplaint(null);
    setHistory([]);

    try {
      const data = await api.complaints.get(refInput.trim());
      setComplaint(data);
      const hist = await api.complaints.history(data.id || data.public_reference);
      setHistory(hist || []);
    } catch (err: any) {
      setError(err.message || 'Defect reference not found. Please verify the tracking number.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Track a Road Defect Report
        </h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Enter your unique public reference (e.g. RW-2026-100214) to view live review status, contractor assignments, and verification evidence.
        </p>

        {/* Search input form */}
        <form onSubmit={handleLookup} className="flex items-center gap-2 max-w-md mx-auto pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="e.g. RW-2026-100214"
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-mono uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
          >
            {loading ? 'Searching...' : 'Track'}
          </button>
        </form>

        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 max-w-md mx-auto">
            {error}
          </div>
        )}
      </div>

      {complaint && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-mono font-bold text-slate-400">PUBLIC TRACKING NUMBER</span>
              <h2 className="text-xl font-black text-slate-900">{complaint.public_reference}</h2>
            </div>
            <StatusBadge status={complaint.status} size="lg" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <DamageBadge category={complaint.category} />
                <PriorityBadge priority={complaint.priority} />
              </div>
              <p className="text-sm text-slate-700 font-medium leading-relaxed">
                {complaint.description}
              </p>
              <div className="text-xs text-slate-500 space-y-1 pt-2">
                <div>
                  Reported On:{' '}
                  <span className="font-semibold text-slate-700">
                    {new Date(complaint.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  Location:{' '}
                  <span className="font-mono text-slate-700">
                    {complaint.location.coordinates[1].toFixed(5)}, {complaint.location.coordinates[0].toFixed(5)}
                  </span>
                </div>
                <div>
                  Citizen Corroboration:{' '}
                  <span className="font-semibold text-slate-700">{complaint.support_count || 0} Citizens</span>
                </div>
              </div>
            </div>

            {complaint.images && complaint.images.length > 0 && (
              <div className="rounded-xl overflow-hidden bg-slate-900 h-52">
                <img
                  src={
                    complaint.images[0].url.startsWith('http')
                      ? complaint.images[0].url
                      : `http://localhost:8000${complaint.images[0].url}`
                  }
                  alt="Defect"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Status Timeline */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" />
              Traceable Progress Timeline
            </h3>

            <div className="space-y-3">
              {history.map((h, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                  <div className="flex-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{h.new_status}</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(h.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {h.reason && <p className="text-slate-600 mt-1 text-[11px]">{h.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
