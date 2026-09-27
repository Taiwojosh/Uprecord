import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { PublicBranding, GLOBEPEN_DEFAULTS } from '../config/branding';
import { useAuth } from './AuthContext';
import type { BrandingResponse } from '../../server/src/contracts/branding';
import { brandContrast } from '../lib/brandContrast';
import { PortalLoadingScreen } from '../components/ui/PortalLoadingScreen';
import { PortalErrorScreen } from '../components/ui/PortalErrorScreen';

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
    root.style.setProperty('--brand-on-primary', brandContrast(b.brandColor || GLOBEPEN_DEFAULTS.brandColor));
    root.style.setProperty('--brand-on-secondary', brandContrast(b.secondaryColor || GLOBEPEN_DEFAULTS.secondaryColor));
    root.classList.toggle('school-portal', Boolean(b.schoolId));

    // Browser chrome follows the portal's saved brand colour. This is runtime
    // CSS presentation only — nothing here is cached or used for tenant auth.
    const themeColor = b.brandColor || GLOBEPEN_DEFAULTS.brandColor;
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute('content', themeColor);
    });

    // Update document title
    if (b.schoolId && b.schoolName) {
      document.title = `${b.portalTitle || b.schoolName} — GlobePen`;
    } else {
      document.title = 'GlobePen — School Management Platform';
    }
  }, []);

  const refreshBranding = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<BrandingResponse>(schoolId ? '/schools/identity' : '/schools/branding');
      if (response.data?.branding) {
        const b = response.data.branding as PublicBranding;
        setBranding(b);
        applyBrandTheme(b);
        setError(null);
        // Install metadata: a school portal points at the server-generated
        // manifest, which resolves the tenant from the trusted hostname
        // server-side (never a client-supplied id). Falls back silently to the
        // platform manifest when the endpoint is unavailable.
        if (b.schoolId) {
          try {
            const manifestResponse = await fetch('/api/schools/manifest', { cache: 'no-store' });
            if (manifestResponse.ok) {
              const manifest = await manifestResponse.json();
              if (manifest?.name) {
                document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.setAttribute('href', '/api/schools/manifest');
              }
            }
          } catch {
            // Older server builds have no manifest endpoint: keep /manifest.webmanifest.
          }
        } else {
          document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.setAttribute('href', '/manifest.webmanifest');
        }
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

  if (error) {
    return (
      <PortalErrorScreen
        message={error}
        onRetry={refreshBranding}
        schoolName={branding.schoolName !== GLOBEPEN_DEFAULTS.schoolName ? branding.schoolName : undefined}
      />
    );
  }

  if (isLoading) {
    return (
      <PortalLoadingScreen
        message="Loading school portal…"
        schoolName={branding.schoolName !== GLOBEPEN_DEFAULTS.schoolName ? branding.schoolName : undefined}
      />
    );
  }

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
