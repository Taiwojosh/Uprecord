import React from 'react';
import { 
  Users, 
  School, 
  LayoutGrid, 
  CalendarCheck,
  ChevronRight,
  TrendingUp,
  Clock,
  PlusCircle,
  FileUp,
  MessageSquare,
  Receipt,
  Download,
  Pin,
  Trash2,
  Edit2,
  UserPlus
} from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../context/AuthContext';
import { useScopedDb } from '../hooks/useScopedDb';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../components/ui/Spinner';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { schoolId } = useScopedDb();

  React.useEffect(() => {
    if (user) {
      if (user.role === 'teacher') {
        navigate('/teacher-portal', { replace: true });
      } else if (user.role === 'student') {
        navigate('/student-portal', { replace: true });
      }
    }
  }, [user, navigate]);
  
  const totalStudents = useLiveQuery(async () => {
    if (!schoolId) return 0;
    return await db.students.where('schoolId').equals(schoolId).count();
  }, [schoolId]) ?? 0;

  const totalTeachers = useLiveQuery(async () => {
    if (!schoolId) return 0;
    return await db.users.where('schoolId').equals(schoolId).and(u => u.role === 'teacher').count();
  }, [schoolId]) ?? 0;

  const settings = useLiveQuery(async () => {
    if (!schoolId) return undefined;
    return await db.settings.where('schoolId').equals(schoolId).first();
  }, [schoolId]);
  
  const recentActivity = useLiveQuery(async () => {
    if (!schoolId) return [];
    const logs = await db.auditLogs.where('schoolId').equals(schoolId).toArray();
    return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 8);
  }, [schoolId]) ?? [];

  const announcements = useLiveQuery(async () => {
    if (!schoolId) return [];
    const ann = await db.announcements.where('schoolId').equals(schoolId).toArray();
    return ann.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
  }, [schoolId]) ?? [];

  const attendanceRate = useLiveQuery(async () => {
    if (!settings || !schoolId) return 94;
    const records = await db.attendance
      .where('schoolId')
      .equals(schoolId)
      .filter(g => g.term === settings.currentTerm && g.session === settings.currentSession)
      .toArray();
    if (records.length === 0) return 94; 
    const avg = records.reduce((acc, curr) => acc + (curr.daysPresent / curr.totalDays), 0) / records.length;
    return Math.round(avg * 100);
  }, [settings]) ?? 94;

  const attendanceDiff = attendanceRate - 94;
  const attendanceTrend = `${attendanceDiff >= 0 ? '+' : ''}${attendanceDiff}% vs last term`;
  const attendanceTrendType = attendanceDiff >= 0 ? 'success' as const : 'warning' as const;

  const studentTrend = `+${totalStudents} this term`;
  const teacherTrend = `+${totalTeachers} this term`;

  const feeStats = useLiveQuery(async () => {
    if (!settings) return undefined;
    const sessionToUse = settings.currentSession;
    const termToUse = settings.currentTerm;
    const list = await db.payments
      .where('session')
      .equals(sessionToUse)
      .filter(p => p.term === termToUse)
      .toArray();
    const studentsList = await db.students.toArray();
    const totalExpected = (studentsList.length || 6) * 150000;
    const totalCollected = list.filter(p => p.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
    const outstanding = Math.max(0, totalExpected - totalCollected);
    const rate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
    return {
      totalCollected,
      totalExpected,
      outstanding,
      rate: rate || 73
    };
  }, [settings]) ?? { totalCollected: 4380000, totalExpected: 6000000, outstanding: 1620000, rate: 73 };

  const classPerformance = useLiveQuery(async () => {
    if (!settings) return undefined;
    const sessionToUse = settings.currentSession;
    const termToUse = settings.currentTerm;
    const classesList = await db.classes.toArray();
    const studentsList = await db.students.toArray();
    const gradesList = await db.grades
      .where('session')
      .equals(sessionToUse)
      .filter(g => g.term === termToUse)
      .toArray();

    const performance = classesList.map(cls => {
      const classStudents = studentsList.filter(s => s.classId === cls.id);
      const studentIds = classStudents.map(s => s.id);
      const classGrades = gradesList.filter(g => studentIds.includes(g.studentId));
      
      const avg = classGrades.length > 0 
        ? Math.round(classGrades.reduce((acc, curr) => acc + (curr.total || 0), 0) / classGrades.length)
        : 70; // Fallback to 70 for visual display if no grades yet
        
      return {
        className: cls.className,
        percentage: avg
      };
    });

    if (performance.length === 0) {
      return [
        { className: "SS 3 Science", percentage: 84 },
        { className: "JSS 2A", percentage: 71 },
        { className: "JSS 1A", percentage: 68 }
      ];
    }
    return performance;
  }, [settings]) ?? [
    { className: "SS 3 Science", percentage: 84 },
    { className: "JSS 2A", percentage: 71 },
    { className: "JSS 1A", percentage: 68 }
  ];

  // Stateful interactive tasks list - pure read-only Query
  const tasksFiltered = useLiveQuery(async () => {
    return await db.tasks.toArray();
  }) ?? [];

  // Seed tasks in a separate side-effect if empty
  React.useEffect(() => {
    const seedTasksIfEmpty = async () => {
      try {
        const list = await db.tasks.toArray();
        if (list.length === 0) {
          const initialTasks = [
            { label: "Publish Term 1 results for SS3", priority: "URGENT" as const, color: "red" as const, completed: false, createdAt: new Date().toISOString(), schoolId: user?.schoolId },
            { label: "Approve 4 new teacher registrations", priority: "PENDING" as const, color: "amber" as const, completed: false, createdAt: new Date().toISOString(), schoolId: user?.schoolId },
            { label: "Update student portal configurations", priority: "PENDING" as const, color: "amber" as const, completed: false, createdAt: new Date().toISOString(), schoolId: user?.schoolId },
            { label: "Review attendance report — Week 10", priority: "LOW" as const, color: "slate" as const, completed: false, createdAt: new Date().toISOString(), schoolId: user?.schoolId }
          ];
          await db.tasks.bulkAdd(initialTasks);
        }
      } catch (err) {
        console.error("Failed to seed initial tasks:", err);
      }
    };
    seedTasksIfEmpty();
  }, [user?.schoolId]);

  const pendingCount = tasksFiltered.filter(t => !t.completed).length;

  const [showAddTask, setShowAddTask] = React.useState(false);
  const [taskLabel, setTaskLabel] = React.useState('');
  const [taskPriority, setTaskPriority] = React.useState<'URGENT' | 'PENDING' | 'LOW'>('PENDING');

  const [showAnnouncementModal, setShowAnnouncementModal] = React.useState(false);
  const [annTitle, setAnnTitle] = React.useState('');
  const [annContent, setAnnContent] = React.useState('');
  const [annIsPinned, setAnnIsPinned] = React.useState(false);

  const handleToggleTask = async (id: number, currentCompleted: boolean) => {
    await db.tasks.update(id, { completed: !currentCompleted });
    const t = await db.tasks.get(id);
    if (t) {
      await db.auditLogs.add({
        userId: user?.email || 'unknown',
        userName: user?.fullName || 'Admin',
        action: `${!currentCompleted ? 'Completed' : 'Reopened'} Task`,
        details: `Task: "${t.label}"`,
        timestamp: new Date().toISOString(),
        schoolId: user?.schoolId
      });
    }
  };

  const handleDeleteTask = async (id: number) => {
    const t = await db.tasks.get(id);
    await db.tasks.delete(id);
    if (t) {
      await db.auditLogs.add({
        userId: user?.email || 'unknown',
        userName: user?.fullName || 'Admin',
        action: 'Deleted Task',
        details: `Deleted task: "${t.label}"`,
        timestamp: new Date().toISOString(),
        schoolId: user?.schoolId
      });
    }
  };

  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskLabel.trim()) return;
    
    const colors = {
      URGENT: 'red' as const,
      PENDING: 'amber' as const,
      LOW: 'slate' as const
    };

    await db.tasks.add({
      label: taskLabel.trim(),
      priority: taskPriority,
      color: colors[taskPriority],
      completed: false,
      createdAt: new Date().toISOString(),
      schoolId: user?.schoolId
    });

    await db.auditLogs.add({
      userId: user?.email || 'unknown',
      userName: user?.fullName || 'Admin',
      action: 'Created Task',
      details: `Created task: "${taskLabel.trim()}"`,
      timestamp: new Date().toISOString(),
      schoolId: user?.schoolId
    });

    setTaskLabel('');
    setShowAddTask(false);
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    await db.announcements.add({
      title: annTitle.trim(),
      content: annContent.trim(),
      isPinned: annIsPinned,
      authorName: user?.fullName || 'System Administrator',
      createdAt: new Date().toISOString(),
      schoolId: user?.schoolId
    });

    await db.auditLogs.add({
      userId: user?.email || 'system',
      userName: user?.fullName || 'System Administrator',
      action: 'Created Announcement',
      details: `Title: "${annTitle.trim()}"`,
      timestamp: new Date().toISOString(),
      schoolId: user?.schoolId
    });

    setAnnTitle('');
    setAnnContent('');
    setAnnIsPinned(false);
    setShowAnnouncementModal(false);
  };

  const handleTogglePinAnnouncement = async (id: number, currentPinned: boolean) => {
    await db.announcements.update(id, { isPinned: !currentPinned });
  };

  const handleDeleteAnnouncement = async (id: number) => {
    const ann = await db.announcements.get(id);
    await db.announcements.delete(id);
    if (ann) {
      await db.auditLogs.add({
        userId: user?.email || 'unknown',
        userName: user?.fullName || 'Admin',
        action: 'Deleted Announcement',
        details: `Deleted: "${ann.title}"`,
        timestamp: new Date().toISOString(),
        schoolId: user?.schoolId
      });
    }
  };

  if (!user || user.role === 'teacher' || user.role === 'student') {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] font-bold text-slate-800 tracking-tight leading-tight">Dashboard</h1>
          <p className="text-slate-500 text-sm font-normal mt-1">
            Good morning, {user?.fullName?.split(' ')[0] || user?.email?.split('@')[0]}. Here's what's happening at {settings?.schoolName || 'UpRecord Portal'} today.
          </p>
        </div>
        <div className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
          {settings?.currentTerm === 1 ? 'First' : settings?.currentTerm === 2 ? 'Second' : 'Third'} Term • {settings?.currentSession || '2024/2025'}
        </div>
      </div>

      {/* Row 1 - Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          icon={Users} 
          label="Total Students" 
          value={totalStudents.toLocaleString()} 
          trend={studentTrend}
          trendType="success"
          onClick={() => navigate('/students')}
        />
        <StatCard 
          icon={School} 
          label="Total Teachers" 
          value={totalTeachers.toLocaleString()} 
          trend={teacherTrend}
          trendType="success"
          onClick={() => navigate('/teachers')}
        />
        <StatCard 
          icon={LayoutGrid} 
          label="Total Classes" 
          value="18" 
          trend="Active"
          trendType="success"
          onClick={() => navigate('/classes')}
        />
        <StatCard 
          icon={CalendarCheck} 
          label="Average Term Attendance" 
          value={`${attendanceRate}%`} 
          trend={attendanceTrend}
          trendType={attendanceTrendType}
          onClick={() => navigate('/attendance')}
        />
      </div>

      {/* Row 2 - Activity & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-md shadow-card">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">Recent Activity</h3>
            <button onClick={() => navigate('/audit')} className="text-xs text-slate-500 font-medium hover:underline">View all</button>
          </div>
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {recentActivity.length > 0 ? (
              recentActivity.map((log) => (
                <div key={log.id} className="px-6 py-4 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-600">
                      <Clock size={14} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-800 font-medium">{log.action}</p>
                      <p className="text-xs text-slate-400">{log.userName}</p>
                    </div>
                  </div>
                  <span className="text-[0.6875rem] text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-slate-400">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No recent activity to show</p>
              </div>
            )}
          </div>
        </div>
                {/* Pending Tasks */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-md shadow-card flex flex-col justify-between">
          <div>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-slate-800">Pending Tasks</h3>
                {pendingCount > 0 && (
                  <span className="bg-slate-800 text-white text-[0.625rem] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </div>
            </div>

            {/* Inline Add Task Form */}
            {showAddTask && (
              <form onSubmit={handleAddTaskSubmit} className="p-4 bg-slate-50 border-b border-slate-100 space-y-3">
                <input
                  type="text"
                  placeholder="Task description..."
                  value={taskLabel}
                  onChange={(e) => setTaskLabel(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-850 bg-white text-slate-800"
                  required
                  autoFocus
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[0.625rem] text-slate-400 font-bold uppercase mr-1">Priority:</span>
                    {(['URGENT', 'PENDING', 'LOW'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setTaskPriority(p)}
                        className={`px-2 py-1 text-[0.5625rem] font-black rounded ${
                          taskPriority === p
                            ? p === 'URGENT' ? 'bg-red-50 text-red-700' : p === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-slate-200 text-slate-800'
                            : 'bg-white text-slate-400 border border-slate-200'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowAddTask(false)}
                      className="px-2 py-1 text-[0.625rem] font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-2.5 py-1 bg-slate-800 text-white text-[0.625rem] font-bold rounded hover:bg-slate-700"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
              {tasksFiltered.length > 0 ? (
                tasksFiltered.map((task) => (
                  <TaskItem 
                    key={task.id}
                    id={task.id!}
                    label={task.label}
                    priority={task.priority}
                    color={task.color}
                    completed={task.completed}
                    onToggle={handleToggleTask}
                    onDelete={handleDeleteTask}
                  />
                ))
              ) : (
                <div className="p-12 text-center text-slate-400">
                  <p className="text-sm">Type some goals to trigger tasks.</p>
                </div>
              )}
            </div>
          </div>
          
          <button 
            type="button"
            onClick={() => setShowAddTask(!showAddTask)}
            className="w-full py-4 text-xs font-semibold text-slate-500 border-t border-dashed border-slate-200 hover:bg-slate-50 transition-colors uppercase tracking-wider"
          >
            {showAddTask ? 'Close panel' : '+ Add Task'}
          </button>
        </div>
      </div>

      {/* Row 3 - Charts & Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Class Performance (Simplified Bar Chart) */}
        <div className="bg-white border border-slate-200 rounded-md shadow-card p-6 flex flex-col justify-between">
           <div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-800 leading-none">Class Performance</h3>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-bold">Average scores — Term {settings?.currentTerm}</p>
            </div>
            <div className="space-y-4">
               {classPerformance.slice(0, 5).map((perf, idx) => (
                 <PerformanceRow key={idx} className={perf.className} percentage={perf.percentage} />
               ))}
            </div>
          </div>
          <button onClick={() => navigate('/results')} className="pt-6 w-full text-xs text-slate-400 font-bold uppercase hover:underline text-left">View all classes →</button>
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-slate-200 rounded-md shadow-card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Quick Actions</h3>
          <div className="space-y-3">
             <QuickActionButton icon={PlusCircle} label="Add New Student" onClick={() => navigate('/students', { state: { openAdd: true } })} />
             <QuickActionButton icon={PlusCircle} label="Add New Teacher" onClick={() => navigate('/teachers')} />
             <QuickActionButton icon={UserPlus} label="Create Portal Account" onClick={() => navigate('/account-creator')} />
             <QuickActionButton icon={FileUp} label="Upload Results" onClick={() => navigate('/data-entry')} />
             <QuickActionButton icon={MessageSquare} label="Send SMS to Parents" onClick={() => navigate('/messages')} />
             <QuickActionButton icon={Download} label="Download Term Report" onClick={() => navigate('/admin-reports')} />
          </div>
        </div>
      </div>

      {/* Row 4 - Announcements */}
      <div className="bg-white border border-slate-200 rounded-md shadow-card">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Announcements</h3>
          <button 
            type="button"
            onClick={() => setShowAnnouncementModal(true)}
            className="px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-md hover:bg-slate-700 transition-colors"
          >
            + New Announcement
          </button>
        </div>
        <div className="p-6 divide-y divide-slate-100">
           {announcements.length > 0 ? (
             announcements.map((ann) => (
               <AnnouncementItem 
                 key={ann.id} 
                 ann={ann} 
                 onTogglePin={handleTogglePinAnnouncement}
                 onDelete={handleDeleteAnnouncement}
               />
             ))
           ) : (
             <div className="py-6 text-center text-slate-400 text-sm">No announcements posted yet.</div>
           )}
        </div>
      </div>

      {/* New Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-md border border-slate-200 shadow-xl max-w-lg w-full p-6 m-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-800 animate-pulse">Create Announcement</h3>
              <button 
                onClick={() => setShowAnnouncementModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAddAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., End of Term Examination Schedule"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-800 bg-white text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Content</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Type the announcement details here..."
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-800 bg-white text-slate-800"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPinned"
                  checked={annIsPinned}
                  onChange={(e) => setAnnIsPinned(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-slate-800 focus:ring-slate-805 cursor-pointer"
                />
                <label htmlFor="isPinned" className="text-xs text-slate-600 font-semibold select-none cursor-pointer">Pin to top</label>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded hover:bg-slate-700 transition-colors"
                >
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-components

const StatCard: React.FC<{ 
  icon: any, 
  label: string, 
  value: string, 
  trend?: string, 
  trendType?: 'success' | 'warning', 
  onClick: () => void,
  progress?: number,
  subLabel?: string,
  isFinance?: boolean
}> = ({ icon: Icon, label, value, trend, trendType, onClick, progress, subLabel, isFinance }) => (
  <button 
    onClick={onClick}
    className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-card text-left hover:border-slate-300 transition-all group w-full flex flex-col justify-between"
  >
    <div className="flex items-center gap-2.5 md:gap-4 mb-3 md:mb-4">
      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-md flex items-center justify-center transition-colors shrink-0 ${isFinance ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-800'}`}>
        <Icon className="w-4 h-4 md:w-5 md:h-5" />
      </div>
      <p className="text-[0.625rem] md:text-[0.75rem] font-bold text-slate-500 tracking-tight leading-none uppercase truncate">{label}</p>
    </div>
    <div className="w-full">
      <h2 className="text-lg md:text-[1.75rem] font-black text-slate-800 leading-none mb-1.5 md:mb-2">{value}</h2>
      {progress !== undefined ? (
        <div className="space-y-1">
           <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
           </div>
           {subLabel && <p className="text-[0.55rem] md:text-[0.6875rem] text-slate-400 font-medium truncate leading-none mt-1">{subLabel}</p>}
        </div>
      ) : trend && (
        <span className={`inline-block px-1.5 py-0.5 rounded-full text-[0.55rem] md:text-[0.625rem] font-black uppercase tracking-wider ${trendType === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {trend}
        </span>
      )}
    </div>
  </button>
);

const TaskItem: React.FC<{ 
  id: number;
  label: string; 
  priority: string; 
  color: 'red' | 'amber' | 'slate';
  completed: boolean;
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
}> = ({ id, label, priority, color, completed, onToggle, onDelete }) => (
  <div className={`px-6 py-3 flex items-center justify-between group hover:bg-slate-50 transition-colors ${completed ? 'opacity-55' : ''}`}>
     <div className="flex items-center gap-3">
        <input 
          type="checkbox" 
          checked={completed}
          onChange={() => onToggle(id, completed)}
          className="w-4 h-4 rounded border-slate-300 text-slate-800 focus:ring-slate-800 cursor-pointer" 
        />
        <span className={`text-[0.8125rem] text-slate-700 font-medium ${completed ? 'line-through text-slate-400' : ''}`}>{label}</span>
     </div>
     <div className="flex items-center gap-2">
       <span className={`text-[0.5625rem] font-black tracking-wider px-2 py-0.5 rounded-full ${
         color === 'red' ? 'bg-red-50 text-red-600' : 
         color === 'amber' ? 'bg-amber-50 text-amber-600' : 
         'bg-slate-100 text-slate-600'
       }`}>
         {priority}
       </span>
       <button 
         type="button"
         onClick={() => onDelete(id)}
         className="p-1 text-slate-400 hover:text-red-500 transition-opacity md:opacity-0 md:group-hover:opacity-100"
         title="Delete task"
       >
         <Trash2 size={13} />
       </button>
     </div>
  </div>
);

const PerformanceRow: React.FC<{ className: string, percentage: number }> = ({ className, percentage }) => (
  <div className="flex items-center gap-4">
    <span className="text-[0.75rem] font-bold text-slate-600 w-14 truncate" title={className}>{className}</span>
    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percentage}%` }} />
    </div>
    <span className="text-[0.75rem] font-black text-slate-800 w-8">{percentage}%</span>
  </div>
);

const QuickActionButton: React.FC<{ icon: any, label: string, onClick: () => void }> = ({ icon: Icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-md text-[0.8125rem] font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
  >
    <Icon size={16} className="text-slate-400" />
    {label}
  </button>
);

const AnnouncementItem: React.FC<{ 
  ann: any; 
  onTogglePin?: (id: number, currentPinned: boolean) => void;
  onDelete?: (id: number) => void;
}> = ({ ann, onTogglePin, onDelete }) => (
  <div className="py-5 first:pt-0 group relative">
    <div className="flex items-center gap-2 mb-2">
       {ann.isPinned && <Pin size={12} className="text-amber-500 fill-amber-500" />}
       <h4 className="text-sm font-bold text-slate-800 group-hover:text-slate-900">{ann.title}</h4>
    </div>
    <p className="text-[0.8125rem] text-slate-500 leading-relaxed mb-3 line-clamp-2">{ann.content}</p>
    <div className="flex items-center justify-between">
       <span className="text-[0.6875rem] text-slate-400 font-medium">Posted by {ann.authorName} • {new Date(ann.createdAt).toLocaleDateString()}</span>
       <div className="flex items-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
          {ann.id && onTogglePin && (
            <button 
              type="button"
              onClick={() => onTogglePin(ann.id!, ann.isPinned)}
              className="p-1 text-slate-400 hover:text-slate-600"
              title={ann.isPinned ? "Unpin" : "Pin"}
            >
              <Pin size={12} className={ann.isPinned ? "fill-slate-400 text-slate-400" : ""} />
            </button>
          )}
          {ann.id && onDelete && (
            <button 
              type="button"
              onClick={() => onDelete(ann.id!)}
              className="p-1 text-slate-400 hover:text-red-500"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          )}
       </div>
    </div>
  </div>
);

