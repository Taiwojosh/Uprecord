import React, { useEffect, useState } from 'react';
import { DevikysLandingPage } from './DevikysLandingPage';
import { PlatformLandingPage } from './PlatformLandingPage';
import { DemoLandingPage } from './DemoLandingPage';
import { NotFoundPage } from './NotFoundPage';

export const LandingPage: React.FC = () => {
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tenant')
      .then((res) => {
        if (!res.ok) throw new Error('Tenant fetch failed');
        return res.json();
      })
      .then((data) => {
        setTenantSlug(data.slug);
        setLoading(false);
      })
      .catch(() => {
        setTenantSlug(null);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  switch (tenantSlug) {
    case 'devickys':
      return <DevikysLandingPage/>;
    case 'app':
      return <PlatformLandingPage/>;
    case 'demo':
      return <DemoLandingPage/>;
    default:
      return <NotFoundPage/>;
  }
};
