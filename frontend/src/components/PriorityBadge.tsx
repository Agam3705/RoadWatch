import React from 'react';
import { PriorityScore, SeverityLevel } from '../types';
import { AlertTriangle, Flame } from 'lucide-react';

interface PriorityBadgeProps {
  priority?: PriorityScore;
  level?: SeverityLevel | string;
  showScore?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, level, showScore = true }) => {
  const band = priority?.band || level || 'MEDIUM';
  const score = priority?.score;
  const isEmergency = priority?.is_emergency;

  const bandConfigs: Record<string, { bg: string; text: string; border: string; label: string }> = {
    CRITICAL: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300', label: 'Critical' },
    HIGH: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', label: 'High' },
    MEDIUM: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', label: 'Medium' },
    LOW: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-300', label: 'Low' },
  };

  const config = bandConfigs[band.toUpperCase()] || bandConfigs.MEDIUM;

  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
        {isEmergency ? <Flame className="w-3 h-3 text-red-600 animate-pulse" /> : <AlertTriangle className="w-3 h-3" />}
        {config.label} Priority
        {showScore && score !== undefined && (
          <span className="ml-1 px-1.5 py-0.2 bg-white/80 rounded text-[11px] font-mono">
            {score}
          </span>
        )}
      </span>
      {isEmergency && (
        <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] uppercase tracking-wide font-black rounded">
          Emergency
        </span>
      )}
    </div>
  );
};
