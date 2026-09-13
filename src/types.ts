export interface Student {
  id: string;
  name: string;
  grade: string;
  attendance: number;
  subjects: {
    name: string;
    score: number;
  }[];
  lastAssessmentDate: string;
}

export interface PerformanceReport {
  studentId: string;
  summary: string;
  strengths: string[];
  areasForImprovement: string[];
  recommendations: string[];
  generatedAt: string;
}
