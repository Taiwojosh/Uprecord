import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Cake, 
  Calendar, 
  ArrowLeft, 
  Edit2, 
  Printer, 
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  TrendingUp,
  CreditCard,
  BookOpen,
  ChevronRight,
  ShieldAlert,
  Camera
} from 'lucide-react';
import { db } from '../db/db';
import { Spinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

type TabType = 'overview' | 'academic' | 'attendance' | 'results' | 'documents';

export const StudentDetailsPage: React.FC = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const student = useLiveQuery(
    () => db.students.get(Number(studentId)),
    [studentId]
  );

  const studentClass = useLiveQuery(
    () => student ? db.classes.get(student.classId) : Promise.resolve(null),
    [student]
  );

  const attendance = useLiveQuery(
    () => student ? db.attendance.where('studentId').equals(Number(studentId)).toArray() : Promise.resolve([]),
    [studentId]
  );

  const grades = useLiveQuery(
    () => student ? db.grades.where('studentId').equals(Number(studentId)).toArray() : Promise.resolve([]),
    [studentId]
  );

  const subjects = useLiveQuery(
    () => student ? db.subjects.where('classId').equals(student.classId).toArray() : Promise.resolve([]),
    [student]
  );

  const settings = useLiveQuery(
    () => db.settings.where('schoolId').equals(user?.schoolId || 'school-1').first(),
    [user?.schoolId]
  );

  if (!student) return <div className="h-[60vh] flex items-center justify-center"><Spinner size="lg" /></div>;

  const isClassTeacher = studentClass && (studentClass.teacherId === Number(user?.id) || studentClass.teacherName === user?.fullName);
  const isAuthorizedToManage = user?.role === 'admin' || user?.isAdmin || (user?.role === 'teacher' && isClassTeacher);

  const isTeacher = user?.role === 'teacher';

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'academic', label: 'Academic' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'results', label: 'Results' },
    { id: 'documents', label: 'Documents' }
  ];

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      <Link 
        to="/students" 
        className="inline-flex items-center gap-2 text-[0.625rem] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-slate-900 transition-colors"
      >
        <ArrowLeft size={14} />
        Back
      </Link>

      {/* Profile Header Card */}
      <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-10">
          {/* Avatar Section */}
          <div className="relative group">
             <div className="w-32 h-32 bg-gray-50 rounded-[3rem] overflow-hidden border border-gray-100 flex items-center justify-center">
                {student.photoBase64 ? (
                  <img src={student.photoBase64} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-gray-300" />
                )}
             </div>
             {isAuthorizedToManage && (
               <button className="absolute -bottom-2 -right-2 p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-blue-600 transition-all shadow-xl shadow-gray-200/50">
                 <Camera size={16} />
               </button>
             )}
          </div>

          {/* Info Section */}
          <div className="flex-1 space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-4xl font-black text-gray-900 tracking-tighter italic uppercase">{student.fullName}</h1>
              <div className="flex items-center gap-2">
                 <Badge variant="outline" className="bg-gray-50 border-gray-100 text-[0.625rem] uppercase font-black tracking-widest px-4 py-2 rounded-xl">
                   {student.admissionNumber}
                 </Badge>
                 <Badge className="bg-slate-900 text-white text-[0.625rem] uppercase font-black tracking-widest px-4 py-2 rounded-xl">
                   {studentClass?.className || 'UNALLOCATED'}
                 </Badge>
                 <Badge variant={student.status === 'Active' ? 'success' : 'danger'} className="text-[0.625rem] uppercase font-black tracking-widest px-4 py-2 rounded-xl">
                   {student.status}
                 </Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-8 text-gray-400">
               <div className="flex items-center gap-2 group cursor-default">
                  <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
                    <Cake size={14} />
                  </div>
                  <span className="text-[0.6875rem] font-black uppercase tracking-widest italic">{student.dateOfBirth}</span>
               </div>
               <div className="flex items-center gap-2 group cursor-default">
                  <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
                    <User size={14} />
                  </div>
                  <span className="text-[0.6875rem] font-black uppercase tracking-widest italic">{student.gender}</span>
               </div>
               <div className="flex items-center gap-2 group cursor-default">
                  <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
                    <Calendar size={14} />
                  </div>
                  <span className="text-[0.6875rem] font-black uppercase tracking-widest italic">Enrolled {student.enrolledDate}</span>
               </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col lg:flex-row gap-3">
             {isAuthorizedToManage && (
                <button className="px-6 py-3 bg-white border border-gray-100 text-gray-600 rounded-2xl font-black text-[0.625rem] uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2">
                   <Edit2 size={16} />
                   Edit Profile
                </button>
             )}
             <button className="px-6 py-3 bg-white border border-gray-100 text-gray-600 rounded-2xl font-black text-[0.625rem] uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2">
                <Printer size={16} />
                Print Profile
             </button>
             {isAuthorizedToManage && (
                <button className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:text-gray-900 transition-colors">
                   <MoreVertical size={20} />
                </button>
             )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-10 border-b border-gray-100 px-6 overflow-x-auto scrollbar-none flex-nowrap whitespace-nowrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-4 text-[0.6875rem] font-black uppercase tracking-[0.2em] transition-all relative shrink-0 ${
              activeTab === tab.id ? 'text-slate-900' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
               <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-gray-900 italic tracking-tight uppercase leading-none">Personal Information</h3>
                  {isAuthorizedToManage && (
                    <button className="p-2 text-gray-400 hover:text-slate-900 transition-colors"><Edit2 size={16} /></button>
                  )}
               </div>
               
               <div className="space-y-6">
                  <DetailRow label="Full Identity" value={student.fullName} icon={User} />
                  <DetailRow label="Date of Birth" value={student.dateOfBirth} icon={Cake} />
                  <DetailRow label="Gender Orientation" value={student.gender} icon={User} />
                  <DetailRow label="Guardian Liaison" value={student.parentPhone || student.phone || 'Registry Unallocated'} icon={Phone} />
                  <DetailRow label="Primary Email" value={student.parentEmail || student.email || 'Registry Unallocated'} icon={Mail} />
                  <DetailRow label="Residential Address" value={student.address || 'Registry Unallocated'} icon={MapPin} />
                  <DetailRow label="Medical Context" value={student.medicalNotes || 'No specific notes registered.'} icon={AlertCircle} />
               </div>
            </div>

            <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
               <h3 className="text-xl font-black text-gray-900 italic tracking-tight uppercase leading-none">Academic Summary</h3>
               
               <div className="grid grid-cols-2 gap-6">
                  <StatItem label="Current Level" value={studentClass?.className || 'N/A'} icon={BookOpen} color="blue" />
                  <StatItem label="Facilitator" value={studentClass?.teacherName || 'None'} icon={User} color="purple" />
                  <StatItem label="Enrollment Date" value={student.enrolledDate || 'N/A'} icon={Calendar} color="amber" />
                  <StatItem label="Attendance Rate" value="94%" icon={CheckCircle2} color="emerald" />
                  <StatItem label="Average Score" value="78%" icon={TrendingUp} color="indigo" />
               </div>

               <div className="p-6 bg-gray-50 rounded-3xl space-y-4">
                  <p className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest italic">Previous Institution</p>
                  <p className="text-sm font-black text-gray-900 italic opacity-80">{student.previousSchool || 'No previous institution on record.'}</p>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'academic' && (
           <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <h3 className="text-xl font-black text-gray-900 italic tracking-tight uppercase mb-8">Registered Curriculum</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {subjects.map(subject => (
                   <div key={subject.id} className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 flex items-center justify-between group hover:border-blue-200 transition-all">
                      <div>
                         <p className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{subject.isCore ? 'Core Module' : 'Elective'}</p>
                         <h4 className="text-lg font-black text-gray-900 italic tracking-tight uppercase">{subject.subjectName}</h4>
                      </div>
                      <ChevronRight className="text-gray-300 group-hover:text-blue-500 transition-colors" size={20} />
                   </div>
                 ))}
              </div>
           </div>
        )}

        {/* Other tabs can be added similarly */}
        {(activeTab === 'results' || activeTab === 'attendance' || activeTab === 'documents') && (
           <div className="bg-white p-20 rounded-[2.5rem] border border-gray-100 shadow-sm text-center space-y-6">
              <div className="w-20 h-20 bg-gray-50 text-gray-300 rounded-[2rem] flex items-center justify-center mx-auto border border-gray-100">
                 <ShieldAlert size={32} />
              </div>
              <div>
                 <h3 className="text-xl font-black text-gray-900 italic tracking-tighter uppercase">{activeTab} Repository Protected</h3>
                 <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2">Data retrieval protocol in progress...</p>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

const DetailRow: React.FC<{ label: string, value: string, icon: any }> = ({ label, value, icon: Icon }) => (
  <div className="flex items-center gap-6 group">
     <div className="w-12 h-12 rounded-[1.25rem] bg-gray-50 flex items-center justify-center text-gray-300 border border-gray-100 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all shrink-0">
        <Icon size={18} />
     </div>
     <div className="flex-1 border-b border-gray-50 pb-4 group-hover:border-blue-100 transition-all">
        <p className="text-[0.5625rem] font-black text-gray-400 uppercase tracking-widest mb-1 italic opacity-80">{label}</p>
        <p className="text-[0.8125rem] font-black text-gray-900 tracking-tight italic">{value}</p>
     </div>
  </div>
);

const StatItem: React.FC<{ label: string, value: string, icon: any, color: string }> = ({ label, value, icon: Icon, color }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    teal: 'bg-teal-50 text-teal-600'
  };

  return (
    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-4 hover:bg-white hover:shadow-xl hover:shadow-gray-200/50 transition-all group">
       <div className={`w-10 h-10 rounded-xl ${colors[color]} flex items-center justify-center shadow-sm`}>
          <Icon size={18} />
       </div>
       <div>
          <p className="text-[0.5625rem] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-sm font-black text-gray-900 italic leading-none">{value}</p>
       </div>
    </div>
  );
};
