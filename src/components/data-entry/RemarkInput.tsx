import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2 } from 'lucide-react';
import { db, type IStudent, type ISettings, type IAttendance } from '../../db/db';

interface RemarkInputProps {
  student: IStudent;
  settings: ISettings;
  initialAttendance?: IAttendance;
  onSave: (field: 'teacherRemark' | 'principalRemark', value: string) => Promise<void>;
  isRestricted: boolean;
}

export const RemarkInput: React.FC<RemarkInputProps> = ({
  student,
  settings,
  initialAttendance,
  onSave,
  isRestricted
}) => {
  const draftKey = `draft_remark_${student.id}_${settings.currentTerm}_${settings.currentSession}`;
  
  const getDraft = () => {
    try {
      const stored = localStorage.getItem(draftKey);
      if (stored) return JSON.parse(stored);
    } catch(e) {}
    return null;
  };

  const draft = getDraft();

  const [teacherRemark, setTeacherRemark] = useState(draft?.teacherRemark ?? (initialAttendance?.teacherRemark || ''));
  const [principalRemark, setPrincipalRemark] = useState(draft?.principalRemark ?? (initialAttendance?.principalRemark || ''));
  
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanged, setHasChanged] = useState(!!draft);
  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    if (!draft && initialAttendance) {
      setTeacherRemark(initialAttendance.teacherRemark || '');
      setPrincipalRemark(initialAttendance.principalRemark || '');
      setHasChanged(false);
    }
    setInitialLoaded(true);
  }, [initialAttendance]);

  useEffect(() => {
    if (initialLoaded && hasChanged) {
      localStorage.setItem(draftKey, JSON.stringify({ teacherRemark, principalRemark }));
    }
  }, [teacherRemark, principalRemark, hasChanged, draftKey, initialLoaded]);

  const handleSave = async () => {
    if (isRestricted || !student.id) return;
    setIsSaving(true);
    try {
      await onSave('teacherRemark', teacherRemark);
      await onSave('principalRemark', principalRemark);
      setHasChanged(false);
      localStorage.removeItem(draftKey);
    } catch (error) {
      console.error('Failed to save remarks', error);
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
  }, [teacherRemark, principalRemark, hasChanged, isSaving]);

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-2xl border transition-all ${hasChanged ? 'border-amber-300' : 'border-gray-100'}`}>
      <div className="space-y-2">
        <label className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest px-1">Teacher's Remark</label>
        <textarea 
          value={teacherRemark}
          onChange={(e) => { setTeacherRemark(e.target.value); setHasChanged(true); }}
          placeholder="Enter teacher's remark..."
          className="w-full h-24 bg-gray-50 border border-gray-100 rounded-2xl p-4 font-medium text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none text-gray-900"
        />
      </div>
      <div className="space-y-2">
        <label className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest px-1 flex justify-between items-center">
          <span>Principal's Remark</span>
          {hasChanged && (
             <span className="text-amber-500 animate-pulse">Draft</span>
          )}
        </label>
        <textarea 
          value={principalRemark}
          onChange={(e) => { setPrincipalRemark(e.target.value); setHasChanged(true); }}
          placeholder="Enter principal's remark..."
          className="w-full h-24 bg-gray-50 border border-gray-100 rounded-2xl p-4 font-medium text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none text-gray-900"
        />
      </div>
    </div>
  );
};
