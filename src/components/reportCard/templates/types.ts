import { IStudent, IClass, ISettings, ITrait } from '../../../db/db';
import { CumulativeRow } from '../../../types/reportCard';
import { brandContrast } from '../../../lib/brandContrast';

export interface BrandContrastDetails {
  backgroundColor: string;
  textColor: '#000000' | '#ffffff';
  isLight: boolean;
  subtextColor: string;
  badgeBackground: string;
  badgeTextColor: string;
  badgeBorder: string;
  borderSubtle: string;
}

export function getBrandContrastDetails(hexColor?: string): BrandContrastDetails {
  const bg = hexColor && hexColor.trim() ? hexColor.trim() : '#1f2937';
  let textColor: '#000000' | '#ffffff';
  try {
    textColor = brandContrast(bg);
  } catch {
    textColor = '#ffffff';
  }
  const isLight = textColor === '#000000';

  return {
    backgroundColor: bg,
    textColor,
    isLight,
    subtextColor: isLight ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.85)',
    badgeBackground: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.20)',
    badgeTextColor: isLight ? '#000000' : '#ffffff',
    badgeBorder: isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.25)',
    borderSubtle: isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.20)',
  };
}

export function getSchoolInitials(name?: string): string {
  if (!name || !name.trim()) return 'S';
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 'S';
  return tokens.slice(0, 3).map(w => w[0]).join('').toUpperCase();
}

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
  contrastDetails?: BrandContrastDetails;
  isEditable?: boolean;
  userRole?: string;
  onUpdateRemark?: (type: 'teacher' | 'principal', value: string) => void;
}

