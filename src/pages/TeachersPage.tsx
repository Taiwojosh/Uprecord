import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  UserCheck, 
  Search, 
  Filter, 
  UserPlus, 
  ShieldCheck,
  Mail,
  BookOpen,
  Trash2,
  Key,
  Clock,
  MoreVertical,
  Users,
  Grid3X3,
  RefreshCw,
  Plus,
  Loader2,
  Phone,
  MapPin,
  Calendar,
  Building2,
  ArrowRight,
  TrendingUp,
  FileText,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  X,
  User,
  Upload,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { db, type IUser } from '../db/db';
import { PageHeader } from '../components/ui/PageHeader';
import { Spinner } from '../components/ui/Spinner';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { BulkTeacherImportModal } from '../components/teachers/BulkTeacherImportModal';
import { motion, AnimatePresence } from 'motion/react';

export const TeachersPage: React.FC = () => {
  const { user } = useAuth();
  const { canManageRegistry } = usePermissions();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.searchTerm) {
      setSearchTerm(location.state.searchTerm);
      navigate(location.pathname, { replace: true, state: { ...location.state, searchTerm: undefined } });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    if (location.state?.addTeacher) {
      setEditingTeacher(null);
      setRegFormData({ fullName: '', email: '', phone: '', department: '', isAdmin: false, password: 'password123' });
      setIsRegModalOpen(true);
      // Clean state after reading
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    const fixOrphanedRecords = async () => {
      const schoolId = user?.schoolId;
      if (schoolId && schoolId !== 'school-1') {
        try {
          const count = await db.students.where('schoolId').equals('school-1').count();
          const userCount = await db.users.where('schoolId').equals('school-1').count();
          if (count > 0 || userCount > 0) {
            await db.transaction('rw', [db.students, db.classes, db.subjects, db.users], async () => {
              await db.students.where('schoolId').equals('school-1').modify({ schoolId });
              await db.classes.where('schoolId').equals('school-1').modify({ schoolId });
              await db.subjects.where('schoolId').equals('school-1').modify({ schoolId });
              await db.users.where('schoolId').equals('school-1').modify({ schoolId });
            });
            showToast(`Migrated ${count + userCount} imported records & user logins to your active school registry!`, 'success');
          }
        } catch (e) {
          console.error('Failed to auto-migrate legacy imports', e);
        }
      }
    };
    fixOrphanedRecords();
  }, [user?.schoolId, showToast]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [selectedTeacher, setSelectedTeacher] = useState<IUser | null>(null);
  const [expandedTeacherIds, setExpandedTeacherIds] = useState<number[]>([]);
  const toggleExpandTeacher = (id: number) => {
    setExpandedTeacherIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };
  const [editingTeacher, setEditingTeacher] = useState<IUser | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<number | null>(null);
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);

  // Registration states
  const [isRegistering, setIsRegistering] = useState(false);
  const [regFormData, setRegFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: '',
    isAdmin: false,
    password: 'password123'
  });

  const settings = useLiveQuery(async () => {
    if (!user?.schoolId) return undefined;
    return await db.settings.where('schoolId').equals(user.schoolId).first();
  }, [user?.schoolId]);

  const teachers = useLiveQuery(async () => {
    if (!user?.schoolId) return [];
    const allUsers = await db.users.where('schoolId').equals(user.schoolId).toArray();
    return allUsers.filter(u => u.role === 'teacher' || u.role === 'admin' || u.isAdmin);
  }, [user?.schoolId]) ?? [];

  const classes = useLiveQuery(async () => {
      if (!user?.schoolId) return [];
      return await db.classes.where('schoolId').equals(user.schoolId).toArray();
  }, [user?.schoolId]) ?? [];

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      return t.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
             t.email.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [teachers, searchTerm]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    try {
      if (editingTeacher) {
        await db.users.update(editingTeacher.id!, {
          fullName: regFormData.fullName,
          email: regFormData.email,
          phone: regFormData.phone,
          department: regFormData.department,
          password: regFormData.password,
          isAdmin: regFormData.isAdmin
        });
        showToast('Faculty member updated successfully', 'success');
        if (selectedTeacher?.id === editingTeacher.id) {
          setSelectedTeacher({ 
            ...selectedTeacher, 
            fullName: regFormData.fullName,
            email: regFormData.email,
            phone: regFormData.phone,
            department: regFormData.department,
            password: regFormData.password,
            isAdmin: regFormData.isAdmin
          });
        }
      } else {
        await db.users.add({
          fullName: regFormData.fullName,
          email: regFormData.email,
          phone: regFormData.phone,
          department: regFormData.department,
          role: 'teacher',
          schoolId: user?.schoolId || 'school-1',
          password: regFormData.password || 'password123',
          isAdmin: regFormData.isAdmin,
          status: 'active',
          joinDate: new Date().toISOString()
        });
        showToast('Faculty member onboarded successfully', 'success');
      }
      setRegFormData({ fullName: '', email: '', phone: '', department: '', isAdmin: false, password: 'password123' });
      setIsRegModalOpen(false);
      setEditingTeacher(null);
    } catch (error) {
      showToast(editingTeacher ? 'Update failed' : 'Registration failed', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  const toggleAdmin = async (teacher: IUser) => {
    try {
      const isCurrentlyAdmin = teacher.role === 'admin' || teacher.isAdmin;
      const willBeAdmin = !isCurrentlyAdmin;
      const updates: Partial<IUser> = { isAdmin: willBeAdmin };
      if (teacher.role === 'admin' && !willBeAdmin) {
        updates.role = 'teacher';
      }
      await db.users.update(teacher.id!, updates);
      showToast(`Privileges updated for ${teacher.fullName}`, 'success');
      if (selectedTeacher?.id === teacher.id) {
        setSelectedTeacher({ ...selectedTeacher, ...updates });
      }
    } catch (e) {
      showToast('Action failed', 'error');
    }
  };

  const handleDelete = async () => {
    if (!teacherToDelete) return;
    try {
      await db.users.delete(teacherToDelete);
      showToast('Teacher account removed', 'success');
      if (selectedTeacher?.id === teacherToDelete) setSelectedTeacher(null);
    } catch (e) {
      showToast('Deletion failed', 'error');
    } finally {
      setTeacherToDelete(null);
    }
  };

  return (
    <div className="space-y-6 md:space-y-10 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Teachers & Staff" 
          subtitle="Manage academic and administrative staff profiles" 
        />
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2.5 md:gap-4 items-center w-full sm:w-auto">
           {canManageRegistry && (
             <>
               <button 
                 onClick={() => setIsBulkImportModalOpen(true)}
                 className="px-3.5 py-2.5 md:px-6 md:py-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-2xl font-black text-[0.55rem] md:text-[0.625rem] uppercase tracking-wider md:tracking-widest hover:bg-gray-50 dark:hover:bg-slate-700 dark:hover:text-white transition-all flex items-center justify-center gap-1.5 w-full sm:w-auto shadow-sm"
               >
                  <Upload className="w-4 h-4 md:w-4 md:h-4 shrink-0" />
                  Bulk Import
               </button>
               <button 
                 onClick={() => {
                   setEditingTeacher(null);
                   setRegFormData({ fullName: '', email: '', phone: '', department: '', isAdmin: false, password: 'password123' });
                   setIsRegModalOpen(true);
                 }}
                 className="px-3.5 py-2.5 md:px-6 md:py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-black text-[0.55rem] md:text-[0.625rem] uppercase tracking-wider md:tracking-widest hover:bg-black dark:hover:bg-white dark:hover:text-slate-900 transition-all shadow-xl shadow-slate-900/10 dark:shadow-none flex items-center justify-center gap-1.5 w-full sm:w-auto"
               >
                 <UserPlus className="w-4 h-4 md:w-4 md:h-4 shrink-0" />
                 Onboard Teacher
               </button>
             </>
           )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <TeacherStatCard icon={Users} label="Total Staff" value={teachers.length} trend="+2 from last month" color="blue" />
        <TeacherStatCard icon={ShieldCheck} label="Admins" value={teachers.filter(t => t.role === 'admin' || t.isAdmin).length} trend="Access Control" color="purple" />
        <TeacherStatCard icon={BadgeCheck} label="Active" value={teachers.filter(t => t.status !== 'inactive').length} trend={settings?.currentSession ? `${settings.currentSession} Session` : 'Current Session'} color="emerald" />
        <TeacherStatCard icon={TrendingUp} label="Retention" value="98%" trend={settings?.currentSession ? `${settings.currentSession} Year` : 'Academic Year'} color="amber" />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main List Column */}
        <div className="flex-1 space-y-6">
          <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
             <div className="flex-1 relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search staff by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 h-12 bg-gray-50 border-transparent rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all font-bold text-sm"
                />
             </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <p className="text-[0.625rem] md:text-xs font-bold text-slate-400 italic">
              Showing {filteredTeachers.length} {filteredTeachers.length === 1 ? 'member' : 'members'}
            </p>
            {filteredTeachers.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const allIds = filteredTeachers.map(t => t.id!).filter(Boolean);
                  const isAllExpanded = expandedTeacherIds.length === allIds.length;
                  setExpandedTeacherIds(isAllExpanded ? [] : allIds);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-[10px] md:text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors shadow-sm select-none active:scale-[0.98]"
              >
                {expandedTeacherIds.length === filteredTeachers.length ? 'Collapse All' : 'Expand All'}
              </button>
            )}
          </div>

          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            {/* Desktop view */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">Staff Identity</th>
                    <th className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">Designation</th>
                    <th className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest text-center">Assigned Class</th>
                    <th className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTeachers.map(teacher => {
                    const assignedClass = classes.find(c => c.teacherId === teacher.id || c.teacherName === teacher.fullName);
                    return (
                      <tr 
                        key={teacher.id} 
                        onClick={() => setSelectedTeacher(teacher)}
                        className={`group hover:bg-gray-50/50 transition-colors cursor-pointer ${selectedTeacher?.id === teacher.id ? 'bg-blue-50/30' : ''}`}
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${teacher.role === 'admin' || teacher.isAdmin ? 'bg-slate-900 text-white' : 'bg-blue-50 text-blue-600'}`}>
                              {teacher.fullName[0]}
                            </div>
                            <div>
                              <p className="font-black text-gray-900 tracking-tight">{teacher.fullName}</p>
                              <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-tighter italic">{teacher.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                           <p className="text-sm font-black text-gray-700 uppercase tracking-tight italic">{teacher.role === 'admin' || teacher.isAdmin ? 'Administrator' : 'Subject Specialist'}</p>
                        </td>
                        <td className="px-8 py-5 text-center">
                          {assignedClass ? (
                            <span className="px-3 py-1 bg-slate-900 text-white text-[0.625rem] font-black rounded-full uppercase tracking-widest">
                              {assignedClass.className}
                            </span>
                          ) : (
                            <span className="text-[0.625rem] font-bold text-gray-300 uppercase italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-8 py-5 text-center">
                           <Badge variant={teacher.status === 'inactive' ? 'outline' : 'success'} className="italic">
                              {teacher.status || 'Active'}
                           </Badge>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setEditingTeacher(teacher);
                                setRegFormData({
                                  fullName: teacher.fullName,
                                  email: teacher.email,
                                  phone: teacher.phone || '',
                                  department: teacher.department || '',
                                  isAdmin: teacher.role === 'admin' || teacher.isAdmin || false,
                                  password: teacher.password || (teacher.role === 'admin' ? 'admin' : 'password123')
                                });
                                setIsRegModalOpen(true);
                              }}
                              className="p-2 text-gray-700 hover:text-blue-600 transition-all bg-gray-50 hover:bg-gray-100 border border-gray-200/50 rounded-xl"
                              title="Edit Profile"
                            >
                              <User size={16} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleAdmin(teacher); }}
                              className={`p-2 rounded-xl transition-all ${teacher.role === 'admin' || teacher.isAdmin ? 'text-blue-600 bg-blue-50 border border-blue-200 shadow-sm' : 'text-gray-700 hover:text-blue-600 bg-gray-50 hover:bg-gray-100 border border-gray-200/50'}`}
                              title={teacher.role === 'admin' || teacher.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                            >
                              <Key size={16} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setTeacherToDelete(teacher.id!); }}
                              className="p-2 text-gray-700 hover:text-rose-600 transition-all bg-gray-50 hover:bg-gray-100 border border-gray-200/50 rounded-xl"
                              title="Remove Teacher"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile view - List/Card Layout with dropdown expand arrow */}
            <div className="block md:hidden divide-y divide-gray-100">
              {filteredTeachers.map(teacher => {
                const assignedClass = classes.find(c => c.teacherId === teacher.id || c.teacherName === teacher.fullName);
                const isExpanded = expandedTeacherIds.includes(teacher.id!);
                return (
                  <div 
                    key={teacher.id} 
                    className={`p-4 transition-colors ${selectedTeacher?.id === teacher.id ? 'bg-blue-50/20' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div 
                        className="flex items-center gap-3 min-w-0 cursor-pointer"
                        onClick={() => setSelectedTeacher(teacher)}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${teacher.role === 'admin' || teacher.isAdmin ? 'bg-slate-900 text-white animate-pulse' : 'bg-blue-50 text-blue-600'}`}>
                          {teacher.fullName[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-gray-900 tracking-tight text-sm truncate uppercase italic">{teacher.fullName}</p>
                          <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-tighter italic truncate">{teacher.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Dropdown Expand Chevron */}
                        <button
                          onClick={() => toggleExpandTeacher(teacher.id!)}
                          className="p-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-500 hover:text-slate-900 hover:bg-gray-100 transition-all flex items-center justify-center shadow-sm"
                          title={isExpanded ? "Collapse Details" : "Expand Details"}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Details Container */}
                    {isExpanded && (
                      <div className="mt-4 p-4 bg-gray-50/70 border border-gray-100/50 rounded-2xl space-y-4 text-xs animate-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[0.55rem] font-black text-gray-400 uppercase tracking-widest">Designation</p>
                            <p className="font-bold text-gray-800 uppercase mt-0.5 tracking-wider">
                              {teacher.role === 'admin' || teacher.isAdmin ? 'Administrator' : 'Subject Specialist'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[0.55rem] font-black text-gray-400 uppercase tracking-widest">Assigned Class</p>
                            <div className="mt-0.5">
                              {assignedClass ? (
                                <span className="px-2 py-0.5 bg-slate-900 text-white text-[0.55rem] font-black rounded uppercase tracking-wider">
                                  {assignedClass.className}
                                </span>
                              ) : (
                                <span className="text-[0.55rem] font-bold text-gray-400 uppercase italic">Unassigned</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-[0.55rem] font-black text-gray-400 uppercase tracking-widest">Status</p>
                            <div className="mt-0.5">
                              <Badge variant={teacher.status === 'inactive' ? 'outline' : 'success'} className="italic py-0 px-2 text-[0.55rem]">
                                {teacher.status || 'Active'}
                              </Badge>
                            </div>
                          </div>
                          {teacher.phone && (
                            <div className="col-span-2">
                              <p className="text-[0.55rem] font-black text-gray-400 uppercase tracking-widest">Phone</p>
                              <p className="font-bold text-gray-800 mt-0.5">{teacher.phone}</p>
                            </div>
                          )}
                        </div>

                        {/* Action buttons list inside details space to prevent mistakes */}
                        <div className="pt-3 border-t border-gray-150/60 flex flex-wrap gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTeacher(teacher);
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-wider transition-all"
                          >
                            <Eye size={12} />
                            View details
                          </button>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setEditingTeacher(teacher);
                              setRegFormData({
                                fullName: teacher.fullName,
                                email: teacher.email,
                                phone: teacher.phone || '',
                                department: teacher.department || '',
                                isAdmin: teacher.role === 'admin' || teacher.isAdmin || false,
                                password: teacher.password || (teacher.role === 'admin' ? 'admin' : 'password123')
                              });
                              setIsRegModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-wider transition-all"
                          >
                            <User size={12} />
                            This Profile
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleAdmin(teacher); }}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                              teacher.role === 'admin' || teacher.isAdmin ? 'text-blue-600 bg-blue-100/60 border-blue-200' : 'text-gray-600 hover:text-blue-600 bg-white border-gray-200'
                            }`}
                          >
                            <Key size={12} />
                            {teacher.role === 'admin' || teacher.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setTeacherToDelete(teacher.id!); }}
                            className="flex items-center gap-1.5 px-3 py-2 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-150 rounded-xl transition-all font-black text-[10px] uppercase tracking-wider ml-auto"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredTeachers.length === 0 && (
              <div className="py-20 text-center space-y-4">
                 <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                    <User size={40} className="text-gray-200" />
                 </div>
                 <p className="text-sm font-black text-gray-400 uppercase tracking-widest italic">No staff members found matching criteria</p>
              </div>
            )}
          </div>
        </div>

        {/* Detail Sidebar */}
        <AnimatePresence>
          {selectedTeacher && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full lg:w-[400px] space-y-6"
            >
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden sticky top-10">
                 <div className="p-1.5 flex items-center justify-end">
                    <button 
                      onClick={() => setSelectedTeacher(null)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-all"
                    >
                      <X size={20} />
                    </button>
                 </div>
                 <div className="px-10 pb-10 text-center space-y-6">
                    <div className="relative mx-auto w-24 h-24">
                       <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center text-3xl font-black text-white shadow-2xl shadow-slate-900/20">
                          {selectedTeacher.fullName[0]}
                       </div>
                       <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center ${selectedTeacher.status === 'inactive' ? 'bg-gray-400' : 'bg-emerald-500'}`}>
                          <CheckCircle2 size={16} className="text-white" />
                       </div>
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-gray-900 tracking-tight italic uppercase">{selectedTeacher.fullName}</h3>
                       <p className="text-[0.625rem] font-black text-blue-600 uppercase tracking-[0.2em]">{selectedTeacher.role === 'admin' || selectedTeacher.isAdmin ? 'Administrator' : 'Subject Specialist'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-left">
                          <p className="text-[0.5rem] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                          <p className="text-sm font-black text-gray-900">{selectedTeacher.status || 'Active'}</p>
                       </div>
                       <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-left">
                          <p className="text-[0.5rem] font-black text-gray-400 uppercase tracking-widest mb-1">Privilege</p>
                          <p className="text-sm font-black text-gray-900">{selectedTeacher.role === 'admin' || selectedTeacher.isAdmin ? 'Admin' : 'Standard'}</p>
                       </div>
                    </div>

                    <div className="space-y-4 text-left">
                       <div className="flex items-center gap-3 text-gray-500">
                          <Mail size={16} />
                          <span className="text-xs font-bold truncate">{selectedTeacher.email}</span>
                       </div>
                       <div className="flex items-center gap-3 text-gray-500">
                          <Phone size={16} />
                          <span className="text-xs font-bold">{selectedTeacher.phone || 'No phone recorded'}</span>
                       </div>
                       <div className="flex items-center gap-3 text-gray-500">
                          <Calendar size={16} />
                          <span className="text-xs font-bold italic">Joined {selectedTeacher.joinDate ? new Date(selectedTeacher.joinDate).toLocaleDateString() : 'N/A'}</span>
                       </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 space-y-4">
                       <div className="flex items-center justify-between">
                          <h4 className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">Assigned Duties</h4>
                          <Plus size={14} className="text-gray-400 cursor-pointer hover:text-gray-900" />
                       </div>
                       {classes.filter(c => c.teacherId === selectedTeacher.id || c.teacherName === selectedTeacher.fullName).map(c => (
                         <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-gray-100">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-100">
                                  <BookOpen size={14} className="text-gray-400" />
                               </div>
                               <div>
                                  <p className="text-xs font-black text-gray-900 italic tracking-tight">{c.className}</p>
                                  <p className="text-[0.5rem] font-black text-gray-400 uppercase">Primary Class</p>
                               </div>
                            </div>
                            <ArrowRight size={14} className="text-gray-300" />
                         </div>
                       ))}
                    </div>

                    <div className="pt-6 grid grid-cols-2 gap-3">
                       <button 
                         onClick={() => {
                           setEditingTeacher(selectedTeacher);
                           setRegFormData({
                             fullName: selectedTeacher!.fullName,
                             email: selectedTeacher!.email,
                             phone: selectedTeacher!.phone || '',
                             department: selectedTeacher!.department || '',
                             isAdmin: selectedTeacher!.role === 'admin' || selectedTeacher!.isAdmin || false,
                             password: selectedTeacher!.password || (selectedTeacher!.role === 'admin' ? 'admin' : 'password123')
                           });
                           setIsRegModalOpen(true);
                         }}
                         className="py-3 bg-gray-50 text-gray-600 rounded-xl font-black text-[0.625rem] uppercase tracking-widest hover:bg-gray-100"
                       >
                         Edit Profile
                       </button>
                       <button 
                         onClick={() => toggleAdmin(selectedTeacher!)}
                         className="py-3 bg-slate-900 text-white rounded-xl font-black text-[0.625rem] uppercase tracking-widest hover:bg-black"
                       >
                         {selectedTeacher.role === 'admin' || selectedTeacher.isAdmin ? 'Demote' : 'Grant Admin'}
                       </button>
                    </div>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <RegistrationModal 
        isOpen={isRegModalOpen}
        onClose={() => {
          setIsRegModalOpen(false);
          setEditingTeacher(null);
        }}
        formData={regFormData}
        setFormData={setRegFormData}
        onSubmit={handleRegister}
        isRegistering={isRegistering}
        isEditing={!!editingTeacher}
      />

      <BulkTeacherImportModal 
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
      />

      <ConfirmDialog 
        isOpen={!!teacherToDelete}
        title="Remove Staff Account?"
        message="Are you sure you want to disable this teacher's access? This action will archive their instructional history but revoke all portal privileges immediately."
        onConfirm={handleDelete}
        onClose={() => setTeacherToDelete(null)}
      />
    </div>
  );
};

const TeacherStatCard: React.FC<{ icon: any, label: string, value: string | number, trend: string, color: 'blue' | 'purple' | 'emerald' | 'amber' }> = ({ icon: Icon, label, value, trend, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100'
  };

  return (
    <div className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 shadow-sm space-y-2 md:space-y-4">
      <div className={`w-10 h-10 md:w-14 md:h-14 ${colors[color]} rounded-xl md:rounded-2xl flex items-center justify-center border shadow-sm`}>
        <Icon className="w-5 h-5 md:w-7 md:h-7" />
      </div>
      <div>
        <p className="text-[0.55rem] md:text-[0.625rem] font-black text-gray-400 uppercase tracking-widest leading-none">{label}</p>
        <p className="text-xl md:text-3xl font-black text-gray-900 tracking-tighter mt-1 md:mt-0">{value}</p>
        <p className="text-[0.55rem] md:text-[0.625rem] font-bold text-gray-500 italic mt-0.5 md:mt-1 truncate">{trend}</p>
      </div>
    </div>
  );
};

const RegistrationModal: React.FC<{
  isOpen: boolean,
  onClose: () => void,
  formData: any,
  setFormData: any,
  onSubmit: (e: React.FormEvent) => void,
  isRegistering: boolean,
  isEditing?: boolean
}> = ({ isOpen, onClose, formData, setFormData, onSubmit, isRegistering, isEditing }) => {
  const [showPassword, setShowPassword] = useState(false);
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Edit Faculty Profile" : "Onboard New Faculty Member"}>
       <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
             <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Professional Full Name</label>
             <input 
               required
               value={formData.fullName}
               onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
               placeholder="e.g. Dr. Sarah Jenkins"
               className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all font-bold text-sm"
             />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Institutional Email</label>
                <input 
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="s.jenkins@school.edu"
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all font-bold text-sm"
                />
             </div>
             <div className="space-y-2">
                <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Contact</label>
                <input 
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+234..."
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all font-bold text-sm"
                />
             </div>
          </div>
          <div className="space-y-2">
             <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Portal Password</label>
             <div className="relative w-full">
               <input 
                 required
                 type={showPassword ? "text" : "password"}
                 value={formData.password || ''}
                 onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                 placeholder="Enter portal password"
                 className="w-full pl-5 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all font-bold text-sm"
               />
               <button
                 type="button"
                 onClick={() => setShowPassword(!showPassword)}
                 className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
               >
                 {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
               </button>
             </div>
          </div>

          <div className="p-6 bg-slate-900 rounded-[2rem] flex items-center justify-between text-white shadow-xl shadow-slate-900/20">
             <div>
                <p className="text-sm font-black italic tracking-tight">Administrative Status</p>
                <p className="text-[0.625rem] font-medium text-white/50 uppercase tracking-widest">Enable system-wide settings access</p>
             </div>
             <button 
               type="button"
               onClick={() => setFormData({ ...formData, isAdmin: !formData.isAdmin })}
               className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.isAdmin ? 'bg-blue-500' : 'bg-white/20'}`}
             >
                <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.isAdmin ? 'translate-x-5' : 'translate-x-0'}`} />
             </button>
          </div>

          <button 
            type="submit"
            disabled={isRegistering}
            className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-[0.6875rem] uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-3"
          >
             {isRegistering ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
             {isEditing ? 'Save Changes' : 'Confirm Onboarding Protocol'}
          </button>
       </form>
    </Modal>
  );
};

const CheckCircle2: React.FC<{ size?: number, className?: string }> = ({ size = 24, className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

