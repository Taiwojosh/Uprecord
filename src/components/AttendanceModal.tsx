import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { db, type IDailyAttendance } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Spinner } from './ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { Check, X } from 'lucide-react';
import { syncAttendanceWithServer } from '../lib/attendanceSync';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: number;
  date: string; // YYYY-MM-DD
  term: 1 | 2 | 3;
  session: string;
  teacherId: number;
  schoolId: string;
  mandatory?: boolean;
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({ 
  isOpen, onClose, classId, date, term, session, teacherId, schoolId, mandatory 
}) => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<Record<number, 'present' | 'absent'>>({});
  const [isSaving, setIsSaving] = useState(false);

  const students = useLiveQuery(
    () => db.students.where('classId').equals(classId).toArray(),
    [classId]
  ) || [];

  // Query existing daily logs for this class/date/term/session if they already exist
  const existingDailyLogs = useLiveQuery(async () => {
    return await db.dailyAttendance
      .where({ classId, date, term, session })
      .toArray();
  }, [classId, date, term, session]) || [];

  // Initialize attendance (default everyone to present, or fetch from existing logs)
  useEffect(() => {
    if (students.length > 0) {
      const initial: Record<number, 'present' | 'absent'> = {};
      
      students.forEach(s => {
        const matchingLog = existingDailyLogs.find(l => l.studentId === s.id);
        if (matchingLog) {
          initial[s.id!] = (matchingLog.status === 'absent') ? 'absent' : 'present';
        } else {
          initial[s.id!] = 'present';
        }
      });
      setAttendance(initial);
    }
  }, [students, existingDailyLogs]);

  const handleToggle = (studentId: number) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Upsert atomically
      const ops = students.map(async (student) => {
        const status = attendance[student.id!] || 'present';
        
        const existing = await db.dailyAttendance
          .where({ studentId: student.id!, date, term, session })
          .first();

        if (existing) {
          // Update details safely
          return db.dailyAttendance.update(existing.id!, {
            status,
            teacherId,
            markedByRole: 'teacher',
            markedByName: user?.fullName || 'Teacher',
            syncStatus: 'pending'
          });
        } else {
          // Add new record
          return db.dailyAttendance.add({
            schoolId,
            studentId: student.id!,
            date,
            status,
            teacherId,
            classId,
            term,
            session,
            markedByRole: 'teacher',
            markedByName: user?.fullName || 'Teacher',
            syncStatus: 'pending'
          });
        }
      });

      await Promise.all(ops);
      // Trigger background sync if online
      syncAttendanceWithServer().catch(console.error);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={mandatory ? () => {} : onClose} title={`Class Roll Call for ${date}`} size="lg">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-bold text-gray-700">Daily Presence Grid</p>
          <p className="text-xs text-gray-500 italic mt-0.5">Toggle student presence by clicking their cards. (Absent labels are highlighted in red).</p>
        </div>

        {/* Visual Student Cards inside Modal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1">
          {students.map(student => {
            const isPresent = attendance[student.id!] === 'present';
            return (
              <button
                key={student.id}
                onClick={() => handleToggle(student.id!)}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between text-left ${
                  isPresent 
                    ? 'bg-emerald-50/50 hover:bg-emerald-50 border-emerald-500/20 hover:border-emerald-500' 
                    : 'bg-red-50/50 hover:bg-red-50 border-red-500/20 hover:border-red-500'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                    {student.photoBase64 ? (
                      <img src={student.photoBase64} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-slate-400 bg-slate-50 text-xs uppercase">
                        {student.fullName.slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate uppercase mt-0.5">{student.fullName}</p>
                    <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">{student.admissionNumber}</p>
                  </div>
                </div>

                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isPresent ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {isPresent ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-4 bg-slate-900 border border-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-md flex items-center justify-center gap-2"
        >
          {isSaving ? <Spinner size="sm" /> : 'Finalize Attendance'}
        </button>
      </div>
    </Modal>
  );
};
