import React from 'react';
import { DamageCategory } from '../types';

interface DamageBadgeProps {
  category: DamageCategory | string;
}

const CATEGORY_NAMES: Record<string, string> = {
  POTHOLE: 'Pothole',
  LONGITUDINAL_CRACK: 'Longitudinal Crack',
  ALLIGATOR_CRACK: 'Alligator Cracking',
  RUTTING: 'Rutting & Depressions',
  SUBSIDENCE: 'Road Subsidence',
  DEBRIS: 'Debris / Obstruction',
  STREETLIGHT_POLE_DAMAGE: 'Pole Damage',
  DRAINAGE_OVERFLOW: 'Drainage Overflow',
  OTHER: 'Infrastructure Defect',
};

export const DamageBadge: React.FC<DamageBadgeProps> = ({ category }) => {
  const label = CATEGORY_NAMES[category] || category.replace(/_/g, ' ');

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
      {label}
    </span>
  );
};
