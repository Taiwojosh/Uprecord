import React, { useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { applyPwaUpdate, onPwaUpdate } from '../../lib/pwa';

/**
 * Non-blocking "new version ready" notice. Appears only when a service-worker
 * update is waiting; never reloads automatically, so an in-progress form or
 * session is never interrupted.
 */
export const UpdateBanner: React.FC = () => {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [dismissed, setDismissed] = useState(false);

  React.useEffect(() => onPwaUpdate((reg) => setRegistration(reg)), []);

  if (!registration || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 left-4 sm:left-auto z-[110] max-w-sm pointer-events-auto animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <Card className="p-4 border border-[var(--app-border-strong)] shadow-[var(--shadow-modal)]">
        <div className="flex items-start gap-3">
          <RefreshCw className="w-4 h-4 mt-0.5 text-[var(--app-info)] shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[var(--app-text)]">A new version of GlobePen is ready</p>
            <p className="text-xs text-[var(--app-text-muted)] mt-1 leading-relaxed">
              Nothing is reloaded automatically. Refresh when it suits you — anything on screen right now stays put.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                onClick={() => {
                  setDismissed(true);
                  applyPwaUpdate(registration);
                }}
              >
                Refresh now
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
                Later
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss update notice"
            className="p-1.5 rounded-lg text-[var(--app-text-subtle)] hover:bg-[var(--app-surface-2)] hover:text-[var(--app-text)] transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </Card>
    </div>
  );
};