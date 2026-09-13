import { describe, it, expect } from 'vitest';
import { 
  calculateAge, 
  calculateTotal, 
  deriveGradeAndRemark, 
  calculateClassRank, 
  computeOverallPercentage,
  sanitizeFileName
} from './calculationEngine';

describe('calculationEngine', () => {
  describe('calculateAge', () => {
    it('calculates age correctly', () => {
      const today = new Date();
      const birthYear = today.getFullYear() - 10;
      const dob = `${birthYear}-01-01`;
      expect(calculateAge(dob)).toBe(10);
    });
  });

  describe('calculateTotal', () => {
    it('sums CA and exam scores correctly', () => {
      const caScores = { ca1: 15, ca2: 15 };
      const examScore = 60;
      expect(calculateTotal(caScores, examScore)).toBe(90);
    });
  });

  describe('deriveGradeAndRemark', () => {
    it('returns A for 70% and above', () => {
      const result = deriveGradeAndRemark(75);
      expect(result.grade).toBe('A');
      expect(result.remark).toBe('EXCELLENT');
    });

    it('returns F for below 30%', () => {
      const result = deriveGradeAndRemark(25);
      expect(result.grade).toBe('F');
      expect(result.remark).toBe('FAIL');
    });
  });

  describe('calculateClassRank', () => {
    it('returns correct rank suffix', () => {
      const allAverages = [90, 85, 80, 75];
      expect(calculateClassRank(90, allAverages)).toBe('1st');
      expect(calculateClassRank(85, allAverages)).toBe('2nd');
      expect(calculateClassRank(80, allAverages)).toBe('3rd');
      expect(calculateClassRank(75, allAverages)).toBe('4th');
    });
  });

  describe('computeOverallPercentage', () => {
    it('formats percentage correctly', () => {
      expect(computeOverallPercentage(75, 100)).toBe('75.00%');
      expect(computeOverallPercentage(33.333, 100)).toBe('33.33%');
    });
  });

  describe('sanitizeFileName', () => {
    it('converts to uppercase and replaces special chars with underscore', () => {
      expect(sanitizeFileName('John Doe-Smith!')).toBe('JOHN_DOE_SMITH_');
    });
  });
});
