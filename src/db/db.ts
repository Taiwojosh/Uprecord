import Dexie, { type Table } from 'dexie';

export interface IActivation {
  id?: number;
  hardwareId: string;
  licenseKey: string;
  activatedAt: string;
  expiresAt: string | null;
  plan: 'trial' | 'monthly' | 'term' | 'yearly' | 'lifetime';
  lastVerifiedAt: string;
  schoolId?: string;
}

export interface CAComponent {
  id: string;
  name: string;
  maxScore: number;
}

export interface IGradingScale {
  grade: string;
  minScore: number;
  remark: string;
}

export interface ISettings {
  id?: number;
  schoolId?: string;
  schoolName: string;
  schoolSlogan: string;
  address: string;
  logoBase64: string;
  principalName: string;
  principalSignatureBase64: string;
  brandColor: string;
  nextTermDate: string;
  termClosingDate: string;
  resumptionDate?: string;
  currentTerm: 1 | 2 | 3;
  currentSession: string;
  totalSubjectScore: number;
  examMaxScore: number;
  caMaxScore: number;
  caComponents: CAComponent[];
  daysSchoolOpen: number;
  department1Name: string;
  department1Level?: 'Primary' | 'junior' | 'senior';
  department2Name: string;
  department2Level?: 'Primary' | 'junior' | 'senior';
  department3Name: string;
  department3Level?: 'Primary' | 'junior' | 'senior';
  enableLevelSubjectFiltering?: boolean;
  gradingScale: IGradingScale[];
  reportCardTemplate?: 'classic' | 'modern' | 'minimal';
  enableGradeColors?: boolean;
  enableCumulativeReport?: boolean;
  autoHideCumulativeForEarlierTerms?: boolean;
  enableDataOverride?: boolean;
  publishedTerms?: string[];
  holidayDates?: string[];
  holidayNames?: Record<string, string>;
  restrictTeacherActionsNoAttendance?: boolean;
  allowTeachersViewFeeStatus?: boolean;
  restrictUnpaidStudentsAccess?: boolean;
}

export interface IComment {
  id?: number;
  schoolId?: string;
  studentId: number;
  term: 1 | 2 | 3;
  session: string;
  teacherComment?: string;
  principalComment?: string;
}

export interface IClass {
  id?: number;
  schoolId?: string;
  className: string;
  teacherName: string;
  teacherId?: number | null;
  level: 'Primary' | 'junior' | 'senior' | 'Secondary';
  departmentId?: 1 | 2 | 3 | null;
  capacity?: number;
}

export interface ISubject {
  id?: number;
  schoolId?: string;
  subjectName: string;
  isCore: boolean;
  coreLevels?: ('Primary' | 'junior' | 'senior' | 'Secondary')[];
  departmentIds: number[];
  teacherId?: number | null;
  classId?: number;
  classIds?: number[];
  assistantTeacherIds?: number[];
}

export interface ITrait {
  id?: number;
  schoolId?: string;
  traitName: string;
  displayOrder: number;
  category: 'affective' | 'psychomotor';
}

export interface IStudent {
  id?: number;
  schoolId?: string;
  admissionNumber: string;
  fullName: string;
  dateOfBirth: string;
  classId: number;
  gender: 'Male' | 'Female';
  departmentId?: number | null;
  departmentName?: string;
  email?: string;
  phone?: string;
  status: 'Active' | 'Inactive' | 'Graduated' | 'Suspended';
  enrolledDate: string;
  photoBase64?: string;
  address?: string;
  parentPhone?: string;
  parentEmail?: string;
  previousSchool?: string;
  medicalNotes?: string;
}

export interface IGrade {
  id?: number;
  schoolId?: string;
  studentId: number;
  subjectId: number;
  term: 1 | 2 | 3;
  session: string;
  caScores: Record<string, number>;
  examScore: number;
  total?: number;
  grade?: string;
  remark?: string;
  updatedAt?: string;
}

export interface IResultApproval {
  id?: number;
  schoolId?: string;
  classId: number;
  term: 1 | 2 | 3;
  session: string;
  status: 'Draft' | 'Submitted' | 'Published';
  approvedBy?: number; // User Id of admin who approved
  approvedAt?: string;
}

export interface ITraitGrade {
  id?: number;
  schoolId?: string;
  studentId: number;
  traitId: number;
  term: 1 | 2 | 3;
  session: string;
  score: number;
  updatedAt?: string;
}

export interface IAttendance {
  id?: number;
  schoolId?: string;
  studentId: number;
  term: 1 | 2 | 3;
  session: string;
  daysPresent: number;
  totalDays: number;
  teacherRemark?: string;
  principalRemark?: string;
  updatedAt?: string;
  syncStatus?: 'pending' | 'synced';
}

export interface IDailyAttendance {
  id?: number;
  schoolId?: string;
  studentId: number;
  date: string; // ISO date string (YYYY-MM-DD)
  status: 'present' | 'absent' | 'late' | 'excused';
  teacherId: number;
  classId: number;
  term: 1 | 2 | 3;
  session: string;
  markedByRole?: 'admin' | 'teacher';
  markedByName?: string;
  syncStatus?: 'pending' | 'synced';
}

export interface ICurriculum {
  id?: number;
  schoolId?: string;
  subjectId: number;
  classId: number;
  term: 1 | 2 | 3;
  session: string;
  topics: {
    week: number;
    title: string;
    description?: string;
    completed: boolean;
    videoUrl?: string;
  }[];
  updatedAt?: string;
}

export interface ILessonNote {
  id?: number;
  schoolId?: string;
  subjectId: number;
  classId: number;
  term: 1 | 2 | 3;
  session: string;
  weeks: {
    week: number;
    title: string;
    description?: string;
    content: string; // Formatting or text content of the lesson note
    videoUrl?: string; // Embedded video url
    updatedAt?: string;
  }[];
  updatedAt?: string;
}

export interface IUser {
  id?: number;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  password?: string; // Optional for local mock
  schoolId: string;
  fullName: string;
  studentId?: number; // Link to IStudent if role is student
  isAdmin?: boolean; // Admin privileges for teachers
  department?: string;
  phone?: string;
  status?: string;
  joinDate?: string;
}

export interface IAuditLog {
  id?: number;
  schoolId?: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface IPayment {
  id?: number;
  schoolId?: string;
  studentId: number;
  amount: number;
  category: 'Tuition' | 'Books' | 'Uniform' | 'Bus' | 'Other';
  term: 1 | 2 | 3;
  session: string;
  paymentMethod: 'Bank Transfer' | 'Cash' | 'POS' | 'Online';
  status: 'paid' | 'pending' | 'failed';
  date: string;
}

export interface IAnnouncement {
  id?: number;
  schoolId?: string;
  title: string;
  content: string;
  isPinned: boolean;
  authorName: string;
  createdAt: string;
}

export interface ITask {
  id?: number;
  schoolId?: string;
  label: string;
  priority: 'URGENT' | 'PENDING' | 'LOW';
  color: 'red' | 'amber' | 'slate';
  completed: boolean;
  createdAt: string;
}

export class UpRecordDB extends Dexie {
  activation!: Table<IActivation>;
  settings!: Table<ISettings>;
  classes!: Table<IClass>;
  subjects!: Table<ISubject>;
  traits!: Table<ITrait>;
  students!: Table<IStudent>;
  grades!: Table<IGrade>;
  traitGrades!: Table<ITraitGrade>;
  attendance!: Table<IAttendance>;
  dailyAttendance!: Table<IDailyAttendance>;
  comments!: Table<IComment>;
  curriculum!: Table<ICurriculum>;
  lessonNotes!: Table<ILessonNote>;
  users!: Table<IUser>;
  auditLogs!: Table<IAuditLog>;
  payments!: Table<IPayment>;
  announcements!: Table<IAnnouncement>;
  tasks!: Table<ITask>;
  resultApprovals!: Table<IResultApproval>;

  constructor() {
    super('ScholarSyncDB');
    this.version(23).stores({
      activation: '++id, schoolId',
      settings: '++id, schoolId',
      classes: '++id, className, level, departmentId, teacherName, teacherId, schoolId',
      subjects: '++id, subjectName, isCore, teacherId, *assistantTeacherIds, classId, schoolId',
      traits: '++id, displayOrder, category, schoolId',
      students: '++id, &admissionNumber, classId, fullName, status, gender, schoolId',
      grades: '++id, [studentId+subjectId+term+session], studentId, subjectId, term, session, total, schoolId',
      traitGrades: '++id, [studentId+traitId+term+session], studentId, schoolId',
      attendance: '++id, [studentId+term+session], studentId, term, session, schoolId',
      dailyAttendance: '++id, [studentId+date+term+session], studentId, date, classId, term, session, schoolId',
      comments: '++id, [studentId+term+session], studentId, schoolId',
      curriculum: '++id, [subjectId+classId+term+session], subjectId, classId, term, session, schoolId',
      lessonNotes: '++id, [subjectId+classId+term+session], subjectId, classId, term, session, schoolId',
      users: '++id, email, role, fullName, studentId, schoolId',
      auditLogs: '++id, userId, timestamp, action, schoolId',
      payments: '++id, studentId, term, session, date, status, schoolId',
      announcements: '++id, createdAt, isPinned, schoolId',
      tasks: '++id, completed, schoolId',
      resultApprovals: '++id, [classId+term+session], classId, term, session, schoolId'
    });

    this.on('populate', () => {
      this.users.add({
        email: 'admin@scholar-sync.local',
        fullName: 'System Administrator',
        role: 'admin',
        schoolId: 'school-1'
      });

      this.traits.bulkAdd([
        { traitName: 'Punctuality', displayOrder: 1, category: 'affective' },
        { traitName: 'Neatness', displayOrder: 2, category: 'affective' },
        { traitName: 'Politeness', displayOrder: 3, category: 'affective' },
        { traitName: 'Honesty', displayOrder: 4, category: 'affective' },
        { traitName: 'Cooperation', displayOrder: 5, category: 'affective' },
        { traitName: 'Leadership', displayOrder: 6, category: 'affective' },
        { traitName: 'Self-Control', displayOrder: 7, category: 'affective' },
        { traitName: 'Mental Alertness', displayOrder: 8, category: 'affective' },
        { traitName: 'Reliability', displayOrder: 9, category: 'affective' },
        { traitName: 'Handwriting', displayOrder: 10, category: 'psychomotor' },
        { traitName: 'Games/Sports', displayOrder: 11, category: 'psychomotor' },
        { traitName: 'Handling of Tools', displayOrder: 12, category: 'psychomotor' },
        { traitName: 'Drawing/Painting', displayOrder: 13, category: 'psychomotor' },
        { traitName: 'Verbal Fluency', displayOrder: 14, category: 'psychomotor' },
      ]);
    });
  }
}

export const db = new UpRecordDB();
