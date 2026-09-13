import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Search, 
  Filter, 
  BookOpen, 
  Users, 
  LayoutGrid, 
  CheckCircle2, 
  BrainCircuit,
  GraduationCap,
  Clock,
  Save,
  ChevronRight,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  MessageSquare,
  AlertTriangle,
  ShieldAlert,
  Info,
  ShieldCheck,
  Award
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { db, type IStudent, type IClass, type ISubject, type IGrade, type ITrait, type ITraitGrade, type IAttendance } from '../db/db';
import { filterSubjectsForStudent, generateTeacherRemark, generatePrincipalRemark } from '../lib/calculationEngine';
import { generateAIRemarks } from '../lib/gemini';
import { PageHeader } from '../components/ui/PageHeader';
import { ScoreInput } from '../components/data-entry/ScoreInput';
import { TraitInput } from '../components/data-entry/TraitInput';
import { RemarkInput } from '../components/data-entry/RemarkInput';
import { AttendanceInput } from '../components/data-entry/AttendanceInput';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../context/ToastContext';
import { useCurrentSession } from '../hooks/useCurrentSession';
import { generateGradeTemplate, importGrades, generateTraitTemplate, importTraits } from '../lib/excelService';

import { useAuth } from '../context/AuthContext';
import { useAttendanceRestriction } from '../hooks/useAttendanceRestriction';
import { AttendanceRestrictionBanner } from '../components/AttendanceRestrictionBanner';

type EntryTab = 'academic' | 'behavioral' | 'attendance' | 'remarks' | 'audit';

export const DataEntryPage: React.FC = () => {
  const { user } = useAuth();
  const { isRestricted: isAttendanceRestricted } = useAttendanceRestriction();
  const location = useLocation();
  const { session, term, isLoading: isSessionLoading } = useCurrentSession();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<EntryTab>('academic');
  const [selectedClassId, setSelectedClassId] = useState<number | null>(
    location.state?.classId || null
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const gradeFileInputRef = React.useRef<HTMLInputElement>(null);
  const traitFileInputRef = React.useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState<Record<number, boolean>>({});
  const [selectedComponentId, setSelectedComponentId] = useState<string>('all');

  // Security Audit States and Live Queries
  const [auditTeacherId, setAuditTeacherId] = useState<number | null>(null);

  const dbTeachers = useLiveQuery(async () => {
    if (!user?.schoolId) return [];
    return await db.users
      .where('schoolId')
      .equals(user.schoolId)
      .and(u => u.role === 'teacher')
      .toArray();
  }, [user?.schoolId]) || [];

  const auditSubjects = useLiveQuery(async () => {
    if (!user?.schoolId) return [];
    return await db.subjects.where('schoolId').equals(user.schoolId).toArray();
  }, [user?.schoolId]) || [];

  const allSchoolClasses = useLiveQuery(async () => {
    if (!user?.schoolId) return [];
    return await db.classes.where('schoolId').equals(user.schoolId).toArray();
  }, [user?.schoolId]) || [];

  const teacherClassesCount = useMemo(() => {
    if (!user || user.role !== 'teacher') return 0;
    const userId = user?.id && !isNaN(Number(user.id)) ? Number(user.id) : -1;
    return allSchoolClasses.filter(c => c.teacherId === userId || c.teacherName === user?.fullName).length;
  }, [user, allSchoolClasses]);

  useEffect(() => {
    if (user?.role === 'teacher' && teacherClassesCount === 0 && (activeTab === 'behavioral' || activeTab === 'remarks' || activeTab === 'attendance')) {
      setActiveTab('academic');
    }
  }, [user, teacherClassesCount, activeTab]);

  useEffect(() => {
    if (user?.role === 'teacher' && user?.id) {
       const numericId = Number(user.id);
       if (!isNaN(numericId) && auditTeacherId !== numericId) {
         setAuditTeacherId(numericId);
       }
    } else if (user?.isAdmin && dbTeachers.length > 0 && !auditTeacherId) {
       const firstId = dbTeachers[0].id;
       if (firstId && auditTeacherId !== firstId) {
         setAuditTeacherId(firstId);
       }
    }
  }, [user, dbTeachers, auditTeacherId]);

  const auditTeacherName = useMemo(() => {
    if (user?.role === 'teacher') return user?.fullName;
    const t = dbTeachers.find(item => item.id === auditTeacherId);
    return t ? t.fullName : 'the selected teacher';
  }, [user, dbTeachers, auditTeacherId]);

  const stats = useMemo(() => {
    const targetTeacherSubjects = auditSubjects.filter(s => s.teacherId === auditTeacherId || s.assistantTeacherIds?.includes(auditTeacherId || -1));
    const total = targetTeacherSubjects.length;
    const primary = targetTeacherSubjects.filter(s => s.teacherId === auditTeacherId).length;
    const assistant = targetTeacherSubjects.filter(s => s.assistantTeacherIds?.includes(auditTeacherId || -1)).length;
    
    // Find all unique classes these subjects align to or encompass
    const uniqueClassIds = new Set<number>();
    targetTeacherSubjects.forEach(s => {
      if (s.classIds && s.classIds.length > 0) {
        s.classIds.forEach(id => uniqueClassIds.add(id));
      } else if (s.classId !== undefined && s.classId !== null) {
        uniqueClassIds.add(s.classId);
      } else {
        allSchoolClasses.forEach(c => {
          const levelMatches = s.isCore 
            ? (s.coreLevels || []).includes(c.level)
            : true;
          const deptMatches = s.departmentIds && s.departmentIds.length > 0
            ? (c.departmentId && s.departmentIds.includes(c.departmentId))
            : true;
          if (levelMatches && deptMatches) {
            uniqueClassIds.add(c.id!);
          }
        });
      }
    });

    return {
      total,
      primary,
      assistant,
      classesCount: uniqueClassIds.size
    };
  }, [auditSubjects, auditTeacherId, allSchoolClasses]);

  const getSubjectClasses = (sub: ISubject) => {
    if (sub.classIds && sub.classIds.length > 0) {
      return allSchoolClasses.filter(c => sub.classIds!.includes(c.id!));
    }
    if (sub.classId !== undefined && sub.classId !== null) {
      const cls = allSchoolClasses.find(c => c.id === sub.classId);
      return cls ? [cls] : [];
    }
    return allSchoolClasses.filter(c => {
      const levelMatches = sub.isCore 
        ? (sub.coreLevels || []).includes(c.level)
        : true;
      const deptMatches = sub.departmentIds && sub.departmentIds.length > 0
        ? (c.departmentId && sub.departmentIds.includes(c.departmentId))
        : true;
      return levelMatches && deptMatches;
    });
  };

  const getDepartmentNames = (deptIds: number[]) => {
    if (!settings || !deptIds || deptIds.length === 0) return [];
    const names: string[] = [];
    if (deptIds.includes(1) && settings.department1Name) names.push(settings.department1Name);
    if (deptIds.includes(2) && settings.department2Name) names.push(settings.department2Name);
    if (deptIds.includes(3) && settings.department3Name) names.push(settings.department3Name);
    return names;
  };

  const handleStartEntry = (subjectId: number, classId: number) => {
    setSelectedClassId(classId);
    setSelectedSubjectId(subjectId);
    setActiveTab('academic');
    showToast(`Navigated to academic scoring mode`, 'success');
  };

  // Data fetching
  const settings = useLiveQuery(async () => {
    const s = await db.settings.toCollection().first();
    return s || null;
  });

  const classes = useLiveQuery(async () => {
    const userId = user?.id && !isNaN(Number(user.id)) ? Number(user.id) : -1;
    const settingsData = await db.settings.toCollection().first();
    
    if (user?.role === 'teacher') {
      if (activeTab === 'academic') {
        const allClasses = await db.classes.toArray();
        const allSubjects = await db.subjects.toArray();
        const teacherSubjects = allSubjects.filter(s => s.teacherId === userId || s.assistantTeacherIds?.includes(userId));
        
        return allClasses.filter(cls => {
          if (!settingsData) return true;
          
          // 1. Check if the teacher has any subjects explicitly mapped to this specific class
          const hasDirectClassMatch = teacherSubjects.some(s => 
            (s.classIds && s.classIds.includes(cls.id!)) || s.classId === cls.id
          );
          if (hasDirectClassMatch) return true;
          
          // 2. Check if the teacher's general subjects (without specific class locks) are active for this class's level and department
          const generalTeacherSubjects = teacherSubjects.filter(s => 
            (!s.classIds || s.classIds.length === 0) && s.classId === undefined && s.classId === null
          );
          const relevantSubjects = filterSubjectsForStudent(generalTeacherSubjects, undefined, cls, settingsData);
          return relevantSubjects.length > 0;
        });
      }
      
      // For other tabs, only show classes they are assigned to as class teacher
      const all = await db.classes.toArray();
      return all.filter(c => c.teacherId === userId || c.teacherName === user?.fullName);
    }
    
    return db.classes.toArray();
  }, [user, activeTab]) || [];

  const allSubjects = useLiveQuery(async () => {
    const userId = user?.id && !isNaN(Number(user.id)) ? Number(user.id) : -1;
    let all = await db.subjects.toArray();
    if (user?.role === 'teacher') {
      return all.filter(s => s.teacherId === userId || s.assistantTeacherIds?.includes(userId));
    }
    return all;
  }, [user]) || [];

  const subjects = useMemo(() => {
    if (!selectedClassId || !settings) return allSubjects;
    const selectedClass = classes.find(c => c.id === selectedClassId);
    if (!selectedClass) return allSubjects;

    return filterSubjectsForStudent(allSubjects, undefined, selectedClass, settings);
  }, [allSubjects, selectedClassId, classes, settings]);

  useEffect(() => {
    if (selectedClassId && subjects.length > 0 && !selectedSubjectId) {
      const firstSubId = subjects[0].id;
      if (firstSubId && selectedSubjectId !== firstSubId) {
        setSelectedSubjectId(firstSubId);
      }
    }
  }, [selectedClassId, subjects, selectedSubjectId]);

  useEffect(() => {
    if (location.state?.classId) {
      setSelectedClassId(location.state.classId);
    }
  }, [location.state?.classId]);

  const students = useLiveQuery(async () => {
    if (!selectedClassId) return [];
    let collection = db.students.where('classId').equals(selectedClassId);
    let allStudents = await collection.toArray();
    
    // Strict subject filtering for teachers in academic tab
    if (activeTab === 'academic' && selectedSubjectId) {
       const subject = allSubjects.find(s => s.id === selectedSubjectId);
       const selectedClass = classes.find(c => c.id === selectedClassId);
       if (subject && selectedClass) {
         allStudents = allStudents.filter(student => {
           const studentSubjects = filterSubjectsForStudent(allSubjects, student, selectedClass, settings);
           return studentSubjects.some(s => s.id === selectedSubjectId);
         });
       }
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      return allStudents.filter(s => 
        s.fullName.toLowerCase().includes(lowerSearch) || 
        s.admissionNumber.toLowerCase().includes(lowerSearch)
      );
    }
    return allStudents;
  }, [selectedClassId, searchTerm, activeTab, selectedSubjectId, allSubjects, classes, settings]) || [];

  const grades = useLiveQuery(async () => {
    if (!selectedClassId || !selectedSubjectId || !session) return [];
    // Fetch all terms for this session and subject to support cumulative calculations
    return db.grades
      .where('[studentId+subjectId+term+session]')
      .between(
        [0, selectedSubjectId, 1, session],
        [Infinity, selectedSubjectId, 3, session]
      )
      .toArray();
  }, [selectedClassId, selectedSubjectId, session]) || [];

  const traitGrades = useLiveQuery(async () => {
    if (!selectedClassId || !session) return [];
    return db.traitGrades
      .where('[studentId+traitId+term+session]')
      .between(
        [0, 0, term, session],
        [Infinity, Infinity, term, session]
      )
      .toArray();
  }, [selectedClassId, term, session]) || [];

  const attendance = useLiveQuery(async () => {
    if (!selectedClassId || !session) return [];
    return db.attendance
      .where('[studentId+term+session]')
      .between(
        [0, term, session],
        [Infinity, term, session]
      )
      .toArray();
  }, [selectedClassId, term, session]) || [];

  // Load full DB info for the subject integrity check
  const subjectIntegrityInfo = useLiveQuery(async () => {
    if (!selectedSubjectId || !selectedClassId) return null;
    
    const sub = await db.subjects.get(selectedSubjectId);
    const cls = await db.classes.get(selectedClassId);
    if (!sub || !cls) return null;

    let primaryTeacher = null;
    if (sub.teacherId) {
      primaryTeacher = await db.users.get(sub.teacherId);
    }

    const assistantTeachers = [];
    if (sub.assistantTeacherIds && sub.assistantTeacherIds.length > 0) {
      for (const aid of sub.assistantTeacherIds) {
        const t = await db.users.get(aid);
        if (t) assistantTeachers.push(t);
      }
    }

    return {
      sub,
      cls,
      primaryTeacher,
      assistantTeachers
    };
  }, [selectedSubjectId, selectedClassId]);

  const integrityCheck = useMemo(() => {
    if (!subjectIntegrityInfo || !settings) return null;
    const { sub, cls, primaryTeacher, assistantTeachers } = subjectIntegrityInfo;
    const userId = user?.id && !isNaN(Number(user.id)) ? Number(user.id) : -1;

    const issues: { type: 'error' | 'warning' | 'info'; title: string; message: string; resolution?: string }[] = [];

    // --- 1. Teacher Assignment Check ---
    const isPrimarySpecialist = sub.teacherId === userId;
    const isAssistantSpecialist = sub.assistantTeacherIds?.includes(userId);
    const isAssigned = isPrimarySpecialist || isAssistantSpecialist;

    if (user?.role === 'teacher') {
      if (!isAssigned) {
        if (!sub.teacherId) {
          issues.push({
            type: 'error',
            title: 'No Subject Specialist Assigned',
            message: `This subject "${sub.subjectName}" has no Specialist Teacher assigned in the database.`,
            resolution: 'Please contact the Admin to configure assignment for this subject on the Academic Settings page.'
          });
        } else {
          const teacherName = primaryTeacher?.fullName || 'another teacher';
          issues.push({
            type: 'error',
            title: 'Subject Assigned to Another Specialist',
            message: `Formally, this subject is assigned to ${teacherName} as the primary Subject Specialist.`,
            resolution: 'If you are covering this class, ask an administrator to add your account as an Assistant Specialist or update the subject record.'
          });
        }
      }
    } else {
      // Admin checking: show who is assigned for visual awareness
      if (!sub.teacherId) {
        issues.push({
          type: 'warning',
          title: 'Unassigned Subject Specialist',
          message: `This subject "${sub.subjectName}" does not have a designated Subject Specialist.`,
          resolution: 'Go to Academic Settings > Subjects to assign a teacher for proper routing and permissions.'
        });
      }
    }

    // --- 2. Class Level or Department Alignment Check ---
    if (sub.classIds && sub.classIds.length > 0) {
      if (!sub.classIds.includes(cls.id!)) {
        issues.push({
          type: 'error',
          title: 'Strict Class Alignment Mismatch',
          message: `This subject "${sub.subjectName}" is not assigned to "${cls.className}" in the registry.`,
          resolution: 'Adjust the alignment settings in Academy Config > Subjects to assign this class.'
        });
      }
    } else if (sub.classId !== undefined && sub.classId !== null) {
      if (sub.classId !== cls.id) {
        issues.push({
          type: 'error',
          title: 'Strict Class Alignment Mismatch',
          message: `This subject is explicitly locked to Class ID: ${sub.classId} in the database, but you are entering scores for "${cls.className}".`,
          resolution: 'Adjust the alignment settings in Academic Settings > Subjects so it is either set to this class or left blank to allow multi-class enrollment.'
        });
      }
    } else {
      const levelMatches = filterSubjectsForStudent([sub], undefined, cls, settings);
      if (levelMatches.length === 0) {
        issues.push({
          type: 'warning',
          title: 'Curriculum Scope Mismatch',
          message: `The educational level (${cls.level}) or department of "${cls.className}" does not match the target scope defined for "${sub.subjectName}".`,
          resolution: 'Verify the Academic Level and Department configurations for this subject.'
        });
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      isAssigned,
      isPrimarySpecialist,
      isAssistantSpecialist
    };
  }, [subjectIntegrityInfo, user, settings]);

  const handleSaveGrade = async (gradeData: IGrade) => {
    if (isAttendanceRestricted) {
      showToast('You must complete pending attendance checks first.', 'error');
      return;
    }
    if (!term || !session) return;
    
    try {
      // Explicitly ensure we are updating/creating for the current active term and session
      const existing = await db.grades
        .where('[studentId+subjectId+term+session]')
        .equals([gradeData.studentId, gradeData.subjectId, term, session])
        .first();

      const dataToSave = {
        ...gradeData,
        term,
        session
      };

      if (existing) {
        const { id, ...updateData } = dataToSave;
        await db.grades.update(existing.id!, updateData);
      } else {
        await db.grades.add(dataToSave);
      }
      showToast('Score saved successfully', 'success');
    } catch (error) {
      showToast('Failed to save score', 'error');
      throw error;
    }
  };

  const handleSaveTrait = async (traitGrades: ITraitGrade[]) => {
    if (isAttendanceRestricted) {
      showToast('You must complete pending attendance checks first.', 'error');
      return;
    }
    try {
      if (traitGrades.length === 0) return;

      // Prefetch existing IDs to use bulkPut for both updates and inserts
      const studentId = traitGrades[0].studentId;
      const term = traitGrades[0].term;
      const session = traitGrades[0].session;

      const existingRecords = await db.traitGrades
        .where('[studentId+traitId+term+session]')
        .between(
          [studentId, 0, term, session],
          [studentId, Infinity, term, session]
        )
        .toArray();
      
      const existingMap = new Map(existingRecords.map(r => [r.traitId, r.id]));
      
      const toPut = traitGrades.map(grade => {
        const existingId = existingMap.get(grade.traitId);
        return existingId ? { ...grade, id: existingId } : grade;
      });

      await db.traitGrades.bulkPut(toPut);
      showToast('Traits saved successfully', 'success');
    } catch (error) {
      showToast('Failed to save traits', 'error');
      throw error;
    }
  };

  const handleAttendanceChange = async (studentId: number, field: 'daysPresent' | 'totalDays', value: number) => {
    if (isAttendanceRestricted) {
      showToast('You must complete pending attendance checks first.', 'error');
      return;
    }
    if (!session) return;
    try {
      const existing = await db.attendance
        .where('[studentId+term+session]')
        .equals([studentId, term, session])
        .first();

      if (existing) {
        await db.attendance.update(existing.id!, { [field]: value });
      } else {
        await db.attendance.add({
          studentId,
          term,
          session,
          daysPresent: field === 'daysPresent' ? value : 0,
          totalDays: field === 'totalDays' ? value : (settings?.daysSchoolOpen || 0)
        });
      }
    } catch (error) {
      showToast('Failed to update attendance', 'error');
    }
  };

  const handleDownloadGradeTemplate = async () => {
    if (!selectedClassId) {
      showToast('Please select a class first', 'error');
      return;
    }
    const cls = classes?.find(c => c.id === selectedClassId);
    if (!cls) return;

    try {
      await generateGradeTemplate(cls.id!, cls.className, selectedSubjectId || undefined, selectedComponentId);
      showToast(`Grade template for ${cls.className} downloaded`, 'success');
    } catch (error) {
      showToast('Failed to download template', 'error');
    }
  };

  const handleImportGrades = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !term || !session) return;

    setIsImporting(true);
    try {
      const result = await importGrades(file, term, session, selectedClassId || undefined, selectedSubjectId || undefined, selectedComponentId);
      if (result.errors.length === 0) {
        showToast(`Successfully imported ${result.inserted} and updated ${result.updated} grade records`, 'success');
      } else {
        showToast(`Import completed with ${result.errors.length} errors`, 'info');
      }
    } catch (error) {
      showToast('Import failed. Please check your file format.', 'error');
    } finally {
      setIsImporting(false);
      if (gradeFileInputRef.current) gradeFileInputRef.current.value = '';
    }
  };

  const handleDownloadTraitTemplate = async () => {
    if (!selectedClassId) {
      showToast('Please select a class first', 'error');
      return;
    }
    const cls = classes?.find(c => c.id === selectedClassId);
    if (!cls) return;

    try {
      await generateTraitTemplate(cls.id!, cls.className);
      showToast(`Traits template for ${cls.className} downloaded`, 'success');
    } catch (error) {
      showToast('Failed to download template', 'error');
    }
  };

  const handleImportTraits = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !term || !session) return;

    setIsImporting(true);
    try {
      const result = await importTraits(file, term, session);
      if (result.errors.length === 0) {
        showToast(`Successfully imported ${result.inserted} and updated ${result.updated} trait records`, 'success');
      } else {
        showToast(`Import completed with ${result.errors.length} errors`, 'info');
      }
    } catch (error) {
      showToast('Import failed. Please check your file format.', 'error');
    } finally {
      setIsImporting(false);
      if (traitFileInputRef.current) traitFileInputRef.current.value = '';
    }
  };

  const handleRunAutoFill = async () => {
    if (!selectedClassId || !term || !session) {
      showToast('Please select a class first', 'error');
      return;
    }

    setIsImporting(true);
    try {
      const traits = await db.traits.toArray();
      const studentsInClass = await db.students.where('classId').equals(selectedClassId).toArray();
      const classStudentIds = new Set(studentsInClass.map(s => s.id));

      const allGrades = await db.grades
        .where('session').equals(session)
        .and(g => g.term === term)
        .toArray();
      const classGrades = allGrades.filter(g => classStudentIds.has(g.studentId));
      
      const classAttendance = await db.attendance
        .where('session').equals(session)
        .and(a => a.term === term)
        .toArray();
      const attendanceMap = new Map(classAttendance.filter(a => classStudentIds.has(a.studentId)).map(a => [a.studentId, a]));

      const studentGradesMap = new Map<number, IGrade[]>();
      classGrades.forEach(g => {
        const list = studentGradesMap.get(g.studentId) || [];
        list.push(g);
        studentGradesMap.set(g.studentId, list);
      });

      const existingTraitGrades = await db.traitGrades
        .where('[studentId+traitId+term+session]')
        .between([0, 0, term, session], [Infinity, Infinity, term, session])
        .toArray();
      const existingMap = new Map(existingTraitGrades.filter(rg => classStudentIds.has(rg.studentId)).map(rg => [`${rg.studentId}-${rg.traitId}`, rg.id]));

      const toPut: ITraitGrade[] = [];
      const canOverride = settings?.enableDataOverride ?? true;

      for (const student of studentsInClass) {
        const sGrades = studentGradesMap.get(student.id!) || [];
        const totalScore = sGrades.reduce((sum, g) => sum + (g.total || 0), 0);
        const totalObtainable = sGrades.length * (settings?.totalSubjectScore || 100);
        const academicAvg = totalObtainable > 0 ? (totalScore / totalObtainable) * 100 : 0;

        const sAtt = attendanceMap.get(student.id!);
        const daysPresent = sAtt?.daysPresent || 0;
        const totalDays = sAtt?.totalDays || settings?.daysSchoolOpen || 1;
        const attendanceAvg = (daysPresent / totalDays) * 100;

        const getScore = (avg: number) => {
          if (avg >= 60) return 4;
          if (avg >= 40) return 3;
          if (avg >= 20) return 2;
          return 1;
        };

        for (const trait of traits) {
          const key = `${student.id}-${trait.id}`;
          const existingId = existingMap.get(key);

          if (existingId && !canOverride) continue;

          let score = 4;
          const tName = trait.traitName.toLowerCase();
          
          if (tName === 'punctuality') {
            score = getScore(attendanceAvg);
          } else if (tName === 'mental alertness' || tName === 'reliability') {
            score = getScore(academicAvg);
          }

          toPut.push({
            id: existingId,
            studentId: student.id!,
            traitId: trait.id!,
            term,
            session,
            score
          });
        }
      }

      if (toPut.length > 0) {
        await db.traitGrades.bulkPut(toPut);
      }
      showToast(`Successfully auto-filled behavioral records for ${studentsInClass.length} students.`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Auto-fill failed.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = async (forAll: boolean = false) => {
    let studentsToInclude: IStudent[] = [];
    if (forAll) {
      studentsToInclude = await db.students.toArray();
    } else if (selectedClassId) {
      studentsToInclude = await db.students.where('classId').equals(selectedClassId).toArray();
    }

    if (studentsToInclude.length === 0) {
      showToast('No students found to generate template', 'error');
      return;
    }

    const headers = ['Admission Number', 'Full Name', 'Days Present', 'Days Absent'];
    const rows = studentsToInclude.map(s => [s.admissionNumber, `"${s.fullName}"`, '', '']);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_template_${forAll ? 'all' : 'class'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Template downloaded', 'success');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    
    try {
      const data = await file.arrayBuffer();
      let rows: any[] = [];
      
      if (isExcel) {
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(worksheet);
      } else {
        const text = new TextDecoder().decode(data);
        const lines = text.split('\n');
        if (lines.length < 2) {
          showToast('File is empty', 'error');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
        const admIdx = headers.indexOf('admission number');
        const presentIdx = headers.indexOf('days present');
        const absentIdx = headers.indexOf('days absent');

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const cols: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let char of line) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
              cols.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          cols.push(current.trim());

          const row: any = {};
          if (admIdx !== -1) row['Admission Number'] = cols[admIdx];
          if (presentIdx !== -1) row['Days Present'] = cols[presentIdx];
          if (absentIdx !== -1) row['Days Absent'] = cols[absentIdx];
          rows.push(row);
        }
      }

      if (rows.length === 0) {
        showToast('No data found in file', 'error');
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const row of rows) {
        const admNum = String(row['Admission Number'] || row['admission number'] || row.admissionNumber || '').trim();
        const presentVal = row['Days Present'] || row['days present'] || row.daysPresent;
        const absentVal = row['Days Absent'] || row['days absent'] || row.daysAbsent;

        if (!admNum) continue;

        const student = await db.students.where('admissionNumber').equals(admNum).first();
        if (student) {
          let daysPresent = 0;
          const totalDays = settings?.daysSchoolOpen || 0;

          if (presentVal !== undefined && presentVal !== '' && !isNaN(Number(presentVal))) {
            daysPresent = Number(presentVal);
          } else if (absentVal !== undefined && absentVal !== '' && !isNaN(Number(absentVal))) {
            daysPresent = Math.max(0, totalDays - Number(absentVal));
          } else {
            continue;
          }

          const existing = await db.attendance
            .where('[studentId+term+session]')
            .equals([student.id!, term, session])
            .first();
          
          const canOverride = settings?.enableDataOverride ?? true;

          if (existing) {
            if (canOverride) {
              await handleAttendanceChange(student.id!, 'daysPresent', daysPresent);
              successCount++;
            } else {
              errorCount++;
            }
          } else {
            await handleAttendanceChange(student.id!, 'daysPresent', daysPresent);
            successCount++;
          }
        } else {
          errorCount++;
        }
      }

      showToast(`Imported ${successCount} records. ${errorCount} errors.`, successCount > 0 ? 'success' : 'error');
    } catch (err) {
      console.error('Import error:', err);
      showToast('Failed to process file. Ensure it matches the template.', 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemarkChange = async (studentId: number, field: 'teacherRemark' | 'principalRemark', value: string) => {
    if (isAttendanceRestricted) {
      showToast('You must complete pending attendance checks first.', 'error');
      return;
    }
    if (!session) return;
    try {
      const existing = await db.attendance
        .where('[studentId+term+session]')
        .equals([studentId, term, session])
        .first();

      if (existing) {
        await db.attendance.update(existing.id!, { [field]: value });
      } else {
        await db.attendance.add({
          studentId,
          term,
          session,
          daysPresent: 0,
          totalDays: settings?.daysSchoolOpen || 0,
          [field]: value
        });
      }
    } catch (error) {
      showToast('Failed to update remark', 'error');
    }
  };

  const handleAIGenerateRemarks = async (student: IStudent) => {
    if (isAttendanceRestricted) {
      showToast('You must complete pending attendance checks first.', 'error');
      return;
    }
    if (!session || !term) return;

    setIsAIGenerating(prev => ({ ...prev, [student.id!]: true }));
    try {
      // 1. Get Academic Data
      const studentGrades = grades.filter(g => g.studentId === student.id && g.term === term);
      const totalScore = studentGrades.reduce((sum, g) => sum + (g.total || 0), 0);
      const totalObtainable = studentGrades.length * (settings?.totalSubjectScore || 100);
      const average = totalObtainable > 0 ? (totalScore / totalObtainable) * 100 : 0;
      
      const academicData = studentGrades.map(g => {
        const sub = subjects.find(s => s.id === g.subjectId);
        return { name: sub?.subjectName || 'Unknown', score: g.total || 0 };
      });

      // 2. Get Behavioral Data
      const studentTraits = await db.traitGrades
        .where('[studentId+term+session]')
        .equals([student.id!, term, session])
        .toArray();
      
      const allTraits = await db.traits.toArray();
      const positiveTraits = studentTraits
        .filter(tg => tg.score >= 4)
        .map(tg => allTraits.find(t => t.id === tg.traitId)?.traitName)
        .filter(Boolean) as string[];

      // 3. Generate via Gemini
      const aiRemarks = await generateAIRemarks(
        student.fullName,
        student.gender,
        average,
        academicData,
        positiveTraits
      );

      // 4. Save to DB
      const existing = await db.attendance
        .where('[studentId+term+session]')
        .equals([student.id!, term, session])
        .first();

      if (existing) {
        await db.attendance.update(existing.id!, { 
          teacherRemark: aiRemarks.teacherRemark, 
          principalRemark: aiRemarks.principalRemark 
        });
      } else {
        await db.attendance.add({
          studentId: student.id!,
          term,
          session,
          daysPresent: 0,
          totalDays: settings?.daysSchoolOpen || 0,
          teacherRemark: aiRemarks.teacherRemark,
          principalRemark: aiRemarks.principalRemark
        });
      }
      showToast('AI remarks generated and saved', 'success');
    } catch (error) {
      console.error('AI Error:', error);
      showToast('AI generation failed. Using rules fallback.', 'info');
      await handleAutoGenerateRemarks(student);
    } finally {
      setIsAIGenerating(prev => ({ ...prev, [student.id!]: false }));
    }
  };

  const handleAutoGenerateRemarks = async (student: IStudent) => {
    if (!session) return;
    
    // Calculate average to generate accurate remarks
    const studentGrades = grades.filter(g => g.studentId === student.id && g.term === term);
    const totalScore = studentGrades.reduce((sum, g) => sum + (g.total || 0), 0);
    const totalObtainable = studentGrades.length * (settings?.totalSubjectScore || 100);
    const average = totalObtainable > 0 ? (totalScore / totalObtainable) * 100 : 0;

    const teacherRemark = generateTeacherRemark(average, student.fullName, student.gender, term);
    const principalRemark = generatePrincipalRemark(average, student.fullName, student.gender, term);

    try {
      const existing = await db.attendance
        .where('[studentId+term+session]')
        .equals([student.id!, term, session])
        .first();

      if (existing) {
        await db.attendance.update(existing.id!, { teacherRemark, principalRemark });
      } else {
        await db.attendance.add({
          studentId: student.id!,
          term,
          session,
          daysPresent: 0,
          totalDays: settings?.daysSchoolOpen || 0,
          teacherRemark,
          principalRemark
        });
      }
      showToast('Remarks auto-generated successfully', 'success');
    } catch (error) {
      showToast('Failed to auto-generate remarks', 'error');
    }
  };

  if (isSessionLoading || settings === undefined) return <Spinner size="lg" />;
  if (!settings) return <EmptyState icon="Save" message="Please configure your school settings before entering data." />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <PageHeader 
          title="Data Entry Hub" 
          subtitle={`Recording data for ${term === 1 ? 'First' : term === 2 ? 'Second' : 'Third'} Term, ${session}`} 
        />
        <div className="relative flex overflow-x-auto pb-0.5 max-w-full p-1 rounded-2xl border border-gray-200/50 shadow-inner w-full lg:w-auto lg:overflow-hidden bg-gray-100 scrollbar-none flex-nowrap">
          <TabButton 
            active={activeTab === 'academic'} 
            onClick={() => setActiveTab('academic')}
            icon={GraduationCap}
            label="Academic"
          />
          {(user?.role !== 'teacher' || teacherClassesCount > 0) && (
            <TabButton 
              active={activeTab === 'behavioral'} 
              onClick={() => setActiveTab('behavioral')}
              icon={BrainCircuit}
              label="Behavioral"
            />
          )}
          {user?.isAdmin && (
            <TabButton 
              active={activeTab === 'attendance'} 
              onClick={() => setActiveTab('attendance')}
              icon={Clock}
              label="Attendance"
            />
          )}
          {(user?.role !== 'teacher' || teacherClassesCount > 0) && (
            <TabButton 
              active={activeTab === 'remarks'} 
              onClick={() => setActiveTab('remarks')}
              icon={MessageSquare}
              label="Remarks"
            />
          )}
          <TabButton 
            active={activeTab === 'audit'} 
            onClick={() => setActiveTab('audit')}
            icon={ShieldCheck}
            label="Security Audit"
          />
        </div>
      </div>

      <AttendanceRestrictionBanner actionName="enter scores, custom traits, or report remarks" />

      {/* Selection Bar */}
      {activeTab === 'audit' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="space-y-2 md:col-span-2 text-left">
            <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-4">Audit Target Teacher Account</label>
            <div className="relative">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              {user?.isAdmin ? (
                <select
                  value={auditTeacherId || ''}
                  onChange={(e) => setAuditTeacherId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full pl-11 pr-10 py-3.5 sm:py-4 bg-white border border-gray-100 rounded-[1.5rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-sm appearance-none shadow-sm text-gray-900"
                >
                  <option value="">Choose a teacher to audit...</option>
                  {dbTeachers.map(t => (
                    <option key={t.id} value={t.id}>{t.fullName} ({t.email || 'No email'})</option>
                  ))}
                </select>
              ) : (
                <div className="w-full pl-11 pr-4 py-3.5 sm:py-4 bg-gray-50 border border-gray-100 rounded-[1.5rem] font-bold text-sm text-gray-500 shadow-sm flex items-center">
                  <span>{user?.fullName} (Logged-in Teacher)</span>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2 text-left">
            <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-4">Security Level</label>
            <div className="relative">
              <ShieldAlert className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
              <div className="w-full pl-11 pr-4 py-3.5 sm:py-4 bg-emerald-50 border border-emerald-100/50 rounded-[1.5rem] font-black text-xs text-emerald-700 shadow-sm flex items-center uppercase tracking-widest">
                <span>{user?.isAdmin ? 'ADMINISTRATOR AUDIT' : 'TEACHER SECURE'}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="space-y-2 text-left">
            <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-4">Select Class</label>
            <div className="relative">
              <LayoutGrid className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select 
                value={selectedClassId || ''}
                onChange={(e) => setSelectedClassId(Number(e.target.value))}
                className="w-full pl-11 pr-10 py-3.5 sm:py-4 bg-white border border-gray-100 rounded-[1.5rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-sm appearance-none shadow-sm text-gray-900"
              >
                <option value="">Choose a class...</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.className}</option>
                ))}
              </select>
            </div>
          </div>

          {activeTab === 'academic' && (
            <div className="space-y-2 text-left">
              <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-4">Select Subject</label>
              <div className="relative">
                <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select 
                  value={selectedSubjectId || ''}
                  onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
                  className="w-full pl-11 pr-10 py-3.5 sm:py-4 bg-white border border-gray-100 rounded-[1.5rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-sm appearance-none shadow-sm text-gray-900"
                >
                  <option value="">Choose a subject...</option>
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.subjectName}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeTab === 'academic' ? (
            <div className="space-y-2 text-left">
              <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-4">Component</label>
              <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select 
                  value={selectedComponentId}
                  onChange={(e) => setSelectedComponentId(e.target.value)}
                  className="w-full pl-11 pr-10 py-3.5 sm:py-4 bg-white border border-gray-100 rounded-[1.5rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-sm appearance-none shadow-sm text-gray-900"
                >
                  <option value="all">All Components</option>
                  {settings.caComponents.map(ca => (
                    <option key={ca.id} value={ca.id}>{ca.name}</option>
                  ))}
                  <option value="exam">Exam Only</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-left">
              <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-4">Search Student</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Filter by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 sm:py-4 bg-white border border-gray-100 rounded-[1.5rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-sm shadow-sm text-gray-900"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content Area */}
      {activeTab === 'audit' ? (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 rounded-[2rem] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(120,119,198,0.1),transparent_50%)]" />
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2 text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[0.625rem] font-bold uppercase tracking-wider text-blue-300">
                  <ShieldCheck size={12} className="text-emerald-400" />
                  Permissions Ledger Verified
                </div>
                <h3 className="text-2xl font-black italic uppercase tracking-tight">Security Audit Report</h3>
                <p className="text-xs font-bold text-gray-300 leading-relaxed max-w-xl">
                  This workspace lists all academic subjects and specific classrooms assigned to <span className="text-white italic font-black font-mono">{auditTeacherName}</span>. 
                  Verification checks ensure grade entry remains restricted, consistent, and highly secure.
                </p>
              </div>
              <div className="flex sm:flex-col gap-4 items-end shrink-0">
                <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl px-5 py-3 text-right">
                  <span className="block text-[0.55rem] font-black text-blue-300 uppercase tracking-widest leading-none mb-1">Audit Status</span>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400 font-mono">● LIVE AUDIT SUCCESS</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stat Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <BookOpen size={18} />
              </div>
              <div>
                <p className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">Total Authorized Subjects</p>
                <p className="text-2xl font-black text-gray-900 tracking-tight">{stats.total}</p>
                <p className="text-[0.55rem] font-bold text-gray-400 uppercase tracking-tighter mt-1 italic">Across {stats.classesCount} classrooms</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <Award size={18} />
              </div>
              <div>
                <p className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">Lead Specialist Role</p>
                <p className="text-2xl font-black text-emerald-600 tracking-tight">{stats.primary}</p>
                <p className="text-[0.55rem] font-bold text-gray-400 uppercase tracking-tighter mt-1 italic">Primary syllabus responsibility</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Users size={18} />
              </div>
              <div>
                <p className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">Assistant Specialist Role</p>
                <p className="text-2xl font-black text-indigo-600 tracking-tight">{stats.assistant}</p>
                <p className="text-[0.55rem] font-bold text-gray-400 uppercase tracking-tighter mt-1 italic">Collaborative editing privileges</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                <LayoutGrid size={18} />
              </div>
              <div>
                <p className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">Enrollment Scope</p>
                <p className="text-2xl font-black text-purple-600 tracking-tight">{stats.classesCount}</p>
                <p className="text-[0.55rem] font-bold text-gray-400 uppercase tracking-tighter mt-1 italic">Classes with eligible pupils</p>
              </div>
            </div>
          </div>

          {/* Permitted Subject List Table */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-[2rem] overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-left">
                <h4 className="text-sm font-black text-gray-950 uppercase italic tracking-tight">Access Control Ledger</h4>
                <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-wider">Formal authority listing from the database</p>
              </div>
              <div className="px-3 py-1 bg-slate-50 border border-gray-100 rounded-xl text-[0.625rem] font-black text-gray-700 uppercase tracking-wider">
                Query: {stats.total} records retrieved
              </div>
            </div>

            {stats.total === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center text-red-500 mx-auto">
                  <ShieldAlert size={28} />
                </div>
                <div>
                  <h5 className="text-sm font-black text-gray-900 uppercase italic">No Active Subjects Found</h5>
                  <p className="text-xs font-bold text-gray-400 max-w-sm mx-auto mt-1 leading-relaxed">
                    {user?.role === 'teacher' 
                      ? "Your account currently has no formally assigned subjects. Please contact the academic administrator to set up your teaching permissions."
                      : "The selected teacher currently has no assigned subjects in the school curriculum."
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div>
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left min-w-[800px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-100">
                        <th className="px-6 py-4 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">Subject Description</th>
                        <th className="px-6 py-4 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">Authority Role</th>
                        <th className="px-6 py-4 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">Encompassed Classes</th>
                        <th className="px-6 py-4 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">Target Scope</th>
                        <th className="px-6 py-4 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">Audit Status</th>
                        <th className="px-6 py-4 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest text-right">Data Entry Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {auditSubjects
                        .filter(s => s.teacherId === auditTeacherId || s.assistantTeacherIds?.includes(auditTeacherId || -1))
                        .map(sub => {
                          const subClasses = getSubjectClasses(sub);
                          const isPrimary = sub.teacherId === auditTeacherId;
                          const depts = getDepartmentNames(sub.departmentIds);

                          return (
                            <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors group">
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 bg-slate-100 border border-slate-200/50 rounded-xl flex items-center justify-center font-black font-mono text-slate-700 text-xs italic">
                                    {sub.subjectName.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-xs font-black text-gray-900 uppercase italic tracking-tight">{sub.subjectName}</p>
                                    <div className="flex gap-1.5 mt-1">
                                      {sub.isCore ? (
                                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[0.5rem] font-black uppercase rounded tracking-tighter">
                                          Core Course
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 text-[0.5rem] font-black uppercase rounded tracking-tighter">
                                          Elective Course
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="px-6 py-5">
                                {isPrimary ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[0.5625rem] font-black uppercase rounded-lg shadow-sm">
                                    <Award size={10} className="text-indigo-500" />
                                    Lead Specialist
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 border border-violet-100 text-violet-700 text-[0.5625rem] font-black uppercase rounded-lg">
                                    <Users size={10} className="text-violet-500" />
                                    Assistant Specialist
                                  </span>
                                )}
                              </td>

                              <td className="px-6 py-5">
                                {subClasses.length === 0 ? (
                                  <span className="text-[0.625rem] font-extrabold text-red-500 uppercase tracking-widest italic flex items-center gap-1">
                                    <AlertTriangle size={12} /> No Matches Found
                                  </span>
                                ) : (
                                  <div className="flex flex-wrap gap-1 max-w-xs">
                                    {subClasses.map(c => (
                                      <span key={c.id} className="px-2 py-0.5 bg-slate-100 border border-gray-200 text-gray-700 text-[0.5rem] font-black uppercase rounded-md tracking-tighter shadow-3xs">
                                        {c.className}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>

                              <td className="px-6 py-5">
                                <div className="space-y-1">
                                  {sub.classId !== undefined && sub.classId !== null ? (
                                    <p className="text-[0.5625rem] font-black text-indigo-600 uppercase tracking-wider">
                                      ★ Direct Class Match Lock
                                    </p>
                                  ) : (
                                    <p className="text-[0.5625rem] font-black text-gray-400 uppercase tracking-wider">
                                      Level: <span className="text-gray-700 italic">{(sub.coreLevels || []).join(', ')}</span>
                                    </p>
                                  )}
                                  {depts.length > 0 && (
                                    <p className="text-[0.5rem] font-extrabold text-blue-500 uppercase tracking-tighter">
                                      Depts: {depts.join(', ')}
                                    </p>
                                  )}
                                </div>
                              </td>

                              <td className="px-6 py-5">
                                <div className="flex items-center gap-1 text-emerald-600 font-extrabold text-xs">
                                  <CheckCircle2 size={13} className="text-emerald-500" />
                                  <span className="uppercase tracking-widest text-[0.55rem] font-mono font-black">ACTIVE ACCESS</span>
                                </div>
                              </td>

                              <td className="px-6 py-5 text-right">
                                {subClasses.length > 0 && user?.role === 'teacher' ? (
                                  <div className="flex flex-col items-end gap-1.5">
                                    <select
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          handleStartEntry(sub.id!, Number(e.target.value));
                                        }
                                      }}
                                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-[0.5625rem] uppercase tracking-widest rounded-xl outline-none focus:ring-2 focus:ring-blue-400/50 cursor-pointer border-none shadow-sm transition-all"
                                      defaultValue=""
                                    >
                                      <option value="" disabled>Enter Scores...</option>
                                      {subClasses.map(c => (
                                        <option key={c.id} value={c.id}>{c.className}</option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  <span className="text-[0.55rem] font-bold text-gray-400 uppercase italic">
                                    {user?.role === 'teacher' ? 'No target classes' : 'Audit Read-Only'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View card layout (Zero horizontal scrolling) */}
                <div className="block md:hidden divide-y divide-gray-100 p-2 space-y-4">
                  {auditSubjects
                    .filter(s => s.teacherId === auditTeacherId || s.assistantTeacherIds?.includes(auditTeacherId || -1))
                    .map(sub => {
                      const subClasses = getSubjectClasses(sub);
                      const isPrimary = sub.teacherId === auditTeacherId;
                      const depts = getDepartmentNames(sub.departmentIds);

                      return (
                        <div key={sub.id} className="bg-white rounded-2xl border border-gray-150 p-4 space-y-3.5 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 border border-slate-205 rounded-xl flex items-center justify-center font-black font-mono text-slate-700 text-xs shrink-0">
                                {sub.subjectName.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-black text-gray-900 uppercase italic tracking-tight">{sub.subjectName}</p>
                                <div className="flex gap-1.5 mt-1">
                                  {sub.isCore ? (
                                    <span className="px-1.5 py-0.5 bg-emerald-55 text-emerald-600 bg-emerald-50 border border-emerald-100 text-[9px] font-black uppercase rounded tracking-tighter">
                                      Core
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 bg-blue-55 text-blue-600 bg-blue-50 border border-blue-100 text-[9px] font-black uppercase rounded tracking-tighter">
                                      Elective
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              {isPrimary ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[8px] font-black uppercase rounded-md shadow-3xs">
                                  Lead
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 border border-violet-100 text-violet-700 text-[8px] font-black uppercase rounded-md">
                                  Assistant
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100/50 text-xs">
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Scope Target</span>
                              {sub.classId !== undefined && sub.classId !== null ? (
                                <p className="text-[0.6875rem] font-bold text-indigo-600 uppercase tracking-wide">
                                  ★ Direct Class Match Lock
                                </p>
                              ) : (
                                <p className="text-[0.6875rem] font-bold text-gray-700">
                                  Level: <span className="italic">{(sub.coreLevels || []).join(', ')}</span>
                                </p>
                              )}
                              {depts.length > 0 && (
                                <p className="text-[0.625rem] font-bold text-blue-500 uppercase tracking-tighter">
                                  Depts: {depts.join(', ')}
                                </p>
                              )}
                            </div>

                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Encompassed Classes</span>
                              {subClasses.length === 0 ? (
                                <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider italic flex items-center gap-1">
                                  <AlertTriangle size={10} /> No Matches Found
                                </span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {subClasses.map(c => (
                                    <span key={c.id} className="px-1.5 py-0.5 bg-white border border-gray-200 text-gray-700 text-[9px] font-bold uppercase rounded-md tracking-tight">
                                      {c.className}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-1 text-emerald-600 font-extrabold text-[9px]">
                              <CheckCircle2 size={11} className="text-emerald-500" />
                              <span className="uppercase tracking-wider font-mono font-black">ACTIVE</span>
                            </div>

                            <div>
                              {subClasses.length > 0 && user?.role === 'teacher' ? (
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleStartEntry(sub.id!, Number(e.target.value));
                                    }
                                  }}
                                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg outline-none cursor-pointer border-none shadow-sm"
                                  defaultValue=""
                                >
                                  <option value="" disabled>Enter Scores...</option>
                                  {subClasses.map(c => (
                                    <option key={c.id} value={c.id}>{c.className}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-[9px] font-bold text-gray-400 uppercase italic">
                                  {user?.role === 'teacher' ? 'No target classes' : 'Audit Read-Only'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : !selectedClassId ? (
        <EmptyState icon="LayoutGrid" message="Please select a class to begin data entry." />
      ) : activeTab === 'academic' && !selectedSubjectId ? (
        <EmptyState icon="BookOpen" message="Please select a subject to enter scores." />
      ) : students.length === 0 ? (
        <EmptyState icon="Users" message="No students found in this class." />
      ) : (
        <div className="space-y-6">
          {activeTab === 'academic' ? (
            <div className="space-y-6">
              {/* Subject Integrity Check Card */}
              {integrityCheck && (
                <div className="px-4">
                  {integrityCheck.issues.length > 0 ? (
                    <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200">
                          <ShieldAlert className="w-5 h-5 text-amber-600 animate-pulse" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-black text-amber-900 tracking-tight uppercase italic mb-0.5">Subject Integrity Check Warning</h4>
                          <p className="text-[0.6875rem] font-bold text-amber-800 uppercase tracking-wider mb-2">
                            Potential Data Entry Conflict Detected
                          </p>
                          <div className="space-y-3">
                            {integrityCheck.issues.map((issue, idx) => (
                              <div key={idx} className="p-3 bg-white/70 border border-amber-200/40 rounded-xl text-left">
                                <div className="flex items-center gap-2 mb-1">
                                  {issue.type === 'error' ? (
                                    <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                                  ) : (
                                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                                  )}
                                  <span className="text-xs font-black text-gray-800 uppercase italic tracking-tight">{issue.title}</span>
                                </div>
                                <p className="text-xs font-bold text-gray-600 leading-relaxed mb-1.5">{issue.message}</p>
                                {issue.resolution && (
                                  <div className="flex items-start gap-1.5 border-t border-dashed border-amber-200/60 pt-1.5 mt-1.5">
                                    <span className="text-[0.55rem] font-black text-blue-600 uppercase tracking-widest shrink-0 mt-0.5">RESOLUTION:</span>
                                    <p className="text-[0.625rem] font-bold text-blue-700 leading-normal">{issue.resolution}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50/20 border border-emerald-100/60 rounded-2xl px-5 py-3 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-emerald-900 uppercase italic tracking-wide">Subject Integrity Verified</p>
                          <p className="text-[0.55rem] font-bold text-emerald-600 uppercase tracking-widest">
                            {user?.role === 'teacher' ? 'Subject is formally assigned to your account & class aligned' : 'Subject is correctly aligned in database'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[0.5rem] font-black bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded uppercase tracking-[0.1em]">DB SECURE</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4">
                <div className="flex items-center gap-2 relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search student..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-2 bg-white border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-xs shadow-sm text-gray-900"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleDownloadGradeTemplate}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 text-blue-600 text-[0.625rem] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Template
                  </button>
                  <button 
                    onClick={() => gradeFileInputRef.current?.click()}
                    disabled={isImporting}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-600 text-[0.625rem] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-100 transition-all"
                  >
                    {isImporting ? <Spinner size="sm" /> : <Upload className="w-3.5 h-3.5" />}
                    Import
                  </button>
                  <input 
                    type="file" 
                    ref={gradeFileInputRef}
                    onChange={handleImportGrades}
                    accept=".xlsx, .xls"
                    className="hidden"
                  />
                </div>
              </div>
              <div className="space-y-4">
                {students.map(student => {
                const studentGrades = grades.filter(g => g.studentId === student.id);
                const grade = studentGrades.find(g => g.term === term);
                
                const cumulativeTotal = studentGrades.reduce((sum, g) => sum + (g.total || 0), 0);
                const cumulativeAvg = studentGrades.length > 0 ? (cumulativeTotal / studentGrades.length).toFixed(1) : '0.0';

                const subject = subjects.find(s => s.id === selectedSubjectId);
                if (!subject) return null;

                return (
                  <div key={student.id} className="space-y-2">
                    <div className="flex items-center justify-between px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-black text-xs">
                          {student.fullName.charAt(0)}
                        </div>
                        <span className="text-sm font-black text-gray-900 tracking-tight">{student.fullName}</span>
                        <span className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">{student.admissionNumber}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {studentGrades.length > 1 && (
                          <div className="flex flex-col items-end">
                            <span className="text-[0.5rem] font-black text-gray-400 uppercase tracking-widest">Cumulative Avg</span>
                            <span className="text-xs font-black text-blue-600">{cumulativeAvg}</span>
                          </div>
                        )}
                        {grade && (
                          <div className="flex items-center gap-1.5 text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="text-[0.625rem] font-black uppercase tracking-widest">Saved</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <ScoreInput 
                      student={student}
                      subject={subject}
                      settings={settings}
                      initialGrade={grade}
                      onSave={handleSaveGrade}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          ) : activeTab === 'behavioral' ? (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">Behavioral Assessment</h3>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Term {term} • {session}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleDownloadTraitTemplate}
                    disabled={!selectedClassId}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 text-blue-600 text-[0.625rem] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Template
                  </button>
                  <button 
                    onClick={() => traitFileInputRef.current?.click()}
                    disabled={isImporting || !selectedClassId}
                    className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-600 text-[0.625rem] font-black uppercase tracking-widest rounded-xl hover:bg-purple-100 transition-all disabled:opacity-50"
                  >
                    {isImporting ? <Spinner size="sm" /> : <Upload className="w-3.5 h-3.5" />}
                    Import
                  </button>
                  <button 
                    onClick={handleRunAutoFill}
                    disabled={isImporting || !selectedClassId}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-[0.625rem] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:opacity-50"
                  >
                    {isImporting ? <Spinner size="sm" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                    Run Auto-Fill
                  </button>
                  <input 
                    type="file" 
                    ref={traitFileInputRef}
                    onChange={handleImportTraits}
                    accept=".xlsx, .xls"
                    className="hidden"
                  />
                </div>
              </div>
              {students.map(student => {
                return (
                  <div key={student.id} className="space-y-4">
                    <div className="flex items-center gap-3 px-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-black text-sm">
                        {student.fullName.charAt(0)}
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-base font-black text-gray-900 tracking-tight">{student.fullName}</h4>
                        <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">{student.admissionNumber}</p>
                      </div>
                    </div>
                    <TraitInput 
                      student={student}
                      settings={settings}
                      onSave={handleSaveTrait}
                    />
                  </div>
                );
              })}
            </div>
          ) : activeTab === 'attendance' ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">Attendance Records</h3>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Term {term} • {session}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center bg-gray-100 rounded-xl p-1">
                    <button 
                      onClick={() => downloadTemplate(false)}
                      disabled={!selectedClassId}
                      className="flex items-center gap-2 px-4 py-2 text-[0.625rem] font-black uppercase tracking-widest text-gray-600 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Class Template
                    </button>
                    <div className="w-px h-4 bg-gray-200" />
                    <button 
                      onClick={() => downloadTemplate(true)}
                      className="flex items-center gap-2 px-4 py-2 text-[0.625rem] font-black uppercase tracking-widest text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      All Students
                    </button>
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-[0.625rem] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Import Records
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleImport}
                    accept=".csv, .xlsx, .xls"
                    className="hidden"
                  />
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm overflow-x-auto custom-scrollbar">
                <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-8 py-5 text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">Student</th>
                    <th className="px-8 py-5 text-center text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">Days Present</th>
                    <th className="px-8 py-5 text-center text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">Total Days</th>
                    <th className="px-8 py-5 text-center text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.map(student => {
                    const att = attendance.find(a => a.studentId === student.id);
                    return (
                      <AttendanceInput 
                        key={student.id}
                        student={student}
                        settings={settings!}
                        initialAttendance={att}
                        onSave={(field, value) => handleAttendanceChange(student.id!, field, value)}
                        isRestricted={isAttendanceRestricted}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">Teacher & Principal Remarks</h3>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Term {term} • {session}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {students.map(student => {
                  const att = attendance.find(a => a.studentId === student.id);
                  
                  // Calculate average to show to the user
                  const studentGrades = grades.filter(g => g.studentId === student.id && g.term === term);
                  const totalScore = studentGrades.reduce((sum, g) => sum + (g.total || 0), 0);
                  const totalObtainable = studentGrades.length * (settings?.totalSubjectScore || 100);
                  const average = totalObtainable > 0 ? (totalScore / totalObtainable) * 100 : 0;

                  return (
                    <div key={student.id} className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-black text-sm">
                            {student.fullName.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-base font-black text-gray-900 tracking-tight">{student.fullName}</h4>
                            <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">{student.admissionNumber} • Avg: {average.toFixed(1)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAIGenerateRemarks(student)}
                            disabled={isAIGenerating[student.id!]}
                            className="px-4 py-2 bg-purple-50 text-purple-600 rounded-xl text-[0.625rem] font-black uppercase tracking-widest hover:bg-purple-100 transition-colors flex items-center gap-2 border border-purple-100"
                          >
                            {isAIGenerating[student.id!] ? (
                              <Spinner size="sm" className="text-purple-600" />
                            ) : (
                              <BrainCircuit className="w-3.5 h-3.5" />
                            )}
                            AI Intelligence
                          </button>
                          <button
                            onClick={() => handleAutoGenerateRemarks(student)}
                            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[0.625rem] font-black uppercase tracking-widest hover:bg-blue-100 transition-colors border border-blue-100"
                          >
                            Auto-Rule
                          </button>
                        </div>
                      </div>
                      
                      <RemarkInput 
                        student={student}
                        settings={settings}
                        initialAttendance={att}
                        onSave={(field, value) => handleRemarkChange(student.id!, field, value)}
                        isRestricted={isAttendanceRestricted}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
        )}
      </div>
    )}
  </div>
);
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, icon: any, label: string }> = ({ active, onClick, icon: Icon, label }) => (
  <button 
    onClick={onClick}
    className={`relative z-10 flex-1 px-2 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 sm:gap-2.5 ${
      active 
        ? 'text-blue-600' 
        : 'text-gray-400 hover:text-gray-600'
    }`}
  >
    {active && (
      <motion.div 
        layoutId="activeTabBackground"
        className="absolute inset-0 bg-white rounded-xl shadow-sm border border-gray-200/50 z-[-1]"
        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
      />
    )}
    <Icon className={`w-3.5 h-3.5 sm:w-4 h-4 transition-transform duration-300 ${active ? 'scale-110' : 'scale-100'}`} />
    <span className="uppercase tracking-widest text-[0.5625rem] xs:text-[0.625rem] sm:text-xs">{label}</span>
    {active && (
      <motion.div 
        layoutId="activeTabGlow"
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.8)]"
      />
    )}
  </button>
);
