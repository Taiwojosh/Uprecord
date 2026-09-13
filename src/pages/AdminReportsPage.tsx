import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Filter, 
  Search, 
  ChevronRight, 
  Table as TableIcon,
  Users,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../context/ToastContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

import { useSettings } from '../hooks/useSettings';
import { useCurrentSession } from '../hooks/useCurrentSession';

export const AdminReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { settings } = useSettings();
  const { session, termLabel } = useCurrentSession();
  
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedTerm, setSelectedTerm] = useState(termLabel);
  const [selectedSession, setSelectedSession] = useState(session);

  // Update local state when session info arrives
  React.useEffect(() => {
    if (session) setSelectedSession(session);
    if (termLabel) setSelectedTerm(termLabel);
  }, [session, termLabel]);
  const [isGenerating, setIsGenerating] = useState(false);

  const classes = useLiveQuery(() => db.classes.toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];

  const handleGenerateClassList = async () => {
    if (!selectedClassId) {
      showToast('Please select a class first', 'error');
      return;
    }

    const cls = classes.find(c => c.id === selectedClassId);
    const students = await db.students.where('classId').equals(selectedClassId).toArray();

    if (students.length === 0) {
      showToast('No students found in this class', 'info');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(cls?.className || 'Class List', 14, 22);
    doc.setFontSize(10);
    doc.text(`Academic Session: ${selectedSession}`, 14, 30);
    doc.text(`Total Students: ${students.length}`, 14, 35);

    const tableData = students.map((s, idx) => [
      idx + 1,
      s.fullName,
      s.admissionNumber,
      s.gender || 'N/A'
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['S/N', 'Full Name', 'Admission No', 'Gender']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] }
    });

    doc.save(`${cls?.className}_Class_List.pdf`);
    showToast('Class list generated!', 'success');
  };

  const handleGenerateBroadsheet = async () => {
    if (!selectedClassId) {
      showToast('Please select a class first', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const cls = classes.find(c => c.id === selectedClassId);
      const students = await db.students.where('classId').equals(selectedClassId).toArray();
      const allGrades = await db.grades
        .where('term').equals(selectedTerm)
        .and(g => g.session === selectedSession)
        .toArray();

      const classSubjects = subjects; // Simplified, in real app might filter by class level

      const doc = new jsPDF('l', 'mm', 'a4');
      doc.setFontSize(16);
      doc.text(`BROADSHEET: ${cls?.className}`, 14, 20);
      doc.setFontSize(10);
      doc.text(`${selectedTerm} | ${selectedSession}`, 14, 28);

      const headers = ['S/N', 'Student Name', ...classSubjects.map(s => s.subjectName), 'Total', 'Avg', 'Pos'];
      const rows = students.map((student, idx) => {
        const studentGrades = allGrades.filter(g => g.studentId === student.id);
        const rowData = classSubjects.map(sub => {
          const g = studentGrades.find(grade => grade.subjectId === sub.id);
          return g ? g.total : '-';
        });
        
        const total = studentGrades.reduce((acc, curr) => acc + (curr.total || 0), 0);
        const avg = studentGrades.length > 0 ? (total / studentGrades.length).toFixed(1) : '0.0';

        return [idx + 1, student.fullName, ...rowData, total, avg, ''];
      });

      autoTable(doc, {
        startY: 35,
        head: [headers],
        body: rows,
        theme: 'grid',
        styles: { fontSize: 7 },
        headStyles: { fillColor: [40, 40, 40] }
      });

      doc.save(`${cls?.className}_Broadsheet_${selectedTerm}.pdf`);
      showToast('Broadsheet generated!', 'success');
    } catch (err) {
      showToast('Failed to generate broadsheet', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportExcel = async () => {
    if (!selectedClassId) return;
    
    const students = await db.students.where('classId').equals(selectedClassId).toArray();
    const data = students.map(s => ({
      'Admission No': s.admissionNumber,
      'Full Name': s.fullName,
      'Email': s.email || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'Student_List.xlsx');
  };

  const handleGeneratePromotionList = async () => {
    if (!selectedClassId) {
      showToast('Please select a class first', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const cls = classes.find(c => c.id === selectedClassId);
      const students = await db.students.where('classId').equals(selectedClassId).toArray();
      const allGrades = await db.grades
        .where('term').equals('Third Term') // Promotion usually happens in 3rd term
        .and(g => g.session === selectedSession)
        .toArray();

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`PROMOTION LIST: ${cls?.className}`, 14, 20);
      doc.setFontSize(10);
      doc.text(`Academic Session: ${selectedSession} | Final Review`, 14, 28);

      const tableData = students.map((s, idx) => {
        const studentGrades = allGrades.filter(g => g.studentId === s.id);
        const avg = studentGrades.length > 0 
          ? (studentGrades.reduce((acc, curr) => acc + (curr.total || 0), 0) / studentGrades.length) 
          : 0;
        
        const status = avg >= 40 ? 'PROMOTED' : 'RETAINED';
        return [idx + 1, s.fullName, avg.toFixed(1) + '%', status];
      });

      autoTable(doc, {
        startY: 35,
        head: [['S/N', 'Student Name', 'Average', 'Decision']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [43, 108, 176] }
      });

      doc.save(`${cls?.className}_Promotion_List.pdf`);
      showToast('Promotion list generated!', 'success');
    } catch (err) {
      showToast('Failed to generate promotion list', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
           <button 
             onClick={() => navigate('/dashboard')}
             className="p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all text-gray-400 hover:text-gray-600"
           >
             <ArrowLeft size={20} />
           </button>
           <PageHeader 
             title="Administrative Printables" 
             subtitle="Generate broadsheets, class lists, and academic registers" 
           />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Academic Session</label>
                    <select 
                      value={selectedSession}
                      onChange={(e) => setSelectedSession(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all font-bold"
                    >
                       <option value={session}>{session}</option>
                       <option value="2023/2024">2023/2024</option>
                       <option value="2024/2025">2024/2025</option>
                       <option value="2025/2026">2025/2026</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Current Term</label>
                    <div className="grid grid-cols-1 gap-2">
                       {['First Term', 'Second Term', 'Third Term'].map(t => (
                         <button
                           key={t}
                           onClick={() => setSelectedTerm(t)}
                           className={`px-4 py-3 rounded-xl text-left font-bold text-sm transition-all border-2 ${selectedTerm === t ? 'bg-blue-50 border-blue-600 text-blue-600' : 'bg-gray-50 border-transparent text-gray-400 hover:border-gray-100'}`}
                         >
                           {t}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
           <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                 <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">Select Class Category</h3>
                 <span className="px-3 py-1 bg-white rounded-full text-[0.625rem] font-black text-gray-400">{classes.length} Classes Available</span>
              </div>
              <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {classes.map(c => (
                   <button 
                     key={c.id}
                     onClick={() => setSelectedClassId(c.id!)}
                     className={`p-6 rounded-[2rem] border-2 transition-all flex items-center justify-between group ${selectedClassId === c.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-gray-100 text-gray-600 hover:border-blue-200'}`}
                   >
                      <div className="flex items-center gap-4">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${selectedClassId === c.id ? 'bg-white/10 text-white' : 'bg-blue-50 text-blue-600'}`}>
                           {c.className.substring(0, 2).toUpperCase()}
                         </div>
                         <div className="text-left">
                            <p className="text-sm font-black tracking-tight">{c.className}</p>
                            <p className={`text-[0.625rem] font-bold ${selectedClassId === c.id ? 'text-white/50' : 'text-gray-400'}`}>{c.level || 'Regular'}</p>
                         </div>
                      </div>
                      <ChevronRight size={18} className={selectedClassId === c.id ? 'text-white/50' : 'text-gray-300 group-hover:translate-x-1 transition-transform'} />
                   </button>
                 ))}
              </div>
           </div>

           {selectedClassId && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                 <ReportActionCard 
                   icon={Users}
                   title="Class Register"
                   description="Export full class list with student details"
                   onPdf={handleGenerateClassList}
                   onExcel={exportExcel}
                   color="blue"
                 />
                 <ReportActionCard 
                   icon={FileSpreadsheet}
                   title="Master Broadsheet"
                   description="Consolidated results for all subjects"
                   onPdf={handleGenerateBroadsheet}
                   onExcel={() => {}}
                   color="emerald"
                 />
                 <ReportActionCard 
                   icon={CheckCircle2}
                   title="Promotion List"
                   description="Summary of students meeting average mark"
                   onPdf={handleGeneratePromotionList}
                   onExcel={() => {}}
                   color="amber"
                 />
                 <ReportActionCard 
                   icon={AlertCircle}
                   title="Failure Report"
                   description="Students requiring remedial attention"
                   onPdf={() => {}}
                   onExcel={() => {}}
                   color="rose"
                 />
              </div>
           )}
        </div>
      </div>
    </div>
  );
};

const ReportActionCard: React.FC<{
  icon: any, 
  title: string, 
  description: string, 
  onPdf: () => void, 
  onExcel: () => void,
  color: string
}> = ({ icon: Icon, title, description, onPdf, onExcel, color }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100'
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6 group">
       <div className="flex items-start gap-4">
          <div className={`w-14 h-14 ${colors[color]} rounded-2xl flex items-center justify-center shrink-0 border`}>
             <Icon size={28} />
          </div>
          <div>
             <h3 className="text-lg font-black text-gray-900 italic tracking-tight">{title}</h3>
             <p className="text-xs text-gray-400 font-medium leading-relaxed">{description}</p>
          </div>
       </div>
       <div className="flex gap-3 pt-2">
          <button 
            onClick={onPdf}
            className="flex-1 py-3 bg-gray-900 text-white text-[0.625rem] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2"
          >
             <Download size={14} />
             PDF
          </button>
          <button 
            onClick={onExcel}
            className="flex-1 py-3 bg-gray-50 text-gray-600 text-[0.625rem] font-black uppercase tracking-widest rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
          >
             <TableIcon size={14} />
             EXCEL
          </button>
       </div>
    </div>
  );
};
