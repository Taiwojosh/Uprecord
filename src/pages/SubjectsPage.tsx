import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { 
  ClipboardList, 
  Plus, 
  BookOpen, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle2,
  Filter,
  User,
  GraduationCap,
  Check,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, type ISubject } from '../db/db';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../hooks/useSettings';
import { useAudit } from '../hooks/useAudit';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Spinner } from '../components/ui/Spinner';

export const SubjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { settings, isLoading: settingsLoading } = useSettings();
  const { logAction } = useAudit();

  React.useEffect(() => {
    if (location.state?.addSubject) {
      setEditingItem(null);
      setIsModalOpen(true);
      // Clean up location state after trigger
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);
  
  const subjects = useLiveQuery(async () => {
    if (!user?.schoolId) return [];
    const all = await db.subjects.where('schoolId').equals(user.schoolId).toArray();
    if (user?.role === 'teacher' && !user?.isAdmin) {
      const teacherId = Number(user.id);
      return all.filter(s => s.teacherId === teacherId || s.assistantTeacherIds?.includes(teacherId));
    }
    return all;
  }, [user]) ?? [];
  
  const teachers = useLiveQuery(async () => {
    if (!user?.schoolId) return [];
    return await db.users.where('schoolId').equals(user.schoolId).and(u => u.role === 'teacher').toArray();
  }, [user?.schoolId]) ?? [];

  const classes = useLiveQuery(async () => {
    if (!user?.schoolId) return [];
    return await db.classes.where('schoolId').equals(user.schoolId).toArray();
  }, [user?.schoolId]) ?? [];
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSeedModalOpen, setIsSeedModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ISubject | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'core' | 'elective'>('all');
  const [filterLevel, setFilterLevel] = useState<'all' | 'Primary' | 'junior' | 'senior'>('all');
  const [expandedSubjectIds, setExpandedSubjectIds] = useState<number[]>([]);

  const toggleExpandSubject = (id: number) => {
    setExpandedSubjectIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const item = await db.subjects.get(confirmDelete);
      await db.subjects.delete(confirmDelete);
      logAction('DELETE_SUBJECT', `Deleted subject: ${item?.subjectName}`);
      showToast('Subject deleted successfully', 'success');
    } catch (e) {
      showToast('Failed to delete subject', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = s.subjectName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || (filterType === 'core' ? s.isCore : !s.isCore);
    
    // Find levels of assigned classes for this subject
    const assignedClasses = classes.filter(c => s.classIds?.includes(c.id!) || s.classId === c.id);
    const assignedLevels = assignedClasses.map(c => c.level);
    
    const matchesLevel = filterLevel === 'all' || 
                         s.coreLevels?.includes(filterLevel as any) ||
                         assignedLevels.includes(filterLevel as any);
    return matchesSearch && matchesType && matchesLevel;
  });

  if (settingsLoading) return <Spinner size="lg" />;

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Subjects" 
          subtitle="Define academic subjects, assign specialists, and manage school curriculum" 
        />
        {user?.role !== 'teacher' && (
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2.5 md:gap-4 items-center w-full sm:w-auto">
            <button 
              type="button"
              onClick={() => setIsSeedModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 md:px-5 md:py-3 bg-blue-50 text-blue-700 text-[0.55rem] md:text-[0.625rem] font-black uppercase tracking-wider md:tracking-widest rounded-xl md:rounded-2xl hover:bg-blue-100 border border-blue-200 transition-all shadow-sm w-full sm:w-auto"
            >
              <ClipboardList className="w-4 h-4 md:w-[18px] md:h-[18px]" />
              Add Sample Subjects
            </button>
            <button 
              type="button"
              onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 md:px-6 md:py-3 bg-slate-900 text-white text-[0.55rem] md:text-[0.625rem] font-black uppercase tracking-wider md:tracking-widest rounded-xl md:rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-200/50 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 md:w-[18px] md:h-[18px]" />
              Register Subject
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end lg:items-center">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search curricula by subject name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-sm text-gray-900 shadow-sm"
          />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="flex-1 md:w-40 space-y-1">
            <span className="text-[0.5rem] md:text-[0.5625rem] font-black text-gray-400 uppercase tracking-widest px-1">Curriculum Type</span>
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-white border border-gray-100 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Types</option>
              <option value="core">Core Program</option>
              <option value="elective">Elective</option>
            </select>
          </div>
          <div className="flex-1 md:w-40 space-y-1">
            <span className="text-[0.5rem] md:text-[0.5625rem] font-black text-gray-400 uppercase tracking-widest px-1">Academic Level</span>
            <select 
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-white border border-gray-100 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Levels</option>
              <option value="Primary">Primary</option>
              <option value="junior">Junior Sec</option>
              <option value="senior">Senior Sec</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <p className="text-[0.625rem] md:text-xs font-bold text-slate-400 italic">
          Showing {filteredSubjects.length} {filteredSubjects.length === 1 ? 'subject' : 'subjects'}
        </p>
        {filteredSubjects.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const allIds = filteredSubjects.map(s => s.id!).filter(Boolean);
              const isAllExpanded = expandedSubjectIds.length === allIds.length;
              setExpandedSubjectIds(isAllExpanded ? [] : allIds);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-[10px] md:text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors shadow-sm select-none active:scale-[0.98]"
          >
            {expandedSubjectIds.length === filteredSubjects.length ? 'Collapse All' : 'Expand All'}
          </button>
        )}
      </div>

      <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
        {filteredSubjects.length === 0 ? (
          <div className="p-12 md:p-24 text-center space-y-6">
             <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-50 text-blue-600 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8 md:w-10 md:h-10" />
             </div>
             <div className="max-w-xs mx-auto">
                <h3 className="text-lg md:text-xl font-black text-gray-900 uppercase italic">Empty Registry</h3>
                <p className="text-gray-400 text-xs md:text-sm font-medium">No subjects found matching your criteria. Start by registering the school curriculum.</p>
             </div>
          </div>
        ) : (
          <>
            {/* Desktop view */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest font-sans">Subject Protocol</th>
                    <th className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest font-sans">Assigned Class(es)</th>
                    <th className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest font-sans">Assigned Specialist</th>
                    <th className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest text-right font-sans">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredSubjects.map(sub => {
                    const teacher = teachers.find(t => t.id === sub.teacherId);
                    return (
                      <tr key={sub.id} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <div>
                            <p className="text-sm font-black text-gray-900 uppercase italic tracking-tight">{sub.subjectName}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {sub.departmentIds.map(id => (
                                <span key={id} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[0.5rem] font-black uppercase rounded tracking-tighter">
                                  {settings?.[`department${id}Name`]}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-wrap gap-1 pb-1">
                            {(() => {
                              const subClasses = classes.filter(c => sub.classIds?.includes(c.id!) || sub.classId === c.id);
                              if (subClasses.length > 0) {
                                return subClasses.map(c => (
                                  <span key={c.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[0.55rem] font-black uppercase rounded shadow-sm">
                                    {c.className}
                                  </span>
                                ));
                              }
                              // Fallback to core level lists
                              if (sub.isCore) {
                                return (
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[0.5rem] font-black uppercase rounded border border-emerald-100">
                                      All ({sub.coreLevels?.join(', ')})
                                    </span>
                                  </div>
                                );
                              }
                              return <span className="text-[0.625rem] font-bold text-gray-400 uppercase italic">All Classes</span>;
                            })()}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-2">
                            {teacher ? (
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center text-[0.625rem] font-black italic">
                                  {teacher.fullName[0]}
                                </div>
                                <div>
                                   <p className="text-xs font-black text-gray-900">{teacher.fullName}</p>
                                   <p className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest">Faculty Specialist</p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-rose-300">
                                 <GraduationCap size={16} />
                                 <span className="text-[0.625rem] font-black uppercase tracking-widest italic">Unassigned</span>
                              </div>
                            )}
                            {(sub.assistantTeacherIds || []).length > 0 && (
                              <div className="flex -space-x-2">
                                {sub.assistantTeacherIds!.map(id => {
                                  const t = teachers.find(x => x.id === id);
                                  if (!t) return null;
                                  return (
                                    <div key={id} title={`Assistant: ${t.fullName}`} className="w-6 h-6 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-[0.5rem] font-black border-2 border-white relative z-10 hover:z-20">
                                      {t.fullName[0]}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-3 transition-opacity">
                            <button 
                              onClick={() => navigate('/lesson-planner', { state: { defaultTab: 'sow' } })}
                              className="p-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm group/btn border border-slate-200"
                              title="Scheme of Work"
                            >
                              <BookOpen size={14} />
                            </button>
                            {user?.role !== 'teacher' && (
                              <>
                                <button 
                                  onClick={() => { setEditingItem(sub); setIsModalOpen(true); }}
                                  className="p-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm group/btn border border-slate-200"
                                  title="Edit Subject"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  onClick={() => setConfirmDelete(sub.id!)}
                                  className="p-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm group/btn border border-slate-200"
                                  title="Delete Subject"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile view - List/Card Layout with dropdown expand arrow */}
            <div className="block md:hidden divide-y divide-gray-100/70">
              {filteredSubjects.map(sub => {
                const teacher = teachers.find(t => t.id === sub.teacherId);
                const isExpanded = expandedSubjectIds.includes(sub.id!);
                const subClasses = classes.filter(c => sub.classIds?.includes(c.id!) || sub.classId === c.id);
                return (
                  <div key={sub.id} className="p-4 transition-colors">
                     {/* Subject summary Row */}
                     <div className="flex items-center justify-between gap-3">
                       <div className="min-w-0 flex-1">
                         <p className="text-sm font-black text-gray-900 uppercase italic tracking-tight truncate">{sub.subjectName}</p>
                         <div className="flex flex-wrap gap-1 mt-1">
                           {sub.departmentIds.map(id => (
                             <span key={id} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[0.5rem] font-black uppercase rounded tracking-tighter shrink-0 leading-none">
                               {settings?.[`department${id}Name`]}
                             </span>
                           ))}
                         </div>
                       </div>
                       <div className="flex items-center gap-2 shrink-0">
                         {/* Dropdown Expand Chevron */}
                         <button
                           onClick={() => toggleExpandSubject(sub.id!)}
                           className="p-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-500 hover:text-slate-900 hover:bg-gray-100 transition-all flex items-center justify-center shadow-sm"
                           title={isExpanded ? "Collapse Details" : "Expand Details"}
                         >
                           {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={14} />}
                         </button>
                       </div>
                     </div>

                     {/* Expandable Details Row */}
                     {isExpanded && (
                        <div className="mt-3 p-3 bg-gray-50/70 border border-gray-100/50 rounded-2xl space-y-3.5 text-xs animate-in slide-in-from-top-2 duration-200">
                          <div className="grid grid-cols-2 gap-3.5">
                            <div>
                              <p className="text-[0.55rem] font-black text-gray-400 uppercase tracking-widest leading-none">Specialist</p>
                              <p className="font-bold text-gray-800 text-xs mt-1 tracking-tight truncate">
                                {teacher ? teacher.fullName : 'Unassigned'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[0.55rem] font-black text-gray-400 uppercase tracking-widest leading-none font-sans">Assistants</p>
                              <div className="mt-1 flex -space-x-1.5 overflow-hidden">
                                {(sub.assistantTeacherIds || []).length > 0 ? (
                                  sub.assistantTeacherIds!.map(id => {
                                    const t = teachers.find(x => x.id === id);
                                    if (!t) return null;
                                    return (
                                      <div key={id} title={`Assistant: ${t.fullName}`} className="w-5 h-5 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-[0.45rem] font-black border-2 border-white relative z-10 hover:z-20 shrink-0">
                                        {t.fullName[0]}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <span className="text-[0.55rem] font-bold text-gray-400 uppercase italic leading-none">None</span>
                                )}
                              </div>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[0.55rem] font-black text-gray-400 uppercase tracking-widest leading-none mb-1 font-sans">Assigned Classes</p>
                              <div className="flex flex-wrap gap-1 leading-none">
                                {subClasses.length > 0 ? (
                                  subClasses.map(c => (
                                    <span key={c.id} className="inline-flex items-center px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[0.5rem] font-black uppercase rounded shadow-sm">
                                      {c.className}
                                    </span>
                                  ))
                                ) : sub.isCore ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[0.5rem] font-black uppercase rounded border border-emerald-100">
                                    All ({sub.coreLevels?.join(', ')})
                                  </span>
                                ) : (
                                  <span className="text-[0.55rem] font-bold text-gray-400 uppercase italic">All Classes</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action buttons list inside details space to prevent mistakes */}
                          <div className="pt-2.5 border-t border-gray-150/60 flex flex-wrap gap-1.5">
                            <button
                              onClick={() => navigate('/lesson-planner', { state: { defaultTab: 'sow' } })}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-200 text-[9px] font-black uppercase tracking-wider transition-all"
                            >
                              <BookOpen size={11} />
                              Scheme
                            </button>
                            {user?.role !== 'teacher' && (
                              <>
                                <button
                                  onClick={() => { setEditingItem(sub); setIsModalOpen(true); }}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-200 text-[9px] font-black uppercase tracking-wider transition-all"
                                >
                                  <Edit2 size={11} />
                                  Edit
                                </button>
                                <button
                                  onClick={() => setConfirmDelete(sub.id!)}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-150 rounded-xl transition-all font-black text-[9px] uppercase tracking-wider ml-auto"
                                >
                                  <Trash2 size={11} />
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                     )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <SubjectModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingItem={editingItem}
        settings={settings}
        teachers={teachers}
        classes={classes}
      />

      <SeedSubjectsModal
        isOpen={isSeedModalOpen}
        onClose={() => setIsSeedModalOpen(false)}
        subjects={subjects}
      />

      <ConfirmDialog 
        isOpen={!!confirmDelete}
        title="Delete Subject Protocol"
        message="Are you sure you want to remove this subject from the registry? This will disconnect it from all assigned teachers and grades."
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
};

const SubjectModal: React.FC<{ 
  isOpen: boolean, 
  onClose: () => void, 
  editingItem: ISubject | null, 
  settings: any,
  teachers: any[],
  classes: any[]
}> = ({ isOpen, onClose, editingItem, settings, teachers, classes }) => {
  const [formData, setFormData] = useState<Partial<ISubject>>({
    subjectName: '',
    isCore: true,
    coreLevels: ['Primary', 'junior', 'senior'],
    departmentIds: [],
    teacherId: null,
    classId: undefined,
    classIds: [],
    assistantTeacherIds: []
  });
  const { showToast } = useToast();
  const { logAction } = useAudit();
  const { user } = useAuth();

  React.useEffect(() => {
    if (editingItem) {
      setFormData({ 
        ...editingItem, 
        assistantTeacherIds: editingItem.assistantTeacherIds || [],
        classIds: editingItem.classIds || (editingItem.classId ? [editingItem.classId] : [])
      });
    } else {
      setFormData({ 
        subjectName: '', 
        isCore: true, 
        coreLevels: ['Primary', 'junior', 'senior'], 
        departmentIds: [], 
        teacherId: null, 
        classId: undefined, 
        classIds: [],
        assistantTeacherIds: [] 
      });
    }
  }, [editingItem, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUser = user;
    try {
      if (editingItem?.id) {
        await db.subjects.update(editingItem.id, formData);
        logAction('UPDATE_SUBJECT', `Updated subject protocol: ${formData.subjectName}`);
        showToast('Subject updated successfully', 'success');
      } else {
        await db.subjects.add({ ...(formData as ISubject), schoolId: currentUser?.schoolId || '' });
        logAction('ADD_SUBJECT', `Registered new subject: ${formData.subjectName}`);
        showToast('Subject registered successfully', 'success');
      }
      onClose();
    } catch (error) {
      showToast('Failed to save subject protocol', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingItem ? 'Edit Subject Registry' : 'Register New Subject'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[0.625rem] font-black text-gray-500 uppercase tracking-widest ml-1">Subject Title</label>
          <input 
            required
            type="text" 
            value={formData.subjectName}
            onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
            placeholder="e.g. Mathematics"
            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-gray-900 uppercase italic text-sm animate-fade-in"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between ml-1">
            <label className="text-[0.625rem] font-black text-gray-500 uppercase tracking-widest">Assign to Class(es)</label>
            {classes.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const allClassIds = classes.map(c => c.id!);
                  const currentIds = formData.classIds || (formData.classId ? [formData.classId] : []);
                  const isAllSelected = allClassIds.every(id => currentIds.includes(id));
                  setFormData({
                    ...formData,
                    classIds: isAllSelected ? [] : allClassIds,
                    classId: undefined
                  });
                }}
                className="text-[0.5625rem] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest select-none cursor-pointer hover:underline transition-all"
              >
                {classes.every(c => (formData.classIds || (formData.classId ? [formData.classId] : [])).includes(c.id!)) ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-3 bg-gray-50 border border-gray-100 rounded-2xl">
            {classes.map(cls => {
              const isSelected = formData.classIds?.includes(cls.id!) || formData.classId === cls.id;
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => {
                    const currentIds = formData.classIds || (formData.classId ? [formData.classId] : []);
                    let nextIds: number[];
                    if (currentIds.includes(cls.id!)) {
                      nextIds = currentIds.filter(id => id !== cls.id);
                    } else {
                      nextIds = [...currentIds, cls.id!];
                    }
                    setFormData({ ...formData, classIds: nextIds, classId: undefined });
                  }}
                  className={`px-3 py-2 rounded-xl text-[0.5625rem] font-black uppercase tracking-widest transition-all border-2 ${
                    isSelected
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                      : 'bg-white border-transparent text-gray-400 hover:border-gray-200 hover:text-gray-600 shadow-sm'
                  }`}
                >
                  {cls.className}
                </button>
              );
            })}
            {classes.length === 0 && (
              <p className="text-[0.5625rem] text-gray-400 p-2 italic w-full text-center">No classes available</p>
            )}
          </div>
          <p className="text-[0.5625rem] font-bold text-gray-400 italic mt-1 uppercase tracking-tighter">
            * Select all classes participating in this subject.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-[0.625rem] font-black text-gray-500 uppercase tracking-widest ml-1">Department</label>
          <div className="max-h-32 overflow-y-auto w-full bg-gray-50 border border-gray-100 rounded-2xl p-3 flex flex-wrap gap-2">
            {[1, 2, 3].map(id => {
              const name = settings?.[`department${id}Name`];
              if (!name) return null;
              const isSelected = formData.departmentIds?.includes(id);
              return (
                <button 
                  key={id}
                  type="button"
                  onClick={() => {
                    const current = formData.departmentIds || [];
                    if (current.includes(id)) {
                      setFormData({ ...formData, departmentIds: current.filter(d => d !== id) });
                    } else {
                      setFormData({ ...formData, departmentIds: [...current, id] });
                    }
                  }}
                  className={`px-3 py-2 rounded-xl text-[0.5625rem] font-black uppercase tracking-widest transition-all border-2 ${
                    isSelected 
                      ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-sm' 
                      : 'bg-white border-transparent text-gray-400 hover:border-blue-200 hover:text-gray-600 shadow-sm'
                  }`}
                >
                  {name}
                </button>
              );
            })}
            {!settings?.department1Name && !settings?.department2Name && !settings?.department3Name && (
              <p className="text-[0.5625rem] text-gray-400 p-2 italic w-full text-center animate-pulse">No departments configured in settings</p>
            )}
          </div>
          <p className="text-[0.5625rem] font-bold text-gray-400 italic mt-1 uppercase tracking-tighter">
            * Assignments restrict subjects to selected departments (optional)
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-[0.625rem] font-black text-gray-500 uppercase tracking-widest ml-1">Subject Specialist</label>
          <select 
            value={formData.teacherId || ''}
            onChange={(e) => {
               const newTeacherId = e.target.value ? Number(e.target.value) : null;
               const newAssistants = (formData.assistantTeacherIds || []).filter(id => id !== newTeacherId);
               setFormData({ ...formData, teacherId: newTeacherId, assistantTeacherIds: newAssistants });
            }}
            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-gray-900 uppercase text-xs"
          >
            <option value="">No Assignment...</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>{t.fullName}</option>
            ))}
          </select>
          <p className="text-[0.5625rem] font-bold text-blue-400 italic mt-1 uppercase tracking-tighter">
            * Designated specialist manages scores in their faculty account
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-[0.625rem] font-black text-gray-500 uppercase tracking-widest ml-1">Assistant Specialists</label>
          <div className="max-h-32 overflow-y-auto w-full bg-gray-50 border border-gray-100 rounded-2xl p-3 flex flex-wrap gap-2">
            {teachers.filter(t => t.id !== formData.teacherId).map(t => (
              <button 
                type="button" 
                key={t.id} 
                onClick={() => {
                   const current = formData.assistantTeacherIds || [];
                   if (current.includes(t.id)) {
                     setFormData({ ...formData, assistantTeacherIds: current.filter(id => id !== t.id) });
                   } else {
                     setFormData({ ...formData, assistantTeacherIds: [...current, t.id] });
                   }
                }}
                className={`px-3 py-2 rounded-xl text-[0.5625rem] font-black uppercase tracking-widest transition-all border-2 ${
                  formData.assistantTeacherIds?.includes(t.id) 
                    ? 'bg-blue-100 border-blue-600 text-blue-900 shadow-sm' 
                    : 'bg-white border-transparent text-gray-400 hover:border-gray-200 hover:text-gray-600 shadow-sm'
                }`}
              >
                {t.fullName}
              </button>
            ))}
            {teachers.filter(t => t.id !== formData.teacherId).length === 0 && (
              <p className="text-[0.5625rem] text-gray-400 p-2 italic w-full text-center">No other teachers available</p>
            )}
          </div>
          <p className="text-[0.5625rem] font-bold text-blue-400 italic mt-1 uppercase tracking-tighter">
            * Collaborators can co-manage grades and lesson plans
          </p>
        </div>

        <button type="submit" className="w-full py-5 bg-slate-900 hover:bg-black text-white font-black rounded-3xl transition-all uppercase tracking-[0.2em] italic text-xs shadow-xl shadow-gray-200">
          {editingItem ? 'Update Registry' : 'Complete Registration'}
        </button>
      </form>
    </Modal>
  );
};

interface SeedSubjectTemplate {
  subjectName: string;
  isCore: boolean;
  coreLevels?: ('Primary' | 'junior' | 'senior' | 'Secondary')[];
  departmentIds: number[];
}

const SEED_CATEGORIES: {
  id: string;
  title: string;
  description: string;
  subjects: SeedSubjectTemplate[];
}[] = [
  {
    id: 'primary',
    title: 'Primary School Foundations',
    description: 'Basic academic core optimized for elementary children',
    subjects: [
      { subjectName: 'English Language', isCore: true, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [] },
      { subjectName: 'Mathematics', isCore: true, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [] },
      { subjectName: 'Basic Science', isCore: true, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [] },
      { subjectName: 'Social Studies', isCore: true, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [] },
      { subjectName: 'Agricultural Science', isCore: true, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [] },
      { subjectName: 'Quantitative Reasoning', isCore: true, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [] },
      { subjectName: 'Verbal Reasoning', isCore: true, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [] },
      { subjectName: 'Home Economics', isCore: false, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [] },
      { subjectName: 'Civic Education', isCore: true, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [] },
      { subjectName: 'Cultural & Creative Arts', isCore: false, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [] },
      { subjectName: 'Handwriting & Phonics', isCore: false, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [] }
    ]
  },
  {
    id: 'junior',
    title: 'Junior Secondary Foundation',
    description: 'General core and vocational courses for junior secondary (grades 7-9)',
    subjects: [
      { subjectName: 'Mathematics', isCore: true, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [] },
      { subjectName: 'English Language', isCore: true, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [] },
      { subjectName: 'Basic Science', isCore: true, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [] },
      { subjectName: 'Basic Technology', isCore: true, coreLevels: ['junior', 'senior'], departmentIds: [] },
      { subjectName: 'Social Studies', isCore: true, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [] },
      { subjectName: 'Civic Education', isCore: true, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [] },
      { subjectName: 'Agricultural Science', isCore: true, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [] },
      { subjectName: 'Business Studies', isCore: true, coreLevels: ['junior', 'senior'], departmentIds: [] },
      { subjectName: 'Cultural & Creative Arts', isCore: false, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [] },
      { subjectName: 'Home Economics', isCore: false, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [] },
      { subjectName: 'Computer Studies / ICT', isCore: true, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [] },
      { subjectName: 'History', isCore: false, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [] }
    ]
  },
  {
    id: 'senior_core',
    title: 'Senior Core Program',
    description: 'Mandatory general subjects required for all senior departments',
    subjects: [
      { subjectName: 'English Language', isCore: true, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [] },
      { subjectName: 'Mathematics', isCore: true, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [] },
      { subjectName: 'Civic Education', isCore: true, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [] },
      { subjectName: 'Computer Studies / ICT', isCore: true, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [] }
    ]
  },
  {
    id: 'senior_science',
    title: 'Senior Science & Maths (STEM)',
    description: 'Departmental subjects for Science & Technical scopes',
    subjects: [
      { subjectName: 'Physics', isCore: false, coreLevels: ['senior'], departmentIds: [3] },
      { subjectName: 'Chemistry', isCore: false, coreLevels: ['senior'], departmentIds: [3] },
      { subjectName: 'Biology', isCore: false, coreLevels: ['senior'], departmentIds: [3] },
      { subjectName: 'Further Mathematics', isCore: false, coreLevels: ['senior'], departmentIds: [3] },
      { subjectName: 'Technical Drawing', isCore: false, coreLevels: ['senior'], departmentIds: [3] },
      { subjectName: 'Agricultural Science', isCore: false, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [3] }
    ]
  },
  {
    id: 'senior_commercial',
    title: 'Senior Commercial & Business',
    description: 'Financial, retail, and commercial specialized electives',
    subjects: [
      { subjectName: 'Financial Accounting', isCore: false, coreLevels: ['senior'], departmentIds: [2] },
      { subjectName: 'Commerce', isCore: false, coreLevels: ['senior'], departmentIds: [2] },
      { subjectName: 'Economics', isCore: false, coreLevels: ['senior'], departmentIds: [2] },
      { subjectName: 'Office Practice', isCore: false, coreLevels: ['senior'], departmentIds: [2] },
      { subjectName: 'Marketing', isCore: false, coreLevels: ['senior'], departmentIds: [2] }
    ]
  },
  {
    id: 'senior_arts',
    title: 'Senior Arts & Humanities',
    description: 'Social sciences, languages, human culture, and literary arts',
    subjects: [
      { subjectName: 'Literature-in-English', isCore: false, coreLevels: ['senior'], departmentIds: [1] },
      { subjectName: 'Government', isCore: false, coreLevels: ['senior'], departmentIds: [1] },
      { subjectName: 'History', isCore: false, coreLevels: ['Primary', 'junior', 'senior'], departmentIds: [1] },
      { subjectName: 'Christian Religious Studies', isCore: false, coreLevels: ['senior'], departmentIds: [1] },
      { subjectName: 'Islamic Religious Studies', isCore: false, coreLevels: ['senior'], departmentIds: [1] },
      { subjectName: 'Geography', isCore: false, coreLevels: ['senior'], departmentIds: [1] },
      { subjectName: 'Fine Arts', isCore: false, coreLevels: ['senior'], departmentIds: [1] }
    ]
  }
];

const SeedSubjectsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  subjects: ISubject[];
}> = ({ isOpen, onClose, subjects }) => {
  const { showToast } = useToast();
  const { logAction } = useAudit();
  const { user } = useAuth();
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    SEED_CATEGORIES.map(c => c.id)
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleCategory = (id: string) => {
    if (selectedCategoryIds.includes(id)) {
      setSelectedCategoryIds(selectedCategoryIds.filter(cId => cId !== id));
    } else {
      setSelectedCategoryIds([...selectedCategoryIds, id]);
    }
  };

  const handleImport = async () => {
    if (selectedCategoryIds.length === 0) {
      showToast('Please select at least one curriculum category', 'error');
      return;
    }

    setIsProcessing(true);
    const schoolId = user?.schoolId || 'school-1';
    try {
      let addedCount = 0;
      let skippedCount = 0;

      const selectedTemplates = SEED_CATEGORIES
        .filter(cat => selectedCategoryIds.includes(cat.id))
        .flatMap(cat => cat.subjects);

      for (const t of selectedTemplates) {
        const uppercaseName = t.subjectName.toUpperCase();
        const exists = subjects.some(s => s.subjectName.toUpperCase() === uppercaseName);

        if (!exists) {
          await db.subjects.add({
            schoolId,
            subjectName: t.subjectName,
            isCore: t.isCore,
            coreLevels: t.coreLevels || [],
            departmentIds: t.departmentIds || [],
            teacherId: null,
            assistantTeacherIds: []
          });
          addedCount++;
        } else {
          skippedCount++;
        }
      }

      if (addedCount > 0) {
        logAction('SEED_CURRICULA', `Prepopulated standard registry with ${addedCount} standard subjects`);
        showToast(`Successfully seeded ${addedCount} standard subjects! (${skippedCount} already existed)`, 'success');
      } else {
        showToast('All selected subjects already exist in your school registry.', 'info');
      }
      onClose();
    } catch (e) {
      console.error(e);
      showToast('Error seeding standard subjects', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Seed Standard Curricula">
      <div className="space-y-6">
        <div className="flex items-start gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 text-blue-800 text-xs">
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Seeding loads well-established, standardized course designations aligned with standard secondary and elementary program requirements, specifically categorizing core programs and departmental senior blocks.
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">
            Academic Blocks to Populate
          </label>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {SEED_CATEGORIES.map(cat => {
              const isSelected = selectedCategoryIds.includes(cat.id);
              const templatesInCat = cat.subjects;
              const uniqueToImport = templatesInCat.filter(
                t => !subjects.some(s => s.subjectName.toUpperCase() === t.subjectName.toUpperCase())
              ).length;

              return (
                <div 
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${
                    isSelected 
                      ? 'bg-blue-50/20 border-blue-500 text-gray-900' 
                      : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                  }`}
                >
                  <div className={`mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                    isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 bg-white'
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black uppercase tracking-tight italic">
                        {cat.title}
                      </p>
                      <span className="text-[0.5625rem] font-black uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded text-gray-600 shrink-0 font-mono">
                        {uniqueToImport} New / {templatesInCat.length} Total
                      </span>
                    </div>
                    <p className="text-[0.625rem] font-medium text-gray-400 mt-1 uppercase tracking-tight">
                      {cat.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {templatesInCat.slice(0, 4).map((t, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 bg-gray-50 border border-gray-100/80 rounded text-[0.5rem] font-bold text-gray-600">
                          {t.subjectName}
                        </span>
                      ))}
                      {templatesInCat.length > 4 && (
                        <span className="text-[0.5rem] font-bold text-gray-400 self-center">
                          +{templatesInCat.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 bg-gray-50 hover:bg-gray-100 text-gray-700 font-black rounded-2xl text-[0.625rem] uppercase tracking-widest transition-all text-center"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isProcessing || selectedCategoryIds.length === 0}
            onClick={handleImport}
            className="flex-[2] py-4 bg-slate-900 hover:bg-black text-white font-black rounded-2xl text-[0.625rem] uppercase tracking-widest transition-all disabled:opacity-50 text-center"
          >
            {isProcessing ? 'Processing Seeding...' : 'Seed Selected Curricula'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
