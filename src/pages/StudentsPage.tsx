import React, { useState, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Plus, 
  Search, 
  Filter as FilterIcon, 
  UserPlus, 
  Users, 
  LayoutGrid, 
  Download,
  FileSpreadsheet,
  AlertTriangle,
  Upload,
  Mail,
  Move,
  Lock,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { db, type IStudent, type IClass } from '../db/db';
import { PageHeader } from '../components/ui/PageHeader';
import { StudentTable } from '../components/students/StudentTable';
import { StudentModal } from '../components/students/StudentModal';
import { BulkStudentImportModal } from '../components/students/BulkStudentImportModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useScopedDb } from '../hooks/useScopedDb';
import { useLocation, useNavigate } from 'react-router-dom';

export const StudentsPage: React.FC = () => {
  const { user } = useAuth();
  const { schoolId } = useScopedDb();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const { canManageRegistry } = usePermissions();

  React.useEffect(() => {
    if (user?.role === 'student') {
      navigate('/student-portal', { replace: true });
    }
  }, [user, navigate]);

  React.useEffect(() => {
    const fixOrphanedRecords = async () => {
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
  }, [schoolId, showToast]);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const classIdParam = searchParams.get('classId');
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<number | 'all'>('all');

  React.useEffect(() => {
    if (classIdParam && !isNaN(Number(classIdParam))) {
      setSelectedClassId(Number(classIdParam));
    }
  }, [classIdParam]);

  React.useEffect(() => {
    if (location.state?.searchTerm) {
      setSearchTerm(location.state.searchTerm);
      navigate(location.pathname, { replace: true, state: { ...location.state, searchTerm: undefined } });
    }
  }, [location.state, navigate]);

  React.useEffect(() => {
    if (location.state?.addStudent) {
      setIsModalOpen(true);
      // clean up state after opening so it doesn't pop up again
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive' | 'Graduated' | 'Suspended'>('All');
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<IStudent | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<number | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Data
  const classes = useLiveQuery(() => schoolId ? db.classes.where('schoolId').equals(schoolId).toArray() : []) || [];
  const attendance = useLiveQuery(() => schoolId ? db.attendance.where('schoolId').equals(schoolId).toArray() : []) || [];
  const allStudents = useLiveQuery(() => schoolId ? db.students.where('schoolId').equals(schoolId).toArray() : []) || [];
  const teacherSubjects = useLiveQuery(async () => {
    if (user?.role === 'teacher') {
      const all = await db.subjects.toArray();
      return all.filter(s => s.teacherId === Number(user.id) || s.assistantTeacherIds?.includes(Number(user.id)));
    }
    return [];
  }) || [];
  const teacherClasses = classes.filter(c => c.teacherId === Number(user?.id) || c.teacherName === user?.fullName);
  const canAddStudent = canManageRegistry || (user?.role === 'teacher' && teacherClasses.length > 0);

  const authorizedStudents = useMemo(() => {
    return allStudents.filter(s => {
      // Teacher authorization filter
      if (user?.role === 'teacher' && !user?.isAdmin) {
        // Teacher is authorized if they are the class teacher for this student
        const isClassTeacher = teacherClasses.some(c => c.id === s.classId);
        if (isClassTeacher) return true;
        
        const studentClass = classes.find(c => c.id === s.classId);
        if (studentClass) {
          return teacherSubjects.some(sub => {
            if (sub.classIds && sub.classIds.length > 0) {
              return sub.classIds.includes(s.classId);
            }
            if (sub.classId !== undefined && sub.classId !== null) {
              return sub.classId === s.classId;
            }
            if (sub.isCore) {
              return sub.coreLevels?.includes(studentClass.level);
            }
            if (sub.departmentIds && sub.departmentIds.length > 0) {
              return s.departmentId && sub.departmentIds.includes(s.departmentId);
            }
            return false;
          });
        }
        return false;
      }
      return true;
    });
  }, [allStudents, user, teacherSubjects, teacherClasses, classes]);

  const filteredStudents = useMemo(() => {
    return authorizedStudents.filter(s => {
      const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.parentPhone?.includes(searchTerm);
      const matchClass = selectedClassId === 'all' || s.classId === selectedClassId;
      const matchStatus = statusFilter === 'All' || s.status === statusFilter;
      const matchGender = genderFilter === 'All' || s.gender === genderFilter;
      
      return matchSearch && matchClass && matchStatus && matchGender;
    });
  }, [authorizedStudents, searchTerm, selectedClassId, statusFilter, genderFilter]);

  const allowedClasses = useMemo(() => {
    if (user?.role !== 'teacher' || user?.isAdmin) return classes;
    const ids = new Set(authorizedStudents.map(s => s.classId));
    return classes.filter(c => ids.has(c.id!));
  }, [classes, authorizedStudents, user]);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredStudents.slice(start, start + rowsPerPage);
  }, [filteredStudents, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredStudents.length / rowsPerPage);

  // Handlers
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedStudents.map(s => s.id!));
    }
  };

  const handleDelete = async () => {
    if (!studentToDelete) return;
    try {
      await db.students.delete(studentToDelete);
      showToast('Student record removed', 'success');
      setStudentToDelete(null);
    } catch (error) {
      showToast('Failed to delete student', 'error');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await db.students.bulkDelete(selectedIds);
      showToast(`${selectedIds.length} records dismantled`, 'success');
      setSelectedIds([]);
      setIsBulkDeleteOpen(false);
    } catch (error) {
      showToast('Bulk operation failed', 'error');
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedClassId('all');
    setStatusFilter('All');
    setGenderFilter('All');
  };

  if (allStudents === undefined) return <div className="h-[60vh] flex items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="fixed top-0 left-0 right-0 z-[60] bg-slate-900 shadow-2xl"
          >
            <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white font-black italic">
                   {selectedIds.length}
                 </div>
                 <p className="text-white text-sm font-black uppercase tracking-widest italic">Students Selected for Protocol</p>
              </div>
              <div className="flex items-center gap-2">
                 <BulkButton icon={Mail} label="Send SMS" onClick={() => {}} />
                 <BulkButton icon={Move} label="Move Class" onClick={() => {}} />
                 <BulkButton icon={Lock} label="Deactivate" onClick={() => {}} />
                 <div className="h-8 w-px bg-white/10 mx-2" />
                 <BulkButton icon={Trash2} label="Dismantle" variant="danger" onClick={() => setIsBulkDeleteOpen(true)} />
                 <button onClick={() => setSelectedIds([])} className="p-2 text-white/40 hover:text-white transition-colors ml-4">
                   <X size={20} />
                 </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={isMobile ? {
          paddingTop: '10px',
          paddingLeft: '10px',
          paddingBottom: '10px',
          paddingRight: '10px',
          marginTop: '-10px',
          marginBottom: '10px'
        } : undefined}
      >
        <PageHeader 
          title="Students" 
          subtitle="Manage all student records across your institutional academic registry." 
          icon={Users}
          titleStyle={isMobile ? { fontSize: '23px' } : undefined}
          iconStyle={isMobile ? { textAlign: 'center' } : undefined}
          metaSpans={isMobile ? [
            { text: 'Academic Registry', style: { width: '93.359px', fontSize: '8px' } },
            { text: 'Active Profiles', style: { fontSize: '8px', width: '56.625px', height: '25.3281px' } },
            { text: 'Secured', style: { fontSize: '6px', width: '55.4688px', height: '19.3281px' } }
          ] : undefined}
        />
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2.5 md:gap-4 items-center w-full sm:w-auto">
            {canAddStudent && (
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
                   setEditingStudent(null);
                   setIsModalOpen(true);
                 }}
                 className="px-3.5 py-2.5 md:px-6 md:py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-black text-[0.55rem] md:text-[0.625rem] uppercase tracking-wider md:tracking-widest hover:bg-black dark:hover:bg-white dark:hover:text-slate-900 transition-all shadow-xl shadow-slate-900/20 dark:shadow-none flex items-center justify-center gap-1.5 w-full sm:w-auto"
               >
                  <Plus className="w-4 h-4 md:w-4 md:h-4 shrink-0" />
                  Add Student
               </button>
             </>
           )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col xl:flex-row items-center gap-4 overflow-hidden relative">
        <div className="flex-1 relative w-full">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
           <input 
             type="text"
             placeholder="Search by name, student ID, or parent linkage..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full pl-11 pr-4 h-12 bg-gray-50 border-transparent rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all font-bold text-sm"
           />
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
           <FilterSelect 
             value={selectedClassId} 
             onChange={(v) => setSelectedClassId(v === 'all' ? 'all' : Number(v))}
             options={[{ label: 'All Classes', value: 'all' }, ...allowedClasses.map(c => ({ label: c.className, value: String(c.id) }))]}
           />
           <FilterSelect 
             value={statusFilter} 
             onChange={(v) => setStatusFilter(v as any)}
             options={['All', 'Active', 'Inactive', 'Graduated', 'Suspended'].map(s => ({ label: s, value: s }))}
           />
           <FilterSelect 
             value={genderFilter} 
             onChange={(v) => setGenderFilter(v as any)}
             options={['All', 'Male', 'Female'].map(g => ({ label: g, value: g }))}
           />
           
           <button className="p-3 bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-400 rounded-xl hover:text-slate-900 dark:hover:bg-white dark:hover:text-slate-900 transition-colors">
              <SlidersHorizontal size={18} />
           </button>

           <AnimatePresence>
             {(searchTerm || selectedClassId !== 'all' || statusFilter !== 'All' || genderFilter !== 'All') && (
               <motion.button 
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.9 }}
                 onClick={resetFilters}
                 className="flex items-center gap-2 px-4 py-3 text-rose-500 font-bold text-[0.625rem] uppercase tracking-widest hover:bg-rose-50 rounded-xl transition-all"
               >
                 <RotateCcw size={14} /> Reset
               </motion.button>
             )}
           </AnimatePresence>
        </div>
      </div>

      {/* Table Section */}
      <div className="space-y-6">
        <StudentTable 
          students={paginatedStudents}
          classes={classes}
          attendance={attendance}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onEdit={(s) => {
            setEditingStudent(s);
            setIsModalOpen(true);
          }}
          onDelete={setStudentToDelete}
        />

        {/* Pagination Footer */}
        <div className="bg-white px-8 py-6 rounded-[2rem] border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
           <p className="text-[0.6875rem] font-black text-gray-400 uppercase tracking-widest italic">
             Showing {filteredStudents.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} – {Math.min(currentPage * rowsPerPage, filteredStudents.length)} <span className="mx-1 text-gray-200">/</span> {filteredStudents.length} Students
           </p>

           <div className="flex items-center gap-2">
             <button 
               disabled={currentPage === 1}
               onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
               className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-slate-900 hover:text-white disabled:opacity-30 transition-all border border-gray-100"
             >
               <ChevronLeft size={18} />
             </button>
             
             <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button 
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${currentPage === pageNum ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10' : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 5 && <span className="mx-2 text-gray-300">...</span>}
             </div>

             <button 
               disabled={currentPage === totalPages}
               onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
               className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-slate-900 hover:text-white disabled:opacity-30 transition-all border border-gray-100"
             >
               <ChevronRight size={18} />
             </button>
           </div>

           <div className="flex items-center gap-3">
              <span className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest italic">Registry Load</span>
              <select 
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-10 px-4 bg-gray-50 border-transparent rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none font-black text-[0.625rem] uppercase tracking-widest text-gray-600 appearance-none pr-8 relative"
              >
                 {[10, 25, 50, 100].map(v => <option key={v} value={v}>{v} Profiles</option>)}
              </select>
           </div>
        </div>
      </div>

      {/* Modals */}
      <StudentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingStudent={editingStudent}
        classes={classes}
      />

      <BulkStudentImportModal 
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
      />

      <ConfirmDialog 
        isOpen={!!studentToDelete}
        title="Dismantle Student Record?"
        message="This operation will remove the student identity and all associated academic lineage. This cannot be reversed."
        onConfirm={handleDelete}
        onClose={() => setStudentToDelete(null)}
      />

      <ConfirmDialog 
        isOpen={isBulkDeleteOpen}
        title="Bulk Dismantle Protocol"
        message={`Are you absolutely certain you want to remove ${selectedIds.length} student records from the institutional registry?`}
        onConfirm={handleBulkDelete}
        onClose={() => setIsBulkDeleteOpen(false)}
      />
    </div>
  );
};

const BulkButton: React.FC<{ icon: any, label: string, variant?: 'normal' | 'danger', onClick: () => void }> = ({ icon: Icon, label, variant = 'normal', onClick }) => (
  <button 
    onClick={onClick}
    className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all group ${variant === 'danger' ? 'text-rose-400 hover:bg-rose-500/10' : 'text-white/70 hover:bg-white/10'}`}
  >
    <Icon size={16} className="group-hover:scale-110 transition-transform" />
    <span className="text-[0.625rem] font-black uppercase tracking-widest italic">{label}</span>
  </button>
);

const FilterSelect: React.FC<{ value: any, onChange: (v: string) => void, options: { label: string, value: string }[] }> = ({ value, onChange, options }) => (
  <div className="relative group min-w-[140px]">
     <select 
       value={value}
       onChange={(e) => onChange(e.target.value)}
       className="w-full h-12 pl-4 pr-10 bg-gray-50 border-transparent rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none appearance-none transition-all font-bold text-[0.625rem] uppercase tracking-[0.15em] text-gray-500 italic"
     >
       {options.map(opt => (
         <option key={opt.value} value={opt.value}>{opt.label}</option>
       ))}
     </select>
     <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none group-focus-within:text-blue-500 transition-colors" size={14} />
  </div>
);

const StatCard: React.FC<{ icon: any, label: string, value: number, subLabel?: string }> = ({ icon: Icon, label, value, subLabel }) => (
  <div className="bg-white p-5 rounded-md border border-slate-200 shadow-card flex items-center gap-5 transition-all hover:border-slate-300">
    <div className="w-12 h-12 bg-slate-50 rounded-md flex items-center justify-center shrink-0 text-slate-700">
      <Icon size={24} />
    </div>
    <div className="space-y-1">
      <p className="text-[0.6875rem] font-bold text-slate-400 uppercase tracking-wider leading-none">{label}</p>
      <p className="text-2xl font-bold text-slate-800 tracking-tight leading-none">{value}</p>
      {subLabel && <p className="text-[0.625rem] text-slate-400 font-medium">{subLabel}</p>}
    </div>
  </div>
);
