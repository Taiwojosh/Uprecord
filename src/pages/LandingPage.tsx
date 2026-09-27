import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import type { PublicBranding } from '../../server/src/contracts/branding';
import { DevikysLandingPage } from './DevikysLandingPage';
import { PlatformLandingPage } from './PlatformLandingPage';
import { DemoLandingPage } from './DemoLandingPage';
import { PortalLoadingScreen } from '../components/ui/PortalLoadingScreen';
import { PortalErrorScreen } from '../components/ui/PortalErrorScreen';

export const LandingPage = () => {
  const [branding, setBranding] = useState<PublicBranding | null>(null);
  const [error, setError] = useState(false);

  const fetchBranding = useCallback(() => {
    setError(false);
    const controller = new AbortController();
    api.get('/schools/branding', { signal: controller.signal })
      .then(({ data }) => setBranding(data.branding))
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return controller;
  }, []);

  useEffect(() => {
    const controller = fetchBranding();
    return () => controller.abort();
  }, [fetchBranding]);

  if (error) {
    return (
      <PortalErrorScreen
        message="This portal could not be loaded. Please check the address and reload."
        onRetry={() => { fetchBranding(); }}
      />
    );
  }

  if (!branding) {
    return <PortalLoadingScreen message="Loading school website…" />;
  }

  if (!branding.schoolId) return <PlatformLandingPage />;
  if (branding.slug === 'demo') return <DemoLandingPage />;
  if (branding.slug === 'devickys' || branding.slug === 'devikys') return <DevikysLandingPage branding={branding} />;
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{branding.schoolName}</h1>
        <a className="inline-flex items-center justify-center px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors" href="/login">
          School Portal
        </a>
      </div>
    </main>
  );
};
