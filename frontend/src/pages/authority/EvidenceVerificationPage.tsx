import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { MaintenanceTask } from '../../types';
import { BeforeAfterCompare } from '../../components/BeforeAfterCompare';
import { StatusBadge } from '../../components/StatusBadge';
import { CheckSquare, ShieldCheck, XCircle, AlertCircle, Clock } from 'lucide-react';

export const EvidenceVerificationPage: React.FC = () => {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);
  const [comments, setComments] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPending = () => {
    setLoading(true);
    api.verification.pending().then((data) => {
      setTasks(data || []);
      if (data && data.length > 0) {
        setSelectedTask(data[0]);
      } else {
        setSelectedTask(null);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async () => {
    if (!selectedTask) return;
    setActionLoading(true);
    try {
      await api.verification.approve(selectedTask.id, comments || 'Repair inspected and accepted.');
      alert('Repair evidence approved! Complaint marked RESOLVED and task marked VERIFIED.');
      setComments('');
      fetchPending();
    } catch (err: any) {
      alert(err.message || 'Error approving evidence.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedTask) return;
    if (!rejectReason.trim()) {
      alert('A rejection reason is required to send back for rework.');
      return;
    }
    setActionLoading(true);
    try {
      await api.verification.reject(selectedTask.id, rejectReason.trim());
      alert('Repair rejected. Work order marked REWORK_REQUIRED and complaint reopened.');
      setRejectReason('');
      fetchPending();
    } catch (err: any) {
      alert(err.message || 'Error rejecting evidence.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <span className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
          Accountability & Quality Assurance
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
          Repair Evidence Verification Queue
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Compare citizen reported defect photos with contractor repair evidence. A complaint cannot be closed without official verification.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading pending verifications...</div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <CheckSquare className="w-12 h-12 text-emerald-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">All Submitted Repairs Verified!</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            There are currently no contractor completion submissions pending review.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Tasks Queue Selector */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Awaiting Inspection ({tasks.length})
            </h2>

            <div className="space-y-2">
              {tasks.map((t) => {
                const isSelected = selectedTask?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-brand-500 bg-sky-50/60 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {t.task_reference}
                      </span>
                      <StatusBadge status={t.status} size="sm" />
                    </div>
                    <div className="text-xs font-bold text-slate-800 line-clamp-1">{t.title}</div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>Contractor: {t.contractor_name || 'Apex Infra'}</span>
                      <span className="text-brand-600 font-semibold">{t.complaint_reference}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Evidence Inspector & Decision Form */}
          {selectedTask && (
            <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-mono text-slate-400">INSPECTING WORK ORDER</span>
                  <h2 className="text-lg font-black text-slate-900">{selectedTask.task_reference}</h2>
                  <div className="text-xs text-slate-600">{selectedTask.title}</div>
                </div>
                <StatusBadge status={selectedTask.status} size="md" />
              </div>

              {/* Before/After Interactive Comparison */}
              <BeforeAfterCompare
                beforeImage={selectedTask.complaint?.images?.[0]}
                afterImage={selectedTask.evidence?.[0]?.file_metadata}
              />

              {/* Contractor Work Notes */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-1">
                <span className="font-bold text-slate-700 uppercase">Contractor Work Log & Materials</span>
                <p className="text-slate-700 italic">
                  "{selectedTask.evidence?.[0]?.work_notes || 'All materials laid according to P.W.D. technical guidelines.'}"
                </p>
                <div className="text-[11px] text-slate-400 pt-1">
                  Submitted by {selectedTask.contractor_name || 'Contractor'} &bull; Repair Location: {selectedTask.evidence?.[0]?.location || 'Verified on-site GPS'}
                </div>
              </div>

              {/* Verification Decision Form */}
              <div className="p-5 bg-sky-50/50 rounded-2xl border border-sky-200 space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Official Verification Determination
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Approve Box */}
                  <div className="p-4 bg-white rounded-xl border border-emerald-200 space-y-3">
                    <div className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> Accept Repair Work
                    </div>
                    <input
                      type="text"
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Verification comments (e.g. Surface level, meets code)..."
                      className="w-full p-2 text-xs border border-slate-200 rounded-lg outline-none"
                    />
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleApprove}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all"
                    >
                      {actionLoading ? 'Processing...' : 'Approve & Mark Resolved'}
                    </button>
                  </div>

                  {/* Reject Box */}
                  <div className="p-4 bg-white rounded-xl border border-rose-200 space-y-3">
                    <div className="text-xs font-bold text-rose-800 flex items-center gap-1">
                      <XCircle className="w-4 h-4 text-rose-600" /> Reject / Rework Required
                    </div>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Mandatory rejection reason (e.g. Rough finish)..."
                      className="w-full p-2 text-xs border border-slate-200 rounded-lg outline-none"
                    />
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleReject}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all"
                    >
                      {actionLoading ? 'Processing...' : 'Reject & Require Rework'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
