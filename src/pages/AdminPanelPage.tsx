import React, { useState, useEffect } from 'react';
import { ShieldAlert, Key, Mail, Clock, Gift, Copy, Check, Loader2, ArrowLeft, UserPlus, Users, BadgeCheck, Trash2, ShieldCheck, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { db, IUser } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';

export const AdminPanelPage: React.FC = () => {
  const [adminSecret, setAdminSecret] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [duration, setDuration] = useState('1year');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // User Mgmt State
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'teacher' | 'student'>('teacher');
  const [isAdminTeacher, setIsAdminTeacher] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [activeTab, setActiveTab] = useState<'single' | 'bulk' | 'matrix'>('single');

  // Matrix State
  const [assignmentTeacherId, setAssignmentTeacherId] = useState<number | null>(null);
  const [assignmentClassId, setAssignmentClassId] = useState<number | null>(null);
  
  const { showToast } = useToast();
  const navigate = useNavigate();

  const { user } = useAuth();
  
  const users = useLiveQuery(async () => {
    if (!user?.schoolId) return [];
    return await db.users.where('schoolId').equals(user.schoolId).toArray();
  }, [user?.schoolId]) || [];
  
  const classes = useLiveQuery(async () => {
    if (!user?.schoolId) return [];
    return await db.classes.where('schoolId').equals(user.schoolId).toArray();
  }, [user?.schoolId]) || [];

  const handleBulkCreate = async () => {
    if (!bulkInput.trim()) {
      showToast('Please enter user data', 'error');
      return;
    }

    const lines = bulkInput.split('\n').filter(l => l.trim().includes(','));
    if (lines.length === 0) {
      showToast('Invalid format. Use: email, full name', 'error');
      return;
    }

    setIsCreatingUser(true);
    let successCount = 0;
    let failCount = 0;

    for (const line of lines) {
      const [email, fullName] = line.split(',').map(s => s.trim());
      if (email && fullName) {
        try {
          await db.users.add({
            email,
            fullName,
            role: newUserRole,
            schoolId: user!.schoolId,
            password: 'password123'
          });
          successCount++;
        } catch (e) {
          failCount++;
        }
      }
    }

    showToast(`Processed ${lines.length} users. ${successCount} successful, ${failCount} failed.`, successCount > 0 ? 'success' : 'error');
    if (successCount > 0) {
      setBulkInput('');
    }
    setIsCreatingUser(false);
  };

  const handleAssignTeacher = async () => {
    if (!assignmentTeacherId || !assignmentClassId) {
      showToast('Select both teacher and class', 'error');
      return;
    }

    const teacher = users.find(u => u.id === assignmentTeacherId);
    if (!teacher) return;

    try {
      await db.classes.update(assignmentClassId, { 
        teacherName: teacher.fullName,
        teacherId: teacher.id
      });
      showToast('Assignment updated', 'success');
    } catch (e) {
      showToast('Failed to update assignment', 'error');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminSecret === 'SS-MASTER-2024') {
      setIsAuthenticated(true);
      showToast('Master access granted', 'success');
    } else {
      showToast('Invalid मास्टर secret key', 'error');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserFullName) {
      showToast('Please fill all user fields', 'error');
      return;
    }
    
    setIsCreatingUser(true);
    try {
      await db.users.add({
        email: newUserEmail,
        fullName: newUserFullName,
        role: newUserRole,
        schoolId: user!.schoolId,
        password: 'password123',
        isAdmin: newUserRole === 'teacher' ? isAdminTeacher : false
      });
      showToast(`${newUserRole} created successfully!`, 'success');
      setNewUserEmail('');
      setNewUserFullName('');
      setIsAdminTeacher(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to create user', 'error');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const toggleAdminPrivilege = async (user: IUser) => {
    if (user.role !== 'teacher') return;
    try {
      await db.users.update(user.id!, { isAdmin: !user.isAdmin });
      showToast(`Privileges updated for ${user.fullName}`, 'success');
    } catch (e) {
      showToast('Update failed', 'error');
    }
  };

  const deleteUser = async (id: number) => {
    if (confirm('Are you sure you want to delete this user?')) {
      await db.users.delete(id);
      showToast('User deleted', 'info');
    }
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('Please enter a school email', 'error');
      return;
    }

    setIsGenerating(true);
    // Simulate generation delay
    setTimeout(() => {
      const key = `SS-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setGeneratedKey(key);
      showToast('License key generated successfully!', 'success');
      setIsGenerating(false);
    }, 1500);
  };

  const copyToClipboard = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('Key copied to clipboard', 'info');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-[2rem] shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert size={32} />
            </div>
            <h1 className="text-2xl font-black text-gray-900 uppercase italic">Admin Access</h1>
            <p className="text-gray-500 text-sm font-medium">Enter your Master Admin Key to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Master Secret</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input 
                  type="password" 
                  value={adminSecret}
                  onChange={(e) => setAdminSecret(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:bg-white outline-none transition-all"
                />
              </div>
            </div>
            <button 
              type="submit"
              className="w-full py-4 bg-gray-900 text-white font-black rounded-xl hover:bg-black transition-all active:scale-[0.98]"
            >
              UNLOCK PANEL
            </button>
            <button 
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-full py-2 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-600 transition-colors"
            >
              Back to App
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-12 pb-32">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-gray-900 uppercase italic">License Generator</h1>
              <p className="text-gray-500 font-medium">Create manual keys for gifts and exceptions</p>
            </div>
          </div>
          <div className="px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-[0.625rem] font-black uppercase tracking-widest flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            Admin Session Active
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Generation Form */}
          <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100 space-y-8">
            <form onSubmit={handleGenerate} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">School Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="school@example.com"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Subscription Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '6months', label: '6 Months', icon: Clock },
                    { id: '1year', label: '1 Year', icon: Calendar },
                    { id: 'lifetime', label: 'Lifetime', icon: Crown }
                  ].map((opt: any) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDuration(opt.id)}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        duration === opt.id 
                        ? 'border-blue-600 bg-blue-50 text-blue-600' 
                        : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      <opt.icon size={18} />
                      <span className="text-[0.625rem] font-black uppercase tracking-tighter">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                disabled={isGenerating}
                className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:bg-blue-400"
              >
                {isGenerating ? <Loader2 className="animate-spin" /> : <Gift size={20} />}
                {isGenerating ? 'GENERATING...' : 'GENERATE GIFT KEY'}
              </button>
            </form>
          </div>

          {/* Result Card */}
          <div className="flex flex-col">
            {generatedKey ? (
              <div className="bg-gray-900 p-8 rounded-[2rem] shadow-2xl text-center space-y-6 animate-in zoom-in duration-300 flex-1 flex flex-col justify-center">
                <div className="w-16 h-16 bg-white/10 text-blue-400 rounded-full flex items-center justify-center mx-auto">
                  <Check size={32} />
                </div>
                <div className="space-y-2">
                  <p className="text-blue-400 text-[0.625rem] font-black uppercase tracking-[0.3em]">Key Generated Successfully</p>
                  <h2 className="text-white font-mono text-3xl font-black tracking-widest">{generatedKey}</h2>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-white/40 text-[0.625rem] font-bold uppercase mb-1">Assigned To</p>
                  <p className="text-white font-medium">{email}</p>
                </div>
                <button 
                  onClick={copyToClipboard}
                  className="w-full py-4 bg-white text-gray-900 font-black rounded-2xl hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                  {copied ? 'COPIED TO CLIPBOARD' : 'COPY LICENSE KEY'}
                </button>
              </div>
            ) : (
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-[2rem] flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center">
                  <Gift size={32} />
                </div>
                <div className="space-y-1">
                  <p className="text-gray-900 font-black uppercase italic">Ready to Generate</p>
                  <p className="text-gray-400 text-sm">Fill the form to create a new license key</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Management Section */}
      <div className="max-w-4xl mx-auto mt-20 space-y-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
             <ShieldCheck size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-display font-black text-gray-900 italic uppercase italic tracking-tight">Faculty & Governance</h2>
            <p className="text-gray-500 font-medium">Architect the registry, manage privileges, and execute rollovers</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-6">
             <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 space-y-8">
                <div className="flex p-1 bg-gray-50 rounded-2xl overflow-x-auto no-scrollbar">
                   <button 
                     onClick={() => setActiveTab('single')}
                     className={`shrink-0 px-6 py-3 rounded-xl text-[0.625rem] font-black tracking-widest uppercase transition-all ${activeTab === 'single' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                   >
                     Individual
                   </button>
                   <button 
                     onClick={() => setActiveTab('bulk')}
                     className={`shrink-0 px-6 py-3 rounded-xl text-[0.625rem] font-black tracking-widest uppercase transition-all ${activeTab === 'bulk' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                   >
                     Batch
                   </button>
                   <button 
                     onClick={() => setActiveTab('matrix')}
                     className={`shrink-0 px-6 py-3 rounded-xl text-[0.625rem] font-black tracking-widest uppercase transition-all ${activeTab === 'matrix' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                   >
                     Matrix
                   </button>
                </div>

                {activeTab === 'single' && (
                  <form onSubmit={handleCreateUser} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                        <input 
                          type="text" 
                          value={newUserFullName}
                          onChange={(e) => setNewUserFullName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Email / Username</label>
                        <input 
                          type="email" 
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          placeholder="john@school.local"
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

                    {newUserRole === 'teacher' && (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                         <div className="space-y-0.5">
                            <p className="text-[0.625rem] font-black text-gray-900 uppercase tracking-widest">Administrative Access</p>
                            <p className="text-[0.5625rem] font-medium text-gray-400">Can access this panel and manage settings</p>
                         </div>
                         <button 
                           type="button"
                           onClick={() => setIsAdminTeacher(!isAdminTeacher)}
                           className={`w-12 h-6 rounded-full transition-all relative ${isAdminTeacher ? 'bg-blue-600' : 'bg-gray-200'}`}
                         >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isAdminTeacher ? 'left-7' : 'left-1'}`} />
                         </button>
                      </div>
                    )}
                    <button 
                      type="submit" 
                      disabled={isCreatingUser}
                      className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-2xl shadow-gray-200"
                    >
                      {isCreatingUser ? <Loader2 className="animate-spin" /> : <UserPlus size={20} />}
                      CREATE ACCESS
                    </button>
                  </form>
                )}

                {activeTab === 'bulk' && (
                  <div className="space-y-6">
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-[0.625rem] font-bold text-amber-700 leading-relaxed uppercase tracking-tighter">
                      Paste a list of users in the format: <br/> 
                      <span className="font-black">email, full name</span> (one per line)
                    </div>
                    <textarea 
                      value={bulkInput}
                      onChange={(e) => setBulkInput(e.target.value)}
                      placeholder="teacher1@school.com, John Teacher&#10;teacher2@school.com, Sarah Smith"
                      rows={6}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all resize-none font-mono text-xs"
                    />
                    <div className="space-y-2">
                        <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Assign Role</label>
                        <div className="flex gap-2">
                          <button 
                            type="button" 
                            onClick={() => setNewUserRole('teacher')}
                            className={`flex-1 py-3 rounded-xl border-2 transition-all font-black uppercase text-[0.625rem] tracking-widest ${newUserRole === 'teacher' ? 'border-emerald-600 bg-emerald-50 text-emerald-600' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-100'}`}
                          >
                            Batch Teachers
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setNewUserRole('student')}
                            className={`flex-1 py-3 rounded-xl border-2 transition-all font-black uppercase text-[0.625rem] tracking-widest ${newUserRole === 'student' ? 'border-amber-600 bg-amber-50 text-amber-600' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-100'}`}
                          >
                            Batch Students
                          </button>
                        </div>
                    </div>
                    <button 
                      onClick={handleBulkCreate}
                      disabled={isCreatingUser}
                      className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-2xl shadow-emerald-100"
                    >
                      {isCreatingUser ? <Loader2 className="animate-spin" /> : <Users size={20} />}
                      PROCESS BATCH
                    </button>
                  </div>
                )}

                {activeTab === 'matrix' && (
                  <div className="space-y-6 py-4">
                     <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100">
                        <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                           <BadgeCheck size={24} />
                        </div>
                        <div>
                           <p className="text-sm font-black text-slate-900 tracking-tight">Teacher Assignment Matrix</p>
                           <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Class Management</p>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div className="space-y-2">
                           <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Select Faculty Member</label>
                           <select 
                             onChange={(e) => setAssignmentTeacherId(Number(e.target.value))}
                             className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                           >
                              <option value="">Choose Teacher...</option>
                              {users.filter(u => u.role === 'teacher').map(t => (
                                <option key={t.id} value={t.id}>{t.fullName}</option>
                              ))}
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Assign to Class</label>
                           <select 
                             onChange={(e) => setAssignmentClassId(Number(e.target.value))}
                             className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                           >
                              <option value="">Choose Class...</option>
                              {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.className}</option>
                              ))}
                           </select>
                        </div>
                        <button 
                          onClick={handleAssignTeacher}
                          className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl shadow-slate-100 hover:bg-black transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[0.625rem]"
                        >
                           Update Assignment Matrix
                        </button>
                     </div>
                  </div>
                )}
             </div>
          </div>

          <div className="lg:col-span-6">
             <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                   <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                      <Users size={16} />
                      Active Portal Users
                   </h3>
                   <span className="text-[0.625rem] font-black text-gray-400">{users.length} Total</span>
                </div>
                <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                   {users.map(u => (
                     <div key={u.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${u.role === 'admin' ? 'bg-slate-900 text-white' : u.role === 'teacher' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                              {u.role[0].toUpperCase()}
                           </div>
                           <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-black text-gray-900">{u.fullName}</p>
                                {u.isAdmin && (
                                  <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[0.4375rem] font-black uppercase rounded-sm">Admin Access</span>
                                )}
                              </div>
                              <p className="text-[0.625rem] font-bold text-gray-400 lowercase italic line-clamp-1">{u.email}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           {u.role === 'teacher' && (
                             <button 
                               onClick={() => toggleAdminPrivilege(u)}
                               className={`p-2 transition-colors ${u.isAdmin ? 'text-blue-600' : 'text-gray-300 hover:text-blue-400'}`}
                               title="Toggle Admin Privilege"
                             >
                                <Key size={16} />
                             </button>
                           )}
                           {u.role !== 'admin' && (
                             <button 
                               onClick={() => deleteUser(u.id!)}
                               className="p-2 text-gray-300 hover:text-rose-500 transition-colors"
                             >
                                <Trash2 size={16} />
                             </button>
                           )}
                           <BadgeCheck size={18} className="text-emerald-500" />
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper icons for the duration buttons
const Calendar = ({ size }: { size: number }) => <Clock size={size} />;
const Crown = ({ size }: { size: number }) => <Gift size={size} />;
