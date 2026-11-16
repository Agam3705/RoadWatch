import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Complaint, DamageCategory, SeverityLevel } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { DamageBadge } from '../../components/DamageBadge';
import { PriorityBadge } from '../../components/PriorityBadge';
import { BoundingBoxViewer } from '../../components/BoundingBoxViewer';
import {
  Shield, CheckCircle2, XCircle, HelpCircle, Wrench, ArrowLeft,
  AlertTriangle, Flame, Send, CheckSquare
} from 'lucide-react';

export const ComplaintReviewDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Review form state
  const [decision, setDecision] = useState<'APPROVE' | 'REJECT' | 'REQUEST_INFO'>('APPROVE');
  const [reason, setReason] = useState('');
  const [overrideCategory, setOverrideCategory] = useState<DamageCategory | ''>('');
  const [overrideSeverity, setOverrideSeverity] = useState<SeverityLevel | ''>('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Dispatch work order modal/state
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState('');
  const [workTitle, setWorkTitle] = useState('');
  const [deadlineDays, setDeadlineDays] = useState(14);
  const [instructions, setInstructions] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(35000);
  const [dispatching, setDispatching] = useState(false);

  const fetchComplaint = async () => {
    if (!id) return;
    try {
      const data = await api.complaints.get(id);
      setComplaint(data);
      setWorkTitle(`Emergency Road Repair at ${data.public_reference}`);
      const orgs = await api.admin.organizations('CONTRACTOR');
      setContractors(orgs || []);
      if (orgs && orgs.length > 0) {
        setSelectedContractor(orgs[0].id);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaint();
  }, [id]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint) return;
    if (decision === 'REJECT' && !reason.trim()) {
      alert('A rejection reason is mandatory.');
      return;
    }

    setSubmittingReview(true);
    try {
      const payload: any = { action: decision, reason: reason.trim() };
      if (overrideCategory) payload.category = overrideCategory;
      if (overrideSeverity) payload.severity = overrideSeverity;

      await api.complaints.review(complaint.id, payload);
      alert(`Report marked as ${decision}.`);
      await fetchComplaint();
    } catch (err: any) {
      alert(err.message || 'Error recording review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDispatchWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !selectedContractor) return;

    setDispatching(true);
    try {
      await api.maintenance.createTask({
        complaint_id: complaint.id,
        title: workTitle,
        contractor_org_id: selectedContractor,
        deadline_days: deadlineDays,
        instructions,
        estimated_cost: estimatedCost,
      });
      alert('Work order generated and assigned to contractor successfully!');
      setShowDispatchModal(false);
      navigate('/authority');
    } catch (err: any) {
      alert(err.message || 'Error dispatching work order.');
    } finally {
      setDispatching(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading inspection details...</div>;
  }

  if (!complaint) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-sm font-bold text-slate-800">Complaint not found</h2>
      </div>
    );
  }

  const pComponents = complaint.priority?.components;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Back button & Header */}
      <div className="space-y-3">
        <Link to="/authority/review-queue" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Review Queue
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-400">OFFICIAL REVIEW:</span>
              <h1 className="text-2xl font-black text-slate-900">{complaint.public_reference}</h1>
              <DamageBadge category={complaint.category} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Location: {complaint.location.coordinates[1].toFixed(5)}, {complaint.location.coordinates[0].toFixed(5)} &bull; Submitted {new Date(complaint.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={complaint.status} size="lg" />
            {(complaint.status === 'APPROVED' || complaint.status === 'SUBMITTED' || complaint.status === 'UNDER_REVIEW') && (
              <button
                onClick={() => setShowDispatchModal(true)}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Wrench className="w-4 h-4" />
                <span>Dispatch Work Order</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Image Viewer with AI Detection Bounding Boxes */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Computer Vision Road Damage Analysis
            </h2>

            <BoundingBoxViewer
              image={complaint.images?.[0]}
              prediction={complaint.ai_prediction}
            />

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-700 uppercase">Citizen Description</span>
              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium leading-relaxed">
                {complaint.description}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Priority Explainability & Authority Action Form */}
        <div className="lg:col-span-5 space-y-6">
          {/* Explainable Priority Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Explainable Priority Score
              </span>
              <PriorityBadge priority={complaint.priority} />
            </div>

            <div className="text-xs text-slate-500 font-mono">
              P = 0.35S + 0.25T + 0.20V + 0.20R = <strong className="text-slate-900 font-bold">{complaint.priority?.score}</strong>
            </div>

            {pComponents && (
              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-0.5">
                    <span>Severity (S = {pComponents.severity_level})</span>
                    <span>{pComponents.severity_score}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full" style={{ width: `${pComponents.severity_score}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-0.5">
                    <span>Road Type (T = {pComponents.road_type})</span>
                    <span>{pComponents.road_importance_score}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-sky-500 h-full" style={{ width: `${pComponents.road_importance_score}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-0.5">
                    <span>Vulnerability Zone (V)</span>
                    <span>{pComponents.vulnerability_score}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full" style={{ width: `${pComponents.vulnerability_score}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-0.5">
                    <span>Corroboration (R = {pComponents.support_count} supporters)</span>
                    <span>{pComponents.corroboration_score}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full" style={{ width: `${pComponents.corroboration_score}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Official Authority Action Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-brand-600" />
              Authority Review Determination
            </h2>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDecision('APPROVE')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    decision === 'APPROVE'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  ✓ Approve
                </button>
                <button
                  type="button"
                  onClick={() => setDecision('REQUEST_INFO')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    decision === 'REQUEST_INFO'
                      ? 'bg-purple-50 border-purple-500 text-purple-800 shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  ? Request Info
                </button>
                <button
                  type="button"
                  onClick={() => setDecision('REJECT')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    decision === 'REJECT'
                      ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  ✕ Reject
                </button>
              </div>

              {/* Review notes / Rejection Reason */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Review Notes / Reason {decision === 'REJECT' && <span className="text-rose-600">*</span>}
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    decision === 'REJECT'
                      ? 'Mandatory reason for rejecting report (e.g., private driveway, defect duplicate)...'
                      : 'Optional review comments...'
                  }
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              {/* Optional Category/Severity Human Override */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Human-in-the-Loop Override (Optional)
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <select
                    value={overrideCategory}
                    onChange={(e) => setOverrideCategory(e.target.value as any)}
                    className="p-2 border border-slate-300 rounded-lg outline-none bg-white font-medium"
                  >
                    <option value="">Keep Category ({complaint.category})</option>
                    <option value="POTHOLE">Pothole</option>
                    <option value="LONGITUDINAL_CRACK">Longitudinal Crack</option>
                    <option value="ALLIGATOR_CRACK">Alligator Crack</option>
                    <option value="SUBSIDENCE">Subsidence</option>
                  </select>

                  <select
                    value={overrideSeverity}
                    onChange={(e) => setOverrideSeverity(e.target.value as any)}
                    className="p-2 border border-slate-300 rounded-lg outline-none bg-white font-medium"
                  >
                    <option value="">Keep Severity ({complaint.citizen_severity})</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                {submittingReview ? 'Recording Decision...' : 'Commit Review Decision'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Dispatch Work Order Modal */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-brand-600" />
                Dispatch Maintenance Work Order
              </h3>
              <button
                onClick={() => setShowDispatchModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDispatchWorkOrder} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase">Work Order Title</label>
                <input
                  type="text"
                  required
                  value={workTitle}
                  onChange={(e) => setWorkTitle(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase">Assign Verified Contractor</label>
                <select
                  required
                  value={selectedContractor}
                  onChange={(e) => setSelectedContractor(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 bg-white font-medium"
                >
                  {contractors.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.registration_number || 'Contractor'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase">Completion Deadline</label>
                  <select
                    value={deadlineDays}
                    onChange={(e) => setDeadlineDays(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 bg-white font-medium"
                  >
                    <option value={3}>3 Days (Emergency SLA)</option>
                    <option value={7}>7 Days (Standard SLA)</option>
                    <option value={14}>14 Days (Routine Maintenance)</option>
                    <option value={30}>30 Days (Major Overlay)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase">Estimated Budget (INR)</label>
                  <input
                    type="number"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase">Technical Instructions for Contractor</label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Cut clean vertical edges, lay tack coat, compact in 50mm layers, seal joint..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispatching}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-md transition-all"
                >
                  {dispatching ? 'Dispatching...' : 'Confirm & Dispatch Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
