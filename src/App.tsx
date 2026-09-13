import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { checkTimeIntegrity } from './lib/licensing';
import { Logo } from './components/ui/Logo';
import { useAuth } from './context/AuthContext';
import { AttendanceGuard } from './components/AttendanceGuard';

// Pages
import { LoginPage } from './pages/Auth/LoginPage';
import { RegisterPage } from './pages/Auth/RegisterPage';
import { AdminPanelPage } from './pages/AdminPanelPage';
import { AdminReportsPage } from './pages/AdminReportsPage';
import { DashboardPage } from './pages/DashboardPage';
import { TeacherPortalPage } from './pages/TeacherPortalPage';
import { StudentPortalPage } from './pages/StudentPortalPage';
import { DataManagementPage } from './pages/DataManagementPage';
import { StudentsPage } from './pages/StudentsPage';
import { StudentDetailsPage } from './pages/StudentDetailsPage';
import { TeachersPage } from './pages/TeachersPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { ResultsPage } from './pages/ResultsPage';
import { AttendancePage } from './pages/AttendancePage';
import { MessagesPage } from './pages/MessagesPage';
import { AuditPage } from './pages/AuditPage';
import { DataEntryPage } from './pages/DataEntryPage';
import { BulkImportPage } from './pages/BulkImportPage';
import { ReportCardsPage } from './pages/ReportCardsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LessonNotesPage } from './pages/LessonNotesPage';
import { BackupPage } from './pages/BackupPage';
import { LicensePage } from './pages/LicensePage';
import { UserManualPage } from './pages/UserManualPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { ClassesPage } from './pages/ClassesPage';
import { AccountCreatorPage } from './pages/AccountCreatorPage';
// WirelessSqliteTestPage removed

// Auth Guard Component
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-10">
        <div className="flex flex-col items-center text-center space-y-8">
          <Logo size={80} variant="icon" />
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-[0.625rem]">Initializing Secure Portal...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  const [timeError, setTimeError] = useState<{ isValid: boolean; lastSeen: string } | null>(null);

  useEffect(() => {
    const check = () => {
      const result = checkTimeIntegrity();
      if (!result.isValid) {
        setTimeError(result);
      }
    };

    check();
    const interval = setInterval(check, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  if (timeError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-2xl text-center space-y-8">
          <div className="w-24 h-24 bg-rose-100 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto">
            <AlertTriangle size={48} />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter">Security Alert</h1>
            <p className="text-gray-500 text-sm font-medium leading-relaxed">
              Your system clock has been set backwards. This is not allowed for security reasons.
            </p>
          </div>
          <div className="p-6 bg-rose-50 rounded-[2rem] border border-rose-100">
            <p className="text-rose-600 text-[0.625rem] font-black uppercase tracking-widest mb-2">Last Known Time</p>
            <p className="text-rose-700 font-mono font-bold text-sm">{timeError.lastSeen}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-5 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-200 uppercase tracking-widest text-xs"
          >
            RETRY SYSTEM CHECK
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin-panel" element={<AdminPanelPage />} />
        <Route path="/admin-reports" element={<AdminReportsPage />} />

        {/* Protected Routes */}
        <Route element={<AuthGuard><AttendanceGuard><AppLayout /></AttendanceGuard></AuthGuard>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/teacher-portal" element={<TeacherPortalPage />} />
          <Route path="/student-portal" element={<StudentPortalPage />} />
          <Route path="/data-management" element={<DataManagementPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/students/:studentId" element={<StudentDetailsPage />} />
          <Route path="/teachers" element={<TeachersPage />} />
          <Route path="/subjects" element={<SubjectsPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/classes" element={<ClassesPage />} />
          <Route path="/account-creator" element={<AccountCreatorPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/data-entry" element={<DataEntryPage />} />
          <Route path="/bulk-import" element={<BulkImportPage />} />
          <Route path="/report-cards" element={<ReportCardsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/curriculum" element={<LessonNotesPage defaultTab="sow" />} />
          <Route path="/lesson-notes" element={<LessonNotesPage defaultTab="note" />} />
          <Route path="/lesson-planner" element={<LessonNotesPage />} />
          <Route path="/backup" element={<BackupPage />} />
          <Route path="/license" element={<LicensePage />} />
          <Route path="/manual" element={<UserManualPage />} />
        </Route>

        <Route path="/" element={<LicensePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
