import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { calculateTotal, calculateGrade, filterSubjectsForStudent } from '../lib/calculationEngine';

export function useAnalytics(classId?: number) {
  return useLiveQuery(async () => {
    const settings = await db.settings.toCollection().first();
    if (!settings) return null;

    const students = classId 
      ? await db.students.where('classId').equals(classId).toArray()
      : await db.students.toArray();

    const classes = await db.classes.toArray();
    const studentIds = students.map(s => s.id!);
    const grades = await db.grades
      .where('studentId')
      .anyOf(studentIds)
      .and(g => g.term === settings.currentTerm && g.session === settings.currentSession)
      .toArray();

    const allSubjects = await db.subjects.toArray();

    // 1. Performance by Subject
    const subjectStats = allSubjects.map(subject => {
      const subjectGrades = grades.filter(g => g.subjectId === subject.id);
      const scores = subjectGrades.map(g => calculateTotal(g.caScores, g.examScore));
      const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const highest = scores.length > 0 ? Math.max(...scores) : 0;
      const lowest = scores.length > 0 ? Math.min(...scores) : 0;

      return {
        id: subject.id,
        name: subject.subjectName,
        average,
        highest,
        lowest,
        count: scores.length
      };
    }).filter(s => s.count > 0);

    // 2. Grade Distribution
    const distribution: Record<string, number> = {};
    settings.gradingScale.forEach(g => distribution[g.grade] = 0);

    grades.forEach(g => {
      const total = calculateTotal(g.caScores, g.examScore);
      const grade = calculateGrade(total, settings.gradingScale);
      distribution[grade] = (distribution[grade] || 0) + 1;
    });

    const distributionData = Object.entries(distribution).map(([name, value]) => ({ name, value }));

    // 3. Overall Stats
    const totalStudents = students.length;
    const activeStudents = new Set(grades.map(g => g.studentId)).size;
    
    // Student averages for ranking/distribution
    const studentAverages = students.map(student => {
      const sid = student.id!;
      const sGrades = grades.filter(g => g.studentId === sid);
      if (sGrades.length === 0) return 0;
      
      const studentClass = classes.find(c => c.id === student.classId);
      if (!studentClass) return 0;
      
      const currentTermSubjects = filterSubjectsForStudent(allSubjects, student, studentClass, settings);

      const total = sGrades.reduce((sum, g) => sum + calculateTotal(g.caScores, g.examScore), 0);
      return currentTermSubjects.length > 0 ? total / currentTermSubjects.length : 0;
    }).filter(avg => avg > 0);

    const classAverage = studentAverages.length > 0 
      ? studentAverages.reduce((a, b) => a + b, 0) / studentAverages.length 
      : 0;

    return {
      subjectStats,
      distributionData,
      totalStudents,
      activeStudents,
      classAverage,
      studentAverages
    };
  }, [classId]);
}
