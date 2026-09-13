import React, { useState, useEffect } from 'react';
import { Save, Star } from 'lucide-react';
import { db, type IStudent, type ISettings, type ITraitGrade, type ITrait } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';

interface TraitInputProps {
  student: IStudent;
  settings: ISettings;
  onSave: (traitGrades: ITraitGrade[]) => void;
}

export const TraitInput: React.FC<TraitInputProps> = ({
  student,
  settings,
  onSave
}) => {
  const traits = useLiveQuery(() => db.traits.orderBy('displayOrder').toArray()) || [];
  
  const draftKey = `draft_trait_${student.id}_${settings.currentTerm}_${settings.currentSession}`;

  const getDraft = () => {
    try {
      const stored = localStorage.getItem(draftKey);
      if (stored) return JSON.parse(stored);
    } catch(e) {}
    return null;
  };

  const draft = getDraft();

  const [scores, setScores] = useState<Record<number, number>>(draft || {});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanged, setHasChanged] = useState(!!draft);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Fetch existing scores for this student
  useEffect(() => {
    const fetchScores = async () => {
      if (!student.id) return;
      const existing = await db.traitGrades
        .where('[studentId+traitId+term+session]')
        .between(
          [student.id, 0, settings.currentTerm, settings.currentSession],
          [student.id, Infinity, settings.currentTerm, settings.currentSession]
        )
        .toArray();
      
      if (!draft) {
        const scoreMap: Record<number, number> = {};
        existing.forEach(g => {
          scoreMap[g.traitId] = g.score;
        });
        setScores(scoreMap);
        setHasChanged(false);
      }
      setInitialLoaded(true);
    };

    fetchScores();
  }, [student.id, settings.currentTerm, settings.currentSession]);

  useEffect(() => {
    if (initialLoaded && hasChanged) {
      localStorage.setItem(draftKey, JSON.stringify(scores));
    }
  }, [scores, hasChanged, draftKey, initialLoaded]);

  const handleScoreChange = (traitId: number, value: number) => {
    setScores(prev => ({ ...prev, [traitId]: value }));
    setHasChanged(true);
  };

  const handleSave = async () => {
    if (!student.id) return;
    setIsSaving(true);
    
    const traitGrades: ITraitGrade[] = Object.entries(scores).map(([traitId, score]) => ({
      studentId: student.id!,
      traitId: Number(traitId),
      term: settings.currentTerm,
      session: settings.currentSession,
      score
    }));

    try {
      await onSave(traitGrades);
      setHasChanged(false);
      localStorage.removeItem(draftKey);
    } catch (error) {
      console.error('Failed to save traits:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced auto-save
  useEffect(() => {
    if (!hasChanged || isSaving) return;
    const timeout = setTimeout(() => {
      handleSave();
    }, 5000);
    return () => clearTimeout(timeout);
  }, [scores, hasChanged, isSaving]);

  return (
    <div className={`bg-white p-6 rounded-[2rem] border shadow-sm space-y-8 transition-all ${hasChanged ? 'border-amber-300' : 'border-gray-100'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-black text-gray-900 tracking-tight">Behavioral & Psychomotor</h3>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Rate from 1 (Poor) to 5 (Excellent)</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={!hasChanged || isSaving}
          className={`px-6 py-2.5 flex items-center justify-center gap-2 rounded-xl transition-all font-bold text-sm w-full sm:w-auto ${
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
            <Save className="w-4 h-4" />
          )}
          {hasChanged ? 'Autosaving...' : 'Saved'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-8">
        {traits.map(trait => (
          <div key={trait.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-gray-600 uppercase tracking-widest">{trait.traitName}</span>
              <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{scores[trait.id!] || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(num => (
                <button
                  key={num}
                  onClick={() => handleScoreChange(trait.id!, num)}
                  className={`flex-1 h-10 rounded-xl transition-all flex items-center justify-center border-2 ${
                    scores[trait.id!] === num
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100'
                      : 'bg-white border-gray-100 text-gray-400 hover:border-blue-200'
                  }`}
                >
                  <span className="text-sm font-black">{num}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
