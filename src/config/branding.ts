/**
 * GlobePen Brand & Theme Configuration
 */

import type { PublicBranding } from '../../server/src/contracts/branding';
export type { PublicBranding } from '../../server/src/contracts/branding';

export const GLOBEPEN_DEFAULTS: PublicBranding = {
  schoolId: null,
  schoolName: 'GlobePen',
  slug: null,
  slogan: 'School Management & Academic Operations',
  logoUrl: null,
  brandColor: '#2563EB',
  secondaryColor: '#1E293B',
  contactEmail: null,
  contactPhone: null,
  portalTitle: 'GlobePen Portal',
  customDomain: null,
  poweredBy: 'GlobePen',
};
