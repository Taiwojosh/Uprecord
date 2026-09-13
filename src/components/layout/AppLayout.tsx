import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Menu, 
  LogOut, 
  Search, 
  Bell, 
  User, 
  ChevronDown,
  Globe,
  Plus,
  Zap,
  Clock,
  ClipboardList,
  UserPlus,
  UserCheck,
  BookOpen,
  Database,
  FileText,
  Info,
  Sun,
  Moon,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useImmersiveMode } from '../../context/ImmersiveContext';
import { Logo } from '../ui/Logo';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { motion, AnimatePresence } from 'motion/react';

export const AppLayout: React.FC = () => {
  const { isImmersive, setImmersive, toggleImmersive } = useImmersiveMode();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isFabOpen, setIsFabOpen] = useState(false);

  const teacherClassesCount = useLiveQuery(async () => {
    if (!user || user.role !== 'teacher') return 0;
    const userId = user?.id && !isNaN(Number(user.id)) ? Number(user.id) : -1;
    const all = await db.classes.toArray();
    return all.filter(c => c.teacherId === userId || c.teacherName === user?.fullName).length;
  }, [user]) ?? 0;

  const getFabActions = () => {
    if (!user) return [];
    
    if (user.role === 'admin') {
      return [
        {
          label: 'Register Scholar',
          icon: UserPlus,
          onClick: () => {
            setIsFabOpen(false);
            navigate('/students', { state: { addStudent: true } });
          },
          color: 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100/70'
        },
        {
          label: 'Onboard Faculty',
          icon: UserCheck,
          onClick: () => {
            setIsFabOpen(false);
            navigate('/teachers', { state: { addTeacher: true } });
          },
          color: 'text-sky-600 bg-sky-50 border-sky-100 hover:bg-sky-100/70'
        },
        {
          label: 'Register Subject',
          icon: BookOpen,
          onClick: () => {
            setIsFabOpen(false);
            navigate('/subjects', { state: { addSubject: true } });
          },
          color: 'text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-50 border-emerald-100 hover:bg-emerald-100/70'
        },
        {
          label: 'Record Attendance',
          icon: Clock,
          onClick: () => {
            setIsFabOpen(false);
            navigate('/attendance');
          },
          color: 'text-amber-600 bg-amber-50 border-amber-100 hover:bg-amber-100/70'
        },
        {
          label: 'Score Sheet Protocol',
          icon: ClipboardList,
          onClick: () => {
            setIsFabOpen(false);
            navigate('/data-entry');
          },
          color: 'text-rose-600 bg-rose-50 border-rose-100 hover:bg-rose-100/70'
        },
        {
          label: 'Database Backup',
          icon: Database,
          onClick: () => {
            setIsFabOpen(false);
            navigate('/backup');
          },
          color: 'text-slate-600 bg-slate-50 border-slate-150 hover:bg-slate-100/70'
        }
      ];
    }
    
    if (user.role === 'teacher') {
      const actions = [];
      if (teacherClassesCount > 0) {
        actions.push({
          label: 'Record Attendance',
          icon: Clock,
          onClick: () => {
            setIsFabOpen(false);
            navigate('/attendance');
          },
          color: 'text-amber-600 bg-amber-50 border-amber-100 hover:bg-amber-100/70'
        });
      }
      
      actions.push({
        label: 'Enter Grades / Scores',
        icon: ClipboardList,
        onClick: () => {
          setIsFabOpen(false);
          navigate('/data-entry');
        },
        color: 'text-rose-600 bg-rose-50 border-rose-100 hover:bg-rose-100/70'
      });

      if (teacherClassesCount > 0) {
        actions.push({
          label: 'Class Students',
          icon: UserPlus,
          onClick: () => {
            setIsFabOpen(false);
            navigate('/students');
          },
          color: 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100/70'
        });
      }
      return actions;
    }
    
    if (user.role === 'student') {
      return [
        {
          label: 'Report Cards / Results',
          icon: FileText,
          onClick: () => {
            setIsFabOpen(false);
            navigate('/report-cards');
          },
          color: 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100/70'
        },
        {
          label: 'Announcements',
          icon: Bell,
          onClick: () => {
            setIsFabOpen(false);
            navigate('/announcements');
          },
          color: 'text-amber-600 bg-amber-50 border-amber-100 hover:bg-amber-100/70'
        },
        {
          label: 'Student Handbook',
          icon: Info,
          onClick: () => {
            setIsFabOpen(false);
            navigate('/manual');
          },
          color: 'text-slate-600 bg-slate-50 border-slate-150 hover:bg-slate-100/70'
        }
      ];
    }
    
    return [];
  };

  const fabActions = getFabActions();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const settings = useLiveQuery(() => db.settings.toArray().then(arr => arr[0]));

  const isAdmin = user?.role === 'admin';
  const cleanQuery = searchQuery.trim().toLowerCase();

  const classesMap = useLiveQuery(async () => {
    const allClasses = await db.classes.toArray();
    return new Map(allClasses.map(c => [c.id, c.className]));
  }) || new Map<number | undefined, string>();

  const searchResults = useLiveQuery(async () => {
    if (!isAdmin || !cleanQuery) return { students: [], teachers: [], classes: [] };

    const allStudents = await db.students.toArray();
    const matchedStudents = allStudents.filter(s => {
      const matchName = s.fullName.toLowerCase().includes(cleanQuery);
      const matchAdmission = s.admissionNumber?.toLowerCase().includes(cleanQuery);
      const matchId = s.id?.toString() === cleanQuery;
      return matchName || matchAdmission || matchId;
    });

    const allUsers = await db.users.where('role').equals('teacher').toArray();
    const matchedTeachers = allUsers.filter(t => {
      const matchName = t.fullName.toLowerCase().includes(cleanQuery);
      const matchEmail = t.email.toLowerCase().includes(cleanQuery);
      const matchId = t.id?.toString() === cleanQuery;
      return matchName || matchEmail || matchId;
    });

    const allClasses = await db.classes.toArray();
    const matchedClasses = allClasses.filter(c => {
      const matchName = c.className.toLowerCase().includes(cleanQuery);
      const matchTeacher = c.teacherName?.toLowerCase().includes(cleanQuery);
      const matchId = c.id?.toString() === cleanQuery;
      return matchName || matchTeacher || matchId;
    });

    return {
      students: matchedStudents.slice(0, 5),
      teachers: matchedTeachers.slice(0, 5),
      classes: matchedClasses.slice(0, 5),
    };
  }, [searchQuery, isAdmin]);

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (searchQuery.trim()) {
        navigate(`/students`, { state: { searchTerm: searchQuery } });
        setSearchFocused(false);
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#F8F9FA] dark:bg-slate-950 overflow-hidden font-sans text-gray-900 dark:text-slate-100 transition-colors duration-200">
      {/* Desktop Sidebar with collapse transition */}
      <motion.div
        animate={{ 
          width: isImmersive ? 0 : '15rem',
          minWidth: isImmersive ? 0 : '15rem',
          opacity: isImmersive ? 0 : 1
        }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:block h-full shrink-0 overflow-hidden bg-slate-900 dark:bg-slate-950"
      >
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />
      </motion.div>

      {/* Mobile Sidebar */}
      <div className="lg:hidden">
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with toggle-active slide-collapse animation */}
        <motion.header 
          animate={{ 
            height: isImmersive ? 0 : '5rem',
            y: isImmersive ? -80 : 0,
            opacity: isImmersive ? 0 : 1
          }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="h-20 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between px-6 lg:px-10 shrink-0 z-30 shadow-sm shadow-gray-50/50 dark:shadow-slate-950/20 transition-colors duration-200 overflow-hidden"
        >
          <div className="flex items-center gap-6 flex-1">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2.5 rounded-xl text-gray-400 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 lg:hidden transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            {/* School Identifier */}
            <div className="hidden sm:flex items-center gap-3">
               <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white overflow-hidden shadow-inner">
                  {settings?.logoBase64 ? (
                     <img src={settings.logoBase64} alt="School Logo" className="w-full h-full object-cover" />
                  ) : (
                     <Globe size={20} />
                  )}
               </div>
               <div>
                  <h1 className="text-sm font-black text-gray-900 dark:text-slate-100 tracking-tight leading-none truncate max-w-[200px]">
                    {settings?.schoolName || 'UpRecord Portal'}
                  </h1>
               </div>
            </div>

            {/* Top Bar Global Search Container */}
            <div className="relative max-w-md w-full ml-6 mr-8 hidden md:block">
              <div className={`flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-slate-800 rounded-2xl border transition-all duration-300 ${searchFocused ? 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 ring-4 ring-blue-500/5 shadow-sm shadow-gray-900/10' : 'border-transparent dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800/70'}`}>
                 <Search size={18} className={`${searchFocused ? 'text-blue-500' : 'text-gray-400 dark:text-slate-500'}`} />
                 <input 
                   type="text" 
                   placeholder={isAdmin ? "Search scholars, faculty, classes..." : "Search students..."} 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   onKeyDown={handleSearch}
                   className="bg-transparent border-none outline-none text-sm font-medium w-full placeholder:text-gray-450 dark:placeholder:text-slate-500 text-gray-900 dark:text-slate-100"
                   onFocus={() => setSearchFocused(true)}
                   onBlur={() => setSearchFocused(false)}
                   style={{ height: '30px', width: '381.766px', borderStyle: 'solid', borderRadius: '12px' }}
                 />
              </div>

              {/* Autocomplete Dropdown Search Results for Admin */}
              <AnimatePresence>
                {searchFocused && isAdmin && searchQuery.trim().length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-12 left-0 right-0 bg-white border border-gray-150 rounded-2xl shadow-xl z-50 max-h-[80vh] overflow-y-auto p-4 space-y-4"
                  >
                    {!searchResults || (searchResults.students.length === 0 && searchResults.teachers.length === 0 && searchResults.classes.length === 0) ? (
                      <div className="py-6 text-center text-gray-400 text-xs font-semibold italic">
                        No matches found for "{searchQuery}"
                      </div>
                    ) : (
                      <>
                        {/* Students Result List */}
                        {searchResults.students.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest block ml-1 select-none">Scholars / Students</span>
                            <div className="space-y-0.5">
                              {searchResults.students.map(student => (
                                <button
                                  key={`student-${student.id}`}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    navigate(`/students/${student.id}`);
                                    setSearchQuery('');
                                    setSearchFocused(false);
                                  }}
                                  className="w-full text-left p-2 rounded-xl hover:bg-slate-50 flex items-center justify-between text-xs transition-colors group animate-none"
                                >
                                  <div className="flex flex-col">
                                    <span className="font-extrabold text-slate-800 uppercase italic tracking-tight group-hover:text-blue-600 transition-colors">
                                      {student.fullName}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-semibold italic mt-0.5">
                                      ID: {student.admissionNumber} • Active
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    {classesMap.get(student.classId) || 'Unassigned'}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Teachers Result List */}
                        {searchResults.teachers.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest block ml-1 select-none">Faculty / Teachers</span>
                            <div className="space-y-0.5">
                              {searchResults.teachers.map(teacher => (
                                <button
                                  key={`teacher-${teacher.id}`}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    navigate(`/teachers`, { state: { searchTerm: teacher.fullName } });
                                    setSearchQuery('');
                                    setSearchFocused(false);
                                  }}
                                  className="w-full text-left p-2 rounded-xl hover:bg-slate-50 flex items-center justify-between text-xs transition-colors group animate-none"
                                >
                                  <div className="flex flex-col">
                                    <span className="font-extrabold text-slate-800 uppercase italic tracking-tight group-hover:text-blue-600 transition-colors">
                                      {teacher.fullName}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-medium lowercase italic mt-0.5">
                                      {teacher.email}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    Faculty
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Classes Result List */}
                        {searchResults.classes.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest block ml-1 select-none">Academic Levels / Classes</span>
                            <div className="space-y-0.5">
                              {searchResults.classes.map(classItem => (
                                <button
                                  key={`class-${classItem.id}`}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    navigate(`/classes`, { state: { searchTerm: classItem.className } });
                                    setSearchQuery('');
                                    setSearchFocused(false);
                                  }}
                                  className="w-full text-left p-2 rounded-xl hover:bg-slate-50 flex items-center justify-between text-xs transition-colors group animate-none"
                                >
                                  <div className="flex flex-col">
                                    <span className="font-extrabold text-slate-800 uppercase italic tracking-tight group-hover:text-blue-600 transition-colors">
                                      {classItem.className}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-semibold italic mt-0.5">
                                      Teacher: {classItem.teacherName || 'Not Assigned'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    {classItem.level}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <button 
                onClick={() => navigate('/announcements')}
                className="p-3 bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-300 hover:text-blue-600 dark:hover:text-amber-400 rounded-2xl transition-all border border-transparent hover:border-blue-50 dark:hover:border-slate-700 relative group"
            >
              <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-950" />
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-3 bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-300 hover:text-blue-600 dark:hover:text-amber-400 rounded-2xl transition-all border border-transparent hover:border-blue-50 dark:hover:border-slate-700 relative group"
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300 text-amber-500" />
              ) : (
                <Moon className="w-5 h-5 group-hover:-rotate-12 transition-transform duration-300 text-slate-400" />
              )}
            </button>

            {/* Immersive Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleImmersive}
              className="p-3 bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-300 hover:text-blue-600 dark:hover:text-emerald-400 rounded-2xl transition-all border border-transparent hover:border-blue-50 dark:hover:border-slate-700 relative group"
              title="Toggle Immersive Mode"
            >
              <Maximize2 className="w-5 h-5 group-hover:scale-110 transition-transform duration-300 text-slate-400 dark:text-slate-300 text-gray-500 dark:text-slate-300" />
            </button>
          </div>
        </motion.header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-[#F8F9FA] dark:bg-slate-950 min-h-0 h-full">
          <motion.div 
            animate={{
              padding: isImmersive ? '0px' : undefined,
              maxWidth: isImmersive ? '100%' : '1600px'
            }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={`mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500 w-full min-h-full flex flex-col ${isImmersive ? 'p-0' : 'p-6 lg:p-10'}`}
          >
            <Outlet />
          </motion.div>
        </main>

        {/* Elegant Floating Escape Button for Immersive Mode */}
        <AnimatePresence>
          {isImmersive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="fixed top-6 right-6 z-[99999] flex items-center gap-2 pointer-events-auto"
            >
              <button
                onClick={() => setImmersive(false)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/90 dark:bg-slate-800/90 hover:bg-slate-950 dark:hover:bg-slate-700 text-white border border-slate-700/50 backdrop-blur-md rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 group font-bold text-xs uppercase tracking-wider"
                title="Exit Immersive Mode (Press ESC)"
              >
                <Minimize2 size={16} className="text-emerald-400 group-hover:scale-90 transition-transform" />
                <span>Exit Immersive</span>
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] bg-slate-800 dark:bg-slate-900 border border-slate-700 rounded text-slate-400 font-medium font-mono">
                  ESC
                </kbd>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Action Button (FAB) Quick Actions Menu */}
      {fabActions.length > 0 && (
        <div id="fab-actions-root" className={`fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-[99999] flex-col items-end pointer-events-none ${location.pathname.startsWith('/attendance') ? 'hidden md:flex' : 'flex'}`}>
          {/* Backdrop Overlay when FAB is open */}
          <AnimatePresence>
            {isFabOpen && (
              <motion.div
                key="fab-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] z-[9998] pointer-events-auto"
                onClick={() => setIsFabOpen(false)}
              />
            )}
          </AnimatePresence>

          {/* Quick Actions Menu Items */}
          <AnimatePresence>
            {isFabOpen && (
              <motion.div
                key="fab-menu"
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="relative z-[9999] mb-4 bg-white/95 border border-slate-200/50 backdrop-blur-md rounded-[2rem] shadow-2xl p-4 w-72 flex flex-col gap-2 border border-slate-100 select-none pointer-events-auto"
              >
                <div className="px-3 py-1.5 border-b border-gray-100/80 mb-1 flex items-center justify-between">
                  <span className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">Portal Hub Commands</span>
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="flex flex-col gap-1.5 max-h-96 overflow-y-auto pr-1">
                  {fabActions.map((action, idx) => (
                    <motion.button
                      key={action.label}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={action.onClick}
                      className="w-full flex items-center justify-between text-left p-2.5 rounded-2xl hover:bg-slate-50 transition-all duration-200 group active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110 duration-200 ${action.color}`}>
                          <action.icon size={16} strokeWidth={2.2} />
                        </div>
                        <span className="text-xs font-black text-slate-800 uppercase italic tracking-tight group-hover:text-blue-600 transition-colors">
                          {action.label}
                        </span>
                      </div>
                      <ChevronDown size={14} className="-rotate-90 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main FAB Toggle Trigger Button */}
          <button
            id="fab-toggle-btn"
            onClick={() => setIsFabOpen(!isFabOpen)}
            className={`relative z-[9999] w-14 h-14 rounded-full flex items-center justify-center shadow-xl border select-none transition-all duration-300 active:scale-95 outline-none pointer-events-auto ${
              isFabOpen
                ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 shadow-rose-900/10'
                : 'bg-slate-900 hover:bg-black text-white border-slate-800 shadow-slate-950/25 ring-4 ring-slate-900/5'
            }`}
            title="Registry Quick Access"
            aria-label="Toggle Quick Actions Menu"
          >
            <motion.div
              animate={{ rotate: isFabOpen ? 135 : 0 }}
              transition={{ type: 'spring', damping: 15, stiffness: 200 }}
              className="flex items-center justify-center"
            >
              <Plus size={24} strokeWidth={2.5} />
            </motion.div>
          </button>
        </div>
      )}
    </div>
  );
};
