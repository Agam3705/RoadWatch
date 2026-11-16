import React from 'react';
import { AIPrediction, ImageMetadata } from '../types';
import { Eye, CheckCircle2, AlertCircle } from 'lucide-react';

interface BoundingBoxViewerProps {
  image?: ImageMetadata;
  prediction?: AIPrediction;
  showOverlay?: boolean;
}

export const BoundingBoxViewer: React.FC<BoundingBoxViewerProps> = ({
  image,
  prediction,
  showOverlay = true,
}) => {
  if (!image) {
    return (
      <div className="w-full h-64 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-sm">
        No image available
      </div>
    );
  }

  const rawUrl = image.url;
  const fullUrl = rawUrl.startsWith('http') ? rawUrl : `http://localhost:8000${rawUrl}`;

  // Image dimensions for calculating % box coordinates
  const origW = image.width || 800;
  const origH = image.height || 600;

  return (
    <div className="space-y-3">
      <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 group">
        <img
          src={fullUrl}
          alt="Road Defect Evidence"
          className="w-full h-auto max-h-[460px] object-contain mx-auto"
          onError={(e) => {
            // Fallback placeholder if media URL fails
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80';
          }}
        />

        {/* AI Bounding Box Overlays */}
        {showOverlay && prediction?.predictions && (
          <div className="absolute inset-0 pointer-events-none">
            {prediction.predictions.map((p, idx) => {
              const [x1, y1, x2, y2] = p.box;
              const leftPct = (x1 / origW) * 100;
              const topPct = (y1 / origH) * 100;
              const widthPct = ((x2 - x1) / origW) * 100;
              const heightPct = ((y2 - y1) / origH) * 100;

              return (
                <div
                  key={idx}
                  className="absolute border-2 border-rose-500 bg-rose-500/15 rounded pointer-events-auto transition-all hover:bg-rose-500/25"
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    width: `${widthPct}%`,
                    height: `${heightPct}%`,
                  }}
                  title={`${p.class} (${(p.confidence * 100).toFixed(1)}% confidence)`}
                >
                  <span className="absolute -top-6 left-0 px-2 py-0.5 bg-rose-600 text-white font-mono text-[11px] font-bold rounded shadow-md whitespace-nowrap">
                    {p.class} {(p.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* AI Model Tag */}
        {prediction && (
          <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/75 backdrop-blur-md rounded-lg text-[11px] text-white flex items-center gap-1.5 font-mono">
            <Eye className="w-3.5 h-3.5 text-sky-400" />
            <span>{prediction.model_name}</span>
            <span className="text-slate-400">({prediction.model_version})</span>
          </div>
        )}
      </div>

      {/* AI Assessment Badges & Quality Indicators */}
      {prediction && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">AI Damage Assessment:</span>
              <span className="px-2 py-0.5 bg-sky-100 text-sky-800 font-bold rounded">
                {prediction.predictions[0]?.class || 'No defect'}
              </span>
              <span className="text-slate-500">
                Confidence: {((prediction.predictions[0]?.confidence || 0) * 100).toFixed(1)}%
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-600">
              {prediction.image_quality.suitable ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> High Quality Image ({prediction.image_quality.quality_score}/100)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> Quality Warning ({prediction.image_quality.flags.join(', ')})
                </span>
              )}
            </div>
          </div>

          {prediction.human_review && prediction.human_review.status !== 'PENDING_REVIEW' && (
            <div className="pt-2 border-t border-slate-200 text-slate-700 flex items-center gap-2">
              <span className="font-semibold text-brand-700">Official Human Review:</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold rounded text-[11px]">
                {prediction.human_review.status}
              </span>
              {prediction.human_review.comments && (
                <span className="text-slate-500 italic">"{prediction.human_review.comments}"</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
