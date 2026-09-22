export interface PublicBranding {
  schoolId: string | null;
  schoolName: string;
  slug: string | null;
  slogan: string | null;
  logoUrl: string | null;
  brandColor: string;
  secondaryColor: string;
  contactEmail: string | null;
  contactPhone: string | null;
  portalTitle: string;
  customDomain: string | null;
  poweredBy: string;
}

export interface BrandingResponse { branding: PublicBranding }
export interface SchoolIdentityResponse extends BrandingResponse { address: string | null }
export interface DomainChallenge { recordType: 'TXT'; recordHost: string; recordValue: string }
export interface SchoolManagementResponse extends SchoolIdentityResponse {
  domain: string | null;
  verificationStatus: 'not_registered' | 'ownership_unverified' | 'ownership_verified';
  verifiedAt: string | null;
  dnsChallenge: DomainChallenge | null;
}
export interface DomainRegistrationResponse {
  message: string;
  domain: string;
  verificationStatus: 'ownership_unverified';
  dnsChallenge: DomainChallenge;
}
export interface DomainVerificationResponse {
  message: string;
  domain: string;
  verificationStatus: 'ownership_verified';
  verifiedAt: string;
  deploymentNote: string;
}
