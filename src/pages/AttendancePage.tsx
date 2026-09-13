import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { 
  Clock, Calendar, Users, Save, Search, LayoutGrid, Check, X, 
  Lock, AlertTriangle, Sparkles, RefreshCw, Trash2, Plus, 
  CalendarDays, ShieldCheck, HelpCircle, CheckCircle2, Info
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type IAttendance, type IDailyAttendance } from '../db/db';
import { useCurrentSession } from '../hooks/useCurrentSession';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../hooks/useSettings';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAudit } from '../hooks/useAudit';
import { EmptyState } from '../components/ui/EmptyState';
import { syncAttendanceWithServer } from '../lib/attendanceSync';

const getLocalDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (dateStr: string) => {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.includes('-')) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const GridSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse select-none">
    {[...Array(8)].map((_, idx) => (
      <div key={idx} className="bg-white rounded-3xl border border-gray-100 p-5 flex flex-col justify-between h-[180px]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-100/80 border border-gray-200/40" />
          <div className="flex-1 space-y-2.5">
            <div className="h-4 bg-gray-100 rounded-lg w-3/4" />
            <div className="h-3 bg-gray-100/50 rounded-md w-1/2" />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
          <div className="h-3 bg-gray-100/80 rounded-md w-1/4" />
          <div className="flex gap-1">
            <div className="w-10 h-6 bg-gray-100 rounded" />
            <div className="w-10 h-6 bg-gray-100 rounded" />
            <div className="w-10 h-6 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const TableSkeleton: React.FC = () => (
  <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm animate-pulse select-none">
    <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[600px]">
        <thead>
          <tr className="bg-gray-50/50">
            <th className="px-8 py-5"><div className="h-3 bg-gray-200 rounded-md w-32" /></th>
            <th className="px-8 py-5"><div className="h-3 bg-gray-200 rounded-md w-24 mx-auto" /></th>
            <th className="px-8 py-5"><div className="h-3 bg-gray-200 rounded-md w-24 ml-auto" /></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {[...Array(6)].map((_, idx) => (
            <tr key={idx}>
              <td className="px-8 py-6">
                <div className="h-4 bg-gray-200 rounded-lg w-44 mb-2" />
                <div className="h-3 bg-gray-100 rounded-md w-24" />
              </td>
              <td className="px-8 py-6 flex justify-center">
                <div className="w-24 h-10 bg-gray-100 rounded-xl" />
              </td>
              <td className="px-8 py-6">
                <div className="h-4 bg-gray-200 rounded-lg w-20 ml-auto animate-pulse" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const HolidaySkeleton: React.FC = () => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse select-none">
    {/* Register Card Skeleton */}
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6 h-fit">
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded-lg w-32" />
        <div className="h-3 bg-gray-100 rounded-md w-full" />
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded-md w-20" />
          <div className="h-12 bg-gray-100 rounded-2xl w-full" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded-md w-32" />
          <div className="h-12 bg-gray-100 rounded-2xl w-full" />
        </div>
        <div className="h-12 bg-gray-200 rounded-2xl w-full" />
      </div>
    </div>
    {/* Holiday List Skeleton */}
    <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded-lg w-40" />
        <div className="h-3 bg-gray-100 rounded-md w-60" />
      </div>
      <div className="divide-y divide-gray-50">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="py-4 flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded-lg w-1/3" />
              <div className="h-3 bg-gray-100 rounded-md w-1/4" />
            </div>
            <div className="w-10 h-10 bg-gray-100 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { logAction } = useAudit();
  
  React.useEffect(() => {
    if (user?.role === 'student') {
      navigate('/student-portal', { replace: true });
    }
  }, [user, navigate]);

  const { session, term, termLabel } = useCurrentSession();
  const { settings, updateSettings } = useSettings();
  const isSettingsLoading = settings === undefined;
  const { showToast } = useToast();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const paramClassId = searchParams.get('classId') ? Number(searchParams.get('classId')) : null;
  const paramDate = searchParams.get('date');

  const [activeTab, setActiveTab] = useState<'daily' | 'summary' | 'holidays'>('daily');
  const [selectedClassId, setSelectedClassId] = useState<number | null>(paramClassId);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Daily attendance state
  const [selectedDate, setSelectedDate] = useState<string>(paramDate || getLocalDateString(new Date()));
  const [dailyStatuses, setDailyStatuses] = useState<Record<number, 'present' | 'absent' | 'late' | 'excused'>>({});

  // Helper action to update state and URL params in a single user action
  const updateClassAndDate = (classId: number | null, dateStr: string | null) => {
    const nextParams = new URLSearchParams(window.location.search);
    
    if (classId !== undefined) {
      setSelectedClassId(classId);
      if (classId) {
        nextParams.set('classId', String(classId));
      } else {
        nextParams.delete('classId');
      }
    }
    
    if (dateStr) {
      setSelectedDate(dateStr);
      nextParams.set('date', dateStr);
    }
    
    setSearchParams(nextParams, { replace: true });
  };

  // Sync URL search params with state only when values are actually present in the URL
  React.useEffect(() => {
    if (paramClassId !== null && paramClassId !== selectedClassId) {
      setSelectedClassId(paramClassId);
    }
    if (paramDate !== null && paramDate !== selectedDate) {
      setSelectedDate(paramDate);
    }
  }, [paramClassId, paramDate]);
  const [isSavingDaily, setIsSavingDaily] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(true);

  // Sync state
  const [isOnlineState, setIsOnlineState] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);

  const unsyncedDailyCount = useLiveQuery(
    () => db.dailyAttendance.filter(item => !item.syncStatus || item.syncStatus === 'pending').count()
  ) ?? 0;

  const unsyncedCumulativeCount = useLiveQuery(
    () => db.attendance.filter(item => !item.syncStatus || item.syncStatus === 'pending').count()
  ) ?? 0;

  const totalUnsynced = unsyncedDailyCount + unsyncedCumulativeCount;

  const handleSyncNow = async () => {
    if (!navigator.onLine) {
      showToast('You are currently offline. Please check your internet connection and try again.', 'info');
      return;
    }
    setIsSyncing(true);
    try {
      const res = await syncAttendanceWithServer();
      if (res.syncedCount > 0) {
        showToast(`Successfully synchronized ${res.syncedCount} local attendance records with server!`, 'success');
      } else if (res.failedCount > 0) {
        showToast(`Failed to sync some records. Check network configurations.`, 'error');
      } else {
        showToast('System is completely up to date.', 'success');
      }
    } catch (e) {
      console.error(e);
      showToast('Sync encountered an connection error.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  React.useEffect(() => {
    const handleOnlineStatus = () => {
      setIsOnlineState(navigator.onLine);
      if (navigator.onLine) {
        syncAttendanceWithServer().catch(console.error);
      }
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    setIsOnlineState(navigator.onLine);
    if (navigator.onLine) {
      syncAttendanceWithServer().catch(console.error);
    }

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  // Holiday section state
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');

  // Term attendance state
  const [isSavingSummary, setIsSavingSummary] = useState(false);
  const [localAttendance, setLocalAttendance] = useState<Record<number, number>>({});

  const classes = useLiveQuery(async () => {
    const all = await db.classes.toArray();
    if (user?.role === 'teacher' && !user?.isAdmin) {
      const userId = user?.id && !isNaN(Number(user.id)) ? Number(user.id) : -1;
      return all.filter(c => c.teacherId === userId || c.teacherName === user?.fullName);
    }
    return all;
  }, [user]);

  // Handle teacher auto-selection and auto-loading first missing registry if any
  React.useEffect(() => {
    const autoSelect = async () => {
      if (user?.role === 'teacher' && !user?.isAdmin && classes && classes.length > 0) {
        if (!selectedClassId) {
          const userId = user?.id && !isNaN(Number(user.id)) ? Number(user.id) : -1;
          const classIds = classes.map(c => c.id!).filter((id): id is number => id !== undefined);
          
          const { getMissingAttendanceList } = await import('../lib/attendance');
          const missing = await getMissingAttendanceList(userId, classIds);
          
          if (missing.length > 0) {
            updateClassAndDate(missing[0].classId, missing[0].date);
          } else {
            updateClassAndDate(classes[0].id!, null);
          }
        }
      }
    };
    autoSelect();
  }, [user, classes, selectedClassId]);

  const studentsRaw = useLiveQuery(
    () => selectedClassId ? db.students.where('classId').equals(selectedClassId).toArray() : Promise.resolve([]),
    [selectedClassId]
  );
  const students = studentsRaw ?? [];
  const isStudentsLoading = selectedClassId ? (studentsRaw === undefined) : false;

  // Create memoized signatures representing primitive values to safely trigger useEffects without circular loops
  const studentsSignature = React.useMemo(() => students.map(s => s.id).join(','), [students]);

  // Query Daily Records for the selected date - optimized to remove students from dependency list
  const dailyRecordsRaw = useLiveQuery(async () => {
    if (!selectedClassId || !selectedDate || !session) return [];
    return await db.dailyAttendance
      .where('classId').equals(selectedClassId)
      .filter(r => r.date === selectedDate && r.term === term && r.session === session)
      .toArray();
  }, [selectedClassId, selectedDate, term, session]);
  const dailyRecords = dailyRecordsRaw ?? [];
  const isDailyLoading = selectedClassId ? (dailyRecordsRaw === undefined) : false;

  const dailyRecordsSignature = React.useMemo(() => 
    JSON.stringify(dailyRecords.map(r => ({ id: r.studentId, status: r.status }))), 
    [dailyRecords]
  );

  const allTermAttendance = useLiveQuery(async () => {
    if (!selectedClassId || !session) return [];
    return await db.dailyAttendance
      .where('classId').equals(selectedClassId)
      .filter(r => r.term === term && r.session === session)
      .toArray();
  }, [selectedClassId, term, session]) ?? [];

  const markedDatesSet = React.useMemo(() => {
    const set = new Set<string>();
    allTermAttendance.forEach(r => {
      set.add(r.date);
    });
    return set;
  }, [allTermAttendance]);

  // Sync state with query for daily records - optimized with dailyRecordsSignature and studentsSignature to preserve user edits
  React.useEffect(() => {
    const initial: Record<number, 'present' | 'absent' | 'late' | 'excused'> = {};
    students.forEach(s => {
      const rec = dailyRecords.find(r => r.studentId === s.id);
      initial[s.id!] = rec ? rec.status : 'present';
    });
    setDailyStatuses(initial);
  }, [dailyRecordsSignature, studentsSignature]);

  // Query Term-based attendance records - optimized with studentsSignature
  const termAttendanceRecordsRaw = useLiveQuery(
    async () => {
      if (!selectedClassId || !session || !students.length) return [];
      const studentIds = students.map(s => s.id!);
      return db.attendance
        .where('studentId').anyOf(studentIds)
        .filter(r => r.term === term && r.session === session)
        .toArray();
    },
    [selectedClassId, term, session, studentsSignature]
  );
  const termAttendanceRecords = termAttendanceRecordsRaw ?? [];
  const isTermLoading = selectedClassId ? (termAttendanceRecordsRaw === undefined) : false;

  const termRecordsSignature = React.useMemo(() => 
    JSON.stringify(termAttendanceRecords.map(r => ({ id: r.studentId, days: r.daysPresent }))), 
    [termAttendanceRecords]
  );

  // Sync state for term-based cumulative records - optimized to prevent user edit overwrites
  React.useEffect(() => {
    const map: Record<number, number> = {};
    students.forEach(s => {
      const record = termAttendanceRecords.find(r => r.studentId === s.id);
      map[s.id!] = record?.daysPresent ?? 0;
    });
    setLocalAttendance(map);
  }, [termRecordsSignature, studentsSignature]);

  const calendarData = React.useMemo(() => {
    const resumption = settings?.resumptionDate;
    const closing = settings?.termClosingDate;
    if (!resumption || !closing) return null;

    let start = new Date(resumption);
    let end = new Date(closing);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

    if (start > end) {
      const t = start;
      start = end;
      end = t;
    }

    // Generate dates from start month 1st to end month last day
    const startMonthFirst = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonthLast = new Date(end.getFullYear(), end.getMonth() + 1, 0);

    const months: {
      year: number;
      month: number;
      name: string;
      weeks: (Date | null)[][];
    }[] = [];

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const current = new Date(startMonthFirst);
    while (current <= endMonthLast) {
      const yr = current.getFullYear();
      const mth = current.getMonth();
      const name = monthNames[mth];

      const daysInMonth = new Date(yr, mth + 1, 0).getDate();
      const firstDayIdx = new Date(yr, mth, 1).getDay();

      const daysList: (Date | null)[] = [];
      for (let i = 0; i < firstDayIdx; i++) {
        daysList.push(null);
      }
      for (let d = 1; d <= daysInMonth; d++) {
        daysList.push(new Date(yr, mth, d));
      }

      // Fill last week to maintain grid structure
      while (daysList.length % 7 !== 0) {
        daysList.push(null);
      }

      const weeks: (Date | null)[][] = [];
      for (let i = 0; i < daysList.length; i += 7) {
        weeks.push(daysList.slice(i, i + 7));
      }

      months.push({
        year: yr,
        month: mth,
        name,
        weeks
      });

      // Move to next month
      current.setMonth(current.getMonth() + 1);
    }

    return {
      months,
      startDate: start,
      endDate: end
    };
  }, [settings?.resumptionDate, settings?.termClosingDate]);

  const calendarStats = React.useMemo(() => {
    if (!calendarData) return null;
    const { startDate, endDate } = calendarData;
    const todayStr = getLocalDateString(new Date());
    const holidayDatesArr = settings?.holidayDates || [];

    let totalWeekdays = 0;
    let markedCount = 0;
    let pendingCount = 0;
    let holidaysCount = 0;

    const walker = new Date(startDate);
    while (walker <= endDate) {
      const dayOfWeek = walker.getDay();
      const dateStr = getLocalDateString(walker);
      const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
      const isHolidayDay = holidayDatesArr.includes(dateStr);

      if (!isWeekendDay) {
        if (isHolidayDay) {
          holidaysCount++;
        } else {
          totalWeekdays++;
          if (markedDatesSet.has(dateStr)) {
            markedCount++;
          } else if (dateStr <= todayStr) {
            pendingCount++;
          }
        }
      }
      walker.setDate(walker.getDate() + 1);
    }

    return { totalWeekdays, markedCount, pendingCount, holidaysCount };
  }, [calendarData, settings?.holidayDates, markedDatesSet]);

  // Helper date status
  const dateObj = parseLocalDate(selectedDate);
  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6; // Sunday = 0, Saturday = 6
  
  const holidayDates = settings?.holidayDates || [];
  const isHoliday = holidayDates.includes(selectedDate);
  const currentHolidayName = isHoliday ? settings?.holidayNames?.[selectedDate] || 'School Holiday' : '';

  // Determine if this daily record has been overridden or marked by Admin
  const loggedByRec = dailyRecords.length > 0 ? dailyRecords[0] : null;
  const isOverriddenByAdmin = dailyRecords.some(r => r.markedByRole === 'admin');
  const loggedByName = loggedByRec?.markedByName || '';
  const loggedByRole = loggedByRec?.markedByRole || '';

  // Lock UI for normal teachers if admin marked this record, or if it is a future date for class teachers
  const todayStr = getLocalDateString(new Date());
  const isFutureDate = selectedDate > todayStr;
  const isLockedForTeacher = !user?.isAdmin && (isOverriddenByAdmin || (user?.role === 'teacher' && isFutureDate));

  // Save Daily Attendance Helper - Optimized to run completely in-memory utilizing preloaded Dexie query data
  const saveDailyWithStatuses = async (statuses: Record<number, 'present' | 'absent' | 'late' | 'excused'>) => {
    if (!selectedClassId || !session || isLockedForTeacher) return;
    
    const todayStr = getLocalDateString(new Date());
    if (user?.role === 'teacher' && !user?.isAdmin && selectedDate > todayStr) {
      showToast('Attendance registry is locked for future dates. Please log attendance for today or earlier.', 'error');
      return;
    }

    setIsSavingDaily(true);
    try {
      const ops = students.map(async (student) => {
        const status = statuses[student.id!] || 'present';
        
        // Optimized: In-memory lookup from the already pre-loaded dailyRecords query instead of sequential database reads
        const existing = dailyRecords.find(r => r.studentId === student.id);

        if (existing) {
          return db.dailyAttendance.update(existing.id!, {
            status,
            teacherId: Number(user?.id) || -1,
            markedByRole: user?.isAdmin ? 'admin' : 'teacher',
            markedByName: user?.fullName || 'Staff Member',
            syncStatus: 'pending'
          });
        } else {
          return db.dailyAttendance.add({
            schoolId: user?.schoolId || '',
            studentId: student.id!,
            date: selectedDate,
            status,
            teacherId: Number(user?.id) || -1,
            classId: selectedClassId,
            term,
            session,
            markedByRole: user?.isAdmin ? 'admin' : 'teacher',
            markedByName: user?.fullName || 'Staff Member',
            syncStatus: 'pending'
          });
        }
      });

      await Promise.all(ops);
      logAction('LOG_DAILY_ATTENDANCE', `Recorded attendance for date ${selectedDate} in class ID ${selectedClassId}`);
      showToast(`Daily attendance saved successfully!`, 'success');

      // Trigger automatic background cloud sync
      syncAttendanceWithServer().catch(console.error);

      // Automatically search for the next pending attendance date/class
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i - 1);
        return d;
      });

      const holidayDatesArr = settings?.holidayDates || [];
      const classList = classes || [];
      const currentClassName = classList.find(c => c.id === selectedClassId)?.className || 'the class';

      let foundNextPending = false;

      // 1. Try to find the next pending date for the currently selected class first
      for (const dateObj of last30Days) {
        if (dateObj.getDay() === 0 || dateObj.getDay() === 6) continue;
        const dateStr = getLocalDateString(dateObj);
        if (holidayDatesArr.includes(dateStr)) continue;

        // Optimized: Checked in-memory using our pre-loaded term logs reference rather than running 30 extra queries!
        const records = allTermAttendance.filter(r => r.date === dateStr);

        // If there's no logs for this date, switch to it!
        if (records.length === 0) {
          updateClassAndDate(selectedClassId, dateStr);
          foundNextPending = true;
          showToast(`Loading next pending attendance page for ${currentClassName} on ${dateStr}...`, 'info');
          break;
        }
      }

      // 2. If all caught up for current class, but we have other classes, check others
      if (!foundNextPending && classList.length > 0) {
        for (const targetClass of classList) {
          if (targetClass.id === selectedClassId) continue;

          // Optimized: Read all daily logs for the target class in ONE single bulk database query!
          const targetClassLogs = await db.dailyAttendance
            .where('classId').equals(targetClass.id!)
            .filter(r => r.term === term && r.session === session)
            .toArray();

          for (const dateObj of last30Days) {
            if (dateObj.getDay() === 0 || dateObj.getDay() === 6) continue;
            const dateStr = getLocalDateString(dateObj);
            if (holidayDatesArr.includes(dateStr)) continue;

            // Filter in-memory - instant check!
            const records = targetClassLogs.filter(rl => rl.date === dateStr);

            if (records.length === 0) {
              updateClassAndDate(targetClass.id!, dateStr);
              foundNextPending = true;
              showToast(`Caught up for ${currentClassName}. Loading next pending: ${targetClass.className} on ${dateStr}`, 'info');
              break;
            }
          }
          if (foundNextPending) break;
        }
      }

      if (!foundNextPending) {
        showToast('All daily attendance logs for all your classes are fully up-to-date! 🎉', 'success');
      }
    } catch (error) {
      console.error(error);
      showToast('Failed to log daily attendance', 'error');
    } finally {
      setIsSavingDaily(false);
    }
  };

  const handleSaveDaily = async () => {
    await saveDailyWithStatuses(dailyStatuses);
  };

  // Group selectors for fast grid marking - automatically saves immediately
  const handleMarkAll = async (status: 'present' | 'absent' | 'late' | 'excused') => {
    if (isLockedForTeacher) return;
    const updated: Record<number, 'present' | 'absent' | 'late' | 'excused'> = {};
    students.forEach(s => {
      updated[s.id!] = status;
    });
    setDailyStatuses(updated);
    await saveDailyWithStatuses(updated);
  };

  // Save Cumulative Term Attendance
  const handleSaveSummary = async () => {
    if (!selectedClassId || !session || !settings) return;
    setIsSavingSummary(true);
    try {
      const ops = students.map(student => {
        const daysPresent = localAttendance[student.id!] || 0;
        const totalDays = settings.daysSchoolOpen || 0;
        
        const existing = termAttendanceRecords?.find(r => r.studentId === student.id);
        
        if (existing) {
          return db.attendance.update(existing.id!, {
            daysPresent,
            totalDays,
            updatedAt: new Date().toISOString(),
            syncStatus: 'pending'
          });
        } else {
          return db.attendance.add({
            studentId: student.id!,
            term,
            session,
            daysPresent,
            totalDays,
            updatedAt: new Date().toISOString(),
            schoolId: user?.schoolId || '',
            syncStatus: 'pending'
          });
        }
      });

      await Promise.all(ops);
      logAction('LOG_CUMULATIVE_ATTENDANCE', `Audited cumulative term totals for class ID ${selectedClassId}`);
      showToast(`Term attendance logs audited & finalized!`, 'success');

      // Trigger automatic background cloud sync
      syncAttendanceWithServer().catch(console.error);
    } catch (error) {
      showToast('Failed to save cumulative logs', 'error');
    } finally {
      setIsSavingSummary(false);
    }
  };

  // Compute Present Days dynamically from Daily Logs
  const handleAutoComputeFromDaily = async () => {
    if (!selectedClassId || !session) return;
    
    try {
      // Find all daily logs for this class, term, & session
      const logs = await db.dailyAttendance
        .where('classId').equals(selectedClassId)
        .filter(r => r.term === term && r.session === session)
        .toArray();

      if (logs.length === 0) {
        showToast('No daily logs found for this class and current term to calculate totals.', 'info');
        return;
      }

      const map: Record<number, number> = {};
      students.forEach(s => {
        const studentLogs = logs.filter(rl => rl.studentId === s.id);
        // Present, Late, or Excused status counts as attending (only 'absent' is excluded)
        const attendedDays = studentLogs.filter(rl => rl.status !== 'absent').length;
        map[s.id!] = attendedDays;
      });

      setLocalAttendance(map);
      showToast('Computed present days from daily tables! Review totals below and click "Save Audit" to permanently save.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to auto-compute totals', 'error');
    }
  };

  // Holiday triggers
  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayName) return;

    const currentHolidays = settings?.holidayDates || [];
    const currentNames = settings?.holidayNames || {};

    if (currentHolidays.includes(newHolidayDate)) {
      showToast('This date is already registered as a holiday.', 'error');
      return;
    }

    const updatedDates = [...currentHolidays, newHolidayDate].sort();
    const updatedNames = { ...currentNames, [newHolidayDate]: newHolidayName };

    await updateSettings({
      holidayDates: updatedDates,
      holidayNames: updatedNames
    });

    logAction('REGISTER_HOLIDAY', `Registered holiday on ${newHolidayDate}: ${newHolidayName}`);
    showToast(`Holiday registered: ${newHolidayName}`, 'success');
    setNewHolidayDate('');
    setNewHolidayName('');
  };

  const handleDeleteHoliday = async (dateStr: string) => {
    const currentHolidays = settings?.holidayDates || [];
    const currentNames = settings?.holidayNames || {};

    const updatedDates = currentHolidays.filter(d => d !== dateStr);
    const updatedNames = { ...currentNames };
    delete updatedNames[dateStr];

    await updateSettings({
      holidayDates: updatedDates,
      holidayNames: updatedNames
    });

    logAction('REMOVE_HOLIDAY', `Removed holiday on ${dateStr}`);
    showToast('Holiday removed', 'info');
  };

  const handleSeedStandardHolidays = async () => {
    const year = parseLocalDate(selectedDate).getFullYear() || new Date().getFullYear();
    const standard: Record<string, string> = {
      [`${year}-01-01`]: "New Year's Day",
      [`${year}-05-01`]: "Workers' Day",
      [`${year}-05-27`]: "Children's Day",
      [`${year}-06-12`]: "Democracy Day",
      [`${year}-10-01`]: "National Independence Day",
      [`${year}-12-25`]: "Christmas Day",
      [`${year}-12-26`]: "Boxing Day",
    };

    const currentHolidays = settings?.holidayDates || [];
    const currentNames = settings?.holidayNames || {};

    const mergedDates = Array.from(new Set([...currentHolidays, ...Object.keys(standard)])).sort();
    const mergedNames = { ...currentNames, ...standard };

    await updateSettings({
      holidayDates: mergedDates,
      holidayNames: mergedNames
    });

    logAction('SEED_HOLIDAYS', `Seeded default academic holidays for calendar year ${year}`);
    showToast(`Standard holidays for ${year} seeded successfully!`, 'success');
  };

  const filteredStudents = students.filter(s => 
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const classesList = classes || [];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <PageHeader 
          title="Attendance Portal" 
          subtitle={`Logging presence for ${termLabel}, ${session}`} 
        />
        
        {/* Tab Controls */}
        <div className="flex overflow-x-auto max-w-full p-1 rounded-2xl border border-gray-200 bg-gray-100 flex-nowrap whitespace-nowrap shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('daily')}
            disabled={isSavingDaily || isSavingSummary}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
              activeTab === 'daily' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-gray-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Daily Register
          </button>
          {user?.isAdmin && (
            <button
              onClick={() => setActiveTab('summary')}
              disabled={isSavingDaily || isSavingSummary}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                activeTab === 'summary' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-gray-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Term Summary (Audit)
            </button>
          )}
          
          {user?.isAdmin && (
            <button
              onClick={() => setActiveTab('holidays')}
              disabled={isSavingDaily || isSavingSummary}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                activeTab === 'holidays' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-gray-500 hover:text-slate-800'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              School Holidays
            </button>
          )}
        </div>
      </div>

      {/* Sync Status Banner */}
      <div className={`p-4 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-bold transition-all border ${
        !isOnlineState
          ? 'bg-amber-50/70 border-amber-200/50 text-amber-900/90'
          : totalUnsynced > 0
            ? 'bg-indigo-50/70 border-indigo-200/50 text-indigo-900/90'
            : 'bg-emerald-50/50 border-emerald-100/50 text-emerald-800/90'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl ${
            !isOnlineState 
              ? 'bg-amber-100/80 text-amber-600' 
              : totalUnsynced > 0 
                ? 'bg-indigo-100/80 text-indigo-600' 
                : 'bg-emerald-100/80 text-emerald-600'
          }`}>
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold uppercase tracking-wide">
                {!isOnlineState 
                  ? 'Offline Work Mode Active' 
                  : totalUnsynced > 0 
                    ? `Pending Cloud Sync (${totalUnsynced} Records)` 
                    : 'System Fully Synced & Protected'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider ${
                !isOnlineState 
                  ? 'bg-amber-100 text-amber-800' 
                  : totalUnsynced > 0
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-emerald-100 text-emerald-800'
              }`}>
                {!isOnlineState ? 'Offline' : 'Online'}
              </span>
            </div>
            <p className="text-[10.5px] text-gray-500 font-medium tracking-tight mt-0.5 leading-normal">
              {!isOnlineState 
                ? `Changes are saved locally to your device. Syncing will occur when internet access returns.` 
                : totalUnsynced > 0 
                  ? 'Attendance registries have been logged locally and are ready to be uploaded to server storage.' 
                  : 'All local attendance logs are completely synchronized with the server.'}
            </p>
          </div>
        </div>

        {isOnlineState && totalUnsynced > 0 && (
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl uppercase tracking-widest text-[9.5px] font-black flex items-center gap-1.5 transition-all active:scale-[0.98] select-none shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync Now
          </button>
        )}
      </div>

      {/* Class Units & Queries Selector Bar */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1 space-y-2">
          <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Select Class Unit</label>
          <div className="relative">
            <LayoutGrid className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select 
              value={selectedClassId || ''}
              disabled={isSavingDaily || isSavingSummary}
              onChange={(e) => updateClassAndDate(Number(e.target.value) || null, null)}
              className="w-full pl-11 pr-10 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-gray-700 appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select Target Class...</option>
              {classesList.map(c => (
                <option key={c.id} value={c.id}>{c.className}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Manual Search</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Locate student by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-gray-700"
            />
          </div>
        </div>
      </div>

      {/* Unselected State Warning */}
      {!selectedClassId && activeTab !== 'holidays' ? (
        <div className="bg-white p-20 rounded-[2.5rem] border border-gray-100 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-[2rem] flex items-center justify-center">
            <Clock size={40} />
          </div>
          <div className="max-w-md">
            <h3 className="text-xl font-black text-gray-900 mb-2">Registry Attendance Hub</h3>
            <p className="text-gray-400 text-sm font-medium italic">"Every day counts. Keep precise and visual roll calls."</p>
            <p className="text-gray-400 text-xs font-medium mt-4 uppercase tracking-widest leading-relaxed">Select a class unit above to access daily visual roll calls and term summaries.</p>
          </div>
        </div>
      ) : (
        <>
          {/* DAILY REGISTER TAB */}
          {activeTab === 'daily' && selectedClassId && (
            <div className="space-y-6">
              {/* Daily Control Bar Indicators (Moved above) */}
              {(isWeekend || isHoliday) && (
                <div className="flex flex-col gap-2">
                  {isWeekend && (
                    <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-3 rounded-xl border border-amber-100 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Weekend! Attendance logs are generally omitted on Saturday & Sunday.</span>
                    </div>
                  )}
                  {isHoliday && (
                    <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-3 rounded-xl border border-blue-100 text-xs font-black uppercase tracking-wider">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span>Holiday: {currentHolidayName} 🏝️</span>
                    </div>
                  )}
                </div>
              )}

              {/* TERM ATTENDANCE CALENDAR TRACKER DASHBOARD */}
              {!settings?.resumptionDate || !settings?.termClosingDate ? (
                <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-6 text-amber-900 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="font-black text-xs uppercase tracking-wider">Term Calendar Tracker Offline</p>
                      <p className="text-xs font-bold text-amber-700 mt-1 leading-relaxed">
                        The Current Term Resumption date and Closing date are not fully defined in the settings. Set them in the Academic Settings to enable the interactive term progress tracker.
                      </p>
                    </div>
                  </div>
                  {user?.isAdmin && (
                    <button
                      onClick={() => navigate('/settings', { state: { tab: 'academic' } })}
                      className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-[0.625rem] font-black uppercase tracking-wider rounded-xl transition-colors whitespace-nowrap"
                    >
                      Configure Calendar Dates
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
                  {/* Calendar Widget Header */}
                  <div className="p-6 md:p-8 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100/50">
                        <CalendarDays className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-gray-900 uppercase italic tracking-wide">Term Class Attendance Tracker</h3>
                        <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest mt-1">
                          Coverage: <span className="text-slate-800 font-extrabold">{settings.resumptionDate}</span> to <span className="text-slate-800 font-extrabold">{settings.termClosingDate}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[0.625rem] font-black uppercase tracking-widest transition-all bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-slate-900"
                      >
                        {isCalendarOpen ? 'Minimize Calendar' : 'Expand Calendar'}
                      </button>
                    </div>
                  </div>

                  {isCalendarOpen && calendarData && calendarStats && (
                    <div className="p-6 md:p-8 space-y-8 animate-fade-in">
                      {/* Metric widgets */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-2xl">
                          <span className="text-[0.55rem] font-black text-gray-400 uppercase tracking-widest block mb-1">Teaching Days</span>
                          <span className="text-base font-black text-slate-800 italic">{calendarStats.totalWeekdays} Days</span>
                        </div>
                        <div className="bg-emerald-50/55 border border-emerald-100/50 p-5 rounded-2xl">
                          <span className="text-[0.55rem] font-black text-emerald-500 uppercase tracking-widest block mb-1">Completed / Marked</span>
                          <span className="text-base font-black text-emerald-800 italic">{calendarStats.markedCount} Days</span>
                        </div>
                        <div className="bg-rose-50/50 border border-rose-100/50 p-5 rounded-2xl relative overflow-hidden">
                          {calendarStats.pendingCount > 0 && (
                            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                          )}
                          <span className="text-[0.55rem] font-black text-rose-500 uppercase tracking-widest block mb-1">Pending Updates</span>
                          <span className="text-base font-black text-rose-800 italic">{calendarStats.pendingCount} Days</span>
                        </div>
                        <div className="bg-indigo-50/50 border border-indigo-100/50 p-5 rounded-2xl">
                          <span className="text-[0.55rem] font-black text-indigo-500 uppercase tracking-widest block mb-1">Holidays Observed</span>
                          <span className="text-base font-black text-indigo-800 italic">{calendarStats.holidaysCount} Days</span>
                        </div>
                      </div>

                      {/* Legend guide */}
                      <div className="flex items-center justify-between py-3 px-5 bg-slate-50 rounded-2xl border border-slate-100 text-[0.625rem] font-extrabold text-slate-500 uppercase tracking-wider relative z-10">
                        <div className="flex items-center gap-2 text-blue-600 font-black">
                          <span>💡 Touch any active date to jump directly to its register</span>
                        </div>
                        
                        <div className="group relative ml-auto">
                          <button className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 transition-colors text-slate-500">
                            <HelpCircle className="w-4 h-4" />
                          </button>
                          
                          <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-100 shadow-xl rounded-2xl p-4 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none flex flex-col gap-3">
                            <div className="text-[0.6rem] font-black text-slate-400 mb-1 border-b border-slate-50 pb-2">LEGEND</div>
                            <div className="flex items-center gap-3">
                              <span className="w-3.5 h-3.5 bg-emerald-500/10 rounded-md border-2 border-emerald-400/40 flex items-center justify-center shrink-0">
                                <Check className="w-2 h-2 text-emerald-800 stroke-[3px]" />
                              </span>
                              <span className="text-slate-600">Marked Complete</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="w-3.5 h-3.5 bg-rose-500/15 rounded-md border-2 border-rose-450 flex items-center justify-center shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                              </span>
                              <span className="text-slate-600">Action Required</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="w-3.5 h-3.5 bg-indigo-50 rounded-md border border-indigo-200 shrink-0" />
                              <span className="text-slate-600">Holiday</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="w-3.5 h-3.5 bg-slate-100 rounded-md border border-slate-200 shrink-0" />
                              <span className="text-slate-600">Weekend</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="w-3.5 h-3.5 bg-white rounded-md border border-slate-200 shrink-0" />
                              <span className="text-slate-600">Future</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Calendar Months Grids Layout */}
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {calendarData.months.map((monthData, mIdx) => {
                          const weekdaysLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
                          return (
                            <div key={mIdx} className="border border-gray-100 rounded-3xl p-5 bg-white shadow-xs">
                              {/* Month Title */}
                              <h4 className="font-black text-slate-800 text-xs italic uppercase tracking-wider mb-4 pb-2 border-b border-gray-50 flex items-center justify-between">
                                <span>{monthData.name} {monthData.year}</span>
                                <span className="text-[0.55rem] text-slate-400 not-italic font-bold">Month {mIdx + 1}</span>
                              </h4>
                              
                              {/* Grid Sizing */}
                              <div className="grid grid-cols-7 gap-1.5 text-center">
                                {/* Weekday headers */}
                                {weekdaysLabels.map((lbl, idx) => (
                                  <div key={idx} className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest py-1">
                                    {lbl}
                                  </div>
                                ))}

                                {/* Weekday cells */}
                                {monthData.weeks.map((week) => 
                                  week.map((day, dIdx) => {
                                    if (day === null) {
                                      return <div key={dIdx} className="aspect-square" />;
                                    }

                                    const dateStr = getLocalDateString(day);
                                    const isDayWeekend = day.getDay() === 0 || day.getDay() === 6;
                                    const isDayHoliday = settings?.holidayDates?.includes(dateStr);
                                    const holidayName = isDayHoliday ? settings?.holidayNames?.[dateStr] || 'Holiday' : '';
                                    
                                    const isWithinTerm = day >= calendarData.startDate && day <= calendarData.endDate;
                                    const todayStr = getLocalDateString(new Date());
                                    const isFuture = dateStr > todayStr;
                                    const isMarked = markedDatesSet.has(dateStr);
                                    const isSelected = dateStr === selectedDate;

                                    let cellStyles = "";
                                    let cellContentMarker = null;

                                    if (!isWithinTerm) {
                                      cellStyles = "bg-transparent text-gray-300 pointer-events-none";
                                    } else if (isDayWeekend) {
                                      cellStyles = "bg-slate-50 text-slate-400 border border-slate-100/50 cursor-not-allowed";
                                    } else if (isDayHoliday) {
                                      cellStyles = "bg-indigo-50/80 text-indigo-700 border border-indigo-200 rounded-xl cursor-help";
                                      cellContentMarker = <span className="absolute bottom-1 w-1 h-1 rounded-full bg-indigo-500" />;
                                    } else if (isMarked) {
                                      cellStyles = "bg-emerald-500/10 text-emerald-800 border-2 border-emerald-400/30 hover:border-emerald-500 font-extrabold";
                                      cellContentMarker = (
                                        <span className="absolute bottom-0.5 right-0.5 bg-emerald-500 rounded-full p-0.5 border border-white">
                                          <Check className="w-1.5 h-1.5 text-white stroke-[4px]" />
                                        </span>
                                      );
                                    } else if (isFuture) {
                                      cellStyles = "bg-white text-slate-600 border border-slate-200 hover:border-indigo-400 hover:text-indigo-600";
                                    } else {
                                      // Past or today, not weekend, not holiday, not marked -> Pending
                                      cellStyles = "bg-rose-500/10 text-rose-800 border-2 border-rose-450 hover:border-rose-600 font-extrabold relative";
                                      cellContentMarker = (
                                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                                      );
                                    }

                                    return (
                                      <div
                                        key={dIdx}
                                        onClick={() => {
                                          if (isWithinTerm) {
                                            const todayStr = getLocalDateString(new Date());
                                            if (user?.role === 'teacher' && !user?.isAdmin && dateStr > todayStr) {
                                              showToast('Attendance registry is locked for future dates. Please log attendance for today or earlier.', 'error');
                                              return;
                                            }
                                            updateClassAndDate(selectedClassId, dateStr);
                                            if (isDayHoliday) {
                                              showToast(`Holiday: ${holidayName} (Classes are suspended on this day).`, 'info');
                                            } else if (isDayWeekend) {
                                              showToast(`Loading Weekend date ${dateStr}. Note: Generally excluded from term logs.`, 'info');
                                            } else {
                                              showToast(`Switched registry to ${dateStr}`, 'success');
                                            }
                                          }
                                        }}
                                        title={
                                          isDayHoliday
                                            ? `Holiday: ${holidayName}`
                                            : isDayWeekend
                                            ? `Weekend`
                                            : isMarked
                                            ? `Attendance complete for ${dateStr}`
                                            : isFuture
                                            ? `${dateStr} is in the future`
                                            : `Attendance Pending for ${dateStr} - CLICK to load record`
                                        }
                                        className={`aspect-square relative flex flex-col items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${cellStyles} ${
                                          isSelected ? 'ring-4 ring-blue-500 ring-offset-1 z-10 scale-[1.05]' : ''
                                        }`}
                                      >
                                        <span className={isSelected ? 'text-blue-700 font-extrabold' : ''}>{day.getDate()}</span>
                                        {cellContentMarker}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Locked state warning for teachers */}
              {isLockedForTeacher && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Lock className="w-6 h-6 text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="font-black text-sm uppercase">
                        {isFutureDate && (user?.role === 'teacher')
                          ? 'Attendance Registry Locked'
                          : 'Admin Attendance Override Active'}
                      </p>
                      <p className="text-xs font-bold text-amber-700 mt-0.5">
                        {isFutureDate && (user?.role === 'teacher')
                          ? 'Attendance registry is locked for future dates. Please log attendance for today or earlier.'
                          : `This daily roll-call was finalized by Administration staff (${loggedByName || 'School Admin'} - ${loggedByRole}) and is now locked for teachers.`}
                      </p>
                    </div>
                  </div>
                  <div className="px-4 py-1.5 bg-amber-600 text-white rounded-xl text-[0.625rem] font-black uppercase tracking-widest">
                    ReadOnly Status
                  </div>
                </div>
              )}

              {/* Status Indicator Banner */}
              {loggedByRec && !isLockedForTeacher && (
                <div className="bg-slate-50 border border-slate-200 text-slate-800 rounded-3xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>
                      Daily logs saved for this date! Logged by: <strong className="uppercase italic">{loggedByName}</strong> ({loggedByRole === 'admin' ? 'Administrator Key' : 'Class Teacher Key'})
                    </span>
                  </div>
                  {user?.isAdmin && loggedByRole === 'teacher' && (
                    <span className="text-[0.625rem] font-black bg-blue-100 text-blue-800 px-3 py-1 rounded-full uppercase tracking-widest">
                      Admin Override Armed 🛡️
                    </span>
                  )}
                </div>
              )}

              {/* Pictures / Grid list of students */}
              {isStudentsLoading || isDailyLoading ? (
                <GridSkeleton />
              ) : filteredStudents.length === 0 ? (
                <EmptyState icon="Search" message="No matching students found. Try refining your search text." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredStudents.map(student => {
                    const status = dailyStatuses[student.id!] || 'present';
                    
                    return (
                      <div 
                        key={student.id}
                        onClick={() => {
                          if (isLockedForTeacher || isSavingDaily) return;
                          // Cycle student status present -> absent
                          const nextStatus = status === 'present' ? 'absent' : 'present';
                          setDailyStatuses({ ...dailyStatuses, [student.id!]: nextStatus });
                        }}
                        className={`group relative bg-white rounded-3xl border-2 p-5 transition-all cursor-pointer select-none flex flex-col justify-between ${
                          isLockedForTeacher || isSavingDaily ? 'opacity-85 pointer-events-none' : ''
                        } ${
                          status === 'present' 
                            ? 'border-emerald-500/40 hover:border-emerald-500 shadow-md shadow-emerald-500/5 bg-gradient-to-b from-white to-emerald-50/10' 
                            : status === 'absent'
                            ? 'border-red-500/40 hover:border-red-500 shadow-md shadow-red-500/5 bg-gradient-to-b from-white to-red-50/10'
                            : status === 'late'
                            ? 'border-amber-500/40 hover:border-amber-500 shadow-md shadow-amber-500/5 bg-gradient-to-b from-white to-amber-50/10'
                            : 'border-blue-500/40 hover:border-blue-500 shadow-md shadow-blue-500/5 bg-gradient-to-b from-white to-blue-50/10'
                        }`}
                      >
                        {/* Student visual badge top decoration */}
                        <div className="flex items-center gap-4 mb-4">
                          <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                            {student.photoBase64 ? (
                              <img src={student.photoBase64} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-black text-slate-400 bg-slate-50 text-lg uppercase italic border border-slate-200 rounded-2xl">
                                {student.fullName.slice(0, 2)}
                              </div>
                            )}
                            
                            {/* Visual status pin on top right of image */}
                            <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                              status === 'present' ? 'bg-emerald-500' :
                              status === 'absent' ? 'bg-red-500' :
                              status === 'late' ? 'bg-amber-500' : 'bg-blue-500'
                            }`}>
                              {status === 'present' && <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />}
                              {status === 'absent' && <X className="w-2.5 h-2.5 text-white stroke-[3px]" />}
                            </div>
                          </div>

                          <div className="min-w-0">
                            <h4 className="font-black text-slate-800 text-sm italic uppercase truncate group-hover:text-black mt-0.5">{student.fullName}</h4>
                            <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">{student.admissionNumber}</p>
                            {isLockedForTeacher && (
                              <span className="inline-flex items-center gap-0.5 mt-1 text-[0.55rem] font-black text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                <Lock className="w-2 h-2" /> Locked
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status selector micro controls inside card */}
                        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                          <span className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest">
                            Presence Style:
                          </span>
                          
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {/* Present pill */}
                            <button
                              onClick={() => {
                                if (isLockedForTeacher) return;
                                setDailyStatuses({ ...dailyStatuses, [student.id!]: 'present' });
                              }}
                              className={`px-2 py-1 rounded text-[0.55rem] font-black uppercase tracking-wider transition-all ${
                                status === 'present' 
                                  ? 'bg-emerald-500 text-white' 
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700'
                              }`}
                            >
                              Pres.
                            </button>
                            {/* Absent pill */}
                            <button
                              onClick={() => {
                                if (isLockedForTeacher) return;
                                setDailyStatuses({ ...dailyStatuses, [student.id!]: 'absent' });
                              }}
                              className={`px-2 py-1 rounded text-[0.55rem] font-black uppercase tracking-wider transition-all ${
                                status === 'absent' 
                                  ? 'bg-red-500 text-white' 
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700'
                              }`}
                            >
                              Abs.
                            </button>
                            {/* Late pill */}
                            <button
                              onClick={() => {
                                if (isLockedForTeacher) return;
                                setDailyStatuses({ ...dailyStatuses, [student.id!]: 'late' });
                              }}
                              className={`px-2 py-1 rounded text-[0.55rem] font-black uppercase tracking-wider transition-all ${
                                status === 'late' 
                                  ? 'bg-amber-500 text-white' 
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700'
                              }`}
                            >
                              Late
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action Submit bar */}
              <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 flex items-center justify-between">
                <div className="text-xs text-slate-400 font-bold max-w-sm lg:block hidden">
                  Clicking anywhere on a student's card toggles between Present and Absent. Select correct states and click the action button to save.
                </div>
                <button
                  onClick={handleSaveDaily}
                  disabled={isSavingDaily || isLockedForTeacher}
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-lg disabled:opacity-50 w-full sm:w-auto ml-auto"
                >
                  {isSavingDaily ? <Spinner size="sm" /> : <Save size={16} />}
                  Save Daily Registry
                </button>
              </div>
            </div>
          )}

          {/* TERM SUMMARY AUDIT TAB */}
          {activeTab === 'summary' && selectedClassId && user?.isAdmin && (
            <div className="space-y-6">
              {isStudentsLoading || isTermLoading ? (
                <TableSkeleton />
              ) : (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
                  <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-black text-gray-900 uppercase">Term Attendance Audit</h3>
                      <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest mt-1">
                        Finalize total recorded days present out of <span className="text-blue-600 italic font-black">{settings?.daysSchoolOpen || 100}</span> school days
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Sync From Daily Logs Button */}
                      <button
                        onClick={handleAutoComputeFromDaily}
                        disabled={isSavingSummary}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors border border-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Read daily registers for this class and calculate totals for this term"
                      >
                        <RefreshCw className="w-4 h-4 text-blue-600" />
                        Auto-Sync from Daily Logs
                      </button>
                      
                      <button 
                        onClick={handleSaveSummary}
                        disabled={isSavingSummary}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
                      >
                        {isSavingSummary ? <Spinner size="sm" /> : <Save size={14} />}
                        Save Cumulative Audit
                      </button>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">Student Information</th>
                          <th className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest text-center">Days Present</th>
                          <th className="px-8 py-5 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest text-right">Attendance Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredStudents.map(student => (
                          <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-8 py-6">
                              <p className="text-sm font-black text-gray-900 italic uppercase">
                                {student.fullName}
                              </p>
                              <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">
                                {student.admissionNumber}
                              </p>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center justify-center gap-4">
                                <input 
                                  type="number" 
                                  min={0}
                                  max={settings?.daysSchoolOpen || 1000}
                                  value={localAttendance[student.id!] || 0}
                                  disabled={isSavingSummary}
                                  onChange={(e) => setLocalAttendance({ ...localAttendance, [student.id!]: Number(e.target.value) })}
                                  className="w-24 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-center text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <span className="text-xs font-black text-gray-300 uppercase tracking-widest">/ {settings?.daysSchoolOpen || 100}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <span className={`text-[0.625rem] font-black uppercase tracking-widest ${
                                (localAttendance[student.id!] || 0) === (settings?.daysSchoolOpen || 100) 
                                ? 'text-emerald-500' 
                                : 'text-amber-500'
                              }`}>
                                {Math.round(((localAttendance[student.id!] || 0) / (settings?.daysSchoolOpen || 100 || 1)) * 100)}% Presence
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* HOLIDAYS TAB - ADMIN ONLY */}
      {activeTab === 'holidays' && user?.isAdmin && (
        isSettingsLoading ? (
          <HolidaySkeleton />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Add Holiday Box */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6 h-fit">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase">Register New Holiday</h3>
                <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  Add dates where the school is closed. These won't be calculated during attendance reports.
                </p>
              </div>

              <form onSubmit={handleAddHoliday} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Holiday Date</label>
                  <input 
                    type="date"
                    required
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-sm font-bold text-gray-800"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-1">Holiday Title / Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Independence Day, Mid-Term Break"
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-sm font-bold text-gray-800"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add School Holiday
                </button>
              </form>

              <div className="pt-4 border-t border-gray-100">
                <button
                  onClick={handleSeedStandardHolidays}
                  className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 rounded-2xl text-[0.625rem] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                  title="Automatically seeds common national/public holidays for the active solar year"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Auto-Seed Public Holidays
                </button>
              </div>
            </div>

            {/* Holiday List */}
            <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase">Set Holiday Calendar</h3>
                <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  Lists of manually/automatically of scheduled school holidays.
                </p>
              </div>

              {holidayDates.length === 0 ? (
                <div className="p-12 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                  <CalendarDays className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-500">No holidays on record yet</p>
                  <p className="text-xs text-gray-400 mt-1">Use the left form to add custom holidays or auto-seed standard events.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {holidayDates.map(dateStr => {
                    const holidayName = settings?.holidayNames?.[dateStr] || 'Unnamed Holiday';
                    const formattedDate = parseLocalDate(dateStr).toLocaleDateString(undefined, {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    });
                    return (
                      <div key={dateStr} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                        <div>
                          <h4 className="font-black text-sm text-slate-900 uppercase italic">{holidayName}</h4>
                          <p className="text-xs text-gray-400 font-bold mt-0.5">{formattedDate}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteHoliday(dateStr)}
                          className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Remove Holiday"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* FLOATING ACTION BAR FOR DAILY REGISTER */}
      {activeTab === 'daily' && selectedClassId && (
        <div className="fixed bottom-6 left-1/2 lg:left-[calc(50%+120px)] -translate-x-1/2 z-50 bg-white p-3 sm:p-3 rounded-3xl sm:rounded-[1.25rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-[calc(100vw-2.5rem)] sm:w-auto transition-all">
          <div className="flex flex-col relative px-1 sm:px-2">
            <input 
              type="date"
              disabled={isSavingDaily}
              value={selectedDate}
              onChange={(e) => {
                const chosen = e.target.value;
                const todayStr = getLocalDateString(new Date());
                if (user?.role === 'teacher' && !user?.isAdmin && chosen > todayStr) {
                  showToast('Attendance registry is locked for future dates. Please log attendance for today or earlier.', 'error');
                } else {
                  updateClassAndDate(selectedClassId, chosen);
                }
              }}
              className="w-full px-3 py-3 sm:py-2.5 bg-gray-50 border-none rounded-2xl sm:rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black text-gray-800 text-sm cursor-pointer hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          
          {!isWeekend && !isHoliday && (
            <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-gray-100 pt-3 sm:pt-0 sm:pl-3">
              <button
                onClick={() => handleMarkAll('present')}
                disabled={isLockedForTeacher || isSavingDaily}
                className="flex-1 sm:flex-none px-4 py-3 sm:py-2.5 text-[0.65rem] sm:text-[0.65rem] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl sm:rounded-xl hover:bg-emerald-100 disabled:opacity-50 transition-colors whitespace-nowrap shadow-sm hover:shadow active:scale-95 text-center flex items-center justify-center gap-1.5"
              >
                {isSavingDaily ? <Spinner size="sm" /> : null} Present (All)
              </button>
              <button
                onClick={() => handleMarkAll('absent')}
                disabled={isLockedForTeacher || isSavingDaily}
                className="flex-1 sm:flex-none px-4 py-3 sm:py-2.5 text-[0.65rem] sm:text-[0.65rem] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-100 rounded-2xl sm:rounded-xl hover:bg-red-100 disabled:opacity-50 transition-colors whitespace-nowrap shadow-sm hover:shadow active:scale-95 text-center flex items-center justify-center gap-1.5"
              >
                {isSavingDaily ? <Spinner size="sm" /> : null} Absent (All)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
