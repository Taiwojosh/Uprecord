import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  ChevronRight,
  School,
  Users
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { db, type IStudent, type IClass, type ISubject, type IGrade, type ISettings } from '../db/db';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { filterSubjectsForStudent, calculateTotal, deriveGradeAndRemark } from '../lib/calculationEngine';
import { useAttendanceRestriction } from '../hooks/useAttendanceRestriction';
import { AttendanceRestrictionBanner } from '../components/AttendanceRestrictionBanner';

export const BulkImportPage: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { isRestricted: isAttendanceRestricted } = useAttendanceRestriction();
  const activeSchoolId = user?.schoolId || 'school-1';
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<number | 'all'>('all');

  interface ImportLog {
    id: string;
    type: 'success' | 'warning' | 'error' | 'info';
    sheet: string;
    row?: number;
    message: string;
    timestamp: string;
  }
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [showLogsPanel, setShowLogsPanel] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'success' | 'warning' | 'error' | 'info'>('all');

  const settings = useLiveQuery(() => db.settings.toCollection().first());
  const classes = useLiveQuery(() => db.classes.toArray()) || [];
  const students = useLiveQuery(() => db.students.toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];

  const handleDownloadTemplate = async () => {
    if (isAttendanceRestricted) {
      showToast('You must complete pending attendance checks first.', 'error');
      return;
    }
    if (!settings) {
      showToast('School settings not found. Please complete setup first.', 'error');
      return;
    }

    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      
      // Determine which classes to include
      const targetClasses = selectedClassId === 'all' 
        ? classes 
        : classes.filter(c => c.id === selectedClassId);

      if (targetClasses.length === 0) {
        showToast('No classes found to generate template.', 'error');
        return;
      }

      // Get all unique levels in the target classes
      const targetLevels = Array.from(new Set(targetClasses.map(c => c.level)));

      // Find all subjects relevant to these levels
      const subjectsToInclude = subjects.filter(s => {
        const sDeptIds = s.departmentIds || [];
        const sCoreLevels = s.coreLevels || ['Primary', 'junior', 'senior'];

        // 1. Core subjects for these levels
        if (s.isCore) {
          if (targetLevels.some(lvl => sCoreLevels.includes(lvl))) return true;
        }

        // 2. Departmental subjects for these levels
        if (sDeptIds.length > 0) {
          return sDeptIds.some(deptId => {
            const deptLevel = (settings as any)[`department${deptId}Level`] || 'senior';
            return targetLevels.includes(deptLevel);
          });
        }

        // 3. General subjects (no departments, not core)
        if (!s.isCore && sDeptIds.length === 0) return true;

        return false;
      });

      if (subjectsToInclude.length === 0) {
        showToast('No subjects found for the selected levels.', 'error');
        return;
      }

      // Create a sheet for each subject
      subjectsToInclude.forEach(subject => {
        const sheetData: any[] = [];
        const sDeptIds = subject.departmentIds || [];
        const sCoreLevels = subject.coreLevels || ['Primary', 'junior', 'senior'];
        
        // Header Row
        const headers = ['Admission Number', 'Student Name', 'Class', 'Department', 'Email', 'Password'];
        settings.caComponents.forEach(ca => headers.push(ca.name));
        headers.push('Exam');
        sheetData.push(headers);

        // Student Rows
        targetClasses.forEach(cls => {
          const classStudents = students.filter(s => s.classId === cls.id);
          
          classStudents.forEach(student => {
            // Determine if this student takes this subject
            let takesSubject = false;

            // Case A: Core Subject
            if (subject.isCore && sCoreLevels.includes(cls.level)) {
              takesSubject = true;
            } 
            
            // Case B: Departmental Subject (Check even if it's core, in case it's restricted to a dept)
            if (!takesSubject && sDeptIds.length > 0) {
              const studentDeptId = student.departmentId || cls.departmentId;
              if (studentDeptId && sDeptIds.includes(studentDeptId)) {
                // Also verify the department's level matches the class level
                const deptLevel = (settings as any)[`department${studentDeptId}Level`] || 'senior';
                if (deptLevel === cls.level) takesSubject = true;
              }
            }
            
            // Case C: General Subject (Not core, no departments)
            if (!takesSubject && !subject.isCore && sDeptIds.length === 0) {
              takesSubject = true;
            }

            if (takesSubject) {
              const row = [student.admissionNumber, student.fullName, cls.className, student.departmentName || ''];
              // Add empty cells for scores
              settings.caComponents.forEach(() => row.push(''));
              row.push('');
              sheetData.push(row);
            }
          });
        });

        // Only add the sheet if it has students
        if (sheetData.length > 1) {
          const ws = XLSX.utils.aoa_to_sheet(sheetData);
          ws['!cols'] = [
            { wch: 20 }, // Admission Number
            { wch: 30 }, // Student Name
            { wch: 15 }, // Class
            { wch: 20 }, // Department
            { wch: 20 }, // Email
            { wch: 20 }, // Password
            ...settings.caComponents.map(() => ({ wch: 10 })),
            { wch: 10 }  // Exam
          ];
          XLSX.utils.book_append_sheet(wb, ws, subject.subjectName.substring(0, 31));
        }
      });

      const fileName = selectedClassId === 'all' 
        ? `Whole_School_Template_${settings.currentSession}_Term${settings.currentTerm}.xlsx`
        : `${classes.find(c => c.id === selectedClassId)?.className}_Template_${settings.currentSession}_Term${settings.currentTerm}.xlsx`;

      XLSX.writeFile(wb, fileName);
      showToast('Template downloaded successfully', 'success');
    } catch (error) {
      console.error('Template generation error:', error);
      showToast('Failed to generate template', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isAttendanceRestricted) {
      showToast('You must complete pending attendance checks first.', 'error');
      return;
    }
    const file = e.target.files?.[0];
    if (!file || !settings) return;

    setIsImporting(true);
    setImportLogs([]);
    setShowLogsPanel(true);

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          
          let updatedCount = 0;
          let skippedCount = 0;
          let errorCount = 0;
          const localLogs: ImportLog[] = [];

          const addLog = (type: 'success' | 'warning' | 'error' | 'info', message: string, sheetName: string, rowNum?: number) => {
            localLogs.push({
              id: Math.random().toString(36).substring(2, 9),
              type,
              sheet: sheetName,
              row: rowNum,
              message,
              timestamp: new Date().toLocaleTimeString(),
            });
          };

          addLog('info', `Successfully loaded file "${file.name}". Starting sheet processing...`, 'System');

          const term = settings.currentTerm;
          const session = settings.currentSession;
          
          let currentClasses = await db.classes.toArray();

          // Iterate through sheets (subjects)
          for (const sheetName of wb.SheetNames) {
            const ws = wb.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(ws) as any[];
            
            if (data.length === 0) {
              addLog('info', `Sheet is empty. Skipping.`, sheetName);
              continue;
            }

            // Find the subject in DB (case-insensitive)
            const subject = subjects.find(s => 
              s.subjectName.toLowerCase() === sheetName.toLowerCase() || 
              s.subjectName.substring(0, 31).toLowerCase() === sheetName.toLowerCase()
            );
            if (!subject) {
              addLog('warning', `Sheet name did not match any subject in the database. Sheet must be named exactly like a subject (or its first 31 chars). Available subjects: ${subjects.map(s => s.subjectName).join(', ')}`, sheetName);
              skippedCount += data.length;
              continue;
            }

            addLog('info', `Processing sheet with ${data.length} rows for subject "${subject.subjectName}"`, sheetName);

            // Pre-fetch all grades for this subject/term/session to optimize lookups
            const existingGrades = await db.grades
              .where('subjectId')
              .equals(subject.id!)
              .filter(g => g.term === term && g.session === session)
              .toArray();
            
            const existingMap = new Map(existingGrades.map(g => [g.studentId, g.id]));
            const toPut: any[] = [];

            let rIdx = 0;
            for (const row of data) {
              rIdx++;
              const rowNum = rIdx + 1; // Excel rows are 1-indexed and row 1 has headers

              try {
                // Flexible admission number lookup
                const admissionNumber = (row['Admission Number'] || row['admission number'] || row['AdmissionNumber'] || '')?.toString().trim();
                if (!admissionNumber) {
                  addLog('warning', 'Omitted row because the "Admission Number" cell is empty.', sheetName, rowNum);
                  skippedCount++;
                  continue;
                }

                // Flexible class name lookup
                const className = (row['Class'] || row['class'] || '')?.toString().trim();
                
                let classRecord: any = null;
                if (className) {
                  classRecord = currentClasses.find(c => c.className.toLowerCase() === className.toLowerCase());
                  if (!classRecord) {
                    try {
                      const newClassId = await db.classes.add({
                        className: className,
                        level: 'senior', // Default
                        teacherName: 'Unassigned',
                        schoolId: activeSchoolId
                      });
                      classRecord = { id: newClassId, className, level: 'senior', teacherName: 'Unassigned', schoolId: activeSchoolId };
                      currentClasses.push(classRecord);
                      addLog('success', `Created missing class "${className}"`, sheetName, rowNum);
                    } catch (classErr: any) {
                      addLog('error', `Could not create class "${className}": ${classErr.message || classErr}`, sheetName, rowNum);
                    }
                  }
                }

                // Student lookup (case-insensitive)
                let student = students.find(s => s.admissionNumber.toLowerCase() === admissionNumber.toLowerCase());
                if (!student) {
                  const fullName = (row['Student Name'] || row['student name'] || row['Name'] || row['name'] || '').toString().trim() || `Student ${admissionNumber}`;
                  const classIdToUse = classRecord ? classRecord.id : (currentClasses.length > 0 ? currentClasses[0].id : 1);
                  
                  try {
                    const newStudentId = await db.students.add({
                      admissionNumber,
                      fullName,
                      classId: classIdToUse,
                      gender: 'Male', // Default, can be updated later in UI
                      status: 'Active',
                      schoolId: activeSchoolId,
                      dateOfBirth: '2010-01-01',
                      enrolledDate: new Date().toISOString().split('T')[0]
                    });

                    student = {
                      id: newStudentId,
                      admissionNumber,
                      fullName,
                      classId: classIdToUse,
                      gender: 'Male',
                      status: 'Active',
                      schoolId: activeSchoolId,
                      dateOfBirth: '2010-01-01',
                      enrolledDate: new Date().toISOString().split('T')[0]
                    };
                    
                    students.push(student); // Add to local array so subsequent rows find it
                    addLog('success', `Registered student "${fullName}" with admission number "${admissionNumber}"`, sheetName, rowNum);
                  } catch (studErr: any) {
                    addLog('error', `Failed to register student: ${studErr.message || studErr}`, sheetName, rowNum);
                    skippedCount++;
                    continue;
                  }
                }

                // Create or update user account if Email is provided
                const email = (row['Email'] || row['email'])?.toString().trim();
                const password = (row['Password'] || row['password'])?.toString().trim();
                if (email) {
                  try {
                    const existingUser = await db.users.where('email').equalsIgnoreCase(email).first();
                    if (existingUser) {
                      if (password && existingUser.password !== password) {
                         await db.users.update(existingUser.id!, { password });
                         addLog('info', `Updated password for student user account "${email}"`, sheetName, rowNum);
                      }
                    } else {
                      await db.users.add({
                        email,
                        fullName: student.fullName,
                        password: password || 'password123',
                        role: 'student',
                        schoolId: activeSchoolId,
                        isAdmin: false,
                        studentId: student.id!
                      });
                      addLog('success', `Provisioned user login account for email "${email}"`, sheetName, rowNum);
                    }
                  } catch (uErr: any) {
                    addLog('warning', `Failed to setup user login for email "${email}": ${uErr.message || uErr}`, sheetName, rowNum);
                  }
                }

                // Extract scores (flexible header lookup) & diagnose columns
                const caScores: Record<string, number> = {};
                let caErrorFound = false;

                settings.caComponents.forEach(ca => {
                  const rawVal = row[ca.name] || row[ca.id] || row[ca.name.toLowerCase()];
                  if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
                    const score = parseFloat(rawVal);
                    if (isNaN(score)) {
                      addLog('error', `CA Column "${ca.name}" contains an invalid/non-numeric value: "${rawVal}"`, sheetName, rowNum);
                      caErrorFound = true;
                    } else if (score < 0 || score > ca.maxScore) {
                      addLog('error', `CA Column "${ca.name}" score (${score}) is out of bounds. Permitted range is 0 to ${ca.maxScore}.`, sheetName, rowNum);
                      caErrorFound = true;
                    } else {
                      caScores[ca.id] = score;
                    }
                  }
                });

                const examScoreVal = row['Exam'] || row['exam'] || row['EXAM'];
                let examScore = NaN;
                if (examScoreVal !== undefined && examScoreVal !== null && examScoreVal !== '') {
                  const score = parseFloat(examScoreVal);
                  if (isNaN(score)) {
                    addLog('error', `Exam Column contains an invalid/non-numeric value: "${examScoreVal}"`, sheetName, rowNum);
                    examScore = 0;
                  } else if (score < 0 || score > settings.examMaxScore) {
                    addLog('error', `Exam Column score (${score}) is out of bounds. Permitted range is 0 to ${settings.examMaxScore}.`, sheetName, rowNum);
                  } else {
                    examScore = score;
                  }
                }
                
                // Only update if we have at least one score
                if (Object.keys(caScores).length > 0 || !isNaN(examScore)) {
                  const finalExamScore = isNaN(examScore) ? 0 : examScore;
                  const total = calculateTotal(caScores, finalExamScore);
                  const { grade, remark } = deriveGradeAndRemark(total, settings.gradingScale);

                  const gradeData: IGrade = {
                    studentId: student.id!,
                    subjectId: subject.id!,
                    term,
                    session,
                    caScores,
                    examScore: finalExamScore,
                    total,
                    grade,
                    remark
                  };

                  const existingId = existingMap.get(student.id!);
                  const canOverride = settings.enableDataOverride ?? true;

                  if (existingId) {
                    if (canOverride) {
                      toPut.push({ ...gradeData, id: existingId });
                      updatedCount++;
                    } else {
                      addLog('warning', `Scores already exist for student "${student.fullName}" and data override is disabled in school settings.`, sheetName, rowNum);
                      skippedCount++;
                    }
                  } else {
                    toPut.push(gradeData);
                    updatedCount++;
                  }
                } else if (caErrorFound) {
                  addLog('warning', `Row for "${student.fullName}" was skipped because key CA/Exam columns had validation errors.`, sheetName, rowNum);
                  skippedCount++;
                }
              } catch (rowErr: any) {
                errorCount++;
                addLog('error', `Failed to parse row: ${rowErr.message || rowErr}`, sheetName, rowNum);
              }
            }

            if (toPut.length > 0) {
              await db.grades.bulkPut(toPut);
              addLog('success', `Saved ${toPut.length} student grades into the system database.`, sheetName);
            }
            
            // Periodically refresh log state sheet by sheet to show interactive progress
            setImportLogs([...localLogs]);
          }

          addLog('success', `Bulk import summary: ${updatedCount} grades processed, ${skippedCount} items skipped/warned, ${errorCount} fatal errors.`, 'System');
          setImportLogs([...localLogs]);
          showToast(`Import complete: ${updatedCount} scores updated, ${skippedCount} items skipped or warned. Check the report below!`, 'success');
        } catch (err: any) {
          console.error('Excel processing error:', err);
          showToast(`Failed to process Excel file: ${err.message || err}`, 'error');
        } finally {
          setIsImporting(false);
          // Reset input
          e.target.value = '';
        }
      };
      reader.readAsBinaryString(file);
    } catch (error: any) {
      console.error('File upload error:', error);
      showToast(`Failed to upload file: ${error.message || error}`, 'error');
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-blue-600" />
            Bulk Scores Import
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            Upload subject scores for multiple students using Excel templates.
          </p>
        </div>
      </div>

      <AttendanceRestrictionBanner actionName="bulk import grades or download templates" />

      {/* Main Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Download Template */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl">
              1
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Download Template</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Prepare your Excel file</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[0.625rem] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">
                Select Scope
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedClassId('all')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    selectedClassId === 'all'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'
                  }`}
                >
                  <School className="w-5 h-5" />
                  <span className="text-xs font-black uppercase tracking-widest">Whole School</span>
                </button>
                <div className="relative">
                  <select
                    value={selectedClassId === 'all' ? '' : selectedClassId}
                    onChange={(e) => setSelectedClassId(Number(e.target.value))}
                    className={`w-full h-full appearance-none flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all outline-none ${
                      selectedClassId !== 'all'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'
                    }`}
                  >
                    <option value="" disabled>Select Class</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.className}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleDownloadTemplate}
              disabled={isExporting}
              className="w-full py-5 bg-gray-900 text-white font-black rounded-[1.5rem] hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isExporting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              <span className="uppercase tracking-widest text-xs">Generate Template</span>
            </button>
          </div>

          <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
            <div className="flex gap-3">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[0.625rem] text-blue-700 font-medium leading-relaxed">
                The template will include all students and subjects for the selected scope. 
                Each subject will have its own tab.
              </p>
            </div>
          </div>
        </div>

        {/* Step 2: Upload Scores */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-xl">
              2
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Upload Scores</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Import data to system</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative group">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                disabled={isImporting || isAttendanceRestricted}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
              />
              <div className={`w-full py-10 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all ${
                isImporting 
                  ? 'bg-gray-50 border-gray-200' 
                  : 'bg-emerald-50/30 border-emerald-100 group-hover:border-emerald-300 group-hover:bg-emerald-50/50'
              }`}>
                {isImporting ? (
                  <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                ) : (
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                )}
                <div className="text-center">
                  <p className="text-sm font-black text-gray-900 uppercase tracking-tight">
                    {isImporting ? 'Processing File...' : 'Click or Drag Excel File'}
                  </p>
                  <p className="text-[0.625rem] text-gray-400 font-bold uppercase tracking-widest mt-1">
                    Supports .xlsx and .xls formats
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[0.625rem] text-gray-500 font-medium leading-relaxed">
                Matches students by <span className="font-black text-gray-900">Admission Number</span>.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[0.625rem] text-gray-500 font-medium leading-relaxed">
                {settings?.enableDataOverride ?? true 
                  ? 'Overwrites existing scores for the current term and session.' 
                  : <span className="text-amber-600 font-black">Data override is DISABED. Existing scores will NOT be updated.</span>
                }
              </p>
            </div>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[0.625rem] text-gray-500 font-medium leading-relaxed">
                Do not change the <span className="font-black text-gray-900">Admission Number</span> or <span className="font-black text-gray-900">Subject Tab Names</span>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Import Logs Console & Diagnoser */}
      {showLogsPanel && importLogs.length > 0 && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600 animate-pulse" />
                Execution Log & Error Diagnoser
              </h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                Detailed real-time diagnostic reports from the Excel parsing engine
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setLogFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                  logFilter === 'all'
                    ? 'bg-gray-900 text-white border-transparent'
                    : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'
                }`}
              >
                All ({importLogs.length})
              </button>
              <button
                onClick={() => setLogFilter('error')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                  logFilter === 'error'
                    ? 'bg-red-500 text-white border-transparent'
                    : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
                }`}
              >
                Errors ({importLogs.filter(l => l.type === 'error').length})
              </button>
              <button
                onClick={() => setLogFilter('warning')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                  logFilter === 'warning'
                    ? 'bg-amber-500 text-white border-transparent'
                    : 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100'
                }`}
              >
                Warnings ({importLogs.filter(l => l.type === 'warning').length})
              </button>
              <button
                onClick={() => setLogFilter('success')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                  logFilter === 'success'
                    ? 'bg-emerald-500 text-white border-transparent'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                }`}
              >
                Success ({importLogs.filter(l => l.type === 'success').length})
              </button>
              <button
                onClick={() => setImportLogs([])}
                className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border bg-slate-100 text-slate-600 hover:bg-slate-200 border-transparent lg:ml-auto"
              >
                Clear Results
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50 p-4 font-mono text-xs space-y-2 leading-relaxed">
            {importLogs
              .filter(log => logFilter === 'all' || log.type === logFilter)
              .map((log) => {
                let typeColor = 'text-blue-600';
                let bgColor = 'bg-blue-50 border-blue-100';
                let tag = 'INFO';
                if (log.type === 'error') {
                  typeColor = 'text-red-700 font-extrabold';
                  bgColor = 'bg-red-50 border-red-100';
                  tag = 'ERROR';
                } else if (log.type === 'warning') {
                  typeColor = 'text-amber-700 font-bold';
                  bgColor = 'bg-amber-50 border-amber-100';
                  tag = 'WARNING';
                } else if (log.type === 'success') {
                  typeColor = 'text-emerald-700 font-bold';
                  bgColor = 'bg-emerald-50 border-emerald-100';
                  tag = 'SUCCESS';
                }

                return (
                  <div key={log.id} className={`p-3 rounded-xl border ${bgColor} flex flex-col md:flex-row md:items-start gap-3 justify-between`}>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <span className={`text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md border ${bgColor} ${typeColor}`}>
                        {tag}
                      </span>
                      <span className="text-gray-400 text-[10px]">{log.timestamp}</span>
                      {log.sheet !== 'System' && (
                        <span className="text-gray-900 font-bold bg-white px-2 py-0.5 rounded-md border border-gray-200 text-[10px] shadow-sm">
                          Tab: {log.sheet}
                        </span>
                      )}
                      {log.row && (
                        <span className="text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200 text-[10px] shadow-sm">
                          Row: {log.row}
                        </span>
                      )}
                    </div>
                    <div className="text-gray-700 text-xs text-left grow font-sans font-medium md:pl-2">
                      {log.message}
                    </div>
                  </div>
                );
              })}
            {importLogs.filter(log => logFilter === 'all' || log.type === logFilter).length === 0 && (
              <div className="text-center py-8 text-gray-400 font-sans">
                No logs found matching filter "{logFilter}"
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions Card */}
      <div className="bg-gray-900 rounded-[3rem] p-10 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full -mr-32 -mt-32" />
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="space-y-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Download className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight">1. Export</h3>
            <p className="text-sm text-gray-400 font-medium leading-relaxed">
              Select your class or the whole school and download the pre-filled template. 
              It contains all students and their registration details.
            </p>
          </div>
          <div className="space-y-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight">2. Fill Scores</h3>
            <p className="text-sm text-gray-400 font-medium leading-relaxed">
              Open the file in Excel. Each subject is a tab. Enter CA and Exam scores 
              for each student. Save the file when done.
            </p>
          </div>
          <div className="space-y-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight">3. Import</h3>
            <p className="text-sm text-gray-400 font-medium leading-relaxed">
              Upload the saved file back here. The system will automatically match 
              students and update their records in real-time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
