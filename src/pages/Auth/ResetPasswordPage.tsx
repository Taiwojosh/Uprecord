import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, CheckCircle2, AlertCircle, Loader2, ArrowRight, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { Logo } from '../../components/ui/Logo';
import { useBrand } from '../../context/BrandContext';
import api from '../../lib/api';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { branding, isSchoolPortal } = useBrand();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [success, setSuccess] = useState(false);

  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Password reset token is missing. Please request a new recovery link.');
      setTokenExpired(true);
      setIsLoading(false);
      return;
    }

    // Verify reset token validity (read-only verification, does not consume)
    api.get(`/auth/verify-reset-token?token=${encodeURIComponent(token)}`)
      .then((res) => {
        setEmail(res.data.email);
        setIsLoading(false);
      })
      .catch((err) => {
        const message = err.response?.data?.error || 'This password reset link is invalid or has expired.';
        setError(message);
        setTokenExpired(true);
        setIsLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.post('/auth/reset-password', {
        token,
        password,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login', {
          state: { message: 'Password has been reset successfully. Please sign in with your new password.' },
        });
      }, 1500);
    } catch (err: any) {
      const serverMessage = err.response?.data?.error || 'Failed to reset password. Please try again.';
      setError(serverMessage);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Verifying recovery link...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
      <div className="w-full max-w-[440px]">
        <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-xl border border-slate-100">
          
          {/* Header */}
          <div className="flex flex-col items-center mb-6 text-center">
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
                  Create New Password
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
                  Set Your New Password
                </p>
              </>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-700 text-xs font-semibold text-left animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {success ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100 text-center space-y-3 animate-fade-in">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-black text-emerald-900 uppercase tracking-wider">Password Reset!</h3>
              <p className="text-xs font-medium text-emerald-700">Redirecting to sign in...</p>
            </div>
          ) : tokenExpired ? (
            <div className="space-y-4 text-center">
              <p className="text-xs text-slate-500 font-medium">
                For security reasons, password reset links expire after 1 hour or after being used.
              </p>
              <div className="pt-2 flex flex-col gap-2">
                <Link
                  to="/forgot-password"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw size={14} />
                  <span>Request New Link</span>
                </Link>
                <Link
                  to="/login"
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {email && (
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-left">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Account</span>
                  <p className="text-xs font-bold text-slate-800">{email}</p>
                </div>
              )}

              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    className="w-full pl-11 pr-11 h-[44px] bg-slate-50/50 border border-slate-100 rounded-2xl focus:border-slate-800 focus:bg-white outline-none transition-all text-xs font-bold placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    minLength={8}
                    className="w-full pl-11 pr-4 h-[44px] bg-slate-50/50 border border-slate-100 rounded-2xl focus:border-slate-800 focus:bg-white outline-none transition-all text-xs font-bold placeholder:text-slate-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  backgroundColor: isSchoolPortal && branding.brandColor ? branding.brandColor : undefined
                }}
                className="w-full h-[46px] bg-slate-800 hover:bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 group disabled:opacity-50 mt-4 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Reset Password</span>
                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
