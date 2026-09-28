import React, { useState, useEffect, useCallback } from 'react';
import { Globe, ShieldCheck, AlertCircle, Loader2, CheckCircle2, RefreshCw, Trash2, ExternalLink, Copy, Check } from 'lucide-react';
import api from '../../lib/api';
import { useBrand } from '../../context/BrandContext';
import type { SchoolManagementResponse, DomainRegistrationResponse, DomainVerificationResponse } from '../../../server/src/contracts/branding';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { db } from '../../db/db';

interface DomainInfo {
  customDomain: string | null;
  customDomainVerified: boolean;
  domainVerificationToken: string | null;
  domainVerifiedAt: string | null;
  brandColor: string;
  secondaryColor: string;
  portalTitle: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

export const DomainBrandingManager: React.FC = () => {
  const { refreshBranding } = useBrand();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [domainInput, setDomainInput] = useState('');
  const [portalTitle, setPortalTitle] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('#06B6D4');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const [domainInfo, setDomainInfo] = useState<DomainInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [isSettingDomain, setIsSettingDomain] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [removeConfirmation, setRemoveConfirmation] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDomainInfo = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await api.get<SchoolManagementResponse>('/schools/management');
      if (res.data?.branding) {
        const b = res.data.branding;
        setDomainInfo({
          customDomain: res.data.domain,
          customDomainVerified: res.data.verificationStatus === 'ownership_verified',
          domainVerificationToken: res.data.dnsChallenge?.recordValue ?? null,
          domainVerifiedAt: res.data.verifiedAt,
          brandColor: b.brandColor || '#2563EB',
          secondaryColor: b.secondaryColor || '#06B6D4',
          portalTitle: b.portalTitle || '',
          contactEmail: b.contactEmail || '',
          contactPhone: b.contactPhone || ''
        });
        setDomainInput(res.data.domain || '');
        setPortalTitle(b.portalTitle || '');
        setSecondaryColor(b.secondaryColor || '#06B6D4');
        setContactEmail(b.contactEmail || '');
        setContactPhone(b.contactPhone || '');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Unable to load school settings. Please retry.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.schoolId]);

  useEffect(() => {
    fetchDomainInfo();
  }, [fetchDomainInfo]);

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBranding(true);
    setErrorMessage(null);

    try {
      await api.put('/schools/branding', {
        portalTitle: portalTitle.trim() || null,
        secondaryColor: secondaryColor.trim() || null,
        contactEmail: contactEmail.trim() || null,
        contactPhone: contactPhone.trim() || null
      });

      showToast('Portal branding updated successfully!', 'success');
      if (user?.schoolId) {
        await db.transaction('rw', db.settings, async () => {
          const current = await db.settings.where('schoolId').equals(user.schoolId).first();
          if (current?.id) {
            await db.settings.update(current.id, {
              portalTitle: portalTitle.trim() || undefined,
              secondaryColor: secondaryColor.trim() || undefined,
            });
          }
        });
      }
      await refreshBranding();
      await fetchDomainInfo();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to update branding settings.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleRegisterDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput.trim()) return;

    setIsSettingDomain(true);
    setErrorMessage(null);

    try {
      const res = await api.post<DomainRegistrationResponse>('/schools/custom-domain', {
        domain: domainInput.trim()
      });

      showToast('Custom domain registered. Add the DNS challenge to verify.', 'success');
      setDomainInfo((prev) => prev ? {
        ...prev,
        customDomain: res.data.domain,
        customDomainVerified: false,
        domainVerificationToken: res.data.dnsChallenge.recordValue,
        domainVerifiedAt: null
      } : null);
      await refreshBranding();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to register custom domain.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSettingDomain(false);
    }
  };

  const handleVerifyDomain = async () => {
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await api.post<DomainVerificationResponse>('/schools/custom-domain/verify');
      if (res.data?.verificationStatus === 'ownership_verified') {
        showToast('DNS Ownership verified successfully!', 'success');
        setDomainInfo((prev) => prev ? {
          ...prev,
          customDomainVerified: true,
          domainVerifiedAt: res.data.verifiedAt
        } : null);
        await refreshBranding();
      } else {
        setErrorMessage(res.data?.message || 'Verification challenge TXT record not found yet.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'DNS verification request failed.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemoveDomain = async () => {
    const currentDomain = domainInfo?.customDomain;
    if (!currentDomain || removeConfirmation !== currentDomain) return;
    setIsRemoving(true);
    try {
      await api.delete('/schools/custom-domain', { data: { confirmDomain: currentDomain } });
      showToast('School address disconnected. Use your school subdomain to sign in.', 'success');
      setDomainInput('');
      setRemoveConfirmation('');
      setIsRemoveOpen(false);
      setDomainInfo((prev) => prev ? {
        ...prev,
        customDomain: null,
        customDomainVerified: false,
        domainVerificationToken: null,
        domainVerifiedAt: null
      } : null);
      await refreshBranding();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to remove custom domain.';
      showToast(msg, 'error');
    } finally {
      setIsRemoving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center bg-white rounded-[2.5rem] border border-gray-100">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Loading domain & white-label settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Portal Branding Section */}
      <section className="bg-white rounded-[2.5rem] border border-gray-100 p-8 sm:p-10 shadow-sm space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-900">White-Label Portal Identity</h2>
            <p className="text-xs text-gray-400 font-medium">Configure institution-specific titles, accent colors, and contact info</p>
          </div>
        </div>

        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-2xl p-3 leading-relaxed">
          The school name, motto, address, logo and primary brand colour are managed under <strong>Settings &gt; Identity</strong>. This section controls the portal title, secondary colour and support contact details.
        </p>

        <form onSubmit={handleSaveBranding} className="space-y-6 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="portal-title" className="text-sm font-bold text-gray-700 tracking-tight">Portal Display Title</label>
              <input id="portal-title"
                type="text"
                value={portalTitle}
                onChange={(e) => setPortalTitle(e.target.value)}
                placeholder="e.g. Apex Academy Student & Staff Portal"
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-semibold text-gray-900 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="secondary-color" className="text-sm font-bold text-gray-700 tracking-tight">Secondary Brand Color</label>
              <div className="flex items-center gap-4 p-2.5 bg-gray-50 border border-gray-100 rounded-2xl">
                <input id="secondary-color"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-10 h-10 rounded-xl border-none cursor-pointer bg-transparent"
                />
                <code className="text-xs font-black text-gray-900 uppercase tracking-widest">{secondaryColor}</code>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="contact-email" className="text-sm font-bold text-gray-700 tracking-tight">Portal Support Email</label>
              <input id="contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="support@school-domain.edu"
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-gray-900 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="contact-phone" className="text-sm font-bold text-gray-700 tracking-tight">Portal Support Phone</label>
              <input id="contact-phone"
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+234 800 123 4567"
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-gray-900 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingBranding}
              className="px-6 py-3 bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {isSavingBranding ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Save Portal Branding</span>
            </button>
          </div>
        </form>
      </section>

      {/* Custom Domain Management Section */}
      <section className="bg-white rounded-[2.5rem] border border-gray-100 p-8 sm:p-10 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center">
              <Globe className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-gray-900">School web address</h2>
              <button type="button" onClick={fetchDomainInfo} className="text-sm underline">Reload domain settings</button>
              <p className="text-xs text-gray-400 font-medium">Connect your school's own address (for example, portal.myschool.edu)</p>
            </div>
          </div>

          {domainInfo?.customDomain && (
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
              domainInfo.customDomainVerified 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {domainInfo.customDomainVerified ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Ownership Verified
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
                  Verification Pending
                </>
              )}
            </span>
          )}
        </div>

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-start gap-3 text-rose-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Domain Form / Status Card */}
        <form onSubmit={handleRegisterDomain} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="custom-domain" className="text-sm font-bold text-gray-700 tracking-tight">Fully Qualified Domain Name</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input id="custom-domain"
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="portal.myschool.edu"
                disabled={Boolean(domainInfo?.customDomain && domainInfo.customDomainVerified)}
                className="flex-1 px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono text-sm font-bold text-gray-900 disabled:opacity-75"
              />
              {(!domainInfo?.customDomain || !domainInfo.customDomainVerified) && (
                <button
                  type="submit"
                  disabled={isSettingDomain || !domainInput.trim()}
                  className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                >
                  {isSettingDomain ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                  <span>{domainInfo?.customDomain ? 'Update Domain' : 'Register Domain'}</span>
                </button>
              )}
              {domainInfo?.customDomain && (
                <button
                  type="button"
                  onClick={() => { setIsRemoveOpen(true); setRemoveConfirmation(''); }}
                  className="px-4 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/50 rounded-2xl transition-all text-xs font-bold flex items-center justify-center gap-1.5 shrink-0"
                  title="Detach Custom Domain"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Disconnect address</span>
                </button>
              )}
            </div>
          </div>
        </form>

        {isRemoveOpen && domainInfo?.customDomain && (
          <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <p className="text-sm font-semibold text-rose-900">Disconnect {domainInfo.customDomain}?</p>
            <p className="text-sm text-rose-800">
              People using this address will lose access to the portal immediately. The school's data stays in place.
              Open your school subdomain first, then type the current address below to confirm.
            </p>
            <label htmlFor="confirm-domain-removal" className="block text-sm font-medium text-rose-900">
              Type {domainInfo.customDomain}
            </label>
            <input id="confirm-domain-removal" type="text" autoComplete="off" value={removeConfirmation}
              onChange={(event) => setRemoveConfirmation(event.target.value)}
              className="w-full rounded-xl border border-rose-300 bg-white px-4 py-3 text-sm" />
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={handleRemoveDomain}
                disabled={isRemoving || removeConfirmation !== domainInfo.customDomain}
                className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {isRemoving ? 'Disconnecting…' : 'Disconnect address'}
              </button>
              <button type="button" onClick={() => { setIsRemoveOpen(false); setRemoveConfirmation(''); }}
                className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-900">Cancel</button>
            </div>
          </div>
        )}

        {domainInfo?.customDomainVerified && (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 text-xs space-y-1.5">
            <p className="font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Domain ownership verified
            </p>
            {domainInfo.domainVerifiedAt && !isNaN(new Date(domainInfo.domainVerifiedAt).getTime()) && (
              <p className="text-emerald-700 font-medium">Verified on {new Date(domainInfo.domainVerifiedAt).toLocaleString()}</p>
            )}
            <p className="text-emerald-700 font-medium leading-relaxed">
              Next step: point this domain's DNS routing at your deployment and complete the proxy/TLS setup before sending production traffic to it. Ownership verification alone does not serve the portal.
            </p>
          </div>
        )}
        {/* Only an unverified domain still needs the ownership challenge below. */}
        {domainInfo?.customDomain && !domainInfo.customDomainVerified && (
          <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-3xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
              <span className="font-black text-slate-800 uppercase tracking-wider text-[11px]">
                Step 1: DNS TXT Ownership Challenge
              </span>
              <span className="text-[10px] text-slate-400 font-mono font-semibold">
                Challenge bound to: {domainInfo.customDomain}
              </span>
            </div>

            <p className="text-slate-600 leading-relaxed font-medium">
              Create the following <strong>TXT</strong> record with your DNS provider (e.g. Cloudflare, GoDaddy, Namecheap) to verify domain ownership:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Type</span>
                <span className="font-mono font-bold text-slate-900">TXT</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Host / Name</span>
                <span className="font-mono font-bold text-slate-900 truncate block">_globepen-challenge.{domainInfo.customDomain}</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Value / Content</span>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono font-bold text-slate-900 truncate text-[11px]">
                    {domainInfo.domainVerificationToken || 'No active challenge. Save the domain again to generate a new one.'}
                  </span>
                  {domainInfo.domainVerificationToken && (
                    <button
                      onClick={() => copyToClipboard(domainInfo.domainVerificationToken!)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors shrink-0"
                      title="Copy Token"
                    >
                      {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Status Action */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500 font-medium">
                After adding the TXT record, click "Verify DNS Ownership" to validate.
              </div>

              {!domainInfo.customDomainVerified && (
                <button
                  type="button"
                  onClick={handleVerifyDomain}
                  disabled={isVerifying}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  <span>Verify DNS Ownership</span>
                </button>
              )}
            </div>

            {/* Step 2: Routing & TLS Readiness */}
            <div className="border-t border-slate-200/60 pt-3 mt-3 space-y-2">
              <span className="font-black text-slate-700 uppercase tracking-wider text-[10px] block">
                Step 2: DNS Routing & TLS Readiness
              </span>
              <p className="text-[11px] text-slate-500 leading-normal">
                Point your domain's <strong>CNAME</strong> or <strong>A</strong> record to your deployed platform proxy. Note that ownership verification is decoupled from TLS certificate issuance: the domain will serve traffic securely once routing propagates and the edge TLS handshake completes.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
