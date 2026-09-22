import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2, ArrowRight, School, UserPlus, Building, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';
import { Logo } from '../../components/ui/Logo';
import { useBrand } from '../../context/BrandContext';

export function RegisterPage() {
  const { branding, isSchoolPortal } = useBrand();
  const [schoolName, setSchoolName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (schoolName && adminName && email && password) {
        // Backend registration is authoritative. Never create a local account on failure.
        const response = await api.post('/auth/register', {
          schoolName: schoolName.trim(), fullName: adminName.trim(),
          email: email.trim().toLowerCase(), password,
        });
        if (!response.data?.school?.id) throw new Error('Registration response was incomplete.');
        setPassword('');
        navigate('/login', { state: { message: 'Registration successful! Please login with your new credentials.' } });
      } else {
        setError('Please fill all fields');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Logo size={56} variant="icon" />
          <div className="mt-4 text-3xl font-sans tracking-tight">
            <span className="font-black text-slate-900">Globe</span>
            <span className="font-bold text-[var(--brand-primary,#2563EB)]">Pen</span>
          </div>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[0.625rem] mt-2">New Institution Onboarding</p>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-gray-200 border border-gray-100">
          {isSchoolPortal ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mx-auto">
                <AlertTriangle size={24} />
              </div>
              <h2 className="text-lg font-black text-slate-900">School Portal Detected</h2>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                You are currently accessing <strong>{branding.schoolName || 'a school portal'}</strong>. New school registrations must be created through the main GlobePen platform.
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="block w-full py-3.5 bg-slate-900 text-white font-bold rounded-2xl hover:bg-black transition-all text-xs uppercase tracking-wider text-center"
                >
                  Return to Portal Sign In
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-black text-gray-900">Register School</h2>
                <p className="text-gray-500 text-sm mt-1">Join the future of school management</p>
              </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Official School Name"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm font-medium"
                  required
                />
              </div>

              <div className="relative">
                <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Admin Full Name"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm font-medium"
                  required
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  placeholder="Admin Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm font-medium"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  placeholder="Create Admin Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm font-medium"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl">
                <p className="text-rose-600 text-[0.625rem] font-black uppercase tracking-widest leading-relaxed">
                  {error}
                </p>
              </div>
            )}

            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100/50 mb-2">
              <p className="text-[0.625rem] text-blue-600 font-bold leading-relaxed">
                By registering, you become the primary administrator for your school's private cloud instance.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 uppercase tracking-widest text-xs flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Register System
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-50">
            <p className="text-center text-gray-500 text-xs font-medium">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 font-bold hover:underline">
                Sign In
              </Link>
            </p>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
