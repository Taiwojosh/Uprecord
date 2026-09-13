import { IStudent, IClass, ISettings, ITrait } from '../../../db/db';
import { CumulativeRow } from '../../../types/reportCard';

export interface ReportCardTemplateProps {
  student: IStudent;
  studentClass: IClass;
  settings: ISettings;
  gradesWithTotal: any[];
  cumulativeRecords: CumulativeRow[];
  classSize: number;
  isPremium: boolean;
  age: number;
  totalDays: number;
  daysPresent: number;
  daysAbsent: number;
  totalObtainable: number;
  studentTotalScore: number;
  percentage: string;
  avgCumulativePercentage: number;
  showCumulative: boolean;
  teacherRemark: string;
  principalRemark: string;
  localTeacherRemark: string;
  setLocalTeacherRemark: (val: string) => void;
  localPrincipalRemark: string;
  setLocalPrincipalRemark: (val: string) => void;
  behavioralTraits: ITrait[];
  psychomotorTraits: ITrait[];
  traitScores: Record<number, number>;
  brandStyle: any;
  isEditable?: boolean;
  userRole?: string;
  onUpdateRemark?: (type: 'teacher' | 'principal', value: string) => void;
}
