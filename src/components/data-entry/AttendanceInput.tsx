import React, { useState, useEffect } from 'react';
import { db, type IStudent, type ISettings, type IAttendance } from '../../db/db';

interface AttendanceInputProps {
  student: IStudent;
  settings: ISettings;
  initialAttendance?: IAttendance;
  onSave: (field: 'daysPresent' | 'totalDays', value: number) => Promise<void>;
  isRestricted: boolean;
}

export const AttendanceInput: React.FC<AttendanceInputProps> = ({
  student,
  settings,
  initialAttendance,
  onSave,
  isRestricted
}) => {
  const draftKey = `draft_att_${student.id}_${settings.currentTerm}_${settings.currentSession}`;
  
  const getDraft = () => {
    try {
      const stored = localStorage.getItem(draftKey);
      if (stored) return JSON.parse(stored);
    } catch(e) {}
    return null;
  };

  const draft = getDraft();

  const [daysPresent, setDaysPresent] = useState<number>(draft?.daysPresent ?? (initialAttendance?.daysPresent || 0));
  const [totalDays, setTotalDays] = useState<number>(draft?.totalDays ?? (initialAttendance?.totalDays || settings?.daysSchoolOpen || 0));
  
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanged, setHasChanged] = useState(!!draft);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const percentage = totalDays > 0 ? ((daysPresent / totalDays) * 100).toFixed(1) : '0.0';

  useEffect(() => {
    if (!draft && initialAttendance) {
      setDaysPresent(initialAttendance.daysPresent || 0);
      setTotalDays(initialAttendance.totalDays || settings?.daysSchoolOpen || 0);
      setHasChanged(false);
    }
    setInitialLoaded(true);
  }, [initialAttendance]);

  useEffect(() => {
    if (initialLoaded && hasChanged) {
      localStorage.setItem(draftKey, JSON.stringify({ daysPresent, totalDays }));
    }
  }, [daysPresent, totalDays, hasChanged, draftKey, initialLoaded]);

  const handleSave = async () => {
    if (isRestricted || !student.id) return;
    setIsSaving(true);
    try {
      await onSave('daysPresent', daysPresent);
      await onSave('totalDays', totalDays);
      setHasChanged(false);
      localStorage.removeItem(draftKey);
    } catch (error) {
      console.error('Failed to save attendance', error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!hasChanged || isSaving) return;
    const timeout = setTimeout(() => {
      handleSave();
    }, 5000);
    return () => clearTimeout(timeout);
  }, [daysPresent, totalDays, hasChanged, isSaving]);

  return (
    <tr className={`hover:bg-gray-50/50 transition-colors ${hasChanged ? 'bg-amber-50/30' : ''}`}>
      <td className="px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 font-black text-xs">
            {student.fullName.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{student.fullName}</p>
            <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-tighter">{student.admissionNumber}</p>
          </div>
        </div>
      </td>
      <td className="px-8 py-5 text-center">
        <input 
          type="number" 
          value={daysPresent === 0 ? '0' : (daysPresent || '')}
          onChange={(e) => {
            setDaysPresent(Number(e.target.value));
            setHasChanged(true);
          }}
          className={`w-24 h-12 bg-gray-50 border rounded-xl text-center font-black text-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-gray-900 ${hasChanged ? 'border-amber-300' : 'border-gray-100'}`}
        />
      </td>
      <td className="px-8 py-5 text-center">
        <input 
          type="number" 
          value={totalDays === 0 ? '0' : (totalDays || '')}
          onChange={(e) => {
             setTotalDays(Number(e.target.value));
             setHasChanged(true);
          }}
          className={`w-24 h-12 bg-gray-50 border rounded-xl text-center font-black text-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-gray-900 ${hasChanged ? 'border-amber-300' : 'border-gray-100'}`}
        />
      </td>
      <td className="px-8 py-5 text-center">
        <div className="inline-flex items-center gap-2">
          {hasChanged && (
             <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
          )}
          <span className="text-lg font-black text-gray-900">{percentage}%</span>
        </div>
      </td>
    </tr>
  );
};
