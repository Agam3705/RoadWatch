import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { MaintenanceTask } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { BeforeAfterCompare } from '../../components/BeforeAfterCompare';
import {
  Wrench, CheckCircle2, XCircle, Clock, AlertTriangle,
  Camera, ArrowLeft, Send, Activity
} from 'lucide-react';

export const TaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<MaintenanceTask | null>(null);
  const [progressPct, setProgressPct] = useState(0);
  const [progressNote, setProgressNote] = useState('');
  const [blocker, setBlocker] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineBox, setShowDeclineBox] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchTask = async () => {
    if (!id) return;
    try {
      const data = await api.contractor.getTask(id);
      setTask(data);
      setProgressPct(data.progress_percentage || 0);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();
  }, [id]);

  const handleAccept = async () => {
    if (!task) return;
    setUpdating(true);
    try {
      await api.contractor.acceptTask(task.id);
      alert('Task accepted! You can now log repair progress.');
      await fetchTask();
    } catch (err: any) {
      alert(err.message || 'Error accepting task.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDecline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !declineReason.trim()) {
      alert('Decline reason is mandatory.');
      return;
    }
    setUpdating(true);
    try {
      await api.contractor.declineTask(task.id, declineReason.trim());
      alert('Task declined. Authority will be notified.');
      navigate('/contractor');
    } catch (err: any) {
      alert(err.message || 'Error declining task.');
    } finally {
      setUpdating(false);
    }
  };

  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    setUpdating(true);
    try {
      await api.contractor.updateProgress(task.id, {
        progress_percentage: progressPct,
        note: progressNote.trim() || `Progress updated to ${progressPct}%`,
        blocker: blocker.trim() || undefined,
      });
      alert('Progress updated successfully.');
      setProgressNote('');
      setBlocker('');
      await fetchTask();
    } catch (err: any) {
      alert(err.message || 'Error updating progress.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading work order details...</div>;
  }

  if (!task) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-sm font-bold text-slate-800">Task not found</h2>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Back button & Header */}
      <div className="space-y-3">
        <Link to="/contractor" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to My Work Orders
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-400">TASK:</span>
              <h1 className="text-2xl font-black text-slate-900">{task.task_reference}</h1>
              <span className="font-mono text-xs font-bold text-brand-700 bg-sky-50 px-2 py-0.5 rounded">
                Ref: {task.complaint_reference}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Deadline: <span className="font-bold text-slate-700">{new Date(task.deadline).toLocaleDateString()}</span> &bull; Assigned to {task.contractor_name}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={task.status} size="lg" />
            <Link
              to={`/contractor/submit-evidence/${task.id}`}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <Camera className="w-4 h-4" />
              <span>Submit Repair Evidence</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Scope, Instructions & Defect Details */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Work Order Scope & Instructions
            </h2>
            <h3 className="text-sm font-bold text-slate-800">{task.title}</h3>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed font-medium">
              {task.instructions || 'Standard P.W.D. road defect excavation and compaction protocol.'}
            </div>

            {task.complaint?.images?.[0] && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-700 uppercase">Original Defect Photograph</span>
                <div className="rounded-xl overflow-hidden bg-slate-900 h-52">
                  <img
                    src={
                      task.complaint.images[0].url.startsWith('http')
                        ? task.complaint.images[0].url
                        : `http://localhost:8000${task.complaint.images[0].url}`
                    }
                    alt="Defect"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Accept / Decline Action Banner if still ASSIGNED */}
          {task.status === 'ASSIGNED' && (
            <div className="bg-amber-50 border border-amber-300 p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Assignment Awaiting Response</span>
              </div>
              <p className="text-xs text-amber-800">
                Please review instructions and confirm whether your maintenance crew accepts this task.
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={updating}
                  onClick={handleAccept}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                >
                  Accept Assignment
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeclineBox(!showDeclineBox)}
                  className="px-4 py-2 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs rounded-xl transition-all"
                >
                  Decline Assignment
                </button>
              </div>

              {showDeclineBox && (
                <form onSubmit={handleDecline} className="pt-3 border-t border-amber-200 space-y-2">
                  <textarea
                    rows={2}
                    required
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="Mandatory reason for declining (e.g. out of jurisdiction, lack of heavy roller)..."
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-rose-600 text-white font-bold text-xs rounded-lg hover:bg-rose-700"
                  >
                    Confirm Decline
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Progress Tracking & Daily Logs */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-brand-600" />
              Update Repair Progress
            </h2>

            <form onSubmit={handleProgressSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-700">
                  <span>Current Progress</span>
                  <span className="text-brand-600 font-mono text-sm">{progressPct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progressPct}
                  onChange={(e) => setProgressPct(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase">Work Log Note</label>
                <input
                  type="text"
                  value={progressNote}
                  onChange={(e) => setProgressNote(e.target.value)}
                  placeholder="e.g. Milled cavity, laid aggregate sub-base..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase">Report Blocker (Optional)</label>
                <input
                  type="text"
                  value={blocker}
                  onChange={(e) => setBlocker(e.target.value)}
                  placeholder="e.g. Continuous rain, awaiting traffic police clearance..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none text-rose-700"
                />
              </div>

              <button
                type="submit"
                disabled={updating}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                {updating ? 'Updating...' : 'Log Progress Update'}
              </button>
            </form>
          </div>

          {/* Historical Progress Logs */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              Progress Activity History
            </h3>

            <div className="space-y-2 max-h-52 overflow-y-auto">
              {task.progress_logs && task.progress_logs.length > 0 ? (
                task.progress_logs.map((log, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-0.5">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>{log.progress_percentage}% Completed</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">{log.note}</p>
                  </div>
                ))
              ) : (
                <div className="text-slate-400 text-xs py-4 text-center">No progress entries logged yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
