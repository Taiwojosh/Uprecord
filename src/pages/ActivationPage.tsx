import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Copy, Check, ShieldCheck, Zap, Calendar, Award, Crown, Loader2, AlertTriangle, MessageSquare } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { getHardwareId, activateLicense, checkTimeIntegrity, verifyLicense, startTrial, registerManualLicense } from '../lib/licensing';
import { PRICING, CONTACT_INFO } from '../constants/pricing';

export const ActivationPage: React.FC = () => {
  const [hwid, setHwid] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [licenseKey, setLicenseKey] = useState<string>('');
  const [isActivating, setIsActivating] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeError, setTimeError] = useState<{ isValid: boolean; lastSeen: string } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('standard');
  const [showPayment, setShowPayment] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      // 1. Check Time Integrity
      const timeCheck = checkTimeIntegrity();
      if (!timeCheck.isValid) {
        setTimeError(timeCheck);
        return;
      }

      // 2. Get HWID
      const id = getHardwareId();
      setHwid(id);

      // 3. Check existing license
      const savedEmail = localStorage.getItem('uprecord_license_email') || localStorage.getItem('scholarsync_license_email') || localStorage.getItem('kardian_license_email');
      const savedKey = localStorage.getItem('uprecord_license_key') || localStorage.getItem('scholarsync_license_key') || localStorage.getItem('kardian_license_key');
      
      if (savedEmail && savedKey) {
        const status = await verifyLicense(savedEmail, savedKey);
        if (status.isValid) {
          navigate('/dashboard');
        }
      }
    };
    init();
  }, [navigate]);

  const handleCopyHwid = () => {
    navigator.clipboard.writeText(hwid);
    setCopied(true);
    showToast('Hardware ID copied to clipboard', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivate = async () => {
    if (!email.trim() || !licenseKey.trim()) {
      showToast('Please enter both email and license key', 'error');
      return;
    }

    setIsActivating(true);
    try {
      const result = await activateLicense(email.trim(), licenseKey.trim().toUpperCase());
      if (result.isValid) {
        showToast('System activated successfully!', 'success');
        navigate('/dashboard');
      } else {
        showToast(result.error || 'Activation failed', 'error');
      }
    } catch (error) {
      showToast('An unexpected error occurred', 'error');
    } finally {
      setIsActivating(false);
    }
  };

  const handleStartTrial = async () => {
    if (!email.trim()) {
      showToast('Please enter your school email first', 'error');
      return;
    }
    setIsStartingTrial(true);
    try {
      const result = await startTrial(email.trim());
      if (result.isValid && result.licenseKey) {
        setLicenseKey(result.licenseKey);
        // Automatically activate the trial license
        const activationResult = await activateLicense(email.trim(), result.licenseKey);
        if (activationResult.isValid) {
          showToast('Free trial started successfully!', 'success');
          navigate('/dashboard');
        } else {
          showToast(activationResult.error || 'Trial activation failed', 'error');
        }
      } else {
        showToast(result.error || 'Failed to start trial', 'error');
      }
    } catch (error) {
      showToast('An unexpected error occurred', 'error');
    } finally {
      setIsStartingTrial(false);
    }
  };

  const handleManualRequest = async (type: 'whatsapp' | 'email', contact: string) => {
    if (!email.trim()) {
      showToast('Please enter your school email first', 'error');
      return;
    }

    // 1. Generate a unique key for this request
    const generatedKey = 'UPR-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // 2. Register it as "pending" in the Google Sheet
    const result = await registerManualLicense(email.trim(), generatedKey, selectedPlan);
    
    if (result.success) {
      setLicenseKey(generatedKey);
      showToast('Request registered! Opening ' + (type === 'whatsapp' ? 'WhatsApp' : 'Email') + '...', 'info');
      
      const messageText = `Hello, I want to activate UpRecord.\n\nHardware ID: ${hwid}\nEmail: ${email}\nPlan: ${selectedPlan.toUpperCase()}\nGenerated Key: ${generatedKey}\n\nI have made the payment. Please approve my activation.`;

      if (type === 'whatsapp') {
        const message = encodeURIComponent(messageText);
        
        // Detect native wrappers (Electron or Capacitor)
        const isElectron = /electron/i.test(navigator.userAgent.toLowerCase());
        const isCapacitor = typeof (window as any).Capacitor !== 'undefined';
        
        if (isElectron || isCapacitor) {
          // GUARANTEE NATIVE APP: Use the explicit WhatsApp URI scheme.
          // This forces the OS to open the installed WhatsApp application directly, bypassing the browser.
          window.location.href = `whatsapp://send?phone=${contact}&text=${message}`;
        } else {
          // Standard Web: Use wa.me which handles web fallbacks gracefully if the app isn't installed
          window.open(`https://wa.me/${contact}?text=${message}`, '_blank');
        }
      } else {
        const subject = encodeURIComponent('UpRecord Activation Request');
        const body = encodeURIComponent(messageText);
        window.location.href = `mailto:${contact}?subject=${subject}&body=${body}`;
      }
    } else {
      showToast(result.error || 'Failed to register request', 'error');
    }
  };

  const plans = [
    {
      id: 'standard',
      ...PRICING.standard,
      icon: Award,
      color: 'bg-blue-50 text-blue-600',
      popular: false,
    },
    {
      id: 'premium',
      ...PRICING.premium,
      icon: Crown,
      color: 'bg-purple-50 text-purple-600',
      popular: true,
    }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 animate-in fade-in duration-500">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center text-white space-y-2">
          <div className="text-5xl font-sans tracking-tighter uppercase italic flex items-center justify-center gap-1">
            <span className="font-black text-white">Up</span>
            <span className="font-medium text-[#DC2626]">Record</span>
          </div>
          <p className="text-slate-300 font-medium tracking-wide">Professional School Report Card System</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Activation Card */}
          <div className="lg:col-span-7 bg-white p-8 rounded-[2rem] shadow-2xl space-y-8">
            {timeError ? (
              <div className="p-8 bg-rose-50 border-2 border-rose-200 rounded-3xl text-center space-y-4">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle size={32} />
                </div>
                <h2 className="text-xl font-black text-rose-700 uppercase italic">Time Integrity Error</h2>
                <p className="text-rose-600 text-sm font-medium">
                  It looks like your system clock has been set backwards. 
                  The system was last used on <span className="font-bold">{timeError.lastSeen}</span>.
                  Please correct your system time to continue.
                </p>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors"
                >
                  RETRY CHECK
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Your Hardware ID</label>
                    <button 
                      onClick={handleCopyHwid}
                      className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'COPIED' : 'COPY ID'}
                    </button>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 break-all font-mono text-sm text-gray-600 text-center select-all">
                    {hwid || 'Generating...'}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">School Email</label>
                      <div className="relative">
                        <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                        <input 
                          type="email" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="school@example.com"
                          className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all font-medium placeholder:text-gray-300"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">License Key</label>
                      <input 
                        type="text" 
                        value={licenseKey}
                        onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                        placeholder="KRD-XXXX-XXXX"
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all font-mono text-xl text-center uppercase placeholder:text-gray-300"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleActivate}
                    disabled={isActivating}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black text-lg rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isActivating ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                    {isActivating ? 'ACTIVATING...' : 'ACTIVATE SYSTEM'}
                  </button>

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                    <div className="relative flex justify-center text-xs uppercase font-bold text-gray-300 bg-white px-4">Or</div>
                  </div>

                  <button 
                    onClick={handleStartTrial}
                    disabled={isStartingTrial}
                    className="w-full py-4 bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-black text-lg rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isStartingTrial ? <Loader2 className="animate-spin" /> : <Zap size={20} />}
                    {isStartingTrial ? 'STARTING...' : 'GET TRIAL KEY'}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Plan Cards */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-4">
              <h2 className="text-white font-bold text-sm uppercase tracking-widest ml-2">1. Select a Plan</h2>
              <div className="grid grid-cols-1 gap-3">
                {plans.map((plan) => (
                  <button 
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`group backdrop-blur-md p-4 rounded-2xl border transition-all flex items-center justify-between text-left w-full ${
                      selectedPlan === plan.id 
                        ? 'bg-white border-white shadow-xl' 
                        : 'bg-white/10 border-white/10 hover:bg-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`p-3 rounded-xl shrink-0 ${plan.color}`}>
                        <plan.icon size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`font-bold truncate ${selectedPlan === plan.id ? 'text-slate-800' : 'text-white'}`}>{plan.name}</h3>
                          {plan.popular && (
                            <span className="bg-blue-500 text-white text-[0.625rem] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shrink-0">Popular</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
                          {plan.benefits.map(benefit => (
                            <span key={benefit} className={`text-[0.5rem] font-bold uppercase tracking-tighter ${selectedPlan === plan.id ? 'text-gray-400' : 'text-white/40'}`}>
                              &bull; {benefit}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className={`font-black ${selectedPlan === plan.id ? 'text-gray-900' : 'text-white'}`}>{plan.price}</div>
                      <div className={`text-[0.625rem] uppercase font-bold ${selectedPlan === plan.id ? 'text-gray-400' : 'text-white/40'}`}>{plan.period}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-white font-bold text-sm uppercase tracking-widest ml-2">2. Payment Details</h2>
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <span className="text-white/60 text-xs font-bold uppercase">Bank Name</span>
                    <span className="text-white font-black text-sm">{CONTACT_INFO.bank.name}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <span className="text-white/60 text-xs font-bold uppercase">Account Number</span>
                    <span className="text-white font-black text-sm tracking-widest">{CONTACT_INFO.bank.accountNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-xs font-bold uppercase">Account Name</span>
                    <span className="text-white font-black text-sm">{CONTACT_INFO.bank.accountName}</span>
                  </div>
                </div>
                
                <div className="p-4 bg-amber-500/20 border border-amber-500/30 rounded-2xl">
                  <p className="text-amber-200 text-[0.625rem] font-bold leading-relaxed uppercase italic">
                    Transfer the exact amount for your selected plan, then click a support button below to register your license.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-2">
                  <button 
                    onClick={() => handleManualRequest('whatsapp', CONTACT_INFO.whatsapp)}
                    className="flex items-center justify-between p-4 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-2xl transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500 rounded-lg text-white">
                        <MessageSquare size={18} />
                      </div>
                      <span className="text-white font-bold text-sm">WhatsApp Support</span>
                    </div>
                    <span className="text-emerald-400 text-[0.625rem] font-black uppercase tracking-widest">Message Us</span>
                  </button>
                  <button 
                    onClick={() => handleManualRequest('email', CONTACT_INFO.email)}
                    className="flex items-center justify-between p-4 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-2xl transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500 rounded-lg text-white">
                        <Mail size={18} />
                      </div>
                      <span className="text-white font-bold text-sm">Email Support</span>
                    </div>
                    <span className="text-blue-400 text-[0.625rem] font-black uppercase tracking-widest">Email Us</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-white/40 text-[0.625rem] font-bold uppercase tracking-[0.3em]">
          UpRecord v4.0 &copy; {new Date().getFullYear()} &bull; Licensed to School Owner
        </p>
      </div>
    </div>
  );
};
