import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { MaintenanceTask } from '../../types';
import { Camera, CheckCircle2, ArrowLeft, Upload, X, AlertCircle } from 'lucide-react';

export const SubmitEvidencePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<MaintenanceTask | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [workNotes, setWorkNotes] = useState('');
  const [materialType, setMaterialType] = useState('Hot Mix Asphalt (VG-30)');
  const [materialQuantity, setMaterialQuantity] = useState('2.5 Metric Tons');
  const [compactionTool, setCompactionTool] = useState('8-10 Ton Vibratory Roller');
  const [repairLocation, setRepairLocation] = useState('GPS Verified On-Site');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      api.contractor.getTask(id).then(setTask).catch(() => {});
    }
  }, [id]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setSelectedImages((prev) => [...prev, ...files]);
    const newUrls = files.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newUrls]);
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    if (selectedImages.length === 0) {
      setError('At least one after-repair photograph is mandatory completion evidence.');
      return;
    }
    if (!workNotes.trim()) {
      setError('Please provide notes describing the repair work and materials used.');
      return;
    }

    setSubmitting(true);
    setError('');

    const formattedNotes = `Material: ${materialType} (${materialQuantity}) | Compaction: ${compactionTool}\n${workNotes.trim()}`;

    const formData = new FormData();
    formData.append('work_notes', formattedNotes);
    formData.append('repair_location', repairLocation);
    selectedImages.forEach((f) => {
      formData.append('images', f);
    });

    try {
      await api.contractor.submitEvidence(task.id, formData);
      alert('Completion evidence successfully submitted! The work order is now awaiting official authority verification.');
      navigate('/contractor');
    } catch (err: any) {
      setError(err.message || 'Error uploading repair evidence.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link to="/contractor" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Contractor Hub
      </Link>

      <div className="space-y-2">
        <span className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
          Completion & Evidence Submission
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Submit Repair Completion Evidence
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Upload clear photographs demonstrating the completed repair patch, surface compaction, and site clearance.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {task && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
            <div>
              <span className="font-mono font-bold text-slate-900">{task.task_reference}</span>
              <div className="text-slate-600 font-semibold">{task.title}</div>
            </div>
            <span className="font-mono text-brand-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 font-bold">
              {task.complaint_reference}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Uploader */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              After-Repair Photographs (Mandatory)
            </label>

            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-8 text-center cursor-pointer transition-colors relative">
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageSelect}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Camera className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-800">
                Click or drag photographs of the repaired road here
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Ensure good lighting, showing smooth level asphalt and sealed borders
              </div>
            </div>

            {previews.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-2">
                {previews.map((url, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden h-24 border border-slate-200 group">
                    <img src={url} alt={`Evidence ${i}`} className="w-full h-full object-cover" />
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

          {/* Material & Execution Specification Log */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>Municipal Materials & Compaction Log</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">
                  Bitumen / Concrete Mix
                </label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white outline-none"
                >
                  <option value="Hot Mix Asphalt (VG-30)">Hot Mix Asphalt (VG-30)</option>
                  <option value="Cold Mix Asphalt Polymer">Cold Mix Asphalt Polymer</option>
                  <option value="Dense Bituminous Macadam (DBM)">Dense Bituminous Macadam</option>
                  <option value="Cement Concrete M-40">Cement Concrete M-40</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">
                  Asphalt Quantity Applied
                </label>
                <input
                  type="text"
                  value={materialQuantity}
                  onChange={(e) => setMaterialQuantity(e.target.value)}
                  placeholder="e.g. 2.5 Metric Tons"
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">
                  Compaction Equipment
                </label>
                <select
                  value={compactionTool}
                  onChange={(e) => setCompactionTool(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white outline-none"
                >
                  <option value="8-10 Ton Vibratory Roller">8-10 Ton Vibratory Roller</option>
                  <option value="Heavy Tandem Roller">Heavy Tandem Roller</option>
                  <option value="Plate Compactor">Plate Compactor</option>
                  <option value="Hand Rammer / Tamper">Hand Tamper</option>
                </select>
              </div>
            </div>
          </div>

          {/* Work Notes */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Work Execution Notes & Materials Applied
            </label>
            <textarea
              rows={3}
              required
              value={workNotes}
              onChange={(e) => setWorkNotes(e.target.value)}
              placeholder="e.g. Cleared water and debris, laid 50mm compacted hot mix asphalt with tack coat, rolled with 8-ton vibratory roller. Traffic restored."
              className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              On-Site Repair Location / Landmarks
            </label>
            <input
              type="text"
              value={repairLocation}
              onChange={(e) => setRepairLocation(e.target.value)}
              className="w-full p-2.5 text-xs border border-slate-300 rounded-xl outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Submitting Completion Evidence...' : 'Submit Evidence for Verification'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
