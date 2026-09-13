import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  Plus, 
  FileText, 
  LayoutDashboard,
  Clock,
  TrendingUp,
  Award,
  BookMarked,
  ArrowRight,
  ClipboardList
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import { AttendanceModal } from '../components/AttendanceModal';
import { useCurrentSession } from '../hooks/useCurrentSession';

export const TeacherPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const myClasses = useLiveQuery(async () => {
    const userId = user?.id && !isNaN(Number(user.id)) ? Number(user.id) : -1;
    const all = await db.classes.toArray();
    return all.filter(c => c.teacherId === userId || c.teacherName === user?.fullName);
  }, [user]) || [];

  const mySubjects = useLiveQuery(async () => {
    const userId = user?.id && !isNaN(Number(user.id)) ? Number(user.id) : -1;
    const all = await db.subjects.toArray();
    return all.filter(s => s.teacherId === userId || s.assistantTeacherIds?.includes(userId));
  }, [user]) || [];

  const { session, term, termLabel } = useCurrentSession();
  
  const classes = useLiveQuery(() => db.classes.toArray()) || [];

  const myCurricula = useLiveQuery(async () => {
    if (!session) return [];
    return await db.curriculum
      .where('session')
      .equals(session)
      .filter(c => c.term === term)
      .toArray();
  }, [session, term]) || [];

  const schemeCoverage = React.useMemo(() => {
    if (mySubjects.length === 0) return [];
    
    const list: {
      subjectId: number;
      subjectName: string;
      classId: number;
      className: string;
      completedTopics: number;
      totalTopics: number;
      percent: number;
    }[] = [];

    const seen = new Set<string>();

    mySubjects.forEach(sub => {
      const targetClassIds: number[] = [];
      
      if (sub.classId) {
        targetClassIds.push(sub.classId);
      }
      if (sub.classIds && sub.classIds.length > 0) {
        sub.classIds.forEach(id => {
          if (!targetClassIds.includes(id)) targetClassIds.push(id);
        });
      }
      if (sub.isCore && sub.coreLevels && sub.coreLevels.length > 0) {
        classes.forEach(c => {
          if (c.id && sub.coreLevels?.includes(c.level) && !targetClassIds.includes(c.id)) {
            targetClassIds.push(c.id);
          }
        });
      }

      targetClassIds.forEach(cId => {
        const key = `${sub.id}-${cId}`;
        if (seen.has(key)) return;
        seen.add(key);

        const cls = classes.find(c => c.id === cId);
        const className = cls ? cls.className : `Class #${cId}`;
        
        const curr = myCurricula.find(c => c.subjectId === sub.id && c.classId === cId && c.term === term);
        
        let completedTopics = 0;
        let totalTopics = 0;
        let percent = 0;

        if (curr && curr.topics && curr.topics.length > 0) {
          totalTopics = curr.topics.length;
          completedTopics = curr.topics.filter(t => t.completed).length;
          percent = Math.round((completedTopics / totalTopics) * 100);
        }

        list.push({
          subjectId: sub.id!,
          subjectName: sub.subjectName,
          classId: cId,
          className,
          completedTopics,
          totalTopics,
          percent
        });
      });
    });

    return list;
  }, [mySubjects, classes, myCurricula, term]);

  const settings = useLiveQuery(() => db.settings.toCollection().first());
  
  const [pendingAttendance, setPendingAttendance] = useState<{classId: number, date: string} | null>(null);
  const [checkTrigger, setCheckTrigger] = useState(0);

  useEffect(() => {
    // Check for missed attendance
    const checkAttendance = async () => {
      if (!user || !settings || myClasses.length === 0) return;
      
      // Check for the last 5 days
      const last5Days = Array.from({length: 5}, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i - 1);
          return d;
      });

      const holidayDates = settings.holidayDates || [];

      for (const classObj of myClasses) {
        for (const dateObj of last5Days) {
           // Skip weekends
           if (dateObj.getDay() === 0 || dateObj.getDay() === 6) continue;

           const date = dateObj.toISOString().split('T')[0];

           // Skip holidays
           if (holidayDates.includes(date)) continue;

           const records = await db.dailyAttendance
             .where({classId: classObj.id!, date: date})
             .filter(r => r.term === term && r.session === session)
             .toArray();
           if (records.length === 0) {
             if (!pendingAttendance || pendingAttendance.classId !== classObj.id || pendingAttendance.date !== date) {
               setPendingAttendance({classId: classObj.id!, date});
             }
             return;
           }
        }
      }
      if (pendingAttendance !== null) {
        setPendingAttendance(null);
      }
    };
    checkAttendance();
  }, [user, myClasses, settings, checkTrigger, term, session, pendingAttendance]);

  const studentCount = useLiveQuery(async () => {
    const allStudents = await db.students.toArray();
    const allClasses = await db.classes.toArray();
    
    let count = 0;
    for (const s of allStudents) {
      const studentClass = allClasses.find(c => c.id === s.classId);
      if (studentClass) {
        let takesTaughtSubject = false;
        for (const sub of mySubjects) {
          if (sub.classIds && sub.classIds.length > 0) {
            if (sub.classIds.includes(s.classId)) {
              takesTaughtSubject = true;
              break;
            }
          }
          if (sub.classId !== undefined && sub.classId !== null) {
            if (sub.classId === s.classId) {
              takesTaughtSubject = true;
              break;
            }
          }
          if (sub.isCore) {
            if (sub.coreLevels?.includes(studentClass.level)) {
              takesTaughtSubject = true;
              break;
            }
          }
          if (sub.departmentIds && sub.departmentIds.length > 0) {
            if (s.departmentId && sub.departmentIds.includes(s.departmentId)) {
               takesTaughtSubject = true;
               break;
            }
          }
        }
        if (takesTaughtSubject) count++;
      }
    }
    return count;
  }, [mySubjects]) ?? 0;

  return (
    <div className="space-y-10 pb-20">
      {pendingAttendance && settings && (
        <AttendanceModal
           isOpen={!!pendingAttendance}
           onClose={() => {
             if (pendingAttendance !== null) {
         setPendingAttendance(null);
       }
             setCheckTrigger(prev => prev + 1);
           }}
           classId={pendingAttendance.classId}
           date={pendingAttendance.date}
           term={settings.currentTerm}
           session={settings.currentSession}
           teacherId={Number(user?.id) || -1}
           schoolId={settings.schoolId!}
           mandatory={true}
        />
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <PageHeader 
          title="Faculty Dashboard" 
          subtitle={`Greetings, ${user?.fullName || 'Educator'}. Monitor your departmental performance.`} 
        />
        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">{termLabel}</p>
            <p className="text-sm font-bold text-slate-800">{session} Academic Year</p>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className={`grid grid-cols-2 ${myClasses.length > 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4 md:gap-6`}>
        <StatCard 
          icon={Users} 
          label="Assigned Students" 
          value={studentCount} 
          subLabel="Offering your subject(s)"
          onClick={() => navigate('/students')}
        />
        {myClasses.length > 0 && (
          <StatCard 
            icon={BookOpen} 
            label="Active Classes" 
            value={myClasses.length} 
            subLabel="Allocated this session"
            onClick={() => navigate('/students')}
          />
        )}
        <StatCard 
          icon={BookMarked} 
          label="Current Subjects" 
          value={mySubjects.length} 
          subLabel="Curriculum coverage"
          onClick={() => navigate('/subjects')}
          className={myClasses.length > 0 ? 'col-span-2 md:col-span-1' : ''}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Core Actions */}
        <div className="lg:col-span-8 space-y-8">
          {myClasses.length > 0 ? (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-card">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center">
                    <LayoutDashboard className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Institutional Governance</h2>
                    <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Execute classroom protocols</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ActionItem 
                  icon={Plus}
                  title="Academic Assessment"
                  description="Upload and manage subject-specific scores"
                  onClick={() => navigate('/data-entry')}
                  variant="slate"
                />
                <ActionItem 
                  icon={Award}
                  title="Remarks & Feedback"
                  description="Record behavioral and academic assessments"
                  onClick={() => navigate('/report-cards')}
                  variant="slate"
                />
                <ActionItem 
                  icon={ClipboardList}
                  title="Attendance Ledger"
                  description="Monitor and log daily student presence"
                  onClick={() => navigate('/attendance')}
                  variant="slate"
                />
                <ActionItem 
                  icon={FileText}
                  title="Reports Center"
                  description="Generate analytics and performance broadsheets"
                  onClick={() => navigate('/reports')}
                  variant="slate"
                />
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-card">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center">
                    <LayoutDashboard className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Subject Academic Protocol</h2>
                    <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Record courses & subject scores</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <ActionItem 
                  icon={Plus}
                  title="Academic Assessment Entry"
                  description="Configure and input students' academic subject scores"
                  onClick={() => navigate('/data-entry')}
                  variant="slate"
                />
              </div>
            </div>
          )}

          {/* Scheme of Work Tracker */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-card space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">Scheme of Work Tracker</h2>
                  <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Live curriculum coverage trackers</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/lesson-planner', { state: { defaultTab: 'sow' } })}
                className="px-4 py-2 bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-xl border border-slate-100 hover:bg-slate-100 transition-all flex items-center gap-1.5"
              >
                Outline Curriculum
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-px bg-slate-100" />

            {schemeCoverage.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center mx-auto">
                  <BookMarked size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">No subjects assigned</p>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-sm mx-auto mt-1">
                    Contact your institution's administrator to assign teaching subjects to your profile.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {schemeCoverage.map((item) => {
                  let statusLabel = "Outline Not Set";
                  let statusBg = "bg-slate-50 text-slate-400 border-slate-100";
                  if (item.totalTopics > 0) {
                    if (item.percent === 0) {
                      statusLabel = "Not Started";
                      statusBg = "bg-rose-50 text-rose-500 border-rose-100/50";
                    } else if (item.percent < 100) {
                      statusLabel = "In Progress";
                      statusBg = "bg-amber-50 text-amber-600 border-amber-100/50";
                    } else {
                      statusLabel = "Completed";
                      statusBg = "bg-emerald-50 text-emerald-600 border-emerald-100/50";
                    }
                  }

                  return (
                    <div 
                      key={`${item.subjectId}-${item.classId}`}
                      className="group p-5 bg-slate-50/50 border border-slate-100/70 rounded-2xl hover:border-slate-300 hover:bg-white transition-all duration-300"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div className="space-y-1">
                          <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase italic leading-none flex items-center gap-2">
                            {item.subjectName}
                            <span className="px-2 py-0.5 bg-slate-900 text-white rounded-lg text-[0.625rem] font-bold non-italic leading-none">
                              {item.className}
                            </span>
                          </h3>
                          <p className="text-[0.6875rem] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            {item.totalTopics > 0 
                              ? `${item.completedTopics} of ${item.totalTopics} topics finalized` 
                              : "No topics configured for this term yet"
                            }
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-full border text-[0.55rem] font-black uppercase tracking-wider leading-none ${statusBg}`}>
                            {statusLabel}
                          </span>
                          <button 
                            onClick={() => navigate('/lesson-planner', { state: { defaultTab: 'sow', subjectId: item.subjectId, classId: item.classId } })}
                            className="p-2 bg-white text-slate-400 hover:text-slate-900 border border-slate-100 rounded-xl shadow-sm hover:shadow transition-all"
                            title="Manage Scheme"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {item.totalTopics > 0 ? (
                        <div className="space-y-2">
                          <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                              className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${item.percent}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">
                            <span>Completion</span>
                            <span className="font-black text-slate-700">{item.percent}%</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                          <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 leading-none">
                            <Clock className="w-3.5 h-3.5" />
                            Ready to seed scheme of work
                          </span>
                          <button 
                            onClick={() => navigate('/lesson-planner', { state: { defaultTab: 'sow', subjectId: item.subjectId, classId: item.classId } })}
                            className="text-[0.625rem] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            Setup Topics →
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col sm:flex-row items-center gap-8 justify-between">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-sm border border-slate-100">
                <TrendingUp className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Performance Analytics</h3>
                <p className="text-sm text-slate-500 font-medium max-w-xs">Review real-time data insights across your assigned departments.</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/reports')}
              className="px-6 py-3 bg-white text-slate-900 text-sm font-bold rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              Open Console
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Support & Tools */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
            <div className="relative z-10 space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Protocol Sync</h3>
                <p className="text-xl font-bold leading-tight">Your data is secured locally in real-time.</p>
              </div>
              <p className="text-slate-400 text-xs font-medium leading-relaxed">
                Academic records are encrypted within the browser's local store. Synchronization 
                is managed locally for maximum efficiency during assessment periods.
              </p>
              <button 
                onClick={() => navigate('/announcements')}
                className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-[0.625rem] font-bold uppercase tracking-widest transition-all text-white border border-white/10"
              >
                Institutional Bulletins
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0">
              <BookMarked className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Library Records</p>
              <p className="text-sm font-bold text-slate-800">Manage digital assets</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: any, label: string, value: string | number, subLabel: string, onClick: () => void, className?: string }> = ({ icon: Icon, label, value, subLabel, onClick, className = "" }) => (
  <button 
    onClick={onClick}
    className={`bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-200 shadow-card hover:border-slate-400 transition-all text-left flex flex-col justify-between h-full active:scale-[0.98] ${className}`}
  >
    <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-800 mb-4 md:mb-6 shrink-0">
      <Icon className="w-5 h-5 md:w-6 md:h-6" />
    </div>
    <div className="mt-auto">
      <p className="text-[0.55rem] md:text-[0.625rem] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">{label}</p>
      <p className="text-xl md:text-4xl font-bold tracking-tight text-slate-900 leading-none mb-1 md:mb-2">{value}</p>
      <p className="text-[0.6rem] md:text-xs text-slate-400 font-medium leading-none truncate">{subLabel}</p>
    </div>
  </button>
);

const ActionItem: React.FC<{ icon: any, title: string, description: string, onClick: () => void, variant: 'slate' | 'white' }> = ({ icon: Icon, title, description, onClick, variant }) => (
  <button 
    onClick={onClick}
    className={`p-6 rounded-3xl border transition-all text-left group flex flex-col gap-4 active:scale-[0.98] ${
      variant === 'slate' ? 'bg-slate-50 border-slate-100 hover:bg-slate-100' : 'bg-white border-slate-200 hover:border-slate-400'
    }`}
  >
    <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all">
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <h3 className="text-sm font-bold text-slate-800 tracking-tight leading-none mb-2">{title}</h3>
      <p className="text-[0.6875rem] text-slate-400 font-medium leading-tight">{description}</p>
    </div>
  </button>
);
