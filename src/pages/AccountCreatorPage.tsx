import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, ArrowLeft, Loader2, Users, Mail, User, Copy, Check, ExternalLink } from 'lucide-react';
import api from '../lib/api';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const AccountCreatorPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'teacher' | 'student'>('teacher');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [setupUrl, setSetupUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserFullName) {
      showToast('Please fill all user fields', 'error');
      return;
    }
    
    setIsCreatingUser(true);
    setSetupUrl(null);
    try {
      const res = await api.post('/auth/invite', {
        email: newUserEmail,
        fullName: newUserFullName,
        role: newUserRole,
      });

      const url = `${window.location.origin}${res.data.setupUrl}`;
      setSetupUrl(url);
      showToast(`${newUserRole.toUpperCase()} account created! Invitation link ready.`, 'success');
      setNewUserEmail('');
      setNewUserFullName('');
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message || 'Failed to create user', 'error');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const copySetupLink = () => {
    if (setupUrl) {
      navigator.clipboard.writeText(setupUrl);
      setCopied(true);
      showToast('Activation link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/dashboard')}
          className="p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all text-gray-400 hover:text-gray-600 border border-gray-100"
        >
          <ArrowLeft size={20} />
        </button>
        <PageHeader 
          title="Portal Account Creator" 
          subtitle="Create new teacher or student portal accounts." 
        />
      </div>

      <div className="max-w-2xl bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
        <form onSubmit={handleCreateUser} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
            <input 
              type="text" 
              value={newUserFullName}
              onChange={(e) => setNewUserFullName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Email / Username</label>
            <input 
              type="email" 
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="e.g. john@school.local"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Assign Role</label>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setNewUserRole('teacher')}
                className={`flex-1 py-3 rounded-xl border-2 transition-all font-black uppercase text-[0.625rem] tracking-widest ${newUserRole === 'teacher' ? 'border-emerald-600 bg-emerald-50 text-emerald-600' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-100'}`}
              >
                Teacher
              </button>
              <button 
                type="button" 
                onClick={() => setNewUserRole('student')}
                className={`flex-1 py-3 rounded-xl border-2 transition-all font-black uppercase text-[0.625rem] tracking-widest ${newUserRole === 'student' ? 'border-amber-600 bg-amber-50 text-amber-600' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-100'}`}
              >
                Student
              </button>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={isCreatingUser}
            className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-2xl shadow-gray-200"
          >
            {isCreatingUser ? <Loader2 className="animate-spin" /> : <UserPlus size={20} />}
            CREATE PORTAL ACCESS
          </button>
        </form>

        {setupUrl && (
          <div className="mt-8 p-6 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <Check className="w-5 h-5 text-emerald-600" />
              <span>User Account Created Successfully!</span>
            </div>
            <p className="text-xs text-emerald-700">
              Share this single-use activation link with the user. They will use it to choose their own secure password:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={setupUrl}
                className="w-full px-3 py-2 text-xs bg-white border border-emerald-200 rounded-lg text-gray-700 font-mono select-all"
              />
              <button
                type="button"
                onClick={copySetupLink}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
