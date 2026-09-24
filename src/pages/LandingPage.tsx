import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import type { PublicBranding } from '../../server/src/contracts/branding';
import { DevikysLandingPage } from './DevikysLandingPage';
import { PlatformLandingPage } from './PlatformLandingPage';
import { DemoLandingPage } from './DemoLandingPage';
export const LandingPage = () => {
  const [branding, setBranding] = useState<PublicBranding | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    api.get('/schools/branding', { signal: controller.signal }).then(({data}) => setBranding(data.branding)).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, []);
  if (error) return <main className="p-10" role="alert">This portal could not be loaded. Please check the address and reload.</main>;
  if (!branding) return <main className="p-10" aria-busy="true">Loading school website…</main>;
  if (!branding.schoolId) return <PlatformLandingPage />;
  if (branding.slug === 'demo') return <DemoLandingPage />;
  if (branding.slug === 'devickys' || branding.slug === 'devikys') return <DevikysLandingPage branding={branding} />;
  return <main className="p-10"><h1 className="text-3xl font-bold">{branding.schoolName}</h1><a className="inline-block mt-6 underline" href="/login">School Portal</a></main>;
};
