import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  GraduationCap, 
  Calendar, 
  Hash, 
  MapPin, 
  Phone, 
  Mail, 
  AlertCircle,
  Camera,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { db, type IStudent, type IClass, type ISettings } from '../../db/db';
import { Modal } from '../ui/Modal';
import { useToast } from '../../context/ToastContext';
import { motion, AnimatePresence } from 'motion/react';
import { useScopedDb } from '../../hooks/useScopedDb';

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingStudent: IStudent | null;
  classes: IClass[];
}

type TabType = 'personal' | 'academic';

export const StudentModal: React.FC<StudentModalProps> = ({
  isOpen,
  onClose,
  editingStudent,
  classes
}) => {
  const { schoolId } = useScopedDb();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('personal');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [settings, setSettings] = useState<ISettings | null>(null);

  const [formData, setFormData] = useState<Partial<IStudent & { password?: string }>>({
    fullName: '',
    admissionNumber: '',
    classId: 0,
    gender: 'Male',
    dateOfBirth: '',
    status: 'Active',
    enrolledDate: new Date().toISOString().split('T')[0],
    address: '',
    parentPhone: '',
    parentEmail: '',
    previousSchool: '',
    medicalNotes: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    const fetchPortalCreds = async () => {
      const settingsData = await db.settings.toCollection().first();
      if (settingsData) {
        setSettings(settingsData);
      }

      if (editingStudent) {
        let studentEmail = editingStudent.email || '';
        let studentPassword = 'student123';
        
        if (editingStudent.id) {
          const portalUser = await db.users.where('studentId').equals(editingStudent.id).first();
          if (portalUser) {
            studentEmail = portalUser.email || studentEmail;
            studentPassword = portalUser.password || studentPassword;
          }
        }

        // Auto-match departmentId if only departmentName is set
        let resolvedDeptId = editingStudent.departmentId;
        if (!resolvedDeptId && editingStudent.departmentName && settingsData) {
          const dName = editingStudent.departmentName.trim().toLowerCase();
          if (settingsData.department1Name && settingsData.department1Name.trim().toLowerCase() === dName) {
            resolvedDeptId = 1;
          } else if (settingsData.department2Name && settingsData.department2Name.trim().toLowerCase() === dName) {
            resolvedDeptId = 2;
          } else if (settingsData.department3Name && settingsData.department3Name.trim().toLowerCase() === dName) {
            resolvedDeptId = 3;
          }
        }
        
        setFormData({
          ...editingStudent,
          fullName: editingStudent.fullName || '',
          admissionNumber: editingStudent.admissionNumber || '',
          dateOfBirth: editingStudent.dateOfBirth || '',
          gender: editingStudent.gender || 'Male',
          status: editingStudent.status || 'Active',
          address: editingStudent.address || '',
          parentPhone: editingStudent.parentPhone || '',
          parentEmail: editingStudent.parentEmail || '',
          previousSchool: editingStudent.previousSchool || '',
          medicalNotes: editingStudent.medicalNotes || '',
          email: studentEmail,
          password: studentPassword,
          departmentId: resolvedDeptId
        });
      } else {
        setFormData({
          fullName: '',
          admissionNumber: `STU-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          classId: classes[0]?.id || 0,
          gender: 'Male',
          dateOfBirth: '2010-01-01',
          status: 'Active',
          enrolledDate: new Date().toISOString().split('T')[0],
          address: '',
          parentPhone: '',
          parentEmail: '',
          previousSchool: '',
          medicalNotes: '',
          email: '',
          password: 'student123',
          departmentId: null,
          departmentName: ''
        });
      }
    };
    
    fetchPortalCreds();
    setActiveTab('personal');
    setIsSuccess(false);
  }, [editingStudent, isOpen, classes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const activeSchoolId = schoolId || 'school-1';
    try {
      const studentFields: IStudent = {
        schoolId: activeSchoolId,
        admissionNumber: formData.admissionNumber || '',
        fullName: formData.fullName || '',
        dateOfBirth: formData.dateOfBirth || '',
        classId: formData.classId || 0,
        gender: formData.gender || 'Male',
        status: formData.status || 'Active',
        enrolledDate: formData.enrolledDate || '',
        address: formData.address,
        parentPhone: formData.parentPhone,
        parentEmail: formData.parentEmail,
        previousSchool: formData.previousSchool,
        medicalNotes: formData.medicalNotes,
        email: formData.email,
        departmentName: formData.departmentName,
        departmentId: formData.departmentId
      };

      if (editingStudent) {
        await db.students.update(editingStudent.id!, studentFields);
        
        // Update user record if exists, otherwise create
        if (formData.email) {
          const existingUser = await db.users.where('studentId').equals(editingStudent.id!).first();
          if (existingUser) {
            await db.users.update(existingUser.id!, {
              email: formData.email,
              fullName: formData.fullName || '',
              password: formData.password || 'student123'
            });
          } else {
            await db.users.add({
              email: formData.email,
              fullName: formData.fullName || '',
              role: 'student',
              password: formData.password || 'student123',
              studentId: editingStudent.id!,
              schoolId: activeSchoolId
            });
          }
        }
        
        showToast('Student record updated successfully', 'success');
        onClose();
      } else {
        const addedId = await db.students.add(studentFields);
        
        // Create user record for student Portal login
        if (formData.email) {
          await db.users.add({
            email: formData.email,
            fullName: formData.fullName || '',
            role: 'student',
            password: formData.password || 'student123',
            studentId: addedId,
            schoolId: activeSchoolId
          });
        }
        
        setIsSuccess(true);
      }
    } catch (error) {
      showToast('Critical: Operation failed', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={editingStudent ? "Refine Student Record" : "Establish New Student Profile"}
      maxWidth="max-w-2xl"
    >
      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="py-12 flex flex-col items-center text-center space-y-6"
          >
             <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-inner shadow-emerald-200/50">
                <CheckCircle2 size={40} />
             </div>
             <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-900 italic tracking-tighter uppercase">Profile Established</h3>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{formData.fullName} has been indexed successfully.</p>
             </div>
             <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setIsSuccess(false)}
                  className="px-6 py-3 bg-gray-50 text-gray-600 rounded-2xl font-black text-[0.625rem] uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-100"
                >
                  Register Another
                </button>
                <button 
                  onClick={onClose}
                  className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[0.625rem] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/10"
                >
                  Exit Registry
                </button>
             </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex gap-1 bg-gray-50 p-1.5 rounded-2xl">
              {(['personal', 'academic'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 rounded-xl text-[0.625rem] font-black uppercase tracking-widest transition-all ${
                    activeTab === tab ? 'bg-white shadow-sm text-slate-900 border border-gray-100' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab === 'personal' ? 'Identity Context' : 'Academic Logic'}
                </button>
              ))}
            </div>

            <div className="space-y-8 min-h-[400px]">
              {activeTab === 'personal' && (
                <motion.div 
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-6"
                >
                  <div className="sm:col-span-2 flex items-center gap-6 pb-4">
                     <div className="w-20 h-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 group cursor-pointer hover:border-blue-400 transition-all">
                        <Camera size={24} />
                        <span className="text-[0.5rem] font-black uppercase tracking-tighter mt-1">LENS</span>
                     </div>
                     <div className="flex-1 space-y-2">
                        <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Full Legal Identify</label>
                        <input
                          type="text"
                          required
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-sm font-black italic uppercase placeholder:opacity-50"
                          placeholder="Surname First, Other Names..."
                        />
                     </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Date of Birth</label>
                    <input
                      type="date"
                      required
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-sm font-black"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Gender Identification</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-sm font-black appearance-none"
                    >
                      <option value="Male">Masculine (Male)</option>
                      <option value="Female">Feminine (Female)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Guardian Liaison Phone</label>
                    <input
                      type="tel"
                      value={formData.parentPhone}
                      onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-sm font-black"
                      placeholder="+234..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Guardian Digital Address</label>
                    <input
                      type="email"
                      value={formData.parentEmail}
                      onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-sm font-black placeholder:opacity-50"
                      placeholder="parent@domain.com"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Residential Coordinates</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={2}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-sm font-black italic"
                      placeholder="Full residential address details..."
                    />
                  </div>
                </motion.div>
              )}

              {activeTab === 'academic' && (
                <motion.div 
                  initial={{ x: 10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="space-y-8"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Department Allocation</label>
                       <select
                         value={formData.departmentId || ''}
                         onChange={(e) => {
                           const val = e.target.value;
                           const deptIdIndex = val ? Number(val) : null;
                           let deptNameStr = '';
                           if (deptIdIndex === 1) {
                             deptNameStr = settings?.department1Name || 'Arts and Humanities';
                           } else if (deptIdIndex === 2) {
                             deptNameStr = settings?.department2Name || 'Business';
                           } else if (deptIdIndex === 3) {
                             deptNameStr = settings?.department3Name || 'Science';
                           }
                           setFormData({
                             ...formData,
                             departmentId: deptIdIndex,
                             departmentName: deptNameStr
                           });
                         }}
                         className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-sm font-black appearance-none"
                       >
                         <option value="">General / No Department</option>
                         {settings?.department1Name && (
                           <option value={1}>{settings.department1Name}</option>
                         )}
                         {settings?.department2Name && (
                           <option value={2}>{settings.department2Name}</option>
                         )}
                         {settings?.department3Name && (
                           <option value={3}>{settings.department3Name}</option>
                         )}
                       </select>
                     </div>
                    <div className="space-y-2">
                      <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Level Allocation</label>
                      <select
                        required
                        value={formData.classId}
                        onChange={(e) => setFormData({ ...formData, classId: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-sm font-black appearance-none"
                      >
                        <option value={0}>Select Academic Class...</option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.className}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                        Admission ID / Reg Number
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.admissionNumber}
                        onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-sm font-black uppercase"
                        placeholder="e.g. SCH/2026/001, REG-123_A"
                      />
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">
                        Supports custom formats and signs like /, -, _, and commas.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Register Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-sm font-black appearance-none"
                      >
                        <option value="Active">Active Enrollment</option>
                        <option value="Inactive">Inactive/On Leave</option>
                        <option value="Suspended">Disciplinary Suspension</option>
                        <option value="Graduated">Graduated Alumni</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Date of Admission</label>
                      <input
                        type="date"
                        value={formData.enrolledDate}
                        onChange={(e) => setFormData({ ...formData, enrolledDate: e.target.value })}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-sm font-black"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Previous Academic Institution</label>
                    <input
                      type="text"
                      value={formData.previousSchool}
                      onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-sm font-black italic"
                      placeholder="Name of last school attended..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                       Medical Intelligence <AlertCircle size={12} className="text-amber-500" />
                    </label>
                    <textarea
                      value={formData.medicalNotes}
                      onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                      rows={2}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-sm font-black italic"
                      placeholder="Note allergies, chronic conditions, etc..."
                    />
                  </div>

                  {/* Portal Credentials */}
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-[2rem] space-y-4 sm:col-span-2">
                    <div>
                      <h4 className="text-sm font-black italic tracking-tight text-slate-800">Student Portal Access Credentials</h4>
                      <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Define login info for student workspace portal</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[0.625rem] font-black text-slate-500 uppercase tracking-widest ml-1">Student Portal Email</label>
                        <input
                          type="email"
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-bold text-xs"
                          placeholder="student@domain.com"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[0.625rem] font-black text-slate-500 uppercase tracking-widest ml-1">Login Password</label>
                        <div className="relative w-full">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={formData.password || ''}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full pl-5 pr-10 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-bold text-xs"
                            placeholder="student123"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="pt-8 border-t border-gray-100 flex items-center justify-between gap-4">
               <button 
                type="button"
                onClick={onClose}
                className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest hover:text-rose-600 transition-colors"
               >
                 Cancel Operation
               </button>
               <button 
                type="submit"
                disabled={isSaving}
                className="flex-[2] py-5 bg-slate-900 text-white font-black text-[0.6875rem] uppercase tracking-[0.2em] rounded-3xl hover:bg-black transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed italic"
               >
                 {isSaving ? 'Processing Profile...' : (editingStudent ? 'Commit Record Refinements' : 'Authorize Student Profile')}
               </button>
            </div>
          </form>
        )}
      </AnimatePresence>
    </Modal>
  );
};
