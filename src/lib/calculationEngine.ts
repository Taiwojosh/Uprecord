import type { IGrade, ISubject, ISettings, IStudent, IClass, IPayment } from '../db/db';
import type { CumulativeRow } from '../types/reportCard';

/**
 * Filters subjects for a specific student or class based on level, department, and core status.
 */
export function filterSubjectsForStudent(
  subjects: ISubject[],
  student: IStudent | undefined,
  studentClass: IClass,
  settings: ISettings,
  grades: IGrade[] = []
): ISubject[] {
  // Infer active academic level to Primary, junior, or senior
  let level = studentClass.level as string;
  if (level === 'Secondary') {
    const classNameUpper = studentClass.className.toUpperCase();
    if (classNameUpper.includes('SS') || classNameUpper.includes('SENIOR') || classNameUpper.includes('SSS') || classNameUpper.startsWith('S')) {
      level = 'senior';
    } else {
      level = 'junior';
    }
  }

  return subjects.filter(s => {
    let studentDeptId = student?.departmentId || studentClass.departmentId;

    if (!studentDeptId && student?.departmentName && settings) {
      const dName = student.departmentName.trim().toLowerCase();
      if (settings.department1Name && settings.department1Name.trim().toLowerCase() === dName) {
        studentDeptId = 1;
      } else if (settings.department2Name && settings.department2Name.trim().toLowerCase() === dName) {
        studentDeptId = 2;
      } else if (settings.department3Name && settings.department3Name.trim().toLowerCase() === dName) {
        studentDeptId = 3;
      }
    }

    // STRICT DEPARTMENT CHECK: If the subject is assigned to specific departments,
    // and the student is in a department, they MUST match.
    // This applies universally, overriding class assignments.
    if (s.departmentIds && s.departmentIds.length > 0 && studentDeptId) {
      if (!s.departmentIds.includes(studentDeptId)) {
        return false;
      }
    }

    // 0. If the subject is specifically assigned to specific classes, that direct assignment determines its scope.
    if (s.classIds && s.classIds.length > 0) {
      return s.classIds.includes(studentClass.id!);
    } else if (s.classId !== undefined && s.classId !== null) {
      return s.classId === studentClass.id;
    }

    // 1. Always include subjects that have grades recorded (manual entry override)
    if (grades.some(g => g.subjectId === s.id)) {
      return true;
    }

    // Strict level check for subjects with explicit coreLevels restrictions
    if (s.coreLevels && s.coreLevels.length > 0) {
      const match = s.coreLevels.includes(level as any) || s.coreLevels.includes(studentClass.level as any);
      if (!match) return false;
    }

    // 2. Core Subject Logic (Strict Level-specific)
    const isCoreForThisLevel = s.isCore && (s.coreLevels || ['Primary', 'junior', 'senior']).includes(level as any);
    
    // If it's core for this level, we show it regardless of department
    if (isCoreForThisLevel) return true;

    // 3. Departmental Logic
    if (s.departmentIds && s.departmentIds.length > 0) {
      // If subject has departments assigned, check if student/class matches
      if (studentDeptId && s.departmentIds.includes(studentDeptId)) {
        // Check if the department's level matches the student's class level
        const deptLevel = (settings as any)[`department${studentDeptId}Level`] || 'senior';
        if (deptLevel === level) return true;
      }
      
      // If it's departmental but doesn't match this student/level, we don't show it
      // even if it's a core subject for ANOTHER level (handled by isCoreForThisLevel check above)
      return false;
    }

    // 4. General Subject Logic (No departments)
    if (settings.enableLevelSubjectFiltering) {
      // If it's marked as Core but NOT for this level (and has no depts), hide it
      if (s.isCore) return false;
      
      // Otherwise it's a non-core, non-departmental subject
      return true;
    }

    // 5. Default Logic (when filtering is OFF)
    return true;
  });
}

/**
 * Calculates student age from date of birth.
 * @param dateOfBirth string "YYYY-MM-DD"
 * @returns number
 */
export function calculateAge(dateOfBirth: string): number {
  if (!dateOfBirth) return 0;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Calculates total score from CA scores and exam score.
 * @param caScores Record<string, number>
 * @param examScore number
 * @returns number
 */
export function calculateTotal(caScores: Record<string, number>, examScore: number): number {
  const caTotal = Object.values(caScores).reduce((sum, score) => sum + (score || 0), 0);
  return caTotal + (examScore || 0);
}

/**
 * Derives grade and remark from total score.
 * @param total number
 * @param gradingScale Array of { grade, minScore, remark }
 * @returns { grade: string, remark: string }
 */
export function deriveGradeAndRemark(total: number, gradingScale?: { grade: string, minScore: number, remark: string }[]): { grade: string, remark: string } {
  if (!gradingScale || gradingScale.length === 0) {
    if (total >= 70) return { grade: 'A', remark: 'EXCELLENT' };
    if (total >= 60) return { grade: 'B', remark: 'VERY GOOD' };
    if (total >= 50) return { grade: 'C', remark: 'CREDIT' };
    if (total >= 40) return { grade: 'D', remark: 'PASS' };
    if (total >= 30) return { grade: 'E', remark: 'POOR' };
    return { grade: 'F', remark: 'FAIL' };
  }

  const sortedScale = [...gradingScale].sort((a, b) => b.minScore - a.minScore);
  const matched = sortedScale.find(s => total >= s.minScore);
  
  return matched ? { grade: matched.grade, remark: matched.remark } : { grade: 'F', remark: 'FAIL' };
}

/**
 * Calculates grade string from total score.
 */
export function calculateGrade(total: number, gradingScale?: any[]): string {
  return deriveGradeAndRemark(total, gradingScale).grade;
}

/**
 * Calculates student rank in class.
 */
export function calculateRank(score: number, allScores: number[]): string {
  return calculateClassRank(score, allScores);
}

/**
 * Calculates student rank in class.
 * @param avg number
 * @param allAverages number[]
 * @returns string (e.g., "1st", "2nd", "3rd", "4th")
 */
export function calculateClassRank(avg: number, allAverages: number[]): string {
  if (!allAverages.length) return '-';
  
  // Sort unique averages descending
  const sortedUnique = Array.from(new Set(allAverages)).sort((a, b) => b - a);
  const rank = sortedUnique.indexOf(avg) + 1;
  
  if (rank === 0) return '-';

  const j = rank % 10;
  const k = rank % 100;
  if (j === 1 && k !== 11) return rank + "st";
  if (j === 2 && k !== 12) return rank + "nd";
  if (j === 3 && k !== 13) return rank + "rd";
  return rank + "th";
}

/**
 * Computes student average score across all subjects.
 * @param grades IGrade[]
 * @param subjects ISubject[]
 * @param settings ISettings
 * @returns number
 */
export function computeStudentAverage(grades: IGrade[], subjects: ISubject[], settings: ISettings): number {
  if (!grades.length) return 0;
  const totalScore = grades.reduce((sum, g) => sum + (g.total || 0), 0);
  return totalScore / grades.length;
}

/**
 * Computes overall percentage.
 * @param avg number
 * @param totalSubjectScore number
 * @returns string
 */
export function computeOverallPercentage(avg: number, totalSubjectScore: number): string {
  if (!totalSubjectScore) return "0.00%";
  return ((avg / totalSubjectScore) * 100).toFixed(2) + "%";
}

/**
 * Builds cumulative record for a student across three terms.
 */
export function buildCumulativeRecord(
  t1: IGrade[],
  t2: IGrade[],
  t3: IGrade[],
  subjects: ISubject[],
  currentTerm: 1 | 2 | 3,
  settings: ISettings
): CumulativeRow[] {
  return subjects.map(subject => {
    const g1 = t1.find(g => g.subjectId === subject.id);
    const g2 = t2.find(g => g.subjectId === subject.id);
    const g3 = t3.find(g => g.subjectId === subject.id);

    const getGradeTotal = (g?: IGrade) => {
      if (!g) return undefined;
      if (g.total !== undefined) return g.total;
      const caTotal = Object.values(g.caScores).reduce((sum, val) => sum + val, 0);
      return caTotal + g.examScore;
    };

    const t1Total = getGradeTotal(g1);
    const t2Total = getGradeTotal(g2);
    const t3Total = getGradeTotal(g3);

    const scores = [t1Total, t2Total, t3Total].filter(s => s !== undefined && s !== null) as number[];
    const cumulativeTotal = scores.reduce((sum, s) => sum + s, 0);
    const cumulativeAverage = scores.length > 0 ? cumulativeTotal / scores.length : 0;
    const cumulativePercentage = settings.totalSubjectScore > 0 ? (cumulativeAverage / settings.totalSubjectScore) * 100 : 0;
    
    // Use current term's total for the grade/remark in the row
    const currentGrade = currentTerm === 1 ? g1 : currentTerm === 2 ? g2 : g3;
    const { grade, remark } = deriveGradeAndRemark(getGradeTotal(currentGrade) || 0, settings.gradingScale);

    return {
      subjectId: subject.id!,
      subjectName: subject.subjectName,
      term1Total: t1Total ?? null,
      term2Total: t2Total ?? null,
      term3Total: t3Total ?? null,
      cumulativeTotal,
      cumulativeAverage,
      cumulativePercentage,
      grade,
      remark
    };
  });
}

/**
 * Gets term label.
 * @param term 1 | 2 | 3
 * @returns string
 */
export function getTermLabel(term: 1 | 2 | 3): string {
  switch (term) {
    case 1: return 'First Term';
    case 2: return 'Second Term';
    case 3: return 'Third Term';
    default: return 'Unknown Term';
  }
}

/**
 * Generates an automatic teacher's remark based on student performance.
 */
export function generateTeacherRemark(average: number, fullName: string, gender: 'Male' | 'Female', currentTerm: 1 | 2 | 3 = 3): string {
  const firstName = fullName ? fullName.split(' ')[0] : 'Student';
  const pronoun = gender === 'Male' ? 'He' : 'She';
  const possessive = gender === 'Male' ? 'His' : 'Her';

  if (average >= 70) return `${firstName} is an excellent student. ${pronoun} should keep up the good work!`;
  if (average >= 60) return `A very good result from ${firstName}. ${pronoun} has a bright future.`;
  if (average >= 50) return `${firstName} has performed well, but there is still room for improvement.`;
  if (average >= 40) return `A fair result. ${firstName} needs to work harder next term.`;
  if (average >= 30) return `A poor performance. ${firstName} must be more serious with ${possessive.toLowerCase()} studies.`;
  
  if (currentTerm === 3) {
    return `A very poor result. ${firstName} is advised to repeat the class.`;
  }
  return `A very poor result. ${firstName} needs to work much harder next term.`;
}

/**
 * Generates an automatic principal's remark based on student performance.
 */
export function generatePrincipalRemark(average: number, fullName: string, gender: 'Male' | 'Female', currentTerm: 1 | 2 | 3 = 3): string {
  const firstName = fullName ? fullName.split(' ')[0] : 'Student';
  const pronoun = gender === 'Male' ? 'He' : 'She';

  if (average >= 70) return `Outstanding! ${firstName} is a very brilliant student.`;
  if (average >= 60) return `Impressive result. ${pronoun} should maintain this standard.`;
  if (average >= 50) return `Good result. ${firstName} should aim for the top next time.`;
  if (average >= 40) return `Pass. ${pronoun} can do better with more effort.`;
  if (average >= 30) return `Weak result. ${firstName} needs extra coaching.`;
  
  if (currentTerm === 3) {
    return `Very weak. Promotion is not guaranteed for ${firstName}.`;
  }
  return `Very weak. Serious improvement is needed.`;
}

/**
 * Sanitizes file name for PDF export.
 * @param name string
 * @returns string
 */
export function sanitizeFileName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .trim();
}

/**
 * Returns a color class based on the grade.
 */
export function getGradeColor(grade: string): string {
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return 'text-emerald-600';
  if (g.startsWith('B')) return 'text-blue-600';
  if (g.startsWith('C')) return 'text-cyan-600';
  if (g.startsWith('D')) return 'text-amber-600';
  if (g.startsWith('E')) return 'text-orange-600';
  if (g.startsWith('F')) return 'text-red-600';
  return 'text-gray-900';
}

/**
 * Formats a date string (YYYY-MM-DD) into a descriptive format (e.g., 5th May, 2026).
 */
export function formatDateDescriptive(dateStr: string | undefined): string {
  if (!dateStr) return 'TBD';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();

    // Add ordinal suffix (st, nd, rd, th)
    const j = day % 10;
    const k = day % 100;
    let suffix = 'th';
    if (j === 1 && k !== 11) suffix = 'st';
    else if (j === 2 && k !== 12) suffix = 'nd';
    else if (j === 3 && k !== 13) suffix = 'rd';

    return `${day}${suffix} ${month}, ${year}`;
  } catch (e) {
    return dateStr;
  }
}

/**
 * Calculates a student's Fee Status model dynamically based on actual ledger payments.
 */
export function getStudentFeeStatus(
  studentId: number,
  currentTerm: number,
  currentSession: string,
  payments: IPayment[]
): 'PAID' | 'PARTIAL' | 'UNPAID' {
  const studentPayments = payments.filter(
    p => p.studentId === studentId && p.term === currentTerm && p.session === currentSession
  );

  if (studentPayments.length === 0) {
    return 'UNPAID';
  }

  const paidPayments = studentPayments.filter(p => p.status === 'paid');
  if (paidPayments.length === 0) {
    return 'UNPAID';
  }

  const tuitionPayments = paidPayments.filter(p => p.category === 'Tuition');
  if (tuitionPayments.length === 0) {
    // Paid other things but not Tuition yet
    return 'PARTIAL';
  }

  const totalTuitionPaid = tuitionPayments.reduce((sum, p) => sum + p.amount, 0);
  // Full tuition is assumed to be 150,000 NGN
  if (totalTuitionPaid >= 150000) {
    return 'PAID';
  }

  return 'PARTIAL';
}

