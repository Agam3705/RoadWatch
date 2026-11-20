import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { DamageCategory, SeverityLevel, Complaint } from '../../types';
import { LocationPicker } from '../../components/LocationPicker';
import { StatusBadge } from '../../components/StatusBadge';
import { DamageBadge } from '../../components/DamageBadge';
import {
  MapPin, Upload, Camera, AlertTriangle, CheckCircle2,
  ThumbsUp, ArrowRight, X, AlertCircle, Crosshair, Zap, ShieldAlert
} from 'lucide-react';

const CATEGORIES: Array<{ id: DamageCategory; label: string; desc: string }> = [
  { id: 'POTHOLE', label: 'Pothole', desc: 'Depression or cavity in road surface' },
  { id: 'LONGITUDINAL_CRACK', label: 'Longitudinal Crack', desc: 'Linear fissure parallel to road centerline' },
  { id: 'ALLIGATOR_CRACK', label: 'Alligator Cracking', desc: 'Interconnected polygon cracks resembling crocodile skin' },
  { id: 'SUBSIDENCE', label: 'Subsidence / Trench', desc: 'Settlement or depression after trenching/water pipe work' },
  { id: 'RUTTING', label: 'Rutting', desc: 'Surface depressions along heavy wheelpaths' },
  { id: 'DEBRIS', label: 'Debris / Obstruction', desc: 'Fallen road material or gravel hazard' },
  { id: 'OTHER', label: 'Other Defect', desc: 'Any other infrastructure damage' },
];

export const ReportIssuePage: React.FC = () => {
  const navigate = useNavigate();

  const [category, setCategory] = useState<DamageCategory>('POTHOLE');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel>('MEDIUM');
  const [coords, setCoords] = useState<[number, number]>([75.768, 31.224]); // [lng, lat]
  const [isNearVulnerable, setIsNearVulnerable] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Emergency SOS & GPS state
  const [isEmergency, setIsEmergency] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Duplicate candidates
  const [nearbyDuplicates, setNearbyDuplicates] = useState<Complaint[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submittedComplaint, setSubmittedComplaint] = useState<any | null>(null);
  const [error, setError] = useState('');

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords([pos.coords.longitude, pos.coords.latitude]);
        setGpsLoading(false);
      },
      (err) => {
        alert('Could not retrieve GPS coordinates: ' + err.message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const toggleEmergencyMode = () => {
    const next = !isEmergency;
    setIsEmergency(next);
    if (next) {
      setSeverity('CRITICAL');
      setIsNearVulnerable(true);
    }
  };

  // Check duplicate candidates when coords change
  useEffect(() => {
    setCheckingDuplicates(true);
    api.geo.nearby(coords[0], coords[1], 300)
      .then((res) => {
        const matches = (res.items || []).filter((c) => c.status !== 'RESOLVED');
        setNearbyDuplicates(matches);
      })
      .catch(() => {})
      .finally(() => setCheckingDuplicates(false));
  }, [coords]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setSelectedImages((prev) => [...prev, ...files]);

    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide a brief description of the defect.');
      return;
    }

    setSubmitting(true);
    setError('');

    const formData = new FormData();
    formData.append('category', category);
    formData.append('description', description.trim());
    formData.append('citizen_severity', severity);
    formData.append('longitude', String(coords[0]));
    formData.append('latitude', String(coords[1]));
    formData.append('is_near_vulnerable', String(isNearVulnerable));

    selectedImages.forEach((file) => {
      formData.append('images', file);
    });

    try {
      const result = await api.complaints.create(formData);
      setSubmittedComplaint(result);
    } catch (err: any) {
      setError(err.message || 'Failed to submit complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSupportDuplicate = async (complaintId: string) => {
    try {
      await api.complaints.support(complaintId);
      alert('You have supported this existing report! Thank you for corroborating.');
      navigate(`/complaints/${complaintId}`);
    } catch (err: any) {
      alert(err.message || 'Could not support report.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <span className="text-xs font-bold font-mono uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-200">
          Citizen Reporting Portal
        </span>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Report a Road Infrastructure Defect
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
          Provide location and photographs. Our AI will automatically evaluate damage severity, check for duplicates, and recommend maintenance priority.
        </p>
      </div>

      {/* Success Dialog */}
      {submittedComplaint ? (
        <div className="bg-white rounded-3xl p-8 border border-emerald-200 shadow-xl text-center space-y-6 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">Complaint Submitted Successfully!</h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              Your report has been logged into the municipal queue and assigned a permanent public tracking reference:
            </p>
            <div className="font-mono text-xl font-black text-brand-700 bg-sky-50 py-2.5 px-6 rounded-xl inline-block border border-sky-200">
              {submittedComplaint.public_reference}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl max-w-md mx-auto text-left text-xs text-slate-600 space-y-2 border border-slate-100">
            <div className="font-bold text-slate-800">What happens next?</div>
            <ul className="list-disc pl-4 space-y-1 text-slate-500">
              <li>OpenCV & YOLO AI damage model processes your uploaded photographs.</li>
              <li>Explainable priority score is calculated based on severity and road classification.</li>
              <li>P.W.D. authority officer inspects report and creates contractor work order.</li>
              <li>You can verify the contractor's repair completion evidence before closure!</li>
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to={`/complaints/${submittedComplaint.id || submittedComplaint.public_reference}`}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              Track Report Timeline &rarr;
            </Link>
            <Link
              to="/citizen"
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
            >
              Back to My Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Emergency SOS Hazard Toggle */}
          <div
            onClick={toggleEmergencyMode}
            className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
              isEmergency
                ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/30'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isEmergency
                    ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/30'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    Emergency Life-Safety Road Hazard Mode
                  </span>
                  {isEmergency && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white animate-pulse">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Deep cave-in, submerged manhole, exposed live wiring, or washed-out bridge requiring immediate 24h municipal intervention.
                </p>
              </div>
            </div>

            <button
              type="button"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                isEmergency
                  ? 'bg-rose-600 text-white'
                  : 'bg-white border border-slate-300 text-slate-700'
              }`}
            >
              {isEmergency ? 'Disable' : 'Enable SOS'}
            </button>
          </div>

          {/* Step 1: Category Selection */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs">1</span>
              Select Road Damage Category
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {CATEGORIES.map((c) => {
                const isSelected = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`p-3 text-left rounded-xl border text-xs transition-all ${
                      isSelected
                        ? 'border-brand-600 bg-sky-50/70 text-brand-950 font-bold shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-slate-900">{c.label}</div>
                    <div className="text-[11px] text-slate-500 font-normal mt-0.5">{c.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Location Picker */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs">2</span>
                Pinpoint Incident Location
              </h2>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={gpsLoading}
                className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Crosshair className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
                <span>{gpsLoading ? 'Locating...' : 'Use My GPS Location'}</span>
              </button>
            </div>
            <LocationPicker
              initialCoords={coords}
              onChange={(newCoords) => setCoords(newCoords)}
            />

            {/* Duplicate Discovery Alert if any nearby open defects */}
            {nearbyDuplicates.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Potential Duplicate Detected Nearby ({nearbyDuplicates.length} open reports within 300m)</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Another citizen may have already reported this issue. You can support the existing report to boost its priority score, or proceed with your new submission.
                </p>

                <div className="space-y-2 pt-1">
                  {nearbyDuplicates.slice(0, 2).map((dup) => (
                    <div
                      key={dup.id}
                      className="p-2.5 bg-white rounded-lg border border-amber-200 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-slate-900">{dup.public_reference}</span>
                        <span className="text-slate-500 ml-2">&bull; {dup.category}</span>
                        <div className="text-[11px] text-slate-600 line-clamp-1">{dup.description}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSupportDuplicate(dup.id)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shrink-0"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>Support This</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Photo Upload & Description */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs">3</span>
              Evidence & Details
            </h2>

            {/* Description */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Defect Description & Landmarks
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe size, depth, water accumulation, or proximity to road divider / crosswalk..."
                className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            {/* Citizen Severity & Vulnerable Flag */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Citizen Estimated Severity
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none bg-white font-medium"
                >
                  <option value="CRITICAL">Critical (Immediate vehicle damage / accident hazard)</option>
                  <option value="HIGH">High (Severe bump / deep crater)</option>
                  <option value="MEDIUM">Medium (Moderate surface cracking / shallow pothole)</option>
                  <option value="LOW">Low (Minor hairline cracks / surface weathering)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="vulnerable-check"
                  checked={isNearVulnerable}
                  onChange={(e) => setIsNearVulnerable(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="vulnerable-check" className="text-xs text-slate-700 font-semibold cursor-pointer">
                  Near School, Hospital, or Bus/Metro Terminal (&lt; 500m)
                </label>
              </div>
            </div>

            {/* Multi Photo Upload */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Upload Defect Photographs (AI Scanned)
              </label>

              <div className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-6 text-center cursor-pointer transition-colors relative">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-800">
                  Click or drag photos here to upload
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Supports JPG, PNG, WEBP up to 15MB each
                </div>
              </div>

              {/* Thumbnails preview */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-2">
                  {imagePreviews.map((url, i) => (
                    <div key={i} className="relative rounded-xl overflow-hidden h-24 border border-slate-200 group">
                      <img src={url} alt={`Upload ${i}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-full hover:bg-rose-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-brand-500/25 transition-all hover:scale-[1.01]"
          >
            {submitting ? 'Analyzing & Submitting Report...' : 'Submit Road Defect Report'}
          </button>
        </form>
      )}
    </div>
  );
};
