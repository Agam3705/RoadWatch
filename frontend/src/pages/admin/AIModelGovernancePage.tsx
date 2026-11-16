import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Eye, Shield, CheckCircle2, AlertTriangle, ArrowLeft, BarChart3 } from 'lucide-react';

export const AIModelGovernancePage: React.FC = () => {
  const [govData, setGovData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.ai.governance().then((data) => {
      setGovData(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading model governance metrics...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <Link to="/admin" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin Console
      </Link>

      <div className="space-y-2">
        <span className="text-xs font-bold font-mono uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200">
          Model Governance & Accountability
        </span>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Computer Vision AI Model Governance
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          PRD Section 7.4 compliance: Tracking model drift, human acceptance ratios, and damage class detection frequency.
        </p>
      </div>

      {govData && (
        <div className="space-y-6">
          {/* Active Model Specification Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-sky-400">ACTIVE PRODUCTION ARTIFACT</span>
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-full font-mono text-xs font-bold border border-emerald-400/30">
                ACTIVE
              </span>
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black">{govData.model_name}</h2>
              <div className="text-xs font-mono text-slate-400">
                Weights Version: {govData.active_version} &bull; Pipeline: OpenCV + YOLOv8 Pavement Damage Detection
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block">Total Inferences</span>
                <span className="text-xl font-bold font-mono text-white">{govData.total_inferences}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Human Agreement</span>
                <span className="text-xl font-bold font-mono text-emerald-400">{govData.human_agreement_rate_pct}%</span>
              </div>
              <div>
                <span className="text-slate-400 block">Verified by Officers</span>
                <span className="text-xl font-bold font-mono text-white">{govData.reviewed_count}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Human Overrides</span>
                <span className="text-xl font-bold font-mono text-amber-400">{govData.modified_count}</span>
              </div>
            </div>
          </div>

          {/* Class Distribution Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-brand-600" />
              Detected Damage Classes Distribution
            </h3>

            <div className="space-y-3">
              {govData.detected_classes_distribution && govData.detected_classes_distribution.length > 0 ? (
                govData.detected_classes_distribution.map((item: any, i: number) => {
                  const pct = Math.min(100, (item.count / Math.max(1, govData.total_inferences)) * 100);
                  return (
                    <div key={i} className="space-y-1 text-xs">
                      <div className="flex justify-between font-bold text-slate-700">
                        <span>{item._id || 'Unclassified'}</span>
                        <span className="font-mono text-slate-500">{item.count} detections</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-brand-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-400 text-xs py-4 text-center">No inferences recorded yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
