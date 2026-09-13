import React, { useState, useEffect } from 'react';
import { 
  Book, 
  Settings, 
  Users, 
  ClipboardList, 
  FileText, 
  Database, 
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  GraduationCap,
  Shield,
  User,
  Sparkles,
  Play,
  FileQuestion,
  Clock,
  ArrowUpRight,
  BookOpen,
  Send,
  Video,
  ListTodo
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

type RoleTab = 'admin' | 'teacher' | 'student';

export const UserManualPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<RoleTab>('student');

  const visibleTabs = React.useMemo(() => {
    const isAdmin = user?.role === 'admin' || user?.isAdmin;
    const isTeacher = user?.role === 'teacher';
    
    const allTabs: { id: RoleTab; label: string; icon: React.FC<any>; color: string }[] = [
      { id: 'admin', label: 'Admin Guide', icon: Shield, color: 'text-violet-600' },
      { id: 'teacher', label: 'Teacher Guide', icon: GraduationCap, color: 'text-blue-600' },
      { id: 'student', label: 'Student Manual', icon: User, color: 'text-emerald-600' }
    ];

    if (isAdmin) {
      return allTabs;
    }
    if (isTeacher) {
      return allTabs.filter(t => t.id === 'teacher' || t.id === 'student');
    }
    return allTabs.filter(t => t.id === 'student');
  }, [user]);

  useEffect(() => {
    if (visibleTabs.length > 0) {
      const isAdmin = user?.role === 'admin' || user?.isAdmin;
      const isTeacher = user?.role === 'teacher';
      
      if (isAdmin) {
        setActiveTab('admin');
      } else if (isTeacher) {
        setActiveTab('teacher');
      } else {
        setActiveTab('student');
      }
    }
  }, [visibleTabs, user]);

  const adminSections = [
    {
      title: 'School Identity & Settings',
      icon: Settings,
      color: 'bg-violet-50 text-violet-600',
      desc: 'Customize institution configurations and profile presets.',
      content: [
        'Navigate to "Settings" to define your school name, custom acronym, logo, and educational slogan.',
        'Set up academic sessions, terms, and promotion standards to align tracking databases.',
        'Define institutional parameters like departments, levels, and custom evaluation criteria.'
      ]
    },
    {
      title: 'Staff & Student Registries',
      icon: Users,
      color: 'bg-indigo-50 text-indigo-600',
      desc: 'Bulk-provision and manage credentials of the entire digital hub.',
      content: [
        'Add students individually or execute high-speed spreadsheet imports in bulk via the Students registry page.',
        'Assign teachers to specialized classrooms as Main Class Teachers or allocate assistant coverage.',
        'View audit logs or delete records cleanly to protect database health.'
      ]
    },
    {
      title: 'Curriculum & Setup Hubs',
      icon: ClipboardList,
      color: 'bg-sky-50 text-sky-600',
      desc: 'Orchestrate subjects, classes, and assign standard modules.',
      content: [
        'Seed unified national curriculum standards instantly inside the Subjects page to eliminate manual entries.',
        'Assign specialist class teachers to specific learning subjects or classrooms.',
        'Set up individual class streams and map core parameters like maximum capacities and current grade weightings.'
      ]
    },
    {
      title: 'Database & Security Guards',
      icon: Database,
      color: 'bg-rose-50 text-rose-600',
      desc: 'Perform system updates, database-backups, and handle licenses.',
      content: [
        'Utilize the Backup panel to download localized JSON state snapshots for external cold storage.',
        'Restore pre-existing backups seamlessly with automatic conflict-resolution checks.',
        'Monitor licensing active periods and enforce system guardrolls for active security.'
      ]
    }
  ];

  const teacherSections = [
    {
      title: 'Class Rosters & Student Directory',
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
      desc: 'Track and oversee students actively allocated to your classrooms.',
      content: [
        'Access the student directory to inspect demographic information and contact records of your assigned pupils.',
        'View custom lists of active student arrays who take subjects assigned to you.',
        'Navigate directly from assigned classrooms to personal educational portfolios.'
      ]
    },
    {
      title: 'Interactive Mark Entry System',
      icon: ClipboardList,
      color: 'bg-emerald-50 text-emerald-600',
      desc: 'Instantly populate score records, assessment points, and behaviors.',
      content: [
        'Utilize the unified Data Entry Hub to rapidly input student scores for Continuous Assessments and exams.',
        'The input form supports seamless keyboard shortcuts such as "Tab" to cycle input fields instantly.',
        'Changes are persisted automatically on background engines so you never lose grading progress.'
      ]
    },
    {
      title: 'Smart Attendance Roll-Call',
      icon: BookOpen,
      color: 'bg-indigo-50 text-indigo-600',
      desc: 'Track and mark student presence status effortlessly.',
      content: [
        'Register daily or subject-wide student presence and calculate aggregate student attendance percentages automatically.',
        'Generate analytical report values of student attendance records across specific terms.',
        'Apply uniform statuses to class subgroups in a single block flow.'
      ]
    },
    {
      title: 'Automated Report Compilations',
      icon: FileText,
      color: 'bg-purple-50 text-purple-600',
      desc: 'Compile performance metrics and customize final remarks.',
      content: [
        'Preview comprehensive progress sheets featuring detailed aggregates, positional rankings, and calculated grades.',
        'Add customized, personal teacher comments and executive principal summaries directly within report previews.',
        'Print compiled report cards to interactive physical sheets or export clean PDFs.'
      ]
    }
  ];

  const studentSections = [
    {
      title: 'Personalized Academic Portal',
      icon: User,
      color: 'bg-emerald-50 text-emerald-600',
      desc: 'Your visual student hub, records, and registration details.',
      content: [
        'View personalized user cards listing active registration statistics, department affiliations, and roll values.',
        'Track active enrollment dates and check your personal teacher advisor allocation records.'
      ]
    },
    {
      title: 'Attendance Ratios',
      icon: BookOpen,
      color: 'bg-cyan-50 text-cyan-600',
      desc: 'Monitor details of your real-time presence scores.',
      content: [
        'Inspect your aggregate attendance rates and presence histories across terms.',
        'Confirm if present lists are logged correctly by your assigned classroom instructors.'
      ]
    },
    {
      title: 'Fees & Transaction Records',
      icon: FileText,
      color: 'bg-indigo-50 text-indigo-600',
      desc: 'Track billing states and transaction histories securely.',
      content: [
        'Access live accounts statements illustrating billing fees, payment structures, and paid balances.',
        'Analyze payment cycles and review institutional accounts indicators for peace of mind.'
      ]
    },
    {
      title: 'Performance Sheet & Grades',
      icon: FileText,
      color: 'bg-blue-50 text-blue-600',
      desc: 'Access grade reports once released by administration.',
      content: [
        'Verify your grade reports, class standings, and aggregate progress stats securely.',
        'Inspect direct feedback and comments written for you by assigned course directors.'
      ]
    }
  ];

  const getActiveSections = () => {
    switch (activeTab) {
      case 'admin':
        return adminSections;
      case 'teacher':
        return teacherSections;
      case 'student':
        return studentSections;
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <PageHeader 
        title="Institutional Manual" 
        subtitle="Explore specialized usage guides, custom configurations, and feature roadmaps" 
      />

      {/* Role Selection Tabs */}
      {visibleTabs.length > 1 && (
        <div className="bg-slate-100 p-2 rounded-[2rem] inline-flex flex-wrap md:flex-nowrap gap-2 w-full max-w-4xl shadow-inner border border-gray-200/50">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-[0.625rem] font-bold uppercase tracking-widest transition-all ${
                  isSelected 
                    ? 'bg-slate-900 text-white shadow-xl shadow-gray-400/20 active:scale-95' 
                    : 'text-gray-500 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : tab.color}`} />
                {tab.label}
                {user?.role === tab.id && (
                  <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[0.5rem] font-black rounded-lg uppercase tracking-tight ml-1 animate-pulse">
                    You
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Detail Sections (8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">
              {activeTab === 'admin' && 'Administrator Manual'}
              {activeTab === 'teacher' && 'Instructor Manual'}
              {activeTab === 'student' && 'Student Portal Guide'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {getActiveSections().map((section, idx) => (
              <motion.div 
                key={section.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex gap-4 items-center">
                    <div className={`w-12 h-12 ${section.color} rounded-2xl flex items-center justify-center shrink-0 shadow-sm`}>
                      <section.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900 tracking-tight uppercase italic">
                        {section.title}
                      </h3>
                      <p className="text-[0.625rem] text-gray-400 font-bold uppercase tracking-wider mt-0.5 leading-none">
                        {section.desc}
                      </p>
                    </div>
                  </div>
                  <div className="h-px bg-gray-50" />
                  <ul className="space-y-3 pt-2">
                    {section.content.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-500 leading-relaxed font-semibold">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ROADMAP SECTION - COMING SOON */}
          <div className="bg-slate-900 rounded-[3rem] p-8 md:p-10 border border-slate-800 text-white relative overflow-hidden shadow-xl">
            <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[100px]" />
            <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-violet-500/10 rounded-full blur-[120px]" />

            <div className="relative space-y-6">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 bg-blue-500/20 border border-blue-400/30 text-blue-400 rounded-xl flex items-center gap-1.5 text-[0.625rem] font-black uppercase tracking-widest animate-pulse">
                  <Sparkles size={12} />
                  Development Roadmap
                </div>
                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                  <Clock size={12} className="text-slate-500" />
                  Next Upgrades
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-black italic tracking-tight uppercase">Coming Soon to UpRecord</h3>
                <p className="text-xs text-slate-400 mt-2 font-medium max-w-2xl leading-relaxed">
                  We are actively building core educational elements to enrich instruction delivery, interactive assessments, and real-time student home study loops.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                {/* Teacher Roadmap Card */}
                <div className="bg-white/5 border border-white/5 p-6 rounded-2xl space-y-4 hover:border-blue-500/30 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center">
                      <GraduationCap size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-white group-hover:text-blue-400 transition-colors">Teacher Advanced Toolkit</h4>
                      <p className="text-[0.625rem] text-slate-500 font-bold uppercase tracking-wider">Lesson Delivery & Testing</p>
                    </div>
                  </div>

                  <ul className="space-y-2.5 pt-1">
                    <li className="flex items-start gap-2.5 text-xs text-slate-300 font-medium">
                      <Send size={12} className="text-blue-400 mt-1 shrink-0" />
                      <div>
                        <strong className="text-white">Scheme of Work Builder:</strong> Plan full semester curriculum structures, outlines, and milestone markers.
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5 text-xs text-slate-300 font-medium">
                      <BookOpen size={12} className="text-blue-400 mt-1 shrink-0" />
                      <div>
                        <strong className="text-white">Class Lesson Notes:</strong> Draft, host, and publish learning materials and reading notes.
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5 text-xs text-slate-300 font-medium">
                      <ListTodo size={12} className="text-blue-400 mt-1 shrink-0" />
                      <div>
                        <strong className="text-white">Interactive Quiz Practice:</strong> Create digital self-assessments with instant grading feedback.
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5 text-xs text-slate-300 font-medium">
                      <Users size={12} className="text-blue-400 mt-1 shrink-0" />
                      <div>
                        <strong className="text-white">Specific Target Assignments:</strong> Direct homework to selected student lists based on learning paces.
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5 text-xs text-slate-300 font-medium">
                      <Video size={12} className="text-blue-400 mt-1 shrink-0" />
                      <div>
                        <strong className="text-white">Embedded Video Lessons:</strong> Link or host YouTube/Vimeo tutorials inside subject guides.
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Student Roadmap Card */}
                <div className="bg-white/5 border border-white/5 p-6 rounded-2xl space-y-4 hover:border-emerald-500/30 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
                      <User size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-white group-hover:text-emerald-400 transition-colors">Student Interactive Space</h4>
                      <p className="text-[0.625rem] text-slate-500 font-bold uppercase tracking-wider">Assignments & Submissions</p>
                    </div>
                  </div>

                  <ul className="space-y-2.5 pt-1">
                    <li className="flex items-start gap-2.5 text-xs text-slate-300 font-medium">
                      <FileQuestion size={12} className="text-emerald-400 mt-1 shrink-0" />
                      <div>
                        <strong className="text-white">Assignment Tracker:</strong> Real-time task board displaying upcoming, pending, and graded assessments.
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5 text-xs text-slate-300 font-medium">
                      <Send size={12} className="text-emerald-400 mt-1 shrink-0" />
                      <div>
                        <strong className="text-white">Digital Submission Portal:</strong> Upload text essays or media documents directly for review.
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5 text-xs text-slate-300 font-medium">
                      <Sparkles size={12} className="text-emerald-400 mt-1 shrink-0" />
                      <div>
                        <strong className="text-white">Personal Study Planner:</strong> Generate custom mock exam routines and doable review logs automatically.
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Support & Quick Info (4 cols on desktop) */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-200 relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 opacity-10">
              <HelpCircle size={200} />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black italic uppercase tracking-tight">Need Support?</h2>
              <p className="text-blue-100 text-xs leading-relaxed font-bold uppercase tracking-wide">
                Our support team is active to help configure and guide your institutional software.
              </p>
              <div className="pt-4">
                <a 
                  href="mailto:ifektivemedia@gmail.com"
                  className="inline-block px-6 py-3 bg-white text-blue-600 font-black rounded-xl hover:bg-blue-50 transition-all text-xs uppercase tracking-widest"
                >
                  Contact Support
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Quick Tips</h3>
            <div className="space-y-4">
              <Tip 
                title="Keyboard Shortcuts" 
                desc="Use 'Tab' to quickly move between student grade cells inside compiling hubs." 
              />
              <Tip 
                title="Auto-Save Engine" 
                desc="Grades feed background saving routines instantly, preventing loss during power delays." 
              />
              <Tip 
                title="Print to PDF" 
                desc="Choose 'Save as PDF' layout configurations before confirming final printed sheets." 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Tip: React.FC<{ title: string, desc: string }> = ({ title, desc }) => (
  <div className="flex gap-4">
    <div className="w-1 h-auto bg-blue-100 rounded-full" />
    <div className="space-y-1">
      <h4 className="text-sm font-black text-gray-900 tracking-tight uppercase italic">{title}</h4>
      <p className="text-xs text-gray-500 leading-relaxed font-bold uppercase tracking-wide">{desc}</p>
    </div>
  </div>
);

