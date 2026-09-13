import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useAuth } from '../context/AuthContext';
import { hasMissingAttendance } from '../lib/attendance';

export interface AttendanceRestrictionResult {
  isRestricted: boolean;
  missingClasses: string[];
  isLoading: boolean;
}

export function useAttendanceRestriction(): AttendanceRestrictionResult {
  const { user } = useAuth();

  const result = useLiveQuery(async () => {
    // Admins are never restricted
    if (!user || user.isAdmin) {
      return { isRestricted: false, missingClasses: [], isLoading: false };
    }

    // Load school settings
    const settings = await db.settings.toCollection().first();
    if (!settings || !settings.restrictTeacherActionsNoAttendance) {
      return { isRestricted: false, missingClasses: [], isLoading: false };
    }

    // Find classes assigned to this teacher
    const userId = Number(user.id);
    const myClasses = await db.classes
      .filter(c => c.teacherId === userId || c.teacherName === user.fullName)
      .toArray();

    if (myClasses.length === 0) {
      return { isRestricted: false, missingClasses: [], isLoading: false };
    }

    const classIds = myClasses.map(c => c.id!).filter((id): id is number => id !== undefined);
    const hasMissing = await hasMissingAttendance(userId, classIds);

    if (hasMissing) {
      // Find exactly which dates/classes have missing attendance to list them
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i - 1);
        return d;
      });

      const holidayDates = settings.holidayDates || [];
      const missingTitlesSet = new Set<string>();

      for (const dateObj of last30Days) {
        if (dateObj.getDay() === 0 || dateObj.getDay() === 6) continue;
        const dateStr = dateObj.toISOString().split('T')[0];
        if (holidayDates.includes(dateStr)) continue;

        for (const cls of myClasses) {
          const records = await db.dailyAttendance.where({ classId: cls.id!, date: dateStr }).toArray();
          if (records.length === 0) {
            // format date beautifully
            const formattedDate = new Date(dateStr).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
            missingTitlesSet.add(`${cls.className} (${formattedDate})`);
          }
        }
      }

      return {
        isRestricted: true,
        missingClasses: Array.from(missingTitlesSet).slice(0, 5), // show top 5
        isLoading: false
      };
    }

    return { isRestricted: false, missingClasses: [], isLoading: false };
  }, [user]);

  return result ?? { isRestricted: false, missingClasses: [], isLoading: true };
}
