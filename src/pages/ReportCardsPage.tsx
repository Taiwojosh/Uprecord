import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  FileText, 
  Download, 
  Users, 
  LayoutGrid, 
  Printer,
  FileArchive,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
  ChevronDown,
  ShieldAlert
} from 'lucide-react';
import { db, type IStudent, type IClass, type ISubject, type IGrade, type ITrait, type ITraitGrade, type IAttendance, type ISettings } from '../db/db';
import { PageHeader } from '../components/ui/PageHeader';
import { ReportCard } from '../components/reportCard/ReportCard';
import { useReportCardData } from '../hooks/useReportCardData';
import { useClassReportCardData } from '../hooks/useClassReportCardData';
import { generateSinglePDF, generatePDFBlob, packageZIP, generateCombinedPDF } from '../lib/pdfService';
import { buildCumulativeRecord, getTermLabel, sanitizeFileName } from '../lib/calculationEngine';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../context/ToastContext';
import { useCurrentSession } from '../hooks/useCurrentSession';

import { useAuth } from '../context/AuthContext';

export const ReportCardsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { session, term, termLabel, isLoading: isSessionLoading } = useCurrentSession();
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState<'student' | 'class'>('student');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [showCumulative, setShowCumulative] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Data fetching
  const settings = useLiveQuery(async () => {
    const s = await db.settings.toCollection().first();
    return s || null;
  });

  // Set default cumulative visibility based on term and settings
  useEffect(() => {
    if (!settings) return;

    if (settings.enableCumulativeReport) {
      if (settings.autoHideCumulativeForEarlierTerms) {
        setShowCumulative(term === 3);
      } else {
        setShowCumulative(true);
      }
    } else {
      setShowCumulative(false);
    }
  }, [term, settings]);

  const classes = useLiveQuery(async () => {
    const all = await db.classes.toArray();
    if (user?.role === 'teacher') {
      const userId = user?.id && !isNaN(Number(user.id)) ? Number(user.id) : -1;
      return all.filter(c => c.teacherId === userId || c.teacherName === user?.fullName);
    }
    return all;
  }, [user]) || [];

  // Handle auto-selection based on role safely
  useEffect(() => {
    if (user?.role === 'teacher' && classes && classes.length > 0) {
      if (!selectedClassId) {
        const firstClassId = classes[0].id!;
        if (selectedClassId !== firstClassId) {
          setSelectedClassId(firstClassId);
        }
      }
    }
  }, [user, classes, selectedClassId]);

  useEffect(() => {
    if (user?.role === 'student' && user.studentId) {
      if (previewMode !== 'student') {
        setPreviewMode('student');
      }
      if (selectedStudentId !== user.studentId) {
        setSelectedStudentId(user.studentId);
      }
      db.students.get(user.studentId).then(s => {
         if (s && s.classId && selectedClassId !== s.classId) {
           setSelectedClassId(s.classId);
         }
      });
    }
  }, [user?.studentId, selectedClassId, previewMode, selectedStudentId]);

  const students = useLiveQuery(async () => {
    if (!selectedClassId) return [];
    const allInClass = await db.students.where('classId').equals(selectedClassId).toArray();
    if (user?.role === 'student') {
       return allInClass.filter(s => s.id === user.studentId);
    }
    return allInClass;
  }, [selectedClassId, user]) || [];

  const studentReportData = useReportCardData(selectedStudentId);
  const classReportData = useClassReportCardData(selectedClassId);

  const payments = useLiveQuery(() => 
    user?.studentId ? db.payments.where('studentId').equals(user.studentId).toArray() : Promise.resolve([])
  , [user?.studentId]) || [];

  const isRestrictedUnpaid = useMemo(() => {
    if (user?.role !== 'student') return false;
    if (!settings?.restrictUnpaidStudentsAccess) return false;

    const tuitionPayments = payments.filter(
      p => p.category === 'Tuition' && p.status === 'paid' && p.term === term && p.session === session
    );
    const tuitionPaid = tuitionPayments.reduce((sum, p) => sum + p.amount, 0);

    return tuitionPaid < 150000;
  }, [user, settings, payments, term, session]);

  const reportData = previewMode === 'student' ? studentReportData : null;
  const classData = previewMode === 'class' ? classReportData : null;

  // Auto-fit logic
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setZoom(Math.min(1, (window.innerWidth - 40) / 800));
      } else {
        setZoom(1);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleExportSingle = async () => {
    if (!studentReportData || !settings) return;
    setIsExporting(true);
    try {
      await generateSinglePDF(
        `report-card-${studentReportData.student.id}`,
        studentReportData.student.fullName,
        studentReportData.studentClass.className,
        termLabel
      );
      showToast('Report card exported successfully', 'success');
    } catch (error) {
      showToast('Failed to export report card', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportClassZIP = async () => {
    if (!selectedClassId || !settings || students.length === 0) return;
    
    const cls = classes.find(c => c.id === selectedClassId);
    if (!cls) return;

    setIsExporting(true);
    setExportProgress(0);
    setShowExportDropdown(false);
    
    const zipFiles: { name: string, blob: Blob }[] = [];

    // Temporarily switch to class preview mode to ensure ALL IDs are rendered
    const originalPreviewMode = previewMode;
    setPreviewMode('class');

    try {
      // Wait for classData to load and DOM to render
      let attempts = 0;
      while (attempts < 10 && (!classReportData || classReportData.length < students.length)) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      // Final short delay to ensure browser has painted
      await new Promise(resolve => setTimeout(resolve, 1000));

      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        
        const blob = await generatePDFBlob(`report-card-${student.id}`);
        const fileName = `${sanitizeFileName(student.fullName)}_${sanitizeFileName(cls.className)}_${sanitizeFileName(termLabel)}.pdf`;
        zipFiles.push({ name: fileName, blob });
        
        setExportProgress(Math.round(((i + 1) / students.length) * 100));
      }

      await packageZIP(zipFiles, `${sanitizeFileName(cls.className)}_${sanitizeFileName(termLabel)}_Reports`);
      showToast(`Exported ${zipFiles.length} reports to ZIP`, 'success');
    } catch (error) {
      console.error('Bulk export error:', error);
      showToast('Bulk export failed. Please try again.', 'error');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setPreviewMode(originalPreviewMode);
    }
  };

  const handleExportClassPDF = async () => {
    if (!selectedClassId || !settings || students.length === 0) return;
    
    if (students.length > 50) {
      showToast('Single PDF export is limited to 50 students max. Please use ZIP export.', 'info');
      return;
    }

    const cls = classes.find(c => c.id === selectedClassId);
    if (!cls) return;

    setIsExporting(true);
    setExportProgress(0);
    setShowExportDropdown(false);

    // Temporarily switch to class preview mode to ensure ALL IDs are rendered
    const originalPreviewMode = previewMode;
    setPreviewMode('class');

    try {
      // Wait for classData to load and DOM to render
      // We wait until classReportData is available and has the same length as students
      let attempts = 0;
      while (attempts < 10 && (!classReportData || classReportData.length < students.length)) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      // Final short delay to ensure browser has painted
      await new Promise(resolve => setTimeout(resolve, 1000));

      const elementIds = students.map(s => `report-card-${s.id}`);
      const fileName = `${sanitizeFileName(cls.className)}_${sanitizeFileName(termLabel)}_Reports`;
      
      await generateCombinedPDF(elementIds, fileName, (progress) => {
        setExportProgress(progress);
      });
      showToast('Combined PDF exported successfully', 'success');
    } catch (error) {
      console.error('Combined PDF export error:', error);
      showToast('Combined PDF export failed. Please try again.', 'error');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setPreviewMode(originalPreviewMode);
    }
  };

  const handleUpdateRemark = async (type: 'teacher' | 'principal', value: string) => {
    if (!selectedStudentId || !settings) return;
    
    try {
      const existing = await db.attendance
        .where('[studentId+term+session]')
        .equals([selectedStudentId, settings.currentTerm, settings.currentSession])
        .first();

      if (existing) {
        await db.attendance.update(existing.id!, {
          [type === 'teacher' ? 'teacherRemark' : 'principalRemark']: value
        });
      } else {
        await db.attendance.add({
          studentId: selectedStudentId,
          term: settings.currentTerm,
          session: settings.currentSession,
          daysPresent: 0,
          totalDays: settings.daysSchoolOpen || 0,
          [type === 'teacher' ? 'teacherRemark' : 'principalRemark']: value
        });
      }
      showToast('Remark updated successfully', 'success');
    } catch (error) {
      showToast('Failed to update remark', 'error');
    }
  };

  if (isSessionLoading || settings === undefined) return <Spinner size="lg" />;
  if (!settings) return <EmptyState icon="FileText" message="Please configure your school settings before generating report cards." />;

  if (isRestrictedUnpaid) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-8 space-y-8 animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center border-4 border-rose-100 shadow-xl">
          <ShieldAlert size={48} className="animate-pulse" />
        </div>
        <div className="space-y-4 max-w-lg">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight italic uppercase">Report Sheets Blocked</h2>
          <p className="text-sm text-gray-400 font-bold leading-relaxed">
            Your academic report sheets and transcript generators have been temporarily locked by the administration due to outstanding Tuition obligations for <span className="text-rose-600 font-black italic">{session} Term {term}</span>.
          </p>
          <div className="p-6 bg-rose-50/50 border border-rose-100 rounded-3xl space-y-3">
            <div className="flex justify-between text-xs font-black uppercase text-gray-400">
              <span>Required Tuition Fee</span>
              <span className="text-gray-950 italic">₦150,000</span>
            </div>
            <div className="flex justify-between text-xs font-black uppercase text-gray-400">
              <span>Remaining Liability</span>
              <span className="text-rose-600 font-black italic">₦150,000</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 font-black uppercase tracking-widest italic pt-2">
            Please notify your guardian and contact the Bursar or Registry Office to clear your outstanding fees.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Report Cards" 
          subtitle={`Generating reports for ${termLabel}, ${session}`} 
        />
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => window.print()}
            disabled={!selectedStudentId || isExporting}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-100 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button 
            onClick={handleExportSingle}
            disabled={!selectedStudentId || isExporting}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 text-sm font-bold rounded-xl hover:bg-blue-100 disabled:opacity-50 transition-all"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          
          {user?.role !== 'student' && (
            <div className="relative w-full sm:w-auto">
              <button 
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={!selectedClassId || isExporting || students.length === 0}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-black disabled:opacity-50 transition-all shadow-lg shadow-slate-200"
              >
                <FileArchive className="w-4 h-4" />
                Export Class Reports
                <ChevronDown className={`w-4 h-4 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showExportDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowExportDropdown(false)} 
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50"
                    >
                      <button
                        onClick={handleExportClassZIP}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-xl transition-colors group"
                      >
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-100">
                          <FileArchive className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-900 uppercase tracking-tight">Download as ZIP</p>
                          <p className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest">Individual PDF files</p>
                        </div>
                      </button>
                      <button
                        onClick={handleExportClassPDF}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-xl transition-colors group"
                      >
                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-900 uppercase tracking-tight">Download Single PDF</p>
                          <p className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest">
                            {students.length > 50 ? 'Limited to 50 students max' : 'All reports in one file'}
                          </p>
                        </div>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {isExporting && (
        <div className="bg-blue-600 p-6 rounded-[2rem] text-white shadow-xl shadow-blue-100 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Spinner size="sm" className="text-white" />
              <h3 className="text-base font-black tracking-tight">Generating PDF Reports...</h3>
            </div>
            <span className="text-sm font-black">{exportProgress}%</span>
          </div>
          <div className="w-full h-2 bg-blue-400 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-300" 
              style={{ width: `${exportProgress}%` }}
            />
          </div>
          <p className="text-[0.625rem] font-bold uppercase tracking-widest mt-3 opacity-80">Please do not close this page while export is in progress.</p>
        </div>
      )}

      {/* Selection Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {user?.role !== 'student' && (
          <>
            <div className="space-y-2">
              <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-4">Preview Mode</label>
              <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
                <button
                  onClick={() => setPreviewMode('student')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 text-xs font-bold rounded-xl transition-all ${previewMode === 'student' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Users className="w-4 h-4" /> Student
                </button>
                <button
                  onClick={() => setPreviewMode('class')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 text-xs font-bold rounded-xl transition-all ${previewMode === 'class' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <LayoutGrid className="w-4 h-4" /> Class
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-4">Select Class</label>
              <div className="relative">
                <LayoutGrid className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select 
                  value={selectedClassId || ''}
                  onChange={(e) => {
                    setSelectedClassId(Number(e.target.value));
                    setSelectedStudentId(null);
                  }}
                  className="w-full pl-11 pr-10 py-3.5 sm:py-4 bg-white border border-gray-100 rounded-[1.5rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-sm appearance-none shadow-sm text-gray-900"
                >
                  <option value="">Choose a class...</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.className}</option>
                  ))}
                </select>
              </div>
            </div>

            {previewMode === 'student' && (
              <div className="space-y-2">
                <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-4">Select Student</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select 
                    value={selectedStudentId || ''}
                    onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                    disabled={!selectedClassId}
                    className="w-full pl-11 pr-10 py-3.5 sm:py-4 bg-white border border-gray-100 rounded-[1.5rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-sm appearance-none shadow-sm disabled:opacity-50 text-gray-900"
                  >
                    <option value="">Choose a student...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </>
        )}

        <div className="space-y-2">
          <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-4">Cumulative Info</label>
          <button
            onClick={() => setShowCumulative(!showCumulative)}
            className={`w-full flex items-center justify-between px-6 py-3.5 sm:py-4 border rounded-[1.5rem] transition-all font-bold text-sm shadow-sm ${
              showCumulative 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className={`w-4 h-4 ${showCumulative ? 'text-white' : 'text-gray-400'}`} />
              <span>Show Cumulative Data</span>
            </div>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${showCumulative ? 'bg-blue-400' : 'bg-gray-200'}`}>
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showCumulative ? 'left-6' : 'left-1'}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Preview Area */}
      {previewMode === 'student' ? (
        !selectedStudentId ? (
          <EmptyState 
            icon="FileText" 
            message={!selectedClassId ? "Select a class to load students." : "Select a student to preview their report card."} 
          />
        ) : !reportData ? (
          <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
            <Spinner size="lg" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Report Card Data...</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Report Preview</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">A4 Portrait Layout</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">Zoom</span>
                  <input 
                    type="range" 
                    min="0.3" 
                    max="1.5" 
                    step="0.1" 
                    value={zoom} 
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-24 h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-[0.625rem] font-black text-blue-600 w-8">{Math.round(zoom * 100)}%</span>
                </div>
                {reportData.student.fullName === '[Name Pending]' && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-widest">Name Pending</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-center pb-8 overflow-x-auto custom-scrollbar">
              <div className="bg-slate-100 p-4 sm:p-8 rounded-[2rem] sm:rounded-[3rem] shadow-inner min-w-fit flex justify-center items-start overflow-hidden">
                <div 
                  style={{ 
                    transform: `scale(${zoom})`, 
                    transformOrigin: 'top center',
                    transition: 'transform 0.2s ease-out'
                  }}
                >
                  <ReportCard 
                    {...reportData} 
                    term={term}
                    showCumulative={showCumulative}
                    isEditable={previewMode === 'student'}
                    userRole={user?.role}
                    onUpdateRemark={handleUpdateRemark}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      ) : (
        !selectedClassId ? (
          <EmptyState icon="FileText" message="Select a class to preview all report cards." />
        ) : !classData ? (
          <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
            <Spinner size="lg" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Class Report Cards...</p>
          </div>
        ) : classData.length === 0 ? (
          <EmptyState icon="Users" message="No students found in this class." />
        ) : (
          <div className="space-y-16">
            {classData.map((data, index) => (
              <div key={data.student.id} className="space-y-4">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest px-4">
                  {index + 1}. {data.student.fullName}
                </h4>
                <div className="flex justify-center pb-8 overflow-x-auto custom-scrollbar">
                  <div className="bg-slate-100 p-4 sm:p-8 rounded-[2rem] sm:rounded-[3rem] shadow-inner min-w-fit flex justify-center items-start overflow-hidden">
                    <div 
                      style={{ 
                        transform: `scale(${zoom})`, 
                        transformOrigin: 'top center',
                        transition: 'transform 0.2s ease-out'
                      }}
                    >
                      <ReportCard {...data} term={term} showCumulative={showCumulative} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};
