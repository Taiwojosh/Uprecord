import { useLiveQuery } from 'dexie-react-hooks';
import { db, type IStudent, type IClass, type ISubject, type IGrade, type ITrait, type IAttendance, type ISettings, type IComment } from '../db/db';
import { buildCumulativeRecord, filterSubjectsForStudent } from '../lib/calculationEngine';
import { CumulativeRow } from '../types/reportCard';

export function useReportCardData(studentId: number | null) {
  return useLiveQuery(async () => {
    if (!studentId) return null;

    const student = await db.students.get(studentId);
    if (!student) return null;

    const [studentClass, settings, allSubjects, allGrades, allTraitGrades, allTraits, allAttendance, allComments] = await Promise.all([
      db.classes.get(student.classId),
      db.settings.toCollection().first(),
      db.subjects.toArray(),
      db.grades.where('studentId').equals(studentId).toArray(),
      db.traitGrades.where('studentId').equals(studentId).toArray(),
      db.traits.toArray(),
      db.attendance.where('studentId').equals(studentId).toArray(),
      db.comments.where('studentId').equals(studentId).toArray()
    ]);

    if (!studentClass || !settings) return null;

    // Filter subjects for this student's class level/department
    const subjects = filterSubjectsForStudent(allSubjects, student, studentClass, settings, allGrades);

    const currentGrades = allGrades.filter(g => 
      g.term === settings.currentTerm && g.session === settings.currentSession
    );

    const currentTraitGrades = allTraitGrades.filter(t => 
      t.term === settings.currentTerm && t.session === settings.currentSession
    );

    const currentAttendance = allAttendance.find(a => 
      a.term === settings.currentTerm && a.session === settings.currentSession
    ) || null;

    const currentComment = allComments.find(c => 
      c.term === settings.currentTerm && c.session === settings.currentSession
    ) || null;

    // Fetch grades for all terms to build cumulative record
    const t1Grades = allGrades.filter(g => g.term === 1 && g.session === settings.currentSession);
    const t2Grades = allGrades.filter(g => g.term === 2 && g.session === settings.currentSession);
    const t3Grades = allGrades.filter(g => g.term === 3 && g.session === settings.currentSession);

    const cumulativeRecords = buildCumulativeRecord(
      t1Grades,
      t2Grades,
      t3Grades,
      subjects,
      settings.currentTerm,
      settings
    );

    // Calculate real class-wide averages for ranking
    const allStudentGrades = await db.grades
      .where('session').equals(settings.currentSession)
      .and(g => g.term === settings.currentTerm)
      .toArray();

    const studentAveragesMap = new Map<number, number>();
    
    // Group grades by studentId and only for students in this class
    const classStudents = await db.students.where('classId').equals(student.classId).toArray();
    const classSize = classStudents.length;
    const classStudentIds = new Set(classStudents.map(s => s.id));
    
    allStudentGrades.forEach(g => {
      if (classStudentIds.has(g.studentId)) {
        const current = studentAveragesMap.get(g.studentId) || 0;
        studentAveragesMap.set(g.studentId, current + (g.total || 0));
      }
    });

    // We also need the count of subjects per student to get the correct average
    // For simplicity, we'll divide by the number of subjects filtered for this student
    // or just use total scores for ranking if preferred. Usually ranking is by total or average.
    // Let's use overall average.
    const finalAverages: number[] = [];
    studentAveragesMap.forEach((total, sId) => {
      // Find how many subjects this specific student has recorded grades for
      const count = allStudentGrades.filter(g => g.studentId === sId).length;
      if (count > 0) {
        finalAverages.push(total / count);
      }
    });

    return {
      student,
      studentClass,
      settings,
      grades: currentGrades,
      subjects,
      traitGrades: currentTraitGrades,
      traits: allTraits,
      attendance: currentAttendance,
      comment: currentComment,
      cumulativeRecords,
      classSize,
      allAverages: finalAverages
    };
  }, [studentId]);
}
