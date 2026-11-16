import React, { useState } from 'react';
import { ImageMetadata } from '../types';
import { CheckCircle2, AlertTriangle, ArrowRightLeft } from 'lucide-react';

interface BeforeAfterCompareProps {
  beforeImage?: ImageMetadata;
  afterImage?: ImageMetadata;
  beforeLabel?: string;
  afterLabel?: string;
}

export const BeforeAfterCompare: React.FC<BeforeAfterCompareProps> = ({
  beforeImage,
  afterImage,
  beforeLabel = 'Before: Citizen Reported Defect',
  afterLabel = 'After: Contractor Repair Evidence',
}) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [viewMode, setViewMode] = useState<'split' | 'side-by-side'>('side-by-side');

  const beforeUrl = beforeImage?.url?.startsWith('http') ? beforeImage.url : `http://localhost:8000${beforeImage?.url || ''}`;
  const afterUrl = afterImage?.url?.startsWith('http') ? afterImage.url : `http://localhost:8000${afterImage?.url || ''}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-brand-600" />
          Repair Evidence Verification Comparison
        </h4>
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              viewMode === 'side-by-side' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-600'
            }`}
          >
            Side by Side
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              viewMode === 'split' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-600'
            }`}
          >
            Overlay Slider
          </button>
        </div>
      </div>

      {viewMode === 'side-by-side' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Before Image */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {beforeLabel}
              </span>
              <span className="text-[11px] font-normal text-slate-500">Original Submission</span>
            </div>
            <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 h-64 flex items-center justify-center">
              <img
                src={beforeUrl}
                alt="Before repair"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80';
                }}
              />
            </div>
          </div>

          {/* After Image */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> {afterLabel}
              </span>
              <span className="text-[11px] font-normal text-slate-500">Contractor Completion</span>
            </div>
            <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 h-64 flex items-center justify-center">
              {afterImage ? (
                <img
                  src={afterUrl}
                  alt="After repair"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1578991624414-276ef23a534f?w=800&auto=format&fit=crop&q=80';
                  }}
                />
              ) : (
                <div className="text-slate-400 text-xs text-center p-4">
                  Repair completion evidence not yet submitted by contractor.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Interactive Split Slider */
        <div className="space-y-2">
          <div className="relative w-full h-80 rounded-2xl overflow-hidden select-none bg-slate-900 border border-slate-200">
            {/* Background After Image */}
            <img
              src={afterUrl}
              alt="After repair"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Foreground Before Image with clip-path */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPos}%` }}
            >
              <img
                src={beforeUrl}
                alt="Before repair"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ width: '100%', maxWidth: 'none' }}
              />
            </div>
            {/* Slider Divider Line */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-xl cursor-ew-resize flex items-center justify-center"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="w-6 h-6 bg-white rounded-full shadow-lg border border-slate-300 flex items-center justify-center text-slate-700 text-[10px] font-bold">
                &harr;
              </div>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderPos}
            onChange={(e) => setSliderPos(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>&larr; Slide Left (Show After)</span>
            <span>Slide Right (Show Before) &rarr;</span>
          </div>
        </div>
      )}
    </div>
  );
};
