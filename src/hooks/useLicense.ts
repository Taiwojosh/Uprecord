import { useState } from 'react';

export interface LicenseInfo {
  isValid: boolean;
  plan: 'standard' | 'premium' | 'trial';
  isPremium: boolean;
  expiresAt: string | null;
}

export const useLicense = () => {
  const [license] = useState<LicenseInfo>({
    isValid: true,
    plan: 'premium',
    isPremium: true,
    expiresAt: 'lifetime'
  });

  return license;
};
