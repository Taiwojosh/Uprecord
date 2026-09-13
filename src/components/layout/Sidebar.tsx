import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  FileSpreadsheet, 
  Settings, 
  Database,
  FileText, 
  ClipboardList,

  Printer,
  X,
  GraduationCap,
  BookOpenCheck,
  UserCheck,
  BarChart3,
  Clock,
  CreditCard,
  Bell,
  History,
  LayoutGrid,
  LogOut,
  User
} from 'lucide-react';
import { Logo } from '../ui/Logo';

import { useAuth } from '../../context/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  
  const role = user?.role || 'admin';

  const myClassesCount = useLiveQuery(async () => {
    if (role !== 'teacher') return 0;
    const userId = user?.id && !isNaN(Number(user.id)) ? Number(user.id) : -1;
    const all = await db.classes.toArray();
    return all.filter(c => c.teacherId === userId || c.teacherName === user?.fullName).length;
  }, [user, role]) ?? 0;

  const getNavGroups = () => {
    if (role === 'student') {
      return [
        {
          title: 'Student Portal',
          items: [
            { to: '/student-portal', label: 'My Portal', icon: LayoutDashboard },
            { to: '/lesson-notes', label: 'Read Note', icon: BookOpen },
            { to: '/report-cards', label: 'View Results', icon: FileText },
          ]
        },
        {
          title: 'Academic Support',
          items: [
            { to: '/manual', label: 'Student Manual', icon: BookOpenCheck },
          ]
        }
      ];
    }

    if (role === 'teacher') {
      const teacherItems = [
        { to: '/teacher-portal', label: 'My Portal', icon: LayoutDashboard },
      ];

      if (myClassesCount > 0) {
        teacherItems.push({ to: '/students', label: 'Class Students', icon: Users });
      }

      teacherItems.push({ to: '/data-entry', label: 'Enter Scores', icon: ClipboardList });
      teacherItems.push({ to: '/lesson-planner', label: 'Lesson Planner', icon: BookOpenCheck });
      teacherItems.push({ to: '/attendance', label: 'Attendance', icon: Clock });

      if (user?.isAdmin) {
        teacherItems.push({ to: '/teachers', label: 'Teachers', icon: UserCheck });
      }

      return [
        {
          title: 'Teacher Portal',
          items: teacherItems
        },
        {
          title: 'Resources',
          items: [
             { to: '/manual', label: 'Teacher Manual', icon: BookOpenCheck },
          ]
        }
      ];
    }

    // Default: Admin
    return [
      {
        title: 'Master Registry',
        items: [
          { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/students', label: 'Students', icon: Users },
          { to: '/teachers', label: 'Teachers', icon: UserCheck },
          { to: '/classes', label: 'Classes', icon: LayoutGrid },
          { to: '/subjects', label: 'Subjects', icon: ClipboardList },
        ]
      },
      {
        title: 'Academics & Analytics',
        items: [
          { to: '/results', label: 'Results', icon: BarChart3 },
          { to: '/lesson-planner', label: 'Lesson Planner', icon: BookOpenCheck },
          { to: '/attendance', label: 'Attendance', icon: Clock },
          { to: '/reports', label: 'Reports', icon: Printer },
          { to: '/messages', label: 'Messages', icon: Bell },
          { to: '/announcements', label: 'Announcements', icon: Bell },
        ]
      },
      {
        title: 'System Operations',
        items: [
          { to: '/settings', label: 'Settings', icon: Settings },
          { to: '/manual', label: 'Institutional Manual', icon: BookOpenCheck },
          { to: '/backup', label: 'Database Backup', icon: Database },
          { to: '/audit', label: 'Audit Logs', icon: History },
        ]
      }
    ];
  };

  const currentNavGroups = getNavGroups();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-60 bg-slate-900 dark:bg-slate-950 text-white border-r border-slate-800 dark:border-slate-900/40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-full lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="h-[60px] flex items-center justify-between px-6 border-b border-slate-700/50">
            <div className="flex items-center gap-2.5">
              <Logo size={28} variant="icon" theme="dark" />
              <div className="text-lg tracking-tight font-sans">
                <span className="font-black text-white">Up</span>
                <span className="font-medium text-[#DC2626]">Record</span>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 lg:hidden transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6 px-0 space-y-6 no-scrollbar">
            {currentNavGroups.map((group) => (
              <div key={group.title}>
                <h3 className="px-6 text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-3">
                  {group.title}
                </h3>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => onClose()}
                      className={({ isActive }) => `
                        relative flex items-center gap-3 px-6 py-2.5 text-[0.8125rem] font-medium transition-all duration-200
                        ${isActive 
                          ? 'bg-slate-700 text-white border-l-[3px] border-[#DC2626]' 
                          : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'}
                      `}
                    >
                      <item.icon className="w-4.5 h-4.5" strokeWidth={2} />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* User Settings & Session Profile in Sidebar Footer */}
          <div className="p-4 border-t border-slate-700/50 bg-slate-900/40 text-xs shrink-0">
            <div className="flex items-center justify-between gap-2 bg-slate-800/40 p-3 rounded-2xl border border-slate-700/30">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-slate-700/80 border border-slate-600 flex items-center justify-center text-slate-300 shadow-inner shrink-0">
                  <User size={16} strokeWidth={2} />
                </div>
                <div className="overflow-hidden min-w-0">
                  <p className="font-extrabold text-white truncate text-[10px] leading-tight uppercase tracking-wider">
                    {user?.fullName || user?.email?.split('@')[0]}
                  </p>
                  <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mt-0.5 leading-none">
                    {role}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  logout();
                  window.location.href = '/login';
                }}
                className="p-1.5 bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 hover:text-rose-300 rounded-xl transition-all border border-rose-900/10 hover:border-rose-900/20 flex items-center justify-center shrink-0 relative group"
                title="Disconnect Session / Logout"
              >
                <LogOut className="w-3.5 h-3.5 group-hover:scale-105 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
