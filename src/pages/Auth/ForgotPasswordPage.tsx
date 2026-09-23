import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import { Logo } from '../../components/ui/Logo';
import api from '../../lib/api';

export function ForgotPasswordPage() {
  const { branding, isSchoolPortal } = useBrand();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide your registered email address.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.post('/auth/forgot-password', {
        email: email.trim(),
      });
      setIsSubmitted(true);
    } catch (err: any) {
      // In the rare event of network error or 429 rate limit
      const serverMessage = err.response?.data?.error;
      setError(serverMessage || 'Unable to process your request. Please try again shortly.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
      <div className="w-full max-w-[440px]">
        <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-xl border border-slate-100">
          
          {/* Header */}
          <div className="flex flex-col items-center mb-8 text-center">
            {isSchoolPortal ? (
              <>
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 overflow-hidden shadow-inner border border-slate-100 p-2"
                  style={{ backgroundColor: `${branding.brandColor}15` }}
                >
                  {branding.logoUrl ? (
                    <img src={branding.logoUrl} alt={branding.schoolName || 'School'} className="w-full h-full object-contain" />
                  ) : (
                    <Logo size={36} variant="icon" />
                  )}
                </div>
                <h2 className="text-xl font-black text-slate-800 leading-tight">
                  {branding.schoolName || 'School Portal'}
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  Password Recovery
                </p>
              </>
            ) : (
              <>
                <div className="mb-3">
                  <Logo size={44} variant="icon" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">
                  Globe<span className="text-[var(--brand-primary,#2563EB)]">Pen</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Account Password Recovery
                </p>
              </>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2.5 text-left animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 font-bold leading-normal">{error}</p>
            </div>
          )}

          {isSubmitted ? (
            <div className="space-y-6 text-center animate-fade-in">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
                <CheckCircle2 size={28} />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-black text-slate-900">Check Your Inbox</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  If an account is associated with <strong>{email}</strong>, a password reset link has been dispatched.
                  Please check your inbox and spam folder.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={14} />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4 text-center">
                Enter your registered email address and we'll generate a secure password recovery link.
              </p>

              <div className="space-y-1.5 text-left">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider ml-1">
                  Registered Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 h-[44px] bg-slate-50/50 border border-slate-100 rounded-2xl focus:border-slate-800 focus:bg-white outline-none transition-all text-xs font-bold placeholder:text-slate-400"
                    placeholder="name@school-domain.edu"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  backgroundColor: isSchoolPortal && branding.brandColor ? branding.brandColor : undefined
                }}
                className="w-full h-[46px] bg-slate-800 hover:bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 mt-4 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Send Recovery Link</span>
                )}
              </button>

              <div className="pt-4 text-center">
                <Link
                  to="/login"
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft size={12} />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
