import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2, ArrowRight, School, UserPlus, Building } from 'lucide-react';
import api from '../../lib/api';
import { Logo } from '../../components/ui/Logo';
import { db } from '../../db/db';

export function RegisterPage() {
  const [schoolName, setSchoolName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (schoolName && adminName && email && password) {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Check if user already exists
        const existing = await db.users.where('email').equalsIgnoreCase(email.trim()).first();
        if (existing) {
          setError('A user account with this email address is already registered.');
          setIsLoading(false);
          return;
        }

        const targetSchoolId = 'school-' + Math.random().toString(36).substring(2, 11);

        // Persistent user creation in local Dev Dexie DB
        await db.users.add({
          email: email.trim().toLowerCase(),
          password: password,
          fullName: adminName.trim(),
          role: 'admin',
          schoolId: targetSchoolId
        });

        // Add new settings for the new school
          await db.settings.add({
            schoolId: targetSchoolId,
            schoolName: schoolName.trim(),
            schoolSlogan: 'Molding Future Leaders',
            address: 'Nigeria',
            logoBase64: '',
            principalName: 'The Principal',
            principalSignatureBase64: '',
            brandColor: '#0f172a', // Slate-900
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

        // Seed 1 Facilitator account
        const t1Id = await db.users.add({
          email: 'mensah@uprecord.local',
          password: 'password123',
          fullName: 'Dr. Robert Mensah',
          role: 'teacher',
          schoolId: targetSchoolId,
          department: 'Senior Secondary',
          status: 'active',
          joinDate: new Date().toISOString().split('T')[0]
        });

        // Seed 1 Class
        const c1Id = await db.classes.add({
          className: 'SS 1 Science',
          level: 'senior',
          teacherId: Number(t1Id),
          teacherName: 'Dr. Robert Mensah',
          capacity: 35,
          schoolId: targetSchoolId
        });

        // Seed 1 Subject
        const s1Id = await db.subjects.add({
          subjectName: 'Mathematics',
          isCore: true,
          classId: Number(c1Id),
          teacherId: Number(t1Id),
          departmentIds: [3],
          schoolId: targetSchoolId
        });

        // Seed 1 Student
        const stu1Id = await db.students.add({
          admissionNumber: 'UPR-2025-001',
          fullName: 'Adamu Haruna',
          dateOfBirth: '2012-05-14',
          gender: 'Male',
          classId: Number(c1Id),
          parentPhone: '+2348033123456',
          parentEmail: 'haruna@uprecord.local',
          status: 'Active',
          enrolledDate: '2025-09-01',
          schoolId: targetSchoolId
        });

        // Seed 1 Term Grade
        await db.grades.add({
          studentId: Number(stu1Id),
          subjectId: Number(s1Id),
          term: 1,
          session: '2025/2026',
          caScores: { ca1: 12, ca2: 14 },
          examScore: 45,
          total: 71,
          grade: 'B2',
          remark: 'Good.',
          schoolId: targetSchoolId
        });

        // Seed 1 Payment
        await db.payments.add({
          studentId: Number(stu1Id),
          amount: 100000,
          category: 'Tuition',
          term: 1,
          session: '2025/2026',
          paymentMethod: 'Bank Transfer',
          status: 'paid',
          date: new Date().toISOString(),
          schoolId: targetSchoolId
        });

        // Seed 1 Attendance
        await db.attendance.add({
          studentId: Number(stu1Id),
          term: 1,
          session: '2025/2026',
          daysPresent: 85,
          totalDays: 90,
          schoolId: targetSchoolId
        });

        // Seed 1 Announcement
        await db.announcements.add({
          title: "Welcome!",
          content: `Welcome to ${schoolName.trim()}.`,
          isPinned: true,
          authorName: "System",
          createdAt: new Date().toISOString(),
          schoolId: targetSchoolId
        });

        // Seed 1 Task
        await db.tasks.add({
          label: "Initial Setup",
          priority: "LOW",
          color: "slate",
          completed: false,
          createdAt: new Date().toISOString(),
          schoolId: targetSchoolId
        });

        // Seed 1 Audit Log
        await db.auditLogs.add({
          userId: 'system',
          userName: 'System Administrator',
          action: 'School registered',
          details: 'Seeded minimal demo data.',
          timestamp: new Date().toISOString(),
          schoolId: targetSchoolId
        });

        localStorage.setItem('scholarSync_activeSchoolId', targetSchoolId);
        navigate('/login', { state: { message: 'Registration successful! Please login with your new credentials.' } });
      } else {
        setError('Please fill all fields');
      }
    } catch (err: any) {
      setError('Failed to register school instance. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <Logo size={60} variant="icon" />
          <div className="mt-6 text-3xl font-sans tracking-tight">
            <span className="font-black text-slate-900">Up</span>
            <span className="font-medium text-[#DC2626]">Record</span>
          </div>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[0.625rem] mt-2">Create New SaaS Account</p>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-gray-200 border border-gray-100">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-gray-900">Register School</h2>
            <p className="text-gray-500 text-sm mt-1">Join the future of school management</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Official School Name"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm font-medium"
                  required
                />
              </div>

              <div className="relative">
                <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Admin Full Name"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm font-medium"
                  required
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  placeholder="Admin Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm font-medium"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  placeholder="Create Admin Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm font-medium"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl">
                <p className="text-rose-600 text-[0.625rem] font-black uppercase tracking-widest leading-relaxed">
                  {error}
                </p>
              </div>
            )}

            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100/50 mb-2">
              <p className="text-[0.625rem] text-blue-600 font-bold leading-relaxed">
                By registering, you become the primary administrator for your school's private cloud instance.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 uppercase tracking-widest text-xs flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Register System
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-50">
            <p className="text-center text-gray-500 text-xs font-medium">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 font-bold hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
