import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { db, type IStudent, type ISubject, type ISettings, type IGrade } from '../../db/db';
import { calculateTotal, deriveGradeAndRemark } from '../../lib/calculationEngine';

interface ScoreInputProps {
  student: IStudent;
  subject: ISubject;
  settings: ISettings;
  initialGrade?: IGrade;
  onSave: (grade: IGrade) => void;
}

export const ScoreInput: React.FC<ScoreInputProps> = ({
  student,
  subject,
  settings,
  initialGrade,
  onSave
}) => {
  const draftKey = `draft_score_${student.id}_${subject.id}_${settings.currentTerm}_${settings.currentSession}`;
  
  const getDraft = () => {
    try {
      const stored = localStorage.getItem(draftKey);
      if (stored) return JSON.parse(stored);
    } catch(e) {}
    return null;
  };

  const draft = getDraft();

  const [caScores, setCaScores] = useState<Record<string, number>>(draft?.caScores || initialGrade?.caScores || {});
  const [examScore, setExamScore] = useState<number>(draft?.examScore ?? (initialGrade?.examScore || 0));
  const [remark, setRemark] = useState<string>(draft?.remark ?? (initialGrade?.remark || ''));

  const [isSaving, setIsSaving] = useState(false);
  const [hasChanged, setHasChanged] = useState(!!draft);

  const total = calculateTotal(caScores, examScore);
  const { grade, remark: autoRemark } = deriveGradeAndRemark(total, settings.gradingScale);

  // Sync draft to localStorage on change
  useEffect(() => {
    if (hasChanged) {
      localStorage.setItem(draftKey, JSON.stringify({ caScores, examScore, remark }));
    }
  }, [caScores, examScore, remark, hasChanged, draftKey]);

  useEffect(() => {
    if (!draft && initialGrade) {
      setCaScores(initialGrade.caScores);
      setExamScore(initialGrade.examScore);
      setRemark(initialGrade.remark || '');
      setHasChanged(false);
    }
  }, [initialGrade]);

  const handleCaChange = (id: string, value: string) => {
    const numValue = Math.min(Number(value) || 0, settings.caComponents.find(c => c.id === id)?.maxScore || 0);
    setCaScores(prev => ({ ...prev, [id]: numValue }));
    setHasChanged(true);
  };

  const handleExamChange = (value: string) => {
    const numValue = Math.min(Number(value) || 0, settings.examMaxScore);
    setExamScore(numValue);
    setHasChanged(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const gradeData: IGrade = {
      studentId: student.id!,
      subjectId: subject.id!,
      term: settings.currentTerm,
      session: settings.currentSession,
      caScores,
      examScore,
      total,
      grade,
      remark: remark || autoRemark
    };
    try {
      await onSave(gradeData);
      setHasChanged(false);
      localStorage.removeItem(draftKey);
    } catch (error) {
      console.error('Failed to save grade:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced Auto-save
  useEffect(() => {
    if (!hasChanged || isSaving) return;
    const timeout = setTimeout(() => {
      handleSave();
    }, 5000); // 5s debounce for auto-syncing to DB
    return () => clearTimeout(timeout);
  }, [caScores, examScore, remark, hasChanged, isSaving]);

  return (
    <div className={`flex items-center gap-4 p-4 bg-white rounded-2xl border transition-all group shadow-sm ${hasChanged ? 'border-amber-300' : 'border-gray-100 hover:border-blue-200'}`}>
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        {settings.caComponents.map(ca => (
          <div key={ca.id} className="space-y-1">
            <label className="text-[0.5625rem] font-black text-gray-400 uppercase tracking-widest truncate">
              {ca.name} ({ca.maxScore})
            </label>
            <input 
              type="number" 
              value={caScores[ca.id] === 0 ? '0' : (caScores[ca.id] || '')}
              onChange={(e) => handleCaChange(ca.id, e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-sm text-gray-900"
              placeholder="0"
            />
          </div>
        ))}
        <div className="space-y-1">
          <label className="text-[0.5625rem] font-black text-gray-400 uppercase tracking-widest">
            Exam ({settings.examMaxScore})
          </label>
          <input 
            type="number" 
            value={examScore === 0 ? '0' : (examScore || '')}
            onChange={(e) => handleExamChange(e.target.value)}
            className="w-full px-3 py-2 bg-blue-50/50 border border-blue-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-sm text-gray-900"
            placeholder="0"
          />
        </div>
        <div className="space-y-1 col-span-2">
          <label className="text-[0.5625rem] font-black text-gray-400 uppercase tracking-widest">
            Remark
          </label>
          <input 
            type="text" 
            value={remark}
            onChange={(e) => { setRemark(e.target.value); setHasChanged(true); }}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-sm text-gray-600"
            placeholder={autoRemark}
          />
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1 h-10 bg-gray-900 rounded-xl flex items-center justify-center px-4 shadow-lg shadow-gray-200">
            <span className="text-lg font-black text-white tracking-tighter">{total}</span>
            <span className="ml-2 text-[0.625rem] font-black text-blue-400 uppercase">{grade}</span>
          </div>
          
          <button 
            onClick={handleSave}
            disabled={!hasChanged || isSaving}
            className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all ${
              hasChanged 
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-100 hover:scale-105 active:scale-95' 
                : 'bg-emerald-50 text-emerald-500'
            }`}
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : hasChanged ? (
              <Save className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
