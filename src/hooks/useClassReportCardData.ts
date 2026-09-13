import { useLiveQuery } from 'dexie-react-hooks';
import { db, type IStudent, type IClass, type ISubject, type IGrade, type ITrait, type IAttendance, type ISettings, type IComment } from '../db/db';
import { buildCumulativeRecord, filterSubjectsForStudent } from '../lib/calculationEngine';
import { CumulativeRow } from '../types/reportCard';

export function useClassReportCardData(classId: number | null) {
  return useLiveQuery(async () => {
    if (!classId) return null;

    const students = await db.students.where('classId').equals(classId).toArray();
    if (students.length === 0) return [];

    const [studentClass, settings, allSubjects, allGrades, allTraitGrades, allTraits, allAttendance, allComments] = await Promise.all([
      db.classes.get(classId),
      db.settings.toCollection().first(),
      db.subjects.toArray(),
      db.grades.toArray(),
      db.traitGrades.toArray(),
      db.traits.toArray(),
      db.attendance.toArray(),
      db.comments.toArray()
    ]);

    if (!studentClass || !settings) return [];

    return students.map(student => {
      const studentGrades = allGrades.filter(g => g.studentId === student.id);
      const studentTraitGrades = allTraitGrades.filter(t => t.studentId === student.id);
      const studentAttendance = allAttendance.filter(a => a.studentId === student.id);
      const studentComments = allComments.filter(c => c.studentId === student.id);

      const subjects = filterSubjectsForStudent(allSubjects, student, studentClass, settings, studentGrades);

      const currentGrades = studentGrades.filter(g => 
        g.term === settings.currentTerm && g.session === settings.currentSession
      );

      const currentTraitGrades = studentTraitGrades.filter(t => 
        t.term === settings.currentTerm && t.session === settings.currentSession
      );

      const currentAttendance = studentAttendance.find(a => 
        a.term === settings.currentTerm && a.session === settings.currentSession
      ) || null;

      const currentComment = studentComments.find(c => 
        c.term === settings.currentTerm && c.session === settings.currentSession
      ) || null;

      const t1Grades = studentGrades.filter(g => g.term === 1 && g.session === settings.currentSession);
      const t2Grades = studentGrades.filter(g => g.term === 2 && g.session === settings.currentSession);
      const t3Grades = studentGrades.filter(g => g.term === 3 && g.session === settings.currentSession);

      const cumulativeRecords = buildCumulativeRecord(
        t1Grades,
        t2Grades,
        t3Grades,
        subjects,
        settings.currentTerm,
        settings
      );

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
        classSize: students.length,
        allAverages: [] // Simplified for now
      };
    });
  }, [classId]);
}
