import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import {
  AlertTriangle, FileText, CheckCircle2, Clock, Search,
  Send, ShieldAlert, ArrowRight, Building, Plus, Info, RefreshCw
} from 'lucide-react';

const CATEGORIES = [
  { id: 'DELAYED_REPAIR', label: 'Delayed Repair Beyond SLA (> 72 hrs)', desc: 'Road hazard was acknowledged but maintenance deadline was breached.' },
  { id: 'POOR_WORKMANSHIP', label: 'Substandard Repair Quality / Re-emerged Defect', desc: 'Repaired pothole deteriorated or failed immediately after work was completed.' },
  { id: 'FALSE_COMPLETION', label: 'Falsely Marked as Repaired ("Ghost Repair")', desc: 'Work order was marked resolved in system, but physical road defect is still present.' },
  { id: 'UNMARKED_HAZARD', label: 'Dangerous Unmarked Construction Site', desc: 'Road excavation or work site left without barricades or warning reflectors.' },
  { id: 'CORRUPTION_NEGLIGENCE', label: 'Contractor Negligence / Material Malpractice', desc: 'Suspected use of substandard tar/asphalt or contractual violation.' },
  { id: 'OTHER', label: 'Other Administrative Grievance', desc: 'Any other grievance regarding civic road governance or officer response.' },
];

export const GrievancePage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'FILE' | 'TRACK'>(
    searchParams.get('tab') === 'track' ? 'TRACK' : 'FILE'
  );

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('DELAYED_REPAIR');
  const [complaintId, setComplaintId] = useState(searchParams.get('complaint_id') || '');
  const [authorityName, setAuthorityName] = useState('Public Works Department (PWD)');
  const [locationText, setLocationText] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('HIGH');
  const [evidenceUrl, setEvidenceUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successDoc, setSuccessDoc] = useState<any>(null);

  // List state
  const [grievances, setGrievances] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selectedGrievance, setSelectedGrievance] = useState<any>(null);

  const fetchGrievances = () => {
    if (!user) return;
    setListLoading(true);
    api.grievances.list().then((res) => {
      setGrievances(res.items || []);
      setListLoading(false);
    }).catch(() => setListLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'TRACK') {
      fetchGrievances();
    }
  }, [activeTab, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be signed in to submit an official grievance report.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const payload = {
        title,
        category,
        complaint_id: complaintId.trim(),
        authority_name: authorityName,
        location_text: locationText.trim(),
        description: description.trim(),
        priority,
        evidence_urls: evidenceUrl ? [evidenceUrl.trim()] : [],
      };

      const res = await api.grievances.create(payload);
      setSuccessDoc(res);
      // Reset form
      setTitle('');
      setDescription('');
      setLocationText('');
      setEvidenceUrl('');
      setComplaintId('');
    } catch (err: any) {
      setError(err.message || 'Error filing grievance.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-rose-900/40">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-400/30 rounded-full text-xs font-semibold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Public Accountability & Malpractice Redressal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Citizen Grievance Redressal Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Formal institutional channel to escalate delayed pothole repairs, substandard quality, false resolution claims, and contractor negligence directly to executive supervisors and oversight authorities.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/80">
          <button
            onClick={() => { setActiveTab('FILE'); setSuccessDoc(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'FILE'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>File Grievance</span>
          </button>
          <button
            onClick={() => setActiveTab('TRACK')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'TRACK'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>My Grievances</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'FILE' ? (
        successDoc ? (
          /* Success Screen */
          <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono font-bold rounded-full">
                {successDoc.grievance_number}
              </span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight pt-2">
                Grievance Formally Registered!
              </h2>
              <p className="text-xs text-slate-600">
                Your report has been escalated to executive supervisors at <strong className="text-slate-900">{successDoc.authority_name}</strong>.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 text-left text-xs space-y-2 border border-slate-200">
              <div className="flex justify-between text-slate-500 pb-1.5 border-b border-slate-200">
                <span>Grievance Reference</span>
                <span className="font-mono font-bold text-slate-900">{successDoc.grievance_number}</span>
              </div>
              <div className="flex justify-between text-slate-500 pb-1.5 border-b border-slate-200">
                <span>Subject</span>
                <span className="font-bold text-slate-800 max-w-xs truncate">{successDoc.title}</span>
              </div>
              <div className="flex justify-between text-slate-500 pb-1.5 border-b border-slate-200">
                <span>Category</span>
                <span className="font-semibold text-rose-700">{successDoc.category.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Current Status</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  {successDoc.status}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => { setActiveTab('TRACK'); setSuccessDoc(null); }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-md"
              >
                Track My Grievances
              </button>
              <button
                onClick={() => setSuccessDoc(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                File Another Grievance
              </button>
            </div>
          </div>
        ) : (
          /* Filing Form */
          <div className="max-w-3xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            {!user && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center justify-between">
                <span>You need an account to lodge an official institutional grievance with tracking.</span>
                <Link to="/login" className="px-3 py-1.5 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700">
                  Sign In First
                </Link>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Grievance Category Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Grievance Category *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {CATEGORIES.map((cat) => (
                    <label
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                        category === cat.id
                          ? 'border-rose-500 bg-rose-50/50 text-rose-950 ring-1 ring-rose-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs">{cat.label}</div>
                      <div className="text-[11px] text-slate-500 mt-1">{cat.desc}</div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Grievance Subject / Headline *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Repaired pothole on Model Town GT Road collapsed within 48 hours after rain"
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              {/* Linked Complaint & Authority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Linked Complaint ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={complaintId}
                    onChange={(e) => setComplaintId(e.target.value)}
                    placeholder="e.g. rw-2026-100214"
                    className="w-full px-3.5 py-2.5 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-400">
                    If this grievance concerns an existing RoadWatch report, paste its reference ID.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Authority / Agency Concerned
                  </label>
                  <select
                    value={authorityName}
                    onChange={(e) => setAuthorityName(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl bg-white outline-none"
                  >
                    <option value="Public Works Department (PWD)">Public Works Department (PWD)</option>
                    <option value="National Highways Authority of India (NHAI)">National Highways Authority (NHAI)</option>
                    <option value="Municipal Corporation">Municipal Corporation (MC)</option>
                    <option value="State Road Infrastructure Agency">State Road Infrastructure Agency</option>
                  </select>
                </div>
              </div>

              {/* Road Location */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Road Name / Location Details
                </label>
                <input
                  type="text"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  placeholder="e.g. Near Bus Stand Flyover, Jalandhar Cantt Road"
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              {/* Detailed Description */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Detailed Statement & Citizen Impact *
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain exactly what happened, when the defect or malpractice was noticed, why current repairs failed or were delayed, and how it poses a danger to motorists and pedestrians..."
                  className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none leading-relaxed"
                />
              </div>

              {/* Priority & Photo Attachment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Urgency Level
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl bg-white outline-none"
                  >
                    <option value="NORMAL">Normal Escalation (7 days)</option>
                    <option value="HIGH">High Priority Hazard (48 hours)</option>
                    <option value="URGENT">Urgent - Life Safety Risk (24 hours)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Evidence Image / Document URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    placeholder="https://... or photo link"
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !user}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-rose-600/25 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Submitting Grievance...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>File Official Institutional Grievance</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )
      ) : (
        /* Track Grievances List */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">My Lodged Grievance Reports</h2>
              <p className="text-xs text-slate-500">Track official investigation remarks and status updates</p>
            </div>
            <button
              onClick={fetchGrievances}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {listLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading your grievances...</div>
          ) : grievances.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4 max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">No Grievances Filed</h3>
                <p className="text-xs text-slate-500">
                  You have not submitted any grievance reports yet.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('FILE')}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md"
              >
                File a Grievance Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {grievances.map((g) => (
                <div
                  key={g.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3.5 hover:border-rose-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-mono text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                        {g.grievance_number}
                      </span>
                      <h3 className="font-black text-sm text-slate-900 mt-1">{g.title}</h3>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        g.status === 'RESOLVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : g.status === 'ACTION_TAKEN'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : g.status === 'UNDER_INVESTIGATION'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {g.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {g.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <div>
                      <span className="block text-slate-400">Category:</span>
                      <span className="font-semibold text-slate-700">{g.category.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400">Authority:</span>
                      <span className="font-semibold text-slate-700">{g.authority_name}</span>
                    </div>
                  </div>

                  {g.resolution_remarks && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                      <div className="font-bold text-emerald-900 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Official Resolution Remarks:</span>
                      </div>
                      <p className="text-[11px] text-emerald-800">{g.resolution_remarks}</p>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 flex justify-between items-center pt-1">
                    <span>Filed on {new Date(g.created_at).toLocaleDateString()}</span>
                    {g.complaint_id && (
                      <span className="font-mono">Ref: {g.complaint_id}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
