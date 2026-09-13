import React, { useMemo, useState, useEffect } from 'react';
import { 
  db, 
  type IStudent, 
  type IClass, 
  type ISubject, 
  type IGrade, 
  type ITrait, 
  type ITraitGrade,
  type IAttendance, 
  type ISettings 
} from '../../db/db';
import { 
  calculateAge, 
  deriveGradeAndRemark, 
  getTermLabel, 
  generateTeacherRemark, 
  generatePrincipalRemark
} from '../../lib/calculationEngine';
import { CumulativeRow } from '../../types/reportCard';
import { useLicense } from '../../hooks/useLicense';
import { ClassicTemplate } from './templates/ClassicTemplate';
import { ModernTemplate } from './templates/ModernTemplate';
import { MinimalTemplate } from './templates/MinimalTemplate';

interface ReportCardProps {
  student: IStudent;
  studentClass: IClass;
  settings: ISettings;
  grades: IGrade[];
  subjects: ISubject[];
  traitGrades: ITraitGrade[];
  traits: ITrait[];
  attendance: IAttendance | null;
  cumulativeRecords: CumulativeRow[];
  classSize: number;
  allAverages: number[];
  term: 1 | 2 | 3;
  showCumulative: boolean;
  isEditable?: boolean;
  userRole?: string;
  onUpdateRemark?: (type: 'teacher' | 'principal', value: string) => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({
  student,
  studentClass,
  settings,
  grades,
  subjects,
  traitGrades,
  traits,
  attendance,
  cumulativeRecords,
  classSize,
  allAverages,
  term,
  showCumulative,
  isEditable,
  userRole,
  onUpdateRemark
}) => {
  const { isPremium } = useLicense();
  const age = calculateAge(student.dateOfBirth);
  
  // The subjects prop is already filtered by the hook using filterSubjectsForStudent
  const currentTermSubjects = subjects;

  const gradesWithTotal = useMemo(() => {
    return grades.map(g => {
      // If total is already present and not 0, use it. 
      // If it's 0, we might want to recalculate it if CA/Exam are present.
      const caTotal = Object.values(g.caScores || {}).reduce((sum, val) => sum + (Number(val) || 0), 0);
      const calculatedTotal = caTotal + (Number(g.examScore) || 0);
      
      // If g.total is missing or 0, but we have a calculated total, use the calculated one.
      if (g.total === undefined || g.total === null || (g.total === 0 && calculatedTotal > 0)) {
        return { ...g, total: calculatedTotal };
      }
      return g;
    });
  }, [grades]);

  const totalObtainable = currentTermSubjects.length * settings.totalSubjectScore;
  const studentTotalScore = gradesWithTotal.reduce((sum, g) => sum + (g.total || 0), 0);
  const studentAverage = currentTermSubjects.length > 0 ? studentTotalScore / currentTermSubjects.length : 0;
  const percentage = totalObtainable > 0 ? ((studentTotalScore / totalObtainable) * 100).toFixed(2) : '0.00';
  const avgCumulativePercentage = cumulativeRecords.length > 0
    ? cumulativeRecords.reduce((sum, row) => sum + row.cumulativePercentage, 0) / cumulativeRecords.length
    : 0;

  const daysPresent = attendance?.daysPresent || 0;
  const totalDays = attendance?.totalDays || settings.daysSchoolOpen || 0;
  const daysAbsent = Math.max(0, totalDays - daysPresent);

  const teacherRemark = useMemo(() => {
    return attendance?.teacherRemark || generateTeacherRemark(studentAverage, student.fullName, student.gender, term);
  }, [attendance?.teacherRemark, studentAverage, student.fullName, student.gender, term]);

  const principalRemark = useMemo(() => {
    return attendance?.principalRemark || generatePrincipalRemark(studentAverage, student.fullName, student.gender, term);
  }, [attendance?.principalRemark, studentAverage, student.fullName, student.gender, term]);

  const [localTeacherRemark, setLocalTeacherRemark] = useState(teacherRemark);
  const [localPrincipalRemark, setLocalPrincipalRemark] = useState(principalRemark);

  // Sync local state when props change (e.g. when switching students)
  useEffect(() => {
    setLocalTeacherRemark(teacherRemark);
  }, [teacherRemark]);

  useEffect(() => {
    setLocalPrincipalRemark(principalRemark);
  }, [principalRemark]);

  const behavioralTraits = traits.filter(t => t.category === 'affective' as any);
  const psychomotorTraits = traits.filter(t => t.category === 'psychomotor' as any);

  const traitScores = useMemo(() => {
    const scores: Record<number, number> = {};
    traitGrades.forEach(tg => {
      scores[tg.traitId] = tg.score;
    });
    return scores;
  }, [traitGrades]);

  const brandStyle = {
    backgroundColor: isPremium ? settings.brandColor : '#1f2937',
    color: '#FFFFFF'
  };

  const templateProps = {
    student,
    studentClass,
    settings,
    gradesWithTotal,
    cumulativeRecords,
    classSize,
    isPremium,
    age,
    totalDays,
    daysPresent,
    daysAbsent,
    totalObtainable,
    studentTotalScore,
    percentage,
    avgCumulativePercentage,
    showCumulative,
    teacherRemark,
    principalRemark,
    localTeacherRemark,
    setLocalTeacherRemark,
    localPrincipalRemark,
    setLocalPrincipalRemark,
    behavioralTraits,
    psychomotorTraits,
    traitScores,
    brandStyle,
    isEditable,
    userRole,
    onUpdateRemark
  };

  const selectedTemplate = isPremium ? (settings.reportCardTemplate || 'classic') : 'classic';

  if (selectedTemplate === 'modern') {
    return <ModernTemplate {...templateProps} />;
  }

  if (selectedTemplate === 'minimal') {
    return <MinimalTemplate {...templateProps} />;
  }

  return <ClassicTemplate {...templateProps} />;
};
