import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Complaint, MaintenanceTask } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { DamageBadge } from '../../components/DamageBadge';
import { PriorityBadge } from '../../components/PriorityBadge';
import { BoundingBoxViewer } from '../../components/BoundingBoxViewer';
import { BeforeAfterCompare } from '../../components/BeforeAfterCompare';
import {
  ThumbsUp, Clock, MapPin, ShieldCheck, Star, AlertTriangle, ArrowLeft, Send, CheckCircle2
} from 'lucide-react';

export const ReportDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [task, setTask] = useState<MaintenanceTask | null>(null);
  const [hasSupported, setHasSupported] = useState(false);
  const [supportCount, setSupportCount] = useState(0);

  // Citizen verification form
  const [rating, setRating] = useState(5);
  const [isFixed, setIsFixed] = useState(true);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!id) return;
    try {
      const data = await api.complaints.get(id);
      setComplaint(data);
      setHasSupported(data.has_supported || false);
      setSupportCount(data.support_count || 0);

      const hist = await api.complaints.history(data.id);
      setHistory(hist || []);

      // Check if there is an active work order
      const tasks = await api.maintenance.listTasks({ complaint_id: data.id });
      if (tasks && tasks.length > 0) {
        const fullTask = await api.contractor.getTask(tasks[0].id);
        setTask(fullTask);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleToggleSupport = async () => {
    if (!complaint) return;
    try {
      if (hasSupported) {
        await api.complaints.removeSupport(complaint.id);
        setHasSupported(false);
        setSupportCount((c) => Math.max(0, c - 1));
      } else {
        const res = await api.complaints.support(complaint.id);
        setHasSupported(true);
        setSupportCount(res.support_count);
      }
    } catch (err: any) {
      alert(err.message || 'Error updating support.');
    }
  };

  const handleCitizenFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    try {
      await api.verification.citizenFeedback(task.id, {
        is_fixed: isFixed,
        rating,
        comments: feedbackComments,
      });
      setFeedbackSubmitted(true);
      alert('Thank you! Your citizen verification feedback has been logged.');
    } catch (err: any) {
      alert(err.message || 'Failed to submit verification feedback.');
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-500">Loading complaint details...</div>;
  }

  if (!complaint) {
    return (
      <div className="py-20 text-center space-y-3">
        <h2 className="text-lg font-bold text-slate-800">Defect report not found</h2>
        <Link to="/map" className="text-xs text-brand-600 font-bold hover:underline">
          &larr; Back to Map
        </Link>
      </div>
    );
  }

  const pComponents = complaint.priority?.components;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Navigation & Header */}
      <div className="space-y-3">
        <Link to="/citizen" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to My Dashboard
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-400">REFERENCE:</span>
              <h1 className="text-2xl font-black text-slate-900">{complaint.public_reference}</h1>
              <DamageBadge category={complaint.category} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Logged on {new Date(complaint.created_at).toLocaleDateString()} &bull; Coordinates: {complaint.location.coordinates[1].toFixed(5)}, {complaint.location.coordinates[0].toFixed(5)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={complaint.status} size="lg" />
            <button
              onClick={handleToggleSupport}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                hasSupported
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>{hasSupported ? 'Supported' : 'Support Issue'}</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-black/10 text-[10px]">
                {supportCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Evidence & AI Analysis */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Photographic Evidence & AI Scan
            </h2>

            <BoundingBoxViewer
              image={complaint.images?.[0]}
              prediction={complaint.ai_prediction}
            />

            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-700 uppercase">Citizen Description</span>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                {complaint.description}
              </p>
            </div>
          </div>

          {/* Before & After Comparison if Task Evidence is Present */}
          {task?.evidence && task.evidence.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <BeforeAfterCompare
                beforeImage={complaint.images?.[0]}
                afterImage={task.evidence[0].file_metadata}
              />
            </div>
          )}

          {/* Citizen Verification Feedback Form */}
          {(complaint.status === 'PENDING_VERIFICATION' || complaint.status === 'RESOLVED') && (
            <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Citizen Repair Verification & Feedback
                </h3>
              </div>
              <p className="text-xs text-slate-600">
                Contractors have completed repairs. As a community member, your feedback helps confirm whether the fix is durable.
              </p>

              {feedbackSubmitted ? (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl font-medium border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Your verification feedback has been recorded! Thank you for inspecting our public roads.</span>
                </div>
              ) : (
                <form onSubmit={handleCitizenFeedbackSubmit} className="space-y-3">
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <span className="text-slate-700">Does the defect look repaired?</span>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={isFixed}
                        onChange={() => setIsFixed(true)}
                        className="text-brand-600"
                      />
                      <span>Yes, looks good</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={!isFixed}
                        onChange={() => setIsFixed(false)}
                        className="text-rose-600"
                      />
                      <span className="text-rose-700 font-bold">Still damaged / Substandard</span>
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Work Quality Rating: {rating} / 5 Stars
                    </label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className={`p-1 text-base ${star <= rating ? 'text-amber-400' : 'text-slate-300'}`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <textarea
                      rows={2}
                      value={feedbackComments}
                      onChange={(e) => setFeedbackComments(e.target.value)}
                      placeholder="Optional comments regarding patch quality, road smoothness, or lingering gravel..."
                      className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Submit Verification Feedback
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Priority Explainability & Status Timeline */}
        <div className="lg:col-span-5 space-y-6">
          {/* Priority Engine Explainability Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Explainable Priority Engine
              </span>
              <PriorityBadge priority={complaint.priority} />
            </div>

            <div className="space-y-3">
              <div className="text-xs text-slate-500 font-mono">
                P = 0.35S + 0.25T + 0.20V + 0.20R
              </div>

              {pComponents && (
                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-0.5">
                      <span>Damage Severity (S = {pComponents.severity_level})</span>
                      <span>{pComponents.severity_score} / 100</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full" style={{ width: `${pComponents.severity_score}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-0.5">
                      <span>Road Importance (T = {pComponents.road_type})</span>
                      <span>{pComponents.road_importance_score} / 100</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-sky-500 h-full" style={{ width: `${pComponents.road_importance_score}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-0.5">
                      <span>Vulnerability Proximity (V)</span>
                      <span>{pComponents.vulnerability_score} / 100</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-purple-500 h-full" style={{ width: `${pComponents.vulnerability_score}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-0.5">
                      <span>Citizen Corroboration (R = {pComponents.support_count} supporters)</span>
                      <span>{pComponents.corroboration_score} / 100</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: `${pComponents.corroboration_score}%` }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Traceable Status Timeline */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-brand-600" />
              Auditable Status Timeline
            </h3>

            <div className="space-y-3">
              {history.map((h, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-500 mt-1 shrink-0" />
                  <div className="flex-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{h.new_status}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(h.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">Actor: {h.actor_name || 'System'}</div>
                    {h.reason && <p className="text-[11px] text-slate-700 italic">"{h.reason}"</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
