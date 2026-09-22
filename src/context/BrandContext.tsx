import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { PublicBranding, GLOBEPEN_DEFAULTS } from '../config/branding';
import { useAuth } from './AuthContext';
import type { BrandingResponse } from '../../server/src/contracts/branding';

interface BrandContextType {
  branding: PublicBranding;
  isLoading: boolean;
  isSchoolPortal: boolean;
  refreshBranding: () => Promise<void>;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const schoolId = user?.schoolId;
  const [branding, setBranding] = useState<PublicBranding>(GLOBEPEN_DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyBrandTheme = useCallback((b: PublicBranding) => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.style.setProperty('--brand-primary', b.brandColor || GLOBEPEN_DEFAULTS.brandColor);
    root.style.setProperty('--brand-secondary', b.secondaryColor || GLOBEPEN_DEFAULTS.secondaryColor);

    // Update document title
    if (b.schoolId && b.schoolName) {
      document.title = `${b.portalTitle || b.schoolName} — GlobePen`;
    } else {
      document.title = 'GlobePen — School Management Platform';
    }
  }, []);

  const refreshBranding = useCallback(async () => {
    try {
      const response = await api.get<BrandingResponse>(schoolId ? '/schools/identity' : '/schools/branding');
      if (response.data?.branding) {
        const b = response.data.branding as PublicBranding;
        setBranding(b);
        applyBrandTheme(b);
        setError(null);
      }
    } catch (err) {
      setError('This school portal could not be loaded. Check the address and try again.');
      setBranding(GLOBEPEN_DEFAULTS);
      applyBrandTheme(GLOBEPEN_DEFAULTS);
    } finally {
      setIsLoading(false);
    }
  }, [applyBrandTheme, schoolId]);

  useEffect(() => {
    refreshBranding();
  }, [refreshBranding]);

  const isSchoolPortal = Boolean(branding.schoolId);

  if (error) return <main role="alert" className="p-10"><p>{error}</p><button className="underline mt-4" onClick={refreshBranding}>Retry</button></main>;
  if (isLoading) return <main className="p-10" aria-busy="true">Loading school portal…</main>;

  return (
    <BrandContext.Provider value={{ branding, isLoading, isSchoolPortal, refreshBranding }}>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = () => {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
};
