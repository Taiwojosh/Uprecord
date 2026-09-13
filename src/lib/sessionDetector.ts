/**
 * Detects the current academic session based on the current date.
 * Academic sessions in Nigeria typically run from September to August.
 * @returns string formatted as "YYYY/YYYY" (e.g., "2024/2025")
 */
export function detectCurrentSession(): string {
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  
  // If we are in September (9) or later, the session starts this year
  // Otherwise, it started last year
  return month >= 9
    ? `${year}/${year + 1}`
    : `${year - 1}/${year}`;
}

/**
 * Detects the current academic term based on the current date.
 * 1st Term: Sept - Dec
 * 2nd Term: Jan - March
 * 3rd Term: April - August
 * @returns 1 | 2 | 3
 */
export function detectCurrentTerm(): 1 | 2 | 3 {
  const month = new Date().getMonth() + 1;
  
  if (month >= 9 && month <= 12) return 1;
  if (month >= 1 && month <= 3) return 2;
  return 3;
}
