import type { IGrade, ISubject, ISettings } from '../db/db';

export interface CumulativeRow {
  subjectId: number;
  subjectName: string;
  term1Total: number | null;
  term2Total: number | null;
  term3Total: number | null;
  cumulativeTotal: number;
  cumulativeAverage: number;
  cumulativePercentage: number;
  grade: string;
  remark: string;
}

export interface StudentPerformance {
  totalObtainable: number;
  studentScore: number;
  percentage: string;
  average: number;
}
