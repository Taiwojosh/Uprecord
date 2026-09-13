cat << 'INNER_EOF' > src/pages/StudentPortalPage.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { 
  User, 
  GraduationCap, 
  FileText, 
  Calendar,
  Award,
  BookOpen,
  PieChart,
  Download,
  AlertCircle,
  Clock,
  LayoutDashboard,
  CheckCircle2,
  TrendingUp,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useCurrentSession } from '../hooks/useCurrentSession';

export const StudentPortalPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { session, term } = useCurrentSession();
  
  const [selectedTerm, setSelectedTerm] = useState<number>(term);
  const [selectedSession, setSelectedSession] = useState<string>(session);

  // Sync state if context changes
  useEffect(() => {
    setSelectedTerm(term);
    setSelectedSession(session);
  }, [session, term]);

  // Get student details linked to this user
  const studentData = useLiveQuery(async () => {
    if (!user) return null;
    if (user.studentId) {
      return await db.students.get(user.studentId);
    }
    if (user.email) {
      const allStudents = await db.students.toArray();
      const byEmail = allStudents.find(s => s.email?.toLowerCase() === user.email.toLowerCase() || s.parentEmail?.toLowerCase() === user.email.toLowerCase());
      return byEmail || null;
    }
    return null;
  }, [user]);

  useEffect(() => {
    console.log('StudentPortalPage DEBUG:', { user, studentData, selectedTerm, selectedSession });
  }, [user, studentData, selectedTerm, selectedSession]);

  // Get the class name
  const classData = useLiveQuery(() => 
    studentData ? db.classes.get(studentData.classId) : null
  , [studentData]);

  // Get results for this student
  const grades = useLiveQuery(() => 
    studentData ? db.grades
      .where({ studentId: studentData.id, term: selectedTerm, session: selectedSession })
      .toArray() : []
  , [studentData, selectedTerm, selectedSession]) || [];

  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];

  const payments = useLiveQuery(() => 
    studentData ? db.payments.where('studentId').equals(studentData.id!).toArray() : Promise.resolve([])
  , [studentData]) || [];

  const settings = useLiveQuery(() => 
    db.settings.where('schoolId').equals(user?.schoolId || 'school-1').first()
  , [user?.schoolId]);

  const isRestrictedUnpaid = useMemo(() => {
    if (!settings?.restrictUnpaidStudentsAccess) return false;
    if (!studentData) return false;
    
    const currentTerm = settings?.currentTerm || 1;
    const currentSession = settings?.currentSession || '2024/2025';
    
    const tuitionPayments = payments.filter(
      p => p.category === 'Tuition' && p.status === 'paid' && p.term === currentTerm && p.session === currentSession
    );
    const tuitionPaid = tuitionPayments.reduce((sum, p) => sum + p.amount, 0);
    
    return tuitionPaid < 150000;
  }, [settings, studentData, payments]);

  const averageScore = grades.length > 0 
    ? (grades.reduce((acc, curr) => acc + (curr.total || 0), 0) / grades.length).toFixed(1)
    : '0.0';

  // Calculate Rank
  const classStudents = useLiveQuery(() => 
    classData ? db.students.where({ classId: classData.id }).toArray() : []
  , [classData]) || [];

  const classGrades = useLiveQuery(() => 
    classData ? db.grades.where({ session: selectedSession, term: selectedTerm }).toArray() : []
  , [classData, selectedSession, selectedTerm]) || [];

  const studentRank = useMemo(() => {
    if (!classStudents.length || !classGrades.length || !studentData) return '--';
    const classStudentIds = new Set(classStudents.map(s => s.id));
    const relevantGrades = classGrades.filter(g => classStudentIds.has(g.studentId));

    const studentTotals: Record<number, number> = {};
    const studentSubjectCounts: Record<number, number> = {};

    relevantGrades.forEach(g => {
      studentTotals[g.studentId] = (studentTotals[g.studentId] || 0) + (g.total || 0);
      studentSubjectCounts[g.studentId] = (studentSubjectCounts[g.studentId] || 0) + 1;
    });

    const rankings = Object.entries(studentTotals).map(([sid, total]) => {
      return {
        studentId: Number(sid),
        average: total / (studentSubjectCounts[Number(sid)] || 1)
      };
    });

    rankings.sort((a, b) => b.average - a.average);
    
    // Find rank (1-indexed)
    const rankIndex = rankings.findIndex(r => r.studentId === studentData.id);
    if (rankIndex === -1) return '--';
    
    const rank = rankIndex + 1;
    const j = rank % 10, k = rank % 100;
    if (j === 1 && k !== 11) return rank + "st";
    if (j === 2 && k !== 12) return rank + "nd";
    if (j === 3 && k !== 13) return rank + "rd";
    return rank + "th";
  }, [classStudents, classGrades, studentData]);

  if (isRestrictedUnpaid) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-8 space-y-8 animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center border-4 border-rose-100 shadow-xl">
          <ShieldAlert size={48} className="animate-pulse" />
        </div>
        
        <div className="space-y-4 max-w-lg">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight italic uppercase">Portal Access Suspended</h2>
          <p className="text-sm text-gray-400 font-bold leading-relaxed">
            Your academic portal has been temporarily locked by the administration due to outstanding Tuition obligations for <span className="text-rose-600 font-black italic">{selectedSession} Term {selectedTerm}</span>.
          </p>
          
          <div className="p-6 bg-rose-50/50 border border-rose-100 rounded-3xl space-y-3">
            <div className="flex justify-between text-xs font-black uppercase text-gray-400">
              <span>Required Tuition Fee</span>
              <span className="text-gray-950 italic">₦150,000</span>
            </div>
            <div className="flex justify-between text-xs font-black uppercase text-gray-400">
              <span>Remaining Liability</span>
              <span className="text-rose-600 font-black italic">₦150,000</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 font-black uppercase tracking-widest italic pt-2">
            Please contact the Bursar or Registry Office to clear your outstanding fees.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <PageHeader 
          title="Student Registry" 
          subtitle={`Welcome back, ${user?.fullName || 'Student'}. Assess your academic performance.`} 
        />
        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Enrollment Status</p>
            <p className="text-sm font-bold text-slate-800 tracking-tight">Active Scholar</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Profile Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-card text-center space-y-8">
            <div className="relative inline-block">
              <div className="w-32 h-32 bg-slate-900 rounded-[2.5rem] flex items-center justify-center shadow-2xl overflow-hidden group">
                <User size={64} className="text-white group-hover:scale-110 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/40 to-transparent" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center border-4 border-white shadow-lg">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                {studentData?.fullName || 'Registry Profile'}
              </h2>
              <div className="flex items-center justify-center gap-2">
                <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[0.625rem] font-bold rounded-full uppercase tracking-widest">
                  {classData?.className || 'Class Unassigned'}
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-400 text-[0.625rem] font-bold rounded-full uppercase tracking-widest">
                  {studentData?.admissionNumber || 'No ID'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6 mt-4 border-t border-slate-50">
              <div className="space-y-1">
                <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Academic Avg</p>
                <p className="text-3xl font-bold text-slate-900 tracking-tighter italic">{averageScore}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Rank</p>
                <p className="text-3xl font-bold text-slate-900 tracking-tighter italic">{studentRank}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl space-y-8">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-slate-400" />
               </div>
               <h3 className="text-base font-bold tracking-tight">Records Lookup</h3>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[0.625rem] font-bold uppercase text-slate-400 tracking-widest ml-1">Academic Session</label>
                <select 
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="w-full bg-slate-800 border-none rounded-2xl px-5 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-slate-500/20 transition-all appearance-none"
                >
                  <option value="2024/2025">2024/2025 Season</option>
                  <option value="2023/2024">2023/2024 Season</option>
                </select>
              </div>
              
              <div className="space-y-3">
                <label className="text-[0.625rem] font-bold uppercase text-slate-400 tracking-widest ml-1">Target Term</label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map(t => (
                    <button
                      key={t}
                      onClick={() => setSelectedTerm(t)}
                      className={`py-3 rounded-xl font-bold text-[0.625rem] uppercase tracking-widest transition-all ${
                        selectedTerm === t ? 'bg-white text-slate-900 shadow-xl' : 'bg-slate-800 text-slate-500 hover:text-white'
                      }`}
                    >
                      Term {t}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => navigate('/report-cards')}
                className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-[0.625rem] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 active:scale-95">
                <Download size={16} />
                Generate Transcript
              </button>
              <button 
                onClick={() => navigate('/lesson-notes')}
                className="w-full py-5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl text-[0.625rem] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95">
                <BookOpen size={16} />
                Read Lesson Notes
              </button>
            </div>
          </div>
        </div>

        {/* Results Main Area */}
        <div className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm">
                <Award className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Academic Transcripts</h2>
                <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Validated assessment records</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest border border-slate-100">
               <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
               Current View: {selectedSession}
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-card overflow-hidden">
            {grades.length > 0 ? (
              <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-8 py-5 text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Discipline / Subject</th>
                      <th className="px-6 py-5 text-center text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">CA</th>
                      <th className="px-6 py-5 text-center text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Exam</th>
                      <th className="px-6 py-5 text-center text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Aggregate</th>
                      <th className="px-8 py-5 text-right text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Valuation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {grades.map((g, idx) => {
                      const subjectName = subjects.find(s => s.id === g.subjectId)?.subjectName || 'Unknown Domain';
                      const caSum = Object.values(g.caScores || {}).reduce((a, b) => a + b, 0);
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-5">
                             <p className="text-sm font-bold text-slate-800 tracking-tight leading-none mb-1">{subjectName}</p>
                             <p className="text-[0.5625rem] font-bold text-slate-400 uppercase tracking-widest">Validated Entry</p>
                          </td>
                          <td className="px-6 py-5 text-center">
                             <p className="text-sm font-bold text-slate-500">{caSum}</p>
                          </td>
                          <td className="px-6 py-5 text-center">
                             <p className="text-sm font-bold text-slate-500">{g.examScore}</p>
                          </td>
                          <td className="px-6 py-5 text-center">
                             <p className="text-lg font-bold text-slate-900 italic tracking-tighter">{g.total}%</p>
                          </td>
                          <td className="px-8 py-5 text-right">
                             <span className={`inline-block min-w-[32px] px-2 py-1 rounded-md text-[0.625rem] font-bold uppercase tracking-widest text-center ${
                               g.grade === 'A' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                g.grade === 'F' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                'bg-slate-50 text-slate-600 border border-slate-100'
                             }`}>
                               {g.grade || '--'}
                             </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-24 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-300">
                  <AlertCircle size={40} />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-bold tracking-tight text-slate-800">Transcript Not Found</p>
                  <p className="text-sm text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
                    Financial clearance or assessment processing might be in progress. 
                    Contact the Registry Office if this persists.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Institutional Info Card */}
          <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-200 flex flex-col sm:flex-row items-center gap-10">
             <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-sm shrink-0 border border-slate-100">
                <TrendingUp className="w-10 h-10 text-slate-400" />
             </div>
             <div className="space-y-2 text-center sm:text-left">
                <h4 className="text-lg font-bold text-slate-900 tracking-tight italic">Registry Integrity Promise</h4>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  Academic records are finalized and digitally signed by the Faculty Council. 
                  Tampering or unauthorized modifications are restricted via hardwired security protocols.
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
INNER_EOF
