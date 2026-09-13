import * as XLSX from 'xlsx';
import { db, type IStudent, type IGrade } from '../db/db';
import { deriveGradeAndRemark } from './calculationEngine';

export interface ImportResult {
  inserted: number;
  updated: number;
  errors: string[];
}

/**
 * Service for handling Excel import and export operations.
 */

/**
 * Generates a template for student data import.
 */
export async function generateStudentTemplate() {
  const settings = await db.settings.toCollection().first();
  const departments = settings ? [
    settings.department1Name,
    settings.department2Name,
    settings.department3Name
  ].filter(Boolean) : [];

  const ws = XLSX.utils.json_to_sheet([
    {
      'Admission Number': '2024/001',
      'Full Name': 'John Doe',
      'Date of Birth': '2010-05-15',
      'Gender': 'Male',
      'Class Name': 'JSS 1 Gold',
      'Department': departments[0] || ''
    }
  ]);

  // Add a note about available departments in a separate sheet or as a comment if possible
  // Since community XLSX doesn't support dropdowns easily, we'll add an info sheet
  const infoWs = XLSX.utils.aoa_to_sheet([
    ['Available Departments (Use exact names)'],
    ...departments.map(d => [d])
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  XLSX.utils.book_append_sheet(wb, infoWs, 'Departments_List');
  XLSX.writeFile(wb, 'Student_Import_Template.xlsx');
}

/**
 * Generates a template for grade data import based on current settings and class.
 */
export async function generateGradeTemplate(classId: number, className: string, subjectId?: number, componentId?: string) {
  const settings = await db.settings.toCollection().first();
  if (!settings) throw new Error('Settings not found');

  const students = await db.students.where('classId').equals(classId).toArray();
  
  let subjectName = '';
  if (subjectId) {
    const subject = await db.subjects.get(subjectId);
    subjectName = subject?.subjectName || '';
  }

  const headers = ['Admission Number', 'Full Name'];
  if (!subjectId) headers.push('Subject Name');

  let componentsToInclude: Array<{id: string, name: string}> = [];
  if (!componentId || componentId === 'all') {
    componentsToInclude = [...settings.caComponents.map(c => ({id: c.id, name: c.name})), {id: 'exam', name: 'Exam'}];
  } else if (componentId === 'exam') {
    componentsToInclude = [{id: 'exam', name: 'Exam'}];
  } else {
    const ca = settings.caComponents.find(c => c.id === componentId);
    if (ca) componentsToInclude = [{id: ca.id, name: ca.name}];
  }

  componentsToInclude.forEach(c => headers.push(c.name));

  const data = students.map(s => {
    const row: any = {
      'Admission Number': s.admissionNumber,
      'Full Name': s.fullName,
    };
    if (!subjectId) row['Subject Name'] = subjectName || 'Mathematics';
    componentsToInclude.forEach(c => row[c.name] = '');
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(data, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Grades');
  
  let filename = `Grades_${className.replace(/\s+/g, '_')}`;
  if (subjectName) filename += `_${subjectName.replace(/\s+/g, '_')}`;
  if (componentId && componentId !== 'all') {
    const compName = componentsToInclude[0]?.name || componentId;
    filename += `_${compName.replace(/\s+/g, '_')}`;
  }
  filename += '.xlsx';
  
  XLSX.writeFile(wb, filename);
}

/**
 * Helper to parse dates from Excel rows reliably.
 */
function parseExcelDate(value: any): string {
  if (!value) return '';
  
  // If it's already a Date object
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  // If it's a number (Excel serial date)
  if (typeof value === 'number') {
    // Excel date starts from 1900-01-01
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }

  const str = String(value).trim();
  if (!str) return '';

  // Handle dd-mm-yyyy or dd/mm/yyyy
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const [_, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Handle yyyy-mm-dd or yyyy/mm/dd
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const [_, y, m, d] = ymdMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Try standard Date parsing as fallback
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return str;
}

/**
 * Imports students from an Excel file.
 * Supports both full data and admission numbers only.
 */
export async function importStudents(file: File, classId?: number): Promise<ImportResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { cellDates: true });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any>(worksheet);

  const result: ImportResult = { inserted: 0, updated: 0, errors: [] };
  const classes = await db.classes.toArray();
  const classMap = new Map(classes.map(c => [c.className.toLowerCase(), c.id]));
  
  const settings = await db.settings.toCollection().first();
  const deptMap = new Map<string, number>();
  if (settings) {
    for (let i = 1; i <= 3; i++) {
      const name = settings[`department${i}Name` as keyof typeof settings];
      if (name && typeof name === 'string') {
        deptMap.set(name.toLowerCase(), i);
      }
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      const admissionNumber = String(row.admissionNumber || row.AdmissionNumber || row['Admission Number'] || '').trim();
      if (!admissionNumber) {
        result.errors.push(`Row ${rowNum}: Missing admission number. Skipped.`);
        continue;
      }

      const fullName = String(row.fullName || row.FullName || row['Full Name'] || '[Name Pending]').trim();
      const rawDob = row.dateOfBirth || row.DateOfBirth || row['Date of Birth'];
      const dob = parseExcelDate(rawDob);
      const gender = String(row.gender || row.Gender || 'Male').trim() as 'Male' | 'Female';
      const deptName = String(row.department || row.Department || '').trim();
      const departmentId = deptName ? deptMap.get(deptName.toLowerCase()) || null : null;
      
      let targetClassId = classId;
      if (!targetClassId) {
        const className = String(row.className || row.ClassName || row['Class Name'] || '').trim();
        const lowerClassName = className.toLowerCase();
        targetClassId = classMap.get(lowerClassName);
        
        if (!targetClassId && className) {
          targetClassId = await db.classes.add({
            className: className,
            teacherName: 'TBD',
            level: 'junior',
            departmentId: null
          });
          classMap.set(lowerClassName, targetClassId);
        }
      }

      if (!targetClassId) {
        result.errors.push(`Row ${rowNum}: Class not found or not specified. Skipped.`);
        continue;
      }

      const existing = await db.students.where('admissionNumber').equals(admissionNumber).first();
      const canOverride = settings?.enableDataOverride ?? true;

      if (existing) {
        if (canOverride) {
          await db.students.update(existing.id!, {
            fullName: fullName !== '[Name Pending]' ? fullName : existing.fullName,
            dateOfBirth: dob || existing.dateOfBirth,
            gender: gender || existing.gender,
            classId: targetClassId,
            departmentId: departmentId !== null ? departmentId : existing.departmentId
          });
          result.updated++;
        } else {
          result.errors.push(`Row ${rowNum}: Student ${admissionNumber} already exists. Data override is disabled.`);
        }
      } else {
        await db.students.add({
          admissionNumber,
          fullName,
          dateOfBirth: dob,
          gender,
          classId: targetClassId,
          departmentId,
          status: 'Active',
          enrolledDate: new Date().toISOString().split('T')[0]
        });
        result.inserted++;
      }
    } catch (error) {
      result.errors.push(`Row ${rowNum}: Unexpected error. Skipped.`);
    }
  }

  return result;
}

/**
 * Imports grades from an Excel file.
 */
export async function generateTraitTemplate(classId: number, className: string) {
  const students = await db.students.where('classId').equals(classId).toArray();
  const traits = await db.traits.orderBy('displayOrder').toArray();
  
  const headers = ['Admission Number', 'Full Name'];
  traits.forEach(t => headers.push(t.traitName));

  const data = students.map(s => {
    const row: any = {
      'Admission Number': s.admissionNumber,
      'Full Name': s.fullName,
    };
    traits.forEach(t => row[t.traitName] = '');
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(data, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Traits');
  XLSX.writeFile(wb, `Traits_Template_${className.replace(/\s+/g, '_')}.xlsx`);
}

export async function importTraits(
  file: File, 
  term: 1 | 2 | 3, 
  session: string
): Promise<ImportResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any>(worksheet);

  const result: ImportResult = { inserted: 0, updated: 0, errors: [] };
  const traits = await db.traits.toArray();
  const students = await db.students.toArray();
  const studentMap = new Map(students.map(s => [String(s.admissionNumber).trim().toLowerCase(), s]));
  
  // Pre-fetch all trait grades for this term/session to optimize lookups
  const existingRecords = await db.traitGrades
    .where('[studentId+traitId+term+session]')
    .between([0, 0, term, session], [Infinity, Infinity, term, session])
    .toArray();
    
  const existingMap = new Map(existingRecords.map(r => [`${r.studentId}-${r.traitId}`, r.id]));
  const toPut: any[] = [];
  const settings = await db.settings.toCollection().first();
  const canOverride = settings?.enableDataOverride ?? true;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      const admissionScan = row.admissionNumber || row.AdmissionNumber || row['Admission Number'];
      const admissionNumber = String(admissionScan || '').trim();
      
      if (!admissionNumber) {
        continue;
      }

      const student = studentMap.get(admissionNumber.toLowerCase());
      if (!student) {
        result.errors.push(`Row ${rowNum}: Student with ID ${admissionNumber} not found. Skipped.`);
        continue;
      }

      for (const trait of traits) {
        const val = row[trait.traitName];
        if (val !== undefined && val !== '') {
          const score = Math.min(Math.max(Number(val) || 0, 1), 5); // Assuming 1-5 rating
          
          const key = `${student.id}-${trait.id}`;
          const existingId = existingMap.get(key);

          const traitData = {
            studentId: student.id!,
            traitId: trait.id!,
            term,
            session,
            score
          };

          if (existingId) {
            if (canOverride) {
              toPut.push({ ...traitData, id: existingId });
              result.updated++;
            } else {
              // We don't push to toPut, so no update happens
              // Maybe add an error if it's explicitly a conflict, but traits are usually imported in bulk
              // so we might not want to flood errors. Just skip silently or one summary error.
            }
          } else {
            toPut.push(traitData);
            result.inserted++;
          }
        }
      }
    } catch (error) {
      result.errors.push(`Row ${rowNum}: Unexpected error. Skipped.`);
    }
  }

  if (toPut.length > 0) {
    await db.traitGrades.bulkPut(toPut);
  }

  return result;
}
export async function importGrades(
  file: File, 
  term: 1 | 2 | 3, 
  session: string,
  classId?: number,
  subjectId?: number,
  componentId?: string
): Promise<ImportResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any>(worksheet);

  const result: ImportResult = { inserted: 0, updated: 0, errors: [] };
  const settings = await db.settings.toCollection().first();
  if (!settings) throw new Error('Settings not found');

  const students = await db.students.toArray();
  const studentMap = new Map<string, IStudent>(students.map(s => [String(s.admissionNumber).trim().toLowerCase(), s]));
  const subjects = await db.subjects.toArray();
  const subjectMap = new Map(subjects.map(s => [s.subjectName.toLowerCase(), s.id]));

  // Pre-fetch existing grades to optimize lookups
  const existingGrades = await db.grades
    .where('session')
    .equals(session)
    .and(g => g.term === term)
    .toArray();
  
  const existingMap = new Map(existingGrades.map(g => [`${g.studentId}-${g.subjectId}`, g.id]));
  const toPut: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      const admissionScan = row.admissionNumber || row.AdmissionNumber || row['Admission Number'];
      const admissionNumber = String(admissionScan || '').trim();
      
      let currentSubjectId = subjectId;
      if (!currentSubjectId) {
        const subjectName = String(row.subjectName || row.SubjectName || row['Subject Name'] || '').trim();
        const lowerSubjectName = subjectName.toLowerCase();
        
        if (!subjectName) {
          result.errors.push(`Row ${rowNum}: Missing subject. Skipped.`);
          continue;
        }
        
        currentSubjectId = subjectMap.get(lowerSubjectName);
        if (!currentSubjectId) {
          currentSubjectId = await db.subjects.add({
            subjectName: subjectName,
            isCore: false,
            departmentIds: []
          });
          subjectMap.set(lowerSubjectName, currentSubjectId);
        }
      }

      if (!admissionNumber) {
        result.errors.push(`Row ${rowNum}: Missing admission number. Skipped.`);
        continue;
      }

      const student = studentMap.get(admissionNumber.toLowerCase());
      if (!student) {
        result.errors.push(`Row ${rowNum}: Student with ID ${admissionNumber} not found. Skipped.`);
        continue;
      }

      const studentId = student.id!;
      const key = `${studentId}-${currentSubjectId}`;
      const existingId = existingMap.get(key);
      const existing = existingId ? existingGrades.find(g => g.id === existingId) : null;

      const caScores: Record<string, number> = existing ? { ...existing.caScores } : {};
      let examScore = existing ? existing.examScore : 0;
      let totalValue = existing ? existing.total : 0;

      // Always check for a Total column if it exists in the row
      const totalValFromExcel = row.total ?? row.Total ?? row.TOTAL ?? row['Total Score'] ?? row['Total (100)'];

      if (!componentId || componentId === 'all') {
        settings.caComponents.forEach(ca => {
          const val = row[ca.name] ?? row[ca.name.toLowerCase()] ?? row[ca.name.toUpperCase()] ?? row[ca.name.replace(/\s+/g, '')];
          if (val !== undefined && val !== '') {
            caScores[ca.id] = Math.min(Number(val) || 0, ca.maxScore);
          }
        });
        const examVal = row.exam ?? row.Exam ?? row.EXAM ?? row['Exam Score'];
        if (examVal !== undefined && examVal !== '') {
          examScore = Math.min(Number(examVal) || 0, settings.examMaxScore);
        }
        
        if (totalValFromExcel !== undefined && totalValFromExcel !== '') {
          totalValue = Number(totalValFromExcel) || 0;
        } else {
          totalValue = Object.values(caScores).reduce((sum, val) => sum + val, 0) + examScore;
        }
      } else if (componentId === 'exam') {
        const examVal = row.exam ?? row.Exam ?? row.EXAM ?? row.Score ?? row.score ?? row['Exam Score'] ?? row['Exam'];
        if (examVal !== undefined && examVal !== '') {
          examScore = Math.min(Number(examVal) || 0, settings.examMaxScore);
        }
        
        if (totalValFromExcel !== undefined && totalValFromExcel !== '') {
          totalValue = Number(totalValFromExcel) || 0;
        } else {
          totalValue = Object.values(caScores).reduce((sum, val) => sum + val, 0) + examScore;
        }
      } else {
        const ca = settings.caComponents.find(c => c.id === componentId);
        if (ca) {
          const val = row[ca.name] ?? row[ca.name.toLowerCase()] ?? row[ca.name.toUpperCase()] ?? row[ca.name.replace(/\s+/g, '')] ?? row.Score ?? row.score;
          if (val !== undefined && val !== '') {
            caScores[ca.id] = Math.min(Number(val) || 0, ca.maxScore);
          }
        }
        
        if (totalValFromExcel !== undefined && totalValFromExcel !== '') {
          totalValue = Number(totalValFromExcel) || 0;
        } else {
          totalValue = Object.values(caScores).reduce((sum, val) => sum + val, 0) + examScore;
        }
      }

      const { grade, remark } = deriveGradeAndRemark(totalValue, settings.gradingScale);

      const gradeData = {
        studentId: student.id!,
        subjectId: currentSubjectId,
        term,
        session,
        caScores,
        examScore,
        total: totalValue,
        grade,
        remark
      };

      const canOverride = settings.enableDataOverride ?? true;

      if (existingId) {
        if (canOverride) {
          toPut.push({ ...gradeData, id: existingId });
          result.updated++;
        } else {
          result.errors.push(`Row ${rowNum}: Grade for ${admissionNumber} already exists. Data override is disabled.`);
        }
      } else {
        toPut.push(gradeData);
        result.inserted++;
      }
    } catch (error) {
      result.errors.push(`Row ${rowNum}: Unexpected error. Skipped.`);
    }
  }

  if (toPut.length > 0) {
    await db.grades.bulkPut(toPut);
  }

  return result;
}
