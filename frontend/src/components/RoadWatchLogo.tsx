import React from 'react';

interface RoadWatchLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  tagline?: string;
  className?: string;
}

export const RoadWatchLogo: React.FC<RoadWatchLogoProps> = ({
  size = 'md',
  showText = true,
  tagline,
  className = '',
}) => {
  const iconSizes = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizes = {
    xs: 'text-sm',
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Brand Icon SVG */}
      <div
        className={`${iconSizes[size]} shrink-0 relative rounded-2xl bg-gradient-to-tr from-brand-700 via-sky-600 to-sky-400 p-[1px] shadow-md shadow-brand-500/20`}
      >
        <svg
          viewBox="0 0 64 64"
          className="w-full h-full rounded-2xl"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="64" height="64" rx="16" fill="#0f172a" />
          <rect
            width="64"
            height="64"
            rx="16"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeOpacity="0.3"
          />

          {/* Converging Highway Roadbed */}
          <path d="M14 54 L25 24 L39 24 L50 54 Z" fill="#1e293b" />

          {/* Highway Shoulders / Curbs */}
          <path d="M14 54 L25 24" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M50 54 L39 24" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />

          {/* White Dashed Center Line */}
          <line x1="32" y1="26" x2="32" y2="31" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <line x1="32" y1="35" x2="32" y2="42" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="32" y1="46" x2="32" y2="54" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />

          {/* Radar AI Pulse Pin */}
          <circle cx="32" cy="18" r="9" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.5" strokeDasharray="2 2" />
          <circle cx="32" cy="18" r="5" fill="#f59e0b" />
          <circle cx="32" cy="18" r="2" fill="#ffffff" />
        </svg>
      </div>

      {/* Brand Wordmark */}
      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span
              className={`${textSizes[size]} font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-brand-800 to-sky-600`}
            >
              Road<span className="text-sky-500">Watch</span>
            </span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] uppercase font-black tracking-widest bg-sky-100 text-sky-800 rounded-md border border-sky-200">
              GovTech
            </span>
          </div>
          {tagline && (
            <span className="text-[10px] text-slate-400 font-semibold tracking-wide">
              {tagline}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
