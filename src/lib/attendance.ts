import { db } from '../db/db';

export interface IMissingAttendanceItem {
  classId: number;
  className: string;
  date: string;
  formattedDate: string;
}

export async function hasMissingAttendance(teacherId: number, classIds: number[]) {
  const list = await getMissingAttendanceList(teacherId, classIds);
  return list.length > 0;
}

export async function getMissingAttendanceList(teacherId: number, classIds: number[]): Promise<IMissingAttendanceItem[]> {
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i - 1);
    return d;
  });

  const settings = await db.settings.toCollection().first();
  const holidayDates = settings?.holidayDates || [];
  const results: IMissingAttendanceItem[] = [];

  for (const dateObj of last30Days) {
    // Skip weekends
    if (dateObj.getDay() === 0 || dateObj.getDay() === 6) continue;
    
    const dateStr = dateObj.toISOString().split('T')[0];

    // Skip holidays
    if (holidayDates.includes(dateStr)) continue;
    
    for (const classId of classIds) {
      const records = await db.dailyAttendance.where({ classId, date: dateStr }).toArray();
      if (records.length === 0) {
        const cls = await db.classes.get(classId);
        const formattedDate = dateObj.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        results.push({
          classId,
          className: cls?.className || `Class #${classId}`,
          date: dateStr,
          formattedDate
        });
      }
    }
  }
  return results.sort((a, b) => b.date.localeCompare(a.date)); // Sort newest/most recent first
}

