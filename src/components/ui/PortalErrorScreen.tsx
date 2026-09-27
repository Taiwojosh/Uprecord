import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, ShieldAlert, Globe } from 'lucide-react';

interface PortalErrorScreenProps {
  title?: string;
  message?: string;
  onRetry?: () => void | Promise<void>;
  schoolName?: string;
}

export const PortalErrorScreen: React.FC<PortalErrorScreenProps> = ({
  title = 'School Portal Unavailable',
  message = 'This school portal could not be loaded. Check the address and try again.',
  onRetry,
  schoolName,
}) => {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry || retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

  return (
    <main
      className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 sm:p-6 text-slate-900"
      role="alert"
      aria-live="polite"
    >
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Header with Alert Icon */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700">
            <AlertTriangle className="w-6 h-6" aria-hidden="true" />
          </div>

          <div className="space-y-1.5">
            {schoolName && (
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {schoolName}
              </p>
            )}
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {title}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed max-w-sm">
              {message}
            </p>
          </div>
        </div>

        {/* Diagnostic info block */}
        <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-3.5 text-xs text-slate-600 space-y-2">
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <Globe className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>Target Host: <code className="font-mono text-slate-800 bg-white px-1 py-0.5 rounded border border-slate-200">{hostname || 'portal host'}</code></span>
          </div>
          <p className="text-slate-500 leading-normal">
            If you are accessing an institution's custom domain, please confirm the web address is correct or verify your internet connection.
          </p>
        </div>

        {/* Action Controls */}
        <div className="space-y-2.5 pt-1">
          {onRetry && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="w-full h-11 inline-flex items-center justify-center gap-2 px-5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>{retrying ? 'Retrying Connection…' : 'Retry'}</span>
            </button>
          )}

          <a
            href="/"
            className="w-full h-11 inline-flex items-center justify-center gap-2 px-5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-sm font-medium rounded-xl border border-slate-200 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Return to Platform Home</span>
          </a>
        </div>

        {/* Trust & Boundary Footer */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[0.6875rem] text-slate-400">
          <ShieldAlert className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          <span>SeferNote Institutional Portal Verification</span>
        </div>
      </div>
    </main>
  );
};
