import React, { useState, useMemo } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { 
  BarChart3, 
  Upload, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  FileText,
  Award,
  MoreVertical,
  Verified,
  Download,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  X,
  FileCheck2,
  Send
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type IGrade, type IClass, type ISubject } from '../db/db';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';
import { useCurrentSession } from '../hooks/useCurrentSession';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

export const ResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  React.useEffect(() => {
    if (user?.role === 'student') {
      navigate('/student-portal', { replace: true });
    }
  }, [user, navigate]);

  const { showToast } = useToast();
  const { settings } = useSettings();
  const { session } = useCurrentSession();
  
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [expandedClassIds, setExpandedClassIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(session || '2024/2025');
  const [selectedTerm, setSelectedTerm] = useState<number>(settings?.currentTerm || 1);

  // Sync state if session/term changes
  React.useEffect(() => {
    if (session) {
      setSelectedSession(session);
    }
  }, [session]);

  React.useEffect(() => {
    if (settings?.currentTerm) {
      setSelectedTerm(settings.currentTerm);
    }
  }, [settings?.currentTerm]);

  const classes = useLiveQuery(async () => {
    const allClasses = await db.classes.toArray();
    if (user?.role === 'teacher' && !user?.isAdmin) {
      const allSubjects = await db.subjects.toArray();
      const mySubjects = allSubjects.filter(s => s.teacherId === Number(user.id) || s.assistantTeacherIds?.includes(Number(user.id)));
      const myClassIds = new Set<number>();
      for (const c of allClasses) {
        if (c.teacherId === Number(user.id) || c.teacherName === user.fullName) myClassIds.add(c.id!);
      }
      for (const sub of mySubjects) {
         if (sub.classId) myClassIds.add(sub.classId);
         else {
           allClasses.forEach(c => {
             if (sub.isCore && (sub.coreLevels || []).includes(c.level)) {
               myClassIds.add(c.id!);
             } else if (sub.departmentIds && sub.departmentIds.length > 0 && c.departmentId && sub.departmentIds.includes(c.departmentId)) {
               myClassIds.add(c.id!);
             } else if (!sub.isCore && (!sub.departmentIds || sub.departmentIds.length === 0)) {
               myClassIds.add(c.id!);
             }
           });
         }
      }
      return allClasses.filter(c => myClassIds.has(c.id!));
    }
    return allClasses;
  }, [user]) ?? [];
  const subjects = useLiveQuery(() => db.subjects.toArray()) ?? [];
  const grades = useLiveQuery(() => db.grades.toArray()) ?? [];
  const students = useLiveQuery(() => db.students.toArray()) ?? [];
  const approvals = useLiveQuery(() => db.resultApprovals.where({ session: selectedSession, term: selectedTerm }).toArray()) ?? [];

  // Summary Stats
  const stats = useMemo(() => {
    const termGrades = grades.filter(g => g.session === selectedSession && g.term === selectedTerm);
    const classesWithResults = new Set(termGrades.map(g => {
      const s = students.find(stu => stu.id === g.studentId);
      return s?.classId;
    })).size;
    
    const avgScore = termGrades.length > 0 
      ? Math.round(termGrades.reduce((acc, curr) => acc + (curr.total || 0), 0) / termGrades.length) 
      : 0;

    return {
      totalEntries: termGrades.length,
      classesWithResults,
      publishedClasses: approvals.filter(a => a.status === 'Published').length, 
      avgScore
    };
  }, [grades, students, selectedSession, selectedTerm, approvals]);

  if (selectedClassId) {
    return (
      <ResultDetailView 
        classId={selectedClassId} 
        onBack={() => setSelectedClassId(null)} 
        session={selectedSession}
        term={selectedTerm}
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <PageHeader 
          title="Results" 
          subtitle="Manage, validate and publish student results." 
        />
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 border border-slate-200 text-slate-800 text-sm font-bold rounded-md hover:bg-slate-50 transition-all active:scale-95"
          >
            <Upload size={18} />
            Upload Results
          </button>
          <button className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white text-sm font-bold rounded-md hover:bg-slate-900 transition-all shadow-sm active:scale-95">
            <FileText size={18} />
            Generate Report Cards
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm flex flex-wrap items-center gap-8">
        <div className="flex flex-col gap-1.5 min-w-[140px]">
          <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Session</label>
          <select 
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="bg-transparent font-bold text-slate-800 outline-none pr-8 cursor-pointer"
          >
            <option value="2024/2025">2024/2025 (current)</option>
            <option value="2023/2024">2023/2024</option>
            <option value="2022/2023">2022/2023</option>
          </select>
        </div>
        <div className="w-px h-10 bg-slate-100 hidden sm:block" />
        <div className="flex flex-col gap-1.5 min-w-[140px]">
          <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Term</label>
          <select 
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(Number(e.target.value))}
            className="bg-transparent font-bold text-slate-800 outline-none pr-8 cursor-pointer"
          >
            <option value={1}>First Term</option>
            <option value={2}>Second Term</option>
            <option value={3}>Third Term</option>
          </select>
        </div>
        <div className="w-px h-10 bg-slate-100 hidden sm:block" />
        <div className="flex-1 flex flex-col gap-1.5 min-w-[200px]">
          <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Class</label>
          <select className="bg-transparent font-bold text-slate-800 outline-none pr-8 cursor-pointer">
            <option value="All">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
          </select>
        </div>
        <button className="px-6 py-2.5 bg-slate-800 text-white text-[0.6875rem] font-bold uppercase tracking-widest hover:bg-slate-900 rounded-md transition-all">
          Apply Filters
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          icon={BarChart3} 
          label="Total Results Entries" 
          value={stats.totalEntries.toLocaleString()} 
          subLabel="Score entries this term"
          color="slate"
        />
        <StatCard 
          icon={LayoutGrid} 
          label="Classes With Results" 
          value={`${stats.classesWithResults}/${classes.length}`} 
          subLabel={`${classes.length - stats.classesWithResults} classes pending`}
          color="slate"
        />
        <StatCard 
          icon={FileCheck2} 
          label="Published Results" 
          value={stats.publishedClasses} 
          subLabel="6 still in draft"
          color="emerald"
        />
        <StatCard 
          icon={Award} 
          label="Avg. School Score" 
          value={`${stats.avgScore}%`} 
          subLabel="Overall term average"
          color="slate"
        />
      </div>

      {/* Results Table */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center justify-between w-full md:w-auto gap-3">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Results by Class</h3>
            
            {classes.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const allIds = classes.map(c => c.id!).filter(Boolean);
                  const isAllExpanded = expandedClassIds.length === allIds.length;
                  setExpandedClassIds(isAllExpanded ? [] : allIds);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-[10px] md:text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors shadow-sm select-none active:scale-[0.98]"
              >
                {expandedClassIds.length === classes.length ? 'Collapse All' : 'Expand All'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
             <button className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-slate-500 text-[0.6875rem] font-bold uppercase tracking-widest hover:bg-slate-50 rounded-md transition-colors border border-slate-100 md:border-none shadow-sm md:shadow-none">
                <Verified size={16} />
                Validate All
             </button>
             <button className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-slate-600 bg-slate-100 text-[0.6875rem] font-bold uppercase tracking-widest hover:bg-slate-200 rounded-md transition-colors shadow-sm">
                <Eye size={16} />
                Publish All
             </button>
          </div>
        </div>

        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Class</th>
                <th className="px-6 py-5 text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Class Teacher</th>
                <th className="px-6 py-5 text-center text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Subjects</th>
                <th className="px-6 py-5 text-center text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Entries</th>
                <th className="px-6 py-5 text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Completion</th>
                <th className="px-6 py-5 text-center text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Status</th>
                <th className="px-6 py-4 border-b border-slate-200"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classes.map(cls => {
                const classStudents = students.filter(s => s.classId === cls.id);
                const classGrades = grades.filter(g => 
                  g.session === selectedSession && 
                  g.term === selectedTerm && 
                  classStudents.some(s => s.id === g.studentId)
                );
                
                const entriesCount = Array.from(new Set(classGrades.map(g => g.studentId))).length;
                const completionPct = Math.round((entriesCount / (classStudents.length || 1)) * 100);
                const classSubjects = subjects.filter(s => s.classId === cls.id).length;

                return (
                  <tr key={cls.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedClassId(cls.id!)}>
                    <td className="px-8 py-5 font-bold text-slate-800 text-sm italic">{cls.className}</td>
                    <td className="px-6 py-5 text-sm font-medium text-slate-600">{cls.teacherName || 'Not Assigned'}</td>
                    <td className="px-6 py-5 text-center text-sm font-bold text-slate-700">{classSubjects}</td>
                    <td className="px-6 py-5 text-center text-sm font-medium text-slate-400">
                      <span className="text-slate-800 font-bold">{entriesCount}</span>/{classStudents.length} Students
                    </td>
                    <td className="px-6 py-5 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${completionPct === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                            style={{ width: `${completionPct}%` }} 
                          />
                        </div>
                        <span className="text-[0.6875rem] font-bold text-slate-600">{completionPct}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-3 py-1 rounded-full text-[0.5625rem] font-bold uppercase tracking-widest ${
                        (approvals.find(a => a.classId === cls.id)?.status === 'Published') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                        (approvals.find(a => a.classId === cls.id)?.status === 'Submitted') ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        'bg-slate-50 text-slate-500 border border-slate-100'
                      }`}>
                        {approvals.find(a => a.classId === cls.id)?.status || 'DRAFT'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                       <button className="p-2 text-slate-300 hover:text-slate-600">
                          <MoreVertical size={16} />
                       </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View (Strictly no horizontal scrolling) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {classes.map(cls => {
            const classStudents = students.filter(s => s.classId === cls.id);
            const classGrades = grades.filter(g => 
              g.session === selectedSession && 
              g.term === selectedTerm && 
              classStudents.some(s => s.id === g.studentId)
            );
            
            const entriesCount = Array.from(new Set(classGrades.map(g => g.studentId))).length;
            const completionPct = Math.round((entriesCount / (classStudents.length || 1)) * 100);
            const classSubjects = subjects.filter(s => s.classId === cls.id).length;
            const isExpanded = expandedClassIds.includes(cls.id!);
            const status = approvals.find(a => a.classId === cls.id)?.status || 'DRAFT';

            return (
              <div key={cls.id} className="p-4 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setSelectedClassId(cls.id!)}
                  >
                    <p className="font-semibold text-slate-850 tracking-tight text-sm italic">{cls.className}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">
                      {cls.teacherName || 'Not Assigned'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      (status === 'Published') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                      (status === 'Submitted') ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                      'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {status}
                    </span>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedClassIds(prev => prev.includes(cls.id!) ? prev.filter(id => id !== cls.id!) : [...prev, cls.id!]);
                      }}
                      className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                      title={isExpanded ? "Collapse Details" : "Expand Details"}
                    >
                      {isExpanded ? <ChevronUp size={14} className="text-slate-600" /> : <ChevronDown size={14} className="text-slate-600" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-3.5 text-xs animate-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest">Subjects</p>
                        <p className="font-bold text-slate-700 mt-0.5">{classSubjects} Subjects</p>
                      </div>
                      <div>
                        <p className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest">Entries Completed</p>
                        <p className="font-bold text-slate-700 mt-0.5">{entriesCount}/{classStudents.length} Students</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest">Completion Rate</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-205 rounded-full overflow-hidden bg-slate-200">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${completionPct === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                            style={{ width: `${completionPct}%` }} 
                          />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-600">{completionPct}%</span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-200/55 flex justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setSelectedClassId(cls.id!)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors shadow-sm"
                      >
                        Open Result Registry
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {isUploadModalOpen && (
          <UploadModal 
            onClose={() => setIsUploadModalOpen(false)}
            session={selectedSession}
            term={selectedTerm}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const ResultDetailView: React.FC<{ classId: number, onBack: () => void, session: string, term: number }> = ({ classId, onBack, session, term }) => {
  const { user } = useAuth();
  const cls = useLiveQuery(() => db.classes.get(classId));
  const classStudents = useLiveQuery(() => db.students.where({ classId }).toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];
  const classSubjects = subjects.filter(s => s.classId === classId);
  const [activeSubjectId, setActiveSubjectId] = useState<number | null>(null);

  const grades = useLiveQuery(() => db.grades.where({ session, term }).toArray()) || [];
  const approval = useLiveQuery(() => db.resultApprovals.where({ classId, session, term }).first());
  
  const status = approval?.status || 'Draft';

  const handleUpdateStatus = async (newStatus: 'Draft' | 'Submitted' | 'Published') => {
    if (approval) {
      await db.resultApprovals.update(approval.id!, { status: newStatus, approvedBy: newStatus === 'Published' ? Number(user?.id) : undefined, approvedAt: new Date().toISOString() });
    } else {
      await db.resultApprovals.add({ classId, session, term: term as (1 | 2 | 3), status: newStatus, approvedBy: newStatus === 'Published' ? Number(user?.id) : undefined, approvedAt: new Date().toISOString() });
    }
  };

  const filteredGrades = grades.filter(g => 
    classStudents.some(s => s.id === g.studentId) && 
    (activeSubjectId ? g.subjectId === activeSubjectId : true)
  );

  const displayGrades = useMemo(() => {
    // If no subject selected, maybe show first or list all
    const targetSubId = activeSubjectId || classSubjects[0]?.id;
    if (!targetSubId) return [];
    
    return classStudents.map(s => {
      const grade = grades.find(g => g.studentId === s.id && g.subjectId === targetSubId && g.session === session && g.term === term);
      return {
        student: s,
        grade
      };
    });
  }, [classStudents, grades, activeSubjectId, classSubjects, session, term]);

  if (!cls) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2.5">
           <button onClick={onBack} className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-800 transition-colors text-xs font-bold group select-none">
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
              Back to Results
           </button>
           <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
              <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight italic uppercase">{cls.className} — Result Registry</h1>
              <span className="text-xs md:text-sm font-black text-slate-400 uppercase">Term {term}, {session}</span>
           </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
           <span className={`px-3.5 py-2 text-[0.55rem] md:text-[0.625rem] font-bold uppercase tracking-wider md:tracking-widest rounded-xl border ${
             status === 'Published' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
             status === 'Submitted' ? 'bg-amber-50 text-amber-600 border-amber-100' :
             'bg-slate-50 text-slate-600 border-slate-100'
           }`}>
              {status}
           </span>
           
           {status === 'Draft' && (user?.role === 'teacher' || user?.role === 'admin') && (
            <button onClick={() => handleUpdateStatus('Submitted')} className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-md">
               <Send size={14} />
               Submit
            </button>
           )}

           {status === 'Submitted' && user?.role === 'admin' && (
            <button onClick={() => handleUpdateStatus('Published')} className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md">
               <Verified size={14} />
               Approve
            </button>
           )}

           <button className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all">
              <Download size={14} />
              Export
           </button>
           <button className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 transition-all shadow-md">
              <FileText size={14} />
              Report Cards
           </button>
        </div>
      </div>

      {/* Subject Tabs */}
      <div className="flex items-center border-b border-slate-100 overflow-x-auto scrollbar-none gap-2 no-scrollbar">
         {classSubjects.map((s, idx) => (
           <button 
            key={s.id}
            onClick={() => setActiveSubjectId(s.id!)}
            className={`px-4 md:px-8 py-3.5 md:py-5 text-[10px] md:text-[0.6875rem] font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${
              (activeSubjectId === s.id || (!activeSubjectId && idx === 0)) ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
           >
             {s.subjectName}
           </button>
         ))}
      </div>

      {/* Detail Table Container */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden">
        {/* Desktop View (Table Layout) */}
        <div className="hidden md:block overflow-x-auto min-h-[300px]">
           <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Student Name</th>
                  <th className="px-6 py-5 text-center text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">CA Score (40)</th>
                  <th className="px-6 py-5 text-center text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Exam Score (60)</th>
                  <th className="px-6 py-5 text-center text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Aggregate (100)</th>
                  <th className="px-8 py-5 text-right text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayGrades.map((item, idx) => {
                  const caSum = Object.values(item.grade?.caScores || {}).reduce((a, b) => a + b, 0);
                  const total = item.grade?.total || 0;
                  const grade = item.grade?.grade || '--';
                  
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5">
                         <p className="text-sm font-bold text-slate-800 tracking-tight">{item.student.fullName}</p>
                         <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">{item.student.admissionNumber}</p>
                      </td>
                      <td className="px-6 py-5 text-center text-sm font-medium text-slate-600">{caSum || 0}</td>
                      <td className="px-6 py-5 text-center text-sm font-medium text-slate-600">{item.grade?.examScore || 0}</td>
                      <td className="px-6 py-5 text-center">
                         <span className={`text-xl font-black italic tracking-tighter ${total >= 50 ? 'text-slate-800' : 'text-rose-600'}`}>{total || 0}%</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <span className={`inline-block px-3 py-1 rounded-md text-[0.6875rem] font-black uppercase text-center min-w-[44px] ${
                           grade === 'A' ? 'text-emerald-600 bg-emerald-50' : 
                           grade === 'F' ? 'text-rose-600 bg-rose-50' : 
                           'text-slate-400 bg-slate-50'
                         }`}>
                           {grade}
                         </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
           </table>
        </div>

        {/* Mobile View (Card-based Layout with zero horizontal scrolling) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {displayGrades.map((item, idx) => {
            const caSum = Object.values(item.grade?.caScores || {}).reduce((a, b) => a + b, 0);
            const total = item.grade?.total || 0;
            const grade = item.grade?.grade || '--';

            return (
              <div key={idx} className="p-4 space-y-3.5">
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-150 flex items-center justify-center font-bold text-xs text-slate-600 bg-slate-100 shrink-0">
                      {item.student.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-800 tracking-tight truncate">{item.student.fullName}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{item.student.admissionNumber}</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider min-w-[34px] text-center shrink-0 ${
                    grade === 'A' ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 
                    grade === 'F' ? 'text-rose-600 bg-rose-50 border border-rose-100' : 
                    'text-slate-550 bg-slate-100 border border-slate-205'
                  }`}>
                    Grade: {grade}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100/60 text-center">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">CA (40)</span>
                    <span className="text-xs font-bold text-slate-700">{caSum || 0}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Exam (60)</span>
                    <span className="text-xs font-bold text-slate-700">{item.grade?.examScore || 0}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total</span>
                    <span className={`text-sm font-black italic duration-300 ${total >= 50 ? 'text-slate-800' : 'text-rose-600'}`}>{total || 0}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-5 md:p-8 bg-slate-50 border-t border-slate-100 text-[9px] md:text-[0.6875rem] font-bold text-slate-600 uppercase tracking-widest flex flex-col sm:flex-row sm:items-center justify-between gap-3 italic">
           <p className="font-bold">Performance Metrics Summary</p>
           <div className="flex flex-wrap items-center gap-4 sm:gap-10">
              <span>Class Avg: <span className="text-slate-900 font-black">74.2</span></span>
              <span>Highest: <span className="text-emerald-600 font-black">94.0</span></span>
              <span>Lowest: <span className="text-rose-600 font-black">32.0</span></span>
           </div>
        </div>
      </div>
    </div>
  );
};

const UploadModal: React.FC<{ onClose: () => void, session: string, term: number }> = ({ onClose, session, term }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg bg-white rounded-md shadow-2xl overflow-hidden border border-slate-200">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 rounded-md flex items-center justify-center text-slate-600">
              <Upload size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Upload Results</h2>
              <p className="text-[0.75rem] font-medium text-slate-400">Bulk import student performance data</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[0.75rem] font-bold text-slate-600 uppercase tracking-wider">Session</label>
              <select className="w-full h-11 px-4 bg-slate-50 rounded border-none outline-none font-bold text-sm">{session}</select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[0.75rem] font-bold text-slate-600 uppercase tracking-wider">Term</label>
              <select className="w-full h-11 px-4 bg-slate-50 rounded border-none outline-none font-bold text-sm">Term {term}</select>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-md border border-slate-100 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[0.6875rem] font-bold text-slate-600 uppercase tracking-widest">Protocol Sync</p>
              <p className="text-xs text-slate-400">Use our official template to prevent errors.</p>
            </div>
            <button className="flex items-center gap-2 text-emerald-600 text-[0.6875rem] font-bold uppercase tracking-widest hover:underline">
              <Download size={14} />
              Template
            </button>
          </div>

          <div className="h-40 border-2 border-dashed border-slate-100 rounded-md flex flex-col items-center justify-center space-y-2 group hover:border-slate-300 transition-all cursor-pointer">
             <Upload size={32} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
             <div className="text-center">
                <p className="text-sm font-bold text-slate-600">Drop XLSX file or browse</p>
                <p className="text-[0.625rem] text-slate-400 uppercase tracking-widest">Max file size 5MB</p>
             </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button onClick={onClose} className="flex-1 py-3 text-[0.6875rem] font-bold text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded">Cancel</button>
            <button disabled className="flex-[2] py-3 bg-slate-200 text-slate-400 text-[0.6875rem] font-bold uppercase tracking-widest rounded cursor-not-allowed">Validate & Upload</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const StatCard: React.FC<{ icon: any, label: string, value: string | number, subLabel?: string, color: string }> = ({ icon: Icon, label, value, subLabel, color }) => (
  <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-md border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-md flex items-center justify-center shrink-0 ${color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'}`}>
      <Icon className="w-5 h-5 md:w-6 md:h-6" />
    </div>
    <div className="space-y-1 overflow-hidden">
      <p className="text-[0.55rem] md:text-[0.625rem] font-black text-slate-400 uppercase tracking-widest leading-none truncate">{label}</p>
      <p className="text-lg md:text-2xl font-black text-slate-800 tracking-tight leading-none italic">{value}</p>
      {subLabel && <p className="text-[0.55rem] md:text-[0.625rem] text-slate-400 font-medium tracking-tight mb-0 truncate">{subLabel}</p>}
    </div>
  </div>
);

const LayoutGrid: React.FC<{ size: number, className?: string }> = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

