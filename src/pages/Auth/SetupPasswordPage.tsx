import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, CheckCircle2, AlertCircle, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Logo } from '../../components/ui/Logo';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export const SetupPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [userInfo, setUserInfo] = useState<{
    email: string;
    fullName: string;
    role: string;
    schoolName?: string;
  } | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Activation token is missing. Please use the link provided by your administrator.');
      setIsLoading(false);
      return;
    }

    // Verify token validity
    api.get(`/auth/verify-setup-token?token=${encodeURIComponent(token)}`)
      .then((res) => {
        setUserInfo(res.data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'This activation link is invalid or has expired.');
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
      await api.post('/auth/setup-password', {
        token,
        password,
      });

      setSuccess(true);
      setTimeout(() => {
        // Navigate to appropriate portal
        if (userInfo?.role === 'teacher') {
          navigate('/teacher-portal');
        } else if (userInfo?.role === 'student') {
          navigate('/student-portal');
        } else {
          navigate('/dashboard');
        }
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to activate account. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Verifying activation invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-block mb-2">
            <Logo size={56} variant="icon" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account Activation</h1>
          <p className="text-xs font-semibold text-slate-500">
            {userInfo?.schoolName ? `Welcome to ${userInfo.schoolName}` : 'Set up your personal password'}
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-start gap-3 text-rose-700 text-xs font-semibold">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {success ? (
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-black text-emerald-900 uppercase tracking-wider">Account Activated!</h3>
            <p className="text-xs font-medium text-emerald-700">Redirecting to your portal...</p>
          </div>
        ) : userInfo ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Account Holder</span>
              <p className="text-xs font-bold text-slate-800">{userInfo.fullName}</p>
              <p className="text-[11px] font-medium text-slate-500">{userInfo.email} &bull; <span className="capitalize">{userInfo.role}</span></p>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Choose Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-800 outline-none text-xs font-bold transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  minLength={8}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-800 outline-none text-xs font-bold transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-slate-900 text-white font-black rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Activate Account
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="text-center pt-2">
            <Link to="/login" className="text-xs font-black text-slate-700 hover:underline">
              Return to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
