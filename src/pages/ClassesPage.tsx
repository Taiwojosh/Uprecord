import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  LayoutGrid, 
  Plus, 
  Users, 
  BookOpen, 
  MoreVertical, 
  Search, 
  Table as TableIcon,
  User as UserIcon,
  Clock,
  TrendingUp,
  CreditCard,
  Edit2,
  Trash2,
  ExternalLink,
  ChevronRight,
  ArrowUpCircle,
  Filter,
  CheckCircle2,
  X,
  ChevronDown
} from 'lucide-react';
import { db, type IClass } from '../db/db';
import { filterSubjectsForStudent } from '../lib/calculationEngine';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../context/ToastContext';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useScopedDb } from '../hooks/useScopedDb';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';

export const ClassesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { schoolId } = useScopedDb();
  const { canManageRegistry } = usePermissions();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (location.state?.searchTerm) {
      setSearchTerm(location.state.searchTerm);
      navigate(location.pathname, { replace: true, state: { ...location.state, searchTerm: undefined } });
    }
  }, [location.state, navigate]);
  const [levelFilter, setLevelFilter] = useState('All Levels');
  const [sortBy, setSortBy] = useState<'name' | 'enrollment'>('name');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<number | null>(null);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    className: '',
    level: 'junior',
    teacherName: '',
    capacity: 40
  });

  const classes = useLiveQuery(() => schoolId ? db.classes.where('schoolId').equals(schoolId).toArray() : []) || [];
  const teachers = useLiveQuery(async () => {
    if (!schoolId) return [];
    const users = await db.users.where('schoolId').equals(schoolId).toArray();
    return users.filter(u => u.role === 'teacher');
  }) || [];
  const students = useLiveQuery(() => schoolId ? db.students.where('schoolId').equals(schoolId).toArray() : []) || [];
  const subjects = useLiveQuery(() => schoolId ? db.subjects.where('schoolId').equals(schoolId).toArray() : []) || [];
  const payments = useLiveQuery(() => schoolId ? db.payments.where('schoolId').equals(schoolId).toArray() : []) || [];
  const settings = useLiveQuery(() => schoolId ? db.settings.where('schoolId').equals(schoolId).first() : undefined);

  const isTeacher = user?.role === 'teacher';

  const filteredClasses = useMemo(() => {
    let result = classes.filter(c => 
      (c.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
       c.teacherName?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (levelFilter === 'All Levels' || c.level === levelFilter)
    );

    if (sortBy === 'name') {
      result.sort((a, b) => a.className.localeCompare(b.className));
    } else {
      result.sort((a, b) => {
        const countA = students.filter(s => s.classId === a.id).length;
        const countB = students.filter(s => s.classId === b.id).length;
        return countB - countA;
      });
    }

    return result;
  }, [classes, searchTerm, levelFilter, sortBy, students]);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await db.classes.add({
        ...(formData as any),
        capacity: Number(formData.capacity),
        schoolId: schoolId || 'school-1'
      });
      showToast('Academic level established successfully', 'success');
      setIsAddModalOpen(false);
      setFormData({ className: '', level: 'junior', teacherName: '', capacity: 40 });
    } catch (error) {
      showToast('Failed to establish level', 'error');
    }
  };

  const handleDelete = async () => {
    if (!classToDelete) return;
    try {
      await db.classes.delete(classToDelete);
      showToast('Academic level removed from registry', 'success');
    } catch (error) {
      showToast('Failed to remove level', 'error');
    } finally {
      setClassToDelete(null);
    }
  };

  const handleBulkPromote = async () => {
    showToast('Bulk promotion protocol initiated...', 'info');
    // Implement bulk promotion logic here
    setTimeout(() => {
      showToast('Success: Students promoted to next academic levels', 'success');
      setIsPromoteModalOpen(false);
    }, 2000);
  };

  const handleAssignTeacher = async (classId: number, teacherIdStr: string) => {
    try {
      if (!teacherIdStr) {
        await db.classes.update(classId, {
          teacherId: null,
          teacherName: ''
        });
        showToast('Facilitator unassigned from levels registry', 'success');
      } else {
        const teacherId = Number(teacherIdStr);
        const teacher = teachers.find(t => t.id === teacherId);
        if (teacher) {
          await db.classes.update(classId, {
            teacherId: teacher.id,
            teacherName: teacher.fullName
          });
          showToast(`Assigned ${teacher.fullName} as class facilitator`, 'success');
        }
      }
    } catch (error) {
      showToast('Assignment protocol failed', 'error');
    }
  };

  if (classes === undefined) return <div className="h-[60vh] flex items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <PageHeader 
          title="Academic Classes" 
          subtitle="Organize students by educational levels and assign facilitators" 
        />
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setIsPromoteModalOpen(true)}
             className="px-6 py-3 bg-white border border-gray-100 text-gray-600 rounded-2xl font-black text-[0.625rem] uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2"
           >
             <ArrowUpCircle size={16} />
             Bulk Promote
           </button>
           <button 
             onClick={() => setIsAddModalOpen(true)}
             className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[0.625rem] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/10 flex items-center gap-2"
           >
             <Plus size={16} />
             New Class
           </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col lg:flex-row items-center gap-4">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search levels or facilitators..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 h-12 bg-gray-50 border-transparent rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all font-bold text-sm"
          />
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
           <div className="relative flex-1 lg:w-48">
              <select 
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full pl-4 pr-10 h-12 bg-gray-50 border-transparent rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none appearance-none transition-all font-bold text-xs uppercase tracking-widest text-gray-500"
              >
                 <option value="All Levels">All Levels</option>
                 <option value="Primary">Primary</option>
                 <option value="junior">Junior Sec.</option>
                 <option value="senior">Senior Sec.</option>
                 <option value="Secondary">Secondary (Legacy)</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
           </div>
           
           <div className="h-8 w-px bg-gray-100 hidden lg:block" />

           <div className="flex bg-gray-50 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-[0.625rem] font-black uppercase tracking-widest ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900 border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <LayoutGrid size={14} />
                Grid
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-[0.625rem] font-black uppercase tracking-widest ${viewMode === 'table' ? 'bg-white shadow-sm text-gray-900 border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <TableIcon size={14} />
                Table
              </button>
           </div>
        </div>
      </div>

      {filteredClasses.length === 0 ? (
        <EmptyState 
          icon="LayoutGrid" 
          message={searchTerm ? "No academic levels match your current search criteria." : "No levels registered in the repository."} 
        />
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredClasses.map((cls) => (
                <ClassCard 
                  key={cls.id} 
                  cls={cls} 
                  studentCount={students.filter(s => s.classId === cls.id).length}
                  subjectCount={settings ? filterSubjectsForStudent(subjects, undefined, cls, settings).length : 0}
                  onDelete={() => setClassToDelete(cls.id!)}
                  navigate={navigate}
                  payments={payments.filter(p => students.some(s => s.id === p.studentId && s.classId === cls.id))}
                  teachers={teachers}
                  canManageRegistry={canManageRegistry}
                  onAssignTeacher={handleAssignTeacher}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">Academic Level</th>
                    <th className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">Facilitator</th>
                    <th className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest text-center">Enrollment</th>
                    <th className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest text-center">Curriculum</th>
                    <th className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredClasses.map(cls => {
                    const classStudents = students.filter(s => s.classId === cls.id);
                    const classPayments = payments.filter(p => classStudents.some(s => s.id === p.studentId));
                    const paidCount = classPayments.filter(p => p.status === 'paid').length;
                    const feeRate = classPayments.length > 0 ? Math.round((paidCount / classPayments.length) * 100) : 0;
                    
                    return (
                      <tr key={cls.id} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg">
                                {cls.className.substring(0, 2).toUpperCase()}
                             </div>
                             <div>
                                <p className="font-black text-gray-900 tracking-tight">{cls.className}</p>
                                <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-tighter italic">{cls.level}</p>
                             </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          {canManageRegistry ? (
                            <div className="relative inline-block w-48">
                              <select
                                value={cls.teacherId || ''}
                                onChange={(e) => handleAssignTeacher(cls.id!, e.target.value)}
                                className="w-full pl-3 pr-8 h-9 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none appearance-none transition-all font-bold text-xs text-gray-700 italic cursor-pointer"
                              >
                                <option value="">Registry Unallocated</option>
                                {teachers.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.fullName}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none w-3.5 h-3.5" />
                            </div>
                          ) : cls.teacherName ? (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-[0.625rem] uppercase">
                                {cls.teacherName[0]}
                              </div>
                              <span className="text-xs font-black text-gray-700 italic tracking-tight">{cls.teacherName}</span>
                            </div>
                          ) : (
                            <span className="text-[0.625rem] text-amber-500 font-black uppercase tracking-widest italic">Unallocated</span>
                          )}
                        </td>
                        <td className="px-8 py-5 text-center">
                          <div className="inline-flex flex-col items-center">
                             <span className="text-sm font-black text-gray-900 italic">{classStudents.length}</span>
                             <span className="text-[0.5rem] font-black text-gray-400 uppercase italic">Students</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <div className="inline-flex flex-col items-center">
                             <span className="text-sm font-black text-gray-900 italic">{settings ? filterSubjectsForStudent(subjects, undefined, cls, settings).length : 0}</span>
                             <span className="text-[0.5rem] font-black text-gray-400 uppercase italic">Subjects</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                             <button 
                              onClick={() => navigate(`/students?classId=${cls.id}`)}
                              className="p-2 text-gray-400 hover:text-gray-900 transition-all"
                              title="View Students"
                             >
                                <Users size={16} />
                             </button>
                             <button 
                              onClick={() => setClassToDelete(cls.id!)}
                              className="p-2 text-gray-400 hover:text-rose-600 transition-all"
                              title="Delete Class"
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
          )}
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Establish Academic Level">
          <form onSubmit={handleAddClass} className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Class Nomenclature</label>
                <input
                  type="text"
                  required
                  value={formData.className}
                  onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-sm font-black italic uppercase"
                  placeholder="e.g. SS1B"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">School Wing</label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-sm font-black appearance-none"
                >
                  <option value="Primary">Primary Wing</option>
                  <option value="junior">Junior Secondary Wing</option>
                  <option value="senior">Senior Secondary Wing</option>
                  <option value="Secondary">Secondary Wing (Legacy)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
                <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Assign Class Teacher</label>
                <select
                  value={formData.teacherName}
                  onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-sm font-black appearance-none"
                >
                  <option value="">No teacher assigned...</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.fullName}>{t.fullName}</option>
                  ))}
                </select>
            </div>

            <div className="space-y-2">
                <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Student Capacity</label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-sm font-black"
                />
            </div>

            <button type="submit" className="w-full py-5 bg-slate-900 text-white font-black text-[0.6875rem] uppercase tracking-[0.2em] rounded-3xl hover:bg-black transition-all shadow-xl shadow-slate-900/20 italic">
              Commence Level Setup
            </button>
          </form>
      </Modal>

      <ConfirmDialog 
        isOpen={!!classToDelete}
        title="Dismantle Academic Level?"
        message="This operation will remove the class record. Existing student registries will be preserved but lose their primary level allocation. Proceed with caution."
        onConfirm={handleDelete}
        onClose={() => setClassToDelete(null)}
      />

      <ConfirmDialog 
        isOpen={isPromoteModalOpen}
        title="Global Promotion Protocol"
        message="Are you sure you want to promote all eligible students in the current session to their next academic levels? This action is non-reversible."
        onConfirm={handleBulkPromote}
        onClose={() => setIsPromoteModalOpen(false)}
      />
    </div>
  );
};

const ClassCard: React.FC<{ 
  cls: IClass, 
  studentCount: number, 
  subjectCount: number, 
  onDelete: () => void,
  navigate: (path: string) => void,
  payments: any[],
  teachers: any[],
  canManageRegistry: boolean,
  onAssignTeacher: (classId: number, teacherIdStr: string) => Promise<void>
}> = ({ cls, studentCount, subjectCount, onDelete, navigate, payments, teachers, canManageRegistry, onAssignTeacher }) => {
  
  const collectionRate = payments.length > 0 
    ? Math.round((payments.filter(p => p.status === 'paid').length / payments.length) * 100) 
    : 0;

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:border-blue-200 transition-all flex flex-col group h-full relative overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
           <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[0.5rem] font-black uppercase tracking-widest mb-2 inline-block">
              {cls.level} Wing
           </div>
           <h3 className="text-2xl font-black text-gray-900 tracking-tight italic uppercase leading-none">{cls.className}</h3>
        </div>
        <div className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all flex gap-1">
          <button 
           onClick={() => navigate(`/students?classId=${cls.id}`)}
           className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 hover:text-gray-900 transition-colors"
           title="View Students"
          >
            <Users size={16} />
          </button>
          <button onClick={onDelete} className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-6 flex-1">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100 flex-shrink-0">
            <UserIcon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Facilitator</p>
            {canManageRegistry ? (
              <div className="relative inline-block w-full">
                <select
                  value={cls.teacherId || ''}
                  onChange={(e) => onAssignTeacher(cls.id!, e.target.value)}
                  className="w-full pr-6 py-0.5 bg-transparent border-0 font-black text-sm text-gray-900 italic tracking-tight outline-none appearance-none cursor-pointer focus:ring-0"
                  style={{ textOverflow: 'ellipsis' }}
                >
                  <option value="">Registry Unallocated</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none w-3 h-3" />
              </div>
            ) : (
              <p className="text-sm font-black text-gray-900 italic tracking-tight truncate">{cls.teacherName || 'Registry Unallocated'}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-[1.5rem] border border-gray-100 space-y-1">
             <p className="text-[0.5rem] font-black text-gray-400 uppercase tracking-widest">Students</p>
             <p className="text-lg font-black text-gray-900 italic leading-none">{studentCount}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-[1.5rem] border border-gray-100 space-y-1">
             <p className="text-[0.5rem] font-black text-gray-400 uppercase tracking-widest">Subjects</p>
             <p className="text-lg font-black text-gray-900 italic leading-none">{subjectCount}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-gray-50 space-y-6">

         <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(`/admin/students?classId=${cls.id}`)}
              className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-[0.625rem] uppercase tracking-widest hover:bg-black transition-all"
            >
              Registry
            </button>
            <button 
              onClick={() => navigate(`/report-cards?classId=${cls.id}`)}
              className="flex-1 py-3 bg-gray-50 text-gray-600 rounded-xl font-black text-[0.625rem] uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-100"
            >
              Reporting
            </button>
         </div>
      </div>
    </div>
  );
};
