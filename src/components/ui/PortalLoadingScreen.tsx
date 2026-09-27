import React from 'react';
import { Loader2, Shield } from 'lucide-react';

interface PortalLoadingScreenProps {
  title?: string;
  message?: string;
  schoolName?: string;
}

export const PortalLoadingScreen: React.FC<PortalLoadingScreenProps> = ({
  title = 'Connecting to School Portal',
  message = 'Retrieving institutional workspace and tenant configuration…',
  schoolName,
}) => {
  return (
    <main
      className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 select-none"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="w-full max-w-sm flex flex-col items-center text-center space-y-6">
        {/* SeferNote Emblem Mark */}
        <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
          <svg
            viewBox="0 0 100 100"
            className="w-8 h-8"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="loadGlobeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563EB" />
                <stop offset="100%" stopColor="#0284C7" />
              </linearGradient>
              <linearGradient id="loadNibGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0F172A" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>
            </defs>
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="url(#loadGlobeGrad)"
              strokeWidth="6"
              strokeDasharray="180 50"
              className="opacity-90"
            />
            <ellipse
              cx="50"
              cy="50"
              rx="40"
              ry="18"
              stroke="url(#loadGlobeGrad)"
              strokeWidth="4"
              strokeDasharray="120 70"
              transform="rotate(-25 50 50)"
              className="opacity-60"
            />
            <path
              d="M 50 20 L 68 45 L 56 50 L 52 75 L 48 75 L 44 50 L 32 45 Z"
              fill="url(#loadNibGrad)"
              transform="rotate(35 50 50)"
            />
            <circle
              cx="50"
              cy="48"
              r="3.5"
              fill="#0284C7"
              transform="rotate(35 50 50)"
            />
          </svg>
        </div>

        {/* Text & Spinner */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">
            <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" aria-hidden="true" />
            <span>{title}</span>
          </div>
          {schoolName && (
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              {schoolName}
            </h1>
          )}
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            {message}
          </p>
        </div>

        {/* Security badge */}
        <div className="pt-2 flex items-center gap-1.5 text-[0.6875rem] font-medium text-slate-400">
          <Shield className="w-3 h-3 text-slate-400" aria-hidden="true" />
          <span>SeferNote Multi-Tenant Boundary</span>
        </div>
      </div>
    </main>
  );
};
