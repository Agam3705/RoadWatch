import React from 'react';
import { ComplaintStatus } from '../types';

interface StatusBadgeProps {
  status: ComplaintStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  SUBMITTED: { label: 'Submitted', bg: 'bg-blue-50', text: 'text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  UNDER_REVIEW: { label: 'Under Review', bg: 'bg-amber-50', text: 'text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  REQUESTED_INFORMATION: { label: 'Info Needed', bg: 'bg-purple-50', text: 'text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  APPROVED: { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  ASSIGNED: { label: 'Assigned', bg: 'bg-indigo-50', text: 'text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-cyan-50', text: 'text-cyan-700 border-cyan-200', dot: 'bg-cyan-500' },
  PENDING_VERIFICATION: { label: 'Pending Verification', bg: 'bg-orange-50', text: 'text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  RESOLVED: { label: 'Resolved & Verified', bg: 'bg-green-50', text: 'text-green-700 border-green-200', dot: 'bg-green-600' },
  REOPENED: { label: 'Reopened', bg: 'bg-rose-50', text: 'text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  REJECTED: { label: 'Rejected', bg: 'bg-slate-100', text: 'text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  DISPUTED: { label: 'Disputed', bg: 'bg-red-50', text: 'text-red-700 border-red-200', dot: 'bg-red-500' },
  COMPLETION_SUBMITTED: { label: 'Completion Submitted', bg: 'bg-amber-50', text: 'text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  VERIFIED: { label: 'Verified', bg: 'bg-emerald-50', text: 'text-emerald-700 border-emerald-200', dot: 'bg-emerald-600' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = STATUS_CONFIG[status] || {
    label: status,
    bg: 'bg-slate-50',
    text: 'text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  }[size];

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.bg} ${config.text} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};
