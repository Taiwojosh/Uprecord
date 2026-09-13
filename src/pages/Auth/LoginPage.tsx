import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Lock, Loader2, Eye, EyeOff, AlertCircle, Search, Building, Globe, Sparkles, Check, ArrowRight, X, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../../components/ui/Logo';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useToast } from '../../context/ToastContext';

type UserRole = 'admin' | 'teacher' | 'student';

const CLOUD_REGISTRY_SCHOOLS = [
  {
    schoolId: 'school-riverside',
    schoolName: 'Riverside International Academy',
    schoolSlogan: 'Excellence in Learning and Character',
    address: 'Abuja, FCT, Nigeria',
    brandColor: '#0284c7', // Sky-600
    email: 'admin@riverside.edu',
    testPassword: 'admin',
    teacherEmail: 'mensah@riverside.edu',
    studentAdmission: 'RIV-2025-001'
  },
  {
    schoolId: 'school-standard',
    schoolName: 'Standard Grace School',
    schoolSlogan: 'Knowledge, Diligence, and Grace',
    address: 'Ikeja, Lagos, Nigeria',
    brandColor: '#16a34a', // Green-600
    email: 'admin@standardgrace.edu',
    testPassword: 'admin',
    teacherEmail: 'mensah@standardgrace.edu',
    studentAdmission: 'SGR-2025-001'
  },
  {
    schoolId: 'school-uprecord',
    schoolName: 'UpRecord Demonstration Academy',
    schoolSlogan: 'Excellence, Innovation, and Character',
    address: 'Accra, Ghana',
    brandColor: '#DC2626', // Crimson Red
    email: 'admin@uprecord.edu',
    testPassword: 'admin',
    teacherEmail: 'mensah@uprecord.edu',
    studentAdmission: 'UPR-2025-001'
  }
];

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // School Finder State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loginBackupFileInputRef = React.useRef<HTMLInputElement>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(() => {
    return localStorage.getItem('scholarSync_activeSchoolId');
  });

  // Query Settings
  const settings = useLiveQuery(async () => {
    if (selectedSchoolId) {
      const s = await db.settings.where('schoolId').equals(selectedSchoolId).first();
      if (s) return s;
    }
    const first = await db.settings.toCollection().first();
    if (first) {
      if (!localStorage.getItem('scholarSync_activeSchoolId') && first.schoolId) {
        localStorage.setItem('scholarSync_activeSchoolId', first.schoolId);
      }
      return first;
    }
    return null;
  }, [selectedSchoolId]);

  // Query active school credentials to display on the quick-access helper card
  const schoolUsers = useLiveQuery(async () => {
    if (!settings?.schoolId) return [];
    return await db.users.where('schoolId').equals(settings.schoolId).toArray();
  }, [settings]);

  // Query students for matching admission codes in helper
  const studentsList = useLiveQuery(async () => {
    if (!settings?.schoolId) return [];
    return await db.students.where('schoolId').equals(settings.schoolId).toArray();
  }, [settings]);

  // Query all local settings to list registered options
  const localSchools = useLiveQuery(() => db.settings.toArray()) || [];

  // Filter and build matching schools list combining local + cloud demo registries
  const matchingSchools = React.useMemo(() => {
    const list: Array<{
      schoolId: string;
      schoolName: string;
      schoolSlogan: string;
      address: string;
      isActiveLocal: boolean;
      isCloudFallback: boolean;
      brandColor?: string;
    }> = [];

    // Add locally registered schools first
    localSchools.forEach(s => {
      // Prevent duplicates
      if (!list.some(x => x.schoolId === s.schoolId)) {
        list.push({
          schoolId: s.schoolId || 'school-1',
          schoolName: s.schoolName || 'UpRecord Academy',
          schoolSlogan: s.schoolSlogan || 'Molding Future Leaders',
          address: s.address || 'Local Device Storage',
          isActiveLocal: true,
          isCloudFallback: false,
          brandColor: s.brandColor
        });
      }
    });

    // Append cloud registries for restoration simulation
    CLOUD_REGISTRY_SCHOOLS.forEach(cs => {
      const exists = list.some(x => x.schoolId === cs.schoolId || x.schoolName.toLowerCase() === cs.schoolName.toLowerCase());
      if (!exists) {
        list.push({
          schoolId: cs.schoolId,
          schoolName: cs.schoolName,
          schoolSlogan: cs.schoolSlogan,
          address: cs.address,
          isActiveLocal: false,
          isCloudFallback: true,
          brandColor: cs.brandColor
        });
      }
    });

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(item => 
      item.schoolName.toLowerCase().includes(q) ||
      item.schoolSlogan.toLowerCase().includes(q) ||
      item.address.toLowerCase().includes(q)
    );
  }, [localSchools, searchQuery]);

  const handleSelectLocalSchool = (schoolId: string, schoolName: string) => {
    localStorage.setItem('scholarSync_activeSchoolId', schoolId);
    setSelectedSchoolId(schoolId);
    setEmail('');
    setPassword('');
    setError(null);
    showToast(`Switched workspace to "${schoolName}"!`, 'success');
    setIsSearchOpen(false);
  };

  const provisionCloudSchool = async (school: typeof CLOUD_REGISTRY_SCHOOLS[0]) => {
    setIsLoading(true);
    try {
      const existingSettings = await db.settings.where('schoolId').equals(school.schoolId).first();
      if (!existingSettings) {
        // Create settings registry entry
        await db.settings.add({
          schoolId: school.schoolId,
          schoolName: school.schoolName,
          schoolSlogan: school.schoolSlogan,
          address: school.address,
          logoBase64: '',
          principalName: 'The Principal',
          principalSignatureBase64: '',
          brandColor: school.brandColor,
          nextTermDate: '',
          termClosingDate: '',
          currentTerm: 1,
          currentSession: '2025/2026',
          totalSubjectScore: 100,
          examMaxScore: 60,
          caMaxScore: 40,
          caComponents: [
            { id: 'ca1', name: 'Continuous Assessment 1', maxScore: 20 },
            { id: 'ca2', name: 'Continuous Assessment 2', maxScore: 20 }
          ],
          daysSchoolOpen: 90,
          department1Name: 'Primary School',
          department2Name: 'Junior Secondary',
          department3Name: 'Senior Secondary',
          gradingScale: [
            { grade: 'A1', minScore: 75, remark: 'Excellent' },
            { grade: 'B2', minScore: 70, remark: 'Very Good' },
            { grade: 'B3', minScore: 65, remark: 'Good' },
            { grade: 'C4', minScore: 60, remark: 'Credit' },
            { grade: 'C5', minScore: 55, remark: 'Credit' },
            { grade: 'C6', minScore: 50, remark: 'Credit' },
            { grade: 'D7', minScore: 45, remark: 'Pass' },
            { grade: 'E8', minScore: 40, remark: 'Pass' },
            { grade: 'F9', minScore: 0, remark: 'Fail' }
          ]
        });

        // Create Admin credential profile
        await db.users.add({
          email: school.email,
          password: school.testPassword,
          fullName: 'School Administrator',
          role: 'admin',
          schoolId: school.schoolId
        });

        // Create Teacher credential profile
        const teacherId = await db.users.add({
          email: school.teacherEmail,
          password: 'password123',
          fullName: 'Dr. Robert Mensah',
          role: 'teacher',
          schoolId: school.schoolId,
          department: 'Senior Secondary',
          status: 'active',
          joinDate: new Date().toISOString().split('T')[0]
        });

        // Setup active classroom container
        const classId = await db.classes.add({
          className: 'SS 1 Academic',
          level: 'senior',
          teacherId: Number(teacherId),
          teacherName: 'Dr. Robert Mensah',
          capacity: 35,
          schoolId: school.schoolId
        });

        // Setup instructional subject 
        const subjectId = await db.subjects.add({
          subjectName: 'Mathematics',
          isCore: true,
          classId: Number(classId),
          teacherId: Number(teacherId),
          departmentIds: [3],
          schoolId: school.schoolId
        });

        // Setup standard student record
        const studentId = await db.students.add({
          admissionNumber: school.studentAdmission,
          fullName: 'Alex Johnson',
          dateOfBirth: '2012-05-14',
          gender: 'Male',
          classId: Number(classId),
          parentPhone: '+2348033123456',
          parentEmail: 'parent@uprecord.local',
          status: 'Active',
          enrolledDate: '2025-09-01',
          schoolId: school.schoolId
        });

        // Setup student login portal profile
        await db.users.add({
          email: `${school.studentAdmission.toLowerCase()}@uprecord.local`,
          password: 'password123',
          fullName: 'Alex Johnson',
          role: 'student',
          studentId: Number(studentId),
          schoolId: school.schoolId
        });

        // Seed default Term summary marks
        await db.grades.add({
          studentId: Number(studentId),
          subjectId: Number(subjectId),
          term: 1,
          session: '2025/2026',
          caScores: { ca1: 15, ca2: 15 },
          examScore: 50,
          total: 80,
          grade: 'A1',
          remark: 'Exceptional work.',
          schoolId: school.schoolId
        });

        // Seed basic open details for attendance to keep components active
        await db.attendance.add({
          studentId: Number(studentId),
          term: 1,
          session: '2025/2026',
          daysPresent: 88,
          totalDays: 90,
          schoolId: school.schoolId
        });
      }

      localStorage.setItem('scholarSync_activeSchoolId', school.schoolId);
      setSelectedSchoolId(school.schoolId);
      setEmail('');
      setPassword('');
      setError(null);

      showToast(`Profile restored! Active workspace: "${school.schoolName}"`, 'success');
      setIsSearchOpen(false);
    } catch (err: any) {
      console.error(err);
      showToast('Error mimicking cloud profile sync.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginBackupImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      let importedSchoolId = '';
      
      if (data.settings && Array.isArray(data.settings) && data.settings.length > 0) {
        importedSchoolId = data.settings[0].schoolId;
      } else {
        for (const tableName in data) {
          const arr = data[tableName];
          if (Array.isArray(arr) && arr.length > 0) {
            const firstWithSchoolId = arr.find((item: any) => item && item.schoolId);
            if (firstWithSchoolId) {
              importedSchoolId = firstWithSchoolId.schoolId;
              break;
            }
          }
        }
      }

      if (!importedSchoolId) {
        importedSchoolId = 'school-imported-' + Date.now();
      }

      let recordsCount = 0;
      for (const tableName in data) {
        const table = db.table(tableName);
        if (table) {
          const records = data[tableName];
          if (Array.isArray(records) && records.length > 0) {
            const itemsToUpsert = records.map((r: any) => ({
              ...r,
              schoolId: r.schoolId || importedSchoolId
            }));

            try {
              await table.where('schoolId').equals(importedSchoolId).delete();
            } catch (err) {
              // Ignore if not filterable on schoolId index
            }

            await table.bulkPut(itemsToUpsert);
            recordsCount += itemsToUpsert.length;
          }
        }
      }

      // Re-query settings to verify structure exists for active view
      const checkSettings = await db.settings.where('schoolId').equals(importedSchoolId).first();
      if (!checkSettings) {
        await db.settings.add({
          schoolId: importedSchoolId,
          schoolName: 'Imported School Workspace',
          schoolSlogan: 'Restored from Backup snapshot',
          address: 'Imported Storage Sandbox',
          logoBase64: '',
          principalName: 'Administrator',
          principalSignatureBase64: '',
          brandColor: '#4f46e5',
          nextTermDate: '',
          termClosingDate: '',
          currentTerm: 1,
          currentSession: '2025/2026',
          totalSubjectScore: 100,
          examMaxScore: 60,
          caMaxScore: 40,
          caComponents: [
            { id: 'ca1', name: 'Continuous Assessment 1', maxScore: 20 },
            { id: 'ca2', name: 'Continuous Assessment 2', maxScore: 20 }
          ],
          daysSchoolOpen: 90,
          department1Name: 'Primary School',
          department2Name: 'Junior Secondary',
          department3Name: 'Senior Secondary',
          gradingScale: [
            { grade: 'A1', minScore: 75, remark: 'Excellent' },
            { grade: 'B2', minScore: 70, remark: 'Very Good' },
            { grade: 'B3', minScore: 65, remark: 'Good' },
            { grade: 'C4', minScore: 60, remark: 'Credit' },
            { grade: 'C5', minScore: 55, remark: 'Credit' },
            { grade: 'C6', minScore: 50, remark: 'Credit' },
            { grade: 'D7', minScore: 45, remark: 'Pass' },
            { grade: 'E8', minScore: 40, remark: 'Pass' },
            { grade: 'F9', minScore: 0, remark: 'Fail' }
          ]
        });
      }

      localStorage.setItem('scholarSync_activeSchoolId', importedSchoolId);
      setSelectedSchoolId(importedSchoolId);
      setEmail('');
      setPassword('');
      
      showToast(`Imported ${recordsCount} records! Switch complete.`, 'success');
      setIsSearchOpen(false);
    } catch (err: any) {
      console.error(err);
      setError('Failed to import backup: ' + (err.message || 'Malformed file.'));
      showToast('Error parsing backup snapshot file.', 'error');
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const activeSchoolId = settings?.schoolId || 'school-1';

    try {
      if (email && password) {
        await new Promise(resolve => setTimeout(resolve, 600));
        
        let existingUser;
        if (role === 'student') {
          const student = await db.students
            .where('admissionNumber')
            .equalsIgnoreCase(email.trim())
            .filter(s => s.schoolId === activeSchoolId)
            .first();
          if (student) {
            existingUser = await db.users
              .where('studentId')
              .equals(student.id!)
              .filter(u => u.schoolId === activeSchoolId)
              .first();
          }
        } else {
          existingUser = await db.users
            .where('email')
            .equalsIgnoreCase(email.trim())
            .filter(u => u.schoolId === activeSchoolId)
            .first();
        }
        
        if (existingUser) {
          if (existingUser.role !== role) {
            setError(`This account belongs to a different role (${existingUser.role.toUpperCase()}). Please select the correct tab above.`);
            setIsLoading(false);
            return;
          }
          
          const expectedPassword = existingUser.password || (existingUser.role === 'admin' ? 'admin' : 'password123');
          if (password !== expectedPassword) {
            setError('Incorrect password. Please try again.');
            setIsLoading(false);
            return;
          }
          
          await login('token-' + Date.now(), {
            ...existingUser,
            id: existingUser.id!.toString()
          });
          
          if (role === 'teacher') {
            navigate('/teacher-portal');
          } else if (role === 'student') {
            navigate('/student-portal');
          } else {
            navigate('/dashboard');
          }
        } else {
          // Special fallback for initial default admin of school-1
          if (activeSchoolId === 'school-1' && email === 'admin@scholar-sync.local' && password === 'admin' && role === 'admin') {
            const adminExists = await db.users.where('email').equals('admin@scholar-sync.local').first();
            if (!adminExists) {
              await db.users.add({
                email: 'admin@scholar-sync.local',
                fullName: 'System Administrator',
                role: 'admin',
                schoolId: 'school-1',
                password: 'admin'
              });
            }
            await login('token-' + Date.now(), {
              email: 'admin@scholar-sync.local',
              fullName: 'System Administrator',
              role: 'admin',
              schoolId: 'school-1',
              id: 'local-admin'
            });
            navigate('/dashboard');
            return;
          }
          setError(`No valid ${role} account found matching credentials for this school workspace.`);
        }
      } else {
         setError('Please fill all credentials.');
      }
    } catch (err: any) {
      setError('Unable to authenticate. Please verify and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
      <div className="w-full max-w-[480px]">
        <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-xl border border-slate-100">
          
          {/* School Header */}
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-4 overflow-hidden shadow-inner border border-slate-50 relative group">
               {settings?.logoBase64 ? (
                 <img src={settings.logoBase64} alt="Logo" className="w-full h-full object-cover" />
               ) : (
                 <span className="text-2xl font-black uppercase text-slate-700 italic">
                   {settings?.schoolName?.charAt(0) || <Logo size={32} />}
                 </span>
               )}
            </div>
            
            <h2 className="text-xl font-black text-slate-800 leading-tight">
              {settings?.schoolName || 'UpRecord Portal'}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              {settings?.schoolSlogan || 'Molding Future Leaders'}
            </p>

            {/* School Finder / Switch Trigger */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(true);
                }}
                className="px-3.5 py-1.5 bg-blue-50/70 text-blue-600 hover:bg-blue-100/80 border border-blue-100/50 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Search size={11} />
                Find / Switch School
              </button>

              <button
                type="button"
                onClick={() => loginBackupFileInputRef.current?.click()}
                className="px-3.5 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Upload size={11} />
                Import Backup
              </button>
            </div>
          </div>

          {/* Role selection tab row */}
          <div className="flex p-1 bg-slate-50 border border-slate-100 rounded-2xl mb-6">
            {(['admin', 'teacher', 'student'] as UserRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2.5 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${
                  role === r 
                    ? 'bg-slate-800 text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {location.state?.message && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 animate-fade-in text-left">
              <span className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">✓</span>
              <p className="text-xs text-emerald-800 font-bold leading-tight">{location.state.message}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between text-left animate-fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-bold leading-normal">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold px-1 text-sm">&times;</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block ml-1">
                {role === 'student' ? 'Admission Number' : 'Email Identity'}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={role === 'student' ? 'text' : 'email'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 h-[44px] bg-slate-50/50 border border-slate-100 rounded-2xl focus:border-slate-800 focus:bg-white outline-none transition-all text-xs font-bold placeholder:text-slate-400"
                  placeholder={role === 'student' ? 'e.g. SCH-2025-001' : 'yourname@school-domain.edu'}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Password</label>
                <Link to="/forgot-password" title="Forgot Password Page Link" className="text-[10px] text-slate-400 font-semibold hover:text-slate-700 hover:underline">Forgot?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 h-[44px] bg-slate-50/50 border border-slate-100 rounded-2xl focus:border-slate-800 focus:bg-white outline-none transition-all text-xs font-bold placeholder:text-slate-400"
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[46px] bg-slate-800 hover:bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 group disabled:opacity-50 mt-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In To Portal</span>
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Quick Access Credentials Panel */}
          {settings && (
            <div className="mt-6 p-4 rounded-3xl bg-amber-50/40 border border-amber-100/50 space-y-2.5 text-left animate-fade-in">
              <div className="flex items-center gap-1.5 text-amber-800">
                <Sparkles size={11} className="text-amber-500 shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                  Quick Evaluation Profiles (Click to fill)
                </span>
              </div>
              
              <div className="flex flex-col gap-1.5">
                {schoolUsers && schoolUsers.length > 0 ? (
                  schoolUsers.filter(u => u.role === role).slice(0, 3).map((usr) => {
                    const displayCredential = usr.role === 'student' 
                      ? (studentsList?.find(s => s.id === usr.studentId)?.admissionNumber || 'SCH-2025-001')
                      : usr.email;
                      
                    const displayPassword = usr.password || (usr.role === 'admin' ? 'admin' : 'password123');

                    return (
                      <button
                        key={usr.id}
                        type="button"
                        onClick={() => {
                          setEmail(displayCredential);
                          setPassword(displayPassword);
                          showToast(`Pre-filled ${usr.fullName || usr.role} credentials!`, 'info');
                        }}
                        className="w-full text-left bg-white hover:bg-amber-100/30 border border-amber-200/20 hover:border-amber-200/60 p-2.5 rounded-xl flex items-center justify-between transition-all group"
                      >
                        <div>
                          <span className="text-[9px] font-black text-amber-800 uppercase tracking-tight block">
                            {usr.fullName || 'Member Portal'}
                          </span>
                          <span className="text-[11px] font-bold text-slate-600 block truncate max-w-[210px] mt-0.5">
                            {usr.role === 'student' ? `ID: ${displayCredential}` : displayCredential}
                          </span>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-2">
                          <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                            {displayPassword}
                          </span>
                          <span className="text-[8px] font-black text-amber-600 group-hover:translate-x-0.5 transition-all text-right uppercase tracking-wider block">
                            Fill &rarr;
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-[10px] text-slate-400 italic font-semibold">No pre-configured users found. Use default admin/admin fallback or register.</p>
                )}
                {schoolUsers && schoolUsers.filter(u => u.role === role).length === 0 && (
                  <div className="p-3 bg-white rounded-xl border border-amber-100/20 text-center">
                    <p className="text-[10px] text-slate-400 font-bold italic">
                      No credentials indexed for "{role.toUpperCase()}" selection on this school registry.
                    </p>
                    {role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setEmail('admin@scholar-sync.local');
                          setPassword('admin');
                        }}
                        className="mt-1 text-[9px] text-blue-600 font-black uppercase hover:underline"
                      >
                        Click to use Local System Admin (admin@scholar-sync.local / admin)
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-slate-50 flex flex-col items-center gap-3">
             <div className="flex items-center gap-2 text-xs text-slate-400">
               <span>New school?</span>
               <Link to="/register" title="Register School Page Link" className="text-slate-800 font-black hover:underline">Register your school</Link>
             </div>
             <p className="text-[10px] text-slate-450 font-semibold italic">Having trouble? Contact support desk</p>
          </div>
        </div>
      </div>

      {/* School Registry Finder Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-scale-up">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-50 relative flex items-start justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">School Registry Search</h3>
                <p className="text-xs font-semibold text-slate-400 leading-normal mt-0.5">
                  Select an existing school workspace or restore a virtual cloud registry.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="p-4 bg-slate-50/50 border-b border-slate-50">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type school name, slogan, or state..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 h-[44px] bg-white border border-slate-250/70 rounded-xl focus:border-slate-800 outline-none transition-all text-xs font-bold placeholder:text-slate-400"
                  autoFocus
                />
              </div>
            </div>

            {/* Matching Schools List container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {matchingSchools.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <Building className="w-12 h-12 text-slate-350 mx-auto" />
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider">No matching school registry</p>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed max-w-xs mx-auto">
                    We couldn't locate any local or cloud registries under that query. Please double check the spelling, clear query to view all, or register a new instance.
                  </p>
                </div>
              ) : (
                matchingSchools.map((sch) => {
                  const isActive = settings?.schoolId === sch.schoolId;
                  
                  return (
                    <div
                      key={sch.schoolId}
                      onClick={() => {
                        if (sch.isCloudFallback) {
                          const originalCloud = CLOUD_REGISTRY_SCHOOLS.find(c => c.schoolId === sch.schoolId);
                          if (originalCloud) {
                            provisionCloudSchool(originalCloud);
                          }
                        } else {
                          handleSelectLocalSchool(sch.schoolId, sch.schoolName);
                        }
                      }}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all flex items-center justify-between group ${
                        isActive 
                          ? 'bg-blue-50/40 border-blue-200' 
                          : 'bg-white hover:bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="flex gap-3 items-center min-w-0">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shrink-0 italic text-sm shadow-sm"
                          style={{ backgroundColor: sch.brandColor || '#0f172a' }}
                        >
                          {sch.schoolName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight truncate max-w-[200px]">
                              {sch.schoolName}
                            </h4>
                            {sch.isCloudFallback ? (
                              <span className="bg-amber-55 bg-amber-50 text-amber-700 border border-amber-100 text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                <Globe size={8} /> CLOUD REGISTRY
                              </span>
                            ) : (
                              <span className="bg-slate-50 text-slate-500 border border-slate-100 text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-md">
                                LOCAL DEVICE
                              </span>
                            )}
                            {isActive && (
                              <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                ACTIVE WORKSPACE
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-semibold text-slate-400 italic line-clamp-1 mt-0.5">{sch.schoolSlogan}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{sch.address}</p>
                        </div>
                      </div>
                      
                      <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-blue-100 text-slate-400 group-hover:text-blue-600 flex items-center justify-center transition-all shrink-0 ml-2">
                        <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>Can't find your school?</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(false);
                    navigate('/register');
                  }}
                  className="text-blue-600 font-bold hover:underline"
                >
                  Register School
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(false);
                  loginBackupFileInputRef.current?.click();
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-1.5 transition-all w-full sm:w-auto justify-center cursor-pointer"
              >
                <Upload size={12} />
                <span>Restore Backup File</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Hidden file input for backup imports outside of active workspace */}
      <input 
        type="file" 
        ref={loginBackupFileInputRef}
        onChange={handleLoginBackupImport}
        accept=".json"
        className="hidden"
      />

    </div>
  );
}
