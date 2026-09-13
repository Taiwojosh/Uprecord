import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  BarChart3, 
  Download, 
  FileSpreadsheet, 
  Filter, 
  Search, 
  PieChart as PieChartIcon, 
  TrendingUp,
  Users,
  BookOpen,
  Award,
  AlertCircle,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
} from 'recharts';
import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';
import { db, type IStudent, type IGrade, type IClass, type ISubject } from '../db/db';
import { useCurrentSession } from '../hooks/useCurrentSession';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useAnalytics } from '../hooks/useAnalytics';
import { calculateTotal, filterSubjectsForStudent } from '../lib/calculationEngine';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const { session, term, termLabel, isLoading: isSessionLoading } = useCurrentSession();
  const { showToast } = useToast();

  // Selection
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'broadsheet' | 'analytics'>('broadsheet');

  // Data
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
         if (sub.classId) {
             myClassIds.add(sub.classId);
         } else {
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
  }, [user]) || [];
  const allSubjects = useLiveQuery(() => db.subjects.toArray()) || [];
  const settings = useLiveQuery(async () => {
    const s = await db.settings.toCollection().first();
    return s || null;
  });

  const selectedClass = useMemo(() => 
    selectedClassId ? classes.find(c => c.id === selectedClassId) : null
  , [classes, selectedClassId]);

  const subjects = useMemo(() => {
    if (!selectedClassId || !settings) return allSubjects;
    const selectedClass = classes.find(c => c.id === selectedClassId);
    if (!selectedClass) return allSubjects;

    return filterSubjectsForStudent(allSubjects, undefined, selectedClass, settings);
  }, [allSubjects, selectedClassId, classes, settings]);

  const analytics = useAnalytics(selectedClassId || undefined);

  // Fetch data for broadsheet
  const students = useLiveQuery(
    () => selectedClassId ? db.students.where('classId').equals(selectedClassId).toArray() : Promise.resolve([]),
    [selectedClassId]
  );

  const grades = useLiveQuery(
    () => {
      if (!selectedClassId || !students || !session) return Promise.resolve([]);
      return db.grades
        .where('term').equals(term)
        .and(g => g.session === session && students.some(s => s.id === g.studentId))
        .toArray();
    },
    [selectedClassId, term, session, students]
  );

  // Broadsheet data processing
  const broadsheetData = useMemo(() => {
    if (!students || !subjects || !grades || !settings) return [];

    return students.map(student => {
      const studentGrades = grades.filter(g => g.studentId === student.id);
      const subjectScores: Record<number, number> = {};
      let totalScore = 0;
      let subjectCount = 0;

      subjects.forEach(subject => {
        const grade = studentGrades.find(g => g.subjectId === subject.id);
        if (grade) {
          const total = calculateTotal(grade.caScores, grade.examScore);
          subjectScores[subject.id!] = total;
          totalScore += total;
          subjectCount++;
        }
      });

      return {
        studentId: student.id,
        fullName: student.fullName,
        admissionNumber: student.admissionNumber,
        subjectScores,
        totalScore,
        average: subjectCount > 0 ? (totalScore / subjectCount).toFixed(2) : '0.00'
      };
    }).sort((a, b) => Number(b.totalScore) - Number(a.totalScore));
  }, [students, subjects, grades, settings]);

  const handleExportBroadsheet = () => {
    if (!selectedClassId || broadsheetData.length === 0 || !subjects) return;

    const cls = classes?.find(c => c.id === selectedClassId);
    const headers = ['Admission No', 'Full Name', ...subjects.map(s => s.subjectName), 'Total', 'Average'];
    
    const data = broadsheetData.map(d => [
      d.admissionNumber,
      d.fullName,
      ...subjects.map(s => d.subjectScores[s.id!] || '-'),
      d.totalScore,
      d.average
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Broadsheet');
    XLSX.writeFile(wb, `Broadsheet_${cls?.className}_${termLabel}.xlsx`);
    showToast('Broadsheet exported to Excel', 'success');
  };
  
  const handleDownloadChart = async (id: string, fileName: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    
    try {
      const dataUrl = await toPng(element, { 
        backgroundColor: '#ffffff',
        style: {
          borderRadius: '0'
        }
      });
      const link = document.createElement('a');
      link.download = `${fileName}.png`;
      link.href = dataUrl;
      link.click();
      showToast('Chart downloaded successfully', 'success');
    } catch (error) {
      console.error('Download error:', error);
      showToast('Failed to download chart', 'error');
    }
  };

  if (isSessionLoading || settings === undefined) return <Spinner size="lg" />;
  if (!settings) return <EmptyState icon="BarChart3" message="Please configure your school settings before viewing reports." />;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Academic Reports" 
          subtitle={`Analysis for ${termLabel}, ${session}`} 
        />
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportBroadsheet}
            disabled={!selectedClassId || broadsheetData.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-sm font-bold rounded-2xl hover:bg-black disabled:opacity-50 transition-all shadow-xl shadow-gray-200 active:scale-95"
          >
            <Download className="w-5 h-5" />
            Export Broadsheet
          </button>
          {activeTab === 'analytics' && (
            <div className="flex bg-white rounded-2xl border border-gray-100 p-1 shadow-sm h-fit">
               <button 
                onClick={() => handleDownloadChart('combined-analytics-view', `Combined_Analytics_${session}`)}
                disabled={!selectedClassId && activeTab === 'analytics' && !analytics}
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-blue-600 text-[0.625rem] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                Download All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Selectors */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1 space-y-2">
          <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Select Class</label>
          <div className="relative">
            <LayoutGrid className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select 
              value={selectedClassId || ''}
              onChange={(e) => setSelectedClassId(Number(e.target.value) || null)}
              className="w-full pl-11 pr-10 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-gray-700 appearance-none"
            >
              <option value="">All Classes (Analytics Only)</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.className}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex p-1 bg-gray-100 rounded-2xl h-fit self-end">
          <button 
            onClick={() => setActiveTab('broadsheet')}
            disabled={!selectedClassId}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
              activeTab === 'broadsheet' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <TableIcon className="w-4 h-4" />
            Broadsheet
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'analytics' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>
        </div>
      </div>

      {activeTab === 'broadsheet' && selectedClassId ? (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-8 py-5 text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest sticky left-0 bg-gray-50 z-10">Student</th>
                  {subjects.map(s => (
                    <th key={s.id} className="px-4 py-5 text-center text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest min-w-[100px]">
                      {s.subjectName}
                    </th>
                  ))}
                  <th className="px-6 py-5 text-center text-[0.625rem] font-bold text-blue-600 uppercase tracking-widest bg-blue-50/50">Total</th>
                  <th className="px-6 py-5 text-center text-[0.625rem] font-bold text-blue-600 uppercase tracking-widest bg-blue-50/50">Average</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {broadsheetData.map(row => (
                  <tr key={row.studentId} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-5 sticky left-0 bg-white group-hover:bg-gray-50 z-10 border-r border-gray-50 shadow-[4px_0_8px_rgba(0,0,0,0.02)]">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{row.fullName}</p>
                        <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-tighter">{row.admissionNumber}</p>
                      </div>
                    </td>
                    {subjects.map(s => (
                      <td key={s.id} className="px-4 py-5 text-center">
                        <span className="text-sm font-black text-gray-600">
                          {row.subjectScores[s.id!] || '-'}
                        </span>
                      </td>
                    ))}
                    <td className="px-6 py-5 text-center bg-blue-50/20">
                      <span className="text-sm font-black text-blue-600">{row.totalScore}</span>
                    </td>
                    <td className="px-6 py-5 text-center bg-blue-50/20">
                      <span className="text-sm font-black text-blue-600">{row.average}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'analytics' && analytics ? (
        <div className="space-y-8">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatCard icon={<Users className="w-6 h-6" />} label="Total Students" value={analytics.totalStudents} color="blue" />
            <StatCard icon={<Award className="w-6 h-6" />} label="Active Students" value={analytics.activeStudents} color="emerald" />
            <StatCard icon={<TrendingUp className="w-6 h-6" />} label="Class Average" value={`${analytics.classAverage.toFixed(1)}%`} color="amber" />
            <StatCard icon={<Users className="w-6 h-6" />} label="Top Average" value={analytics.studentAverages.length > 0 ? `${Math.max(...analytics.studentAverages).toFixed(1)}%` : '0%'} color="purple" />
          </div>

          <div id="combined-analytics-view" className="space-y-8 bg-gray-50/50 p-4 rounded-[3rem]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Subject Performance */}
              <div id="subject-performance-chart" className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 tracking-tight leading-none mb-1">Subject Performance</h3>
                      {selectedClass && (
                        <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">
                          {selectedClass.className} • {session} • {termLabel} • {selectedClass.teacherName}
                        </p>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDownloadChart('subject-performance-chart', `Subject_Performance_${selectedClass?.className || 'All'}_${session}`)}
                    className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-blue-600 transition-all flex items-center gap-2"
                    title="Download as PNG"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-[0.625rem] font-black uppercase tracking-widest hidden sm:inline">PNG</span>
                  </button>
                </div>
                <div className="h-[450px] w-full">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={analytics.subjectStats} margin={{ bottom: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} 
                        interval={0}
                        angle={-90} 
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="average" fill="#3B82F6" radius={[6, 6, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Grade Distribution */}
              <div id="grade-distribution-chart" className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                      <PieChartIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 tracking-tight leading-none mb-1">Grade Distribution</h3>
                      {selectedClass && (
                        <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">
                          {selectedClass.className} • {session} • {termLabel} • {selectedClass.teacherName}
                        </p>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDownloadChart('grade-distribution-chart', `Grade_Distribution_${selectedClass?.className || 'All'}_${session}`)}
                    className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-emerald-600 transition-all flex items-center gap-2"
                    title="Download as PNG"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-[0.625rem] font-black uppercase tracking-widest hidden sm:inline">PNG</span>
                  </button>
                </div>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie data={analytics.distributionData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                        {analytics.distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                  {analytics.distributionData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-[0.625rem] font-black uppercase tracking-widest text-gray-400">{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 p-20 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center">
            <BarChart3 className="w-10 h-10 text-blue-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black tracking-tight text-gray-900">Select a class to view reports</h3>
            <p className="text-sm text-gray-400 font-medium max-w-xs mx-auto">Choose a class from the dropdown above to analyze academic performance and export broadsheets.</p>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, color: 'blue' | 'emerald' | 'amber' | 'purple' }> = ({ icon, label, value, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <div className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 shadow-sm space-y-2 md:space-y-4">
      <div className={`w-10 h-10 md:w-12 md:h-12 ${colors[color]} rounded-xl md:rounded-2xl flex items-center justify-center [&_svg]:w-5 [&_svg]:h-5 md:[&_svg]:w-6 md:[&_svg]:h-6`}>
        {icon}
      </div>
      <div>
        <p className="text-[0.55rem] md:text-[0.625rem] font-black text-gray-400 uppercase tracking-widest leading-none mb-1 md:mb-0">{label}</p>
        <p className="text-xl md:text-2xl font-black tracking-tighter text-gray-900 leading-none">{value}</p>
      </div>
    </div>
  );
};
