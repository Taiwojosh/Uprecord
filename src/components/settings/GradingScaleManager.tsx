import React from 'react';
import { Plus, Trash2, Calculator } from 'lucide-react';
import type { IGradingScale } from '../../db/db';

interface GradingScaleManagerProps {
  scale: IGradingScale[];
  onChange: (newScale: IGradingScale[]) => void;
}

export const GradingScaleManager: React.FC<GradingScaleManagerProps> = ({ scale, onChange }) => {
  const handleAdd = () => {
    const newScale = [...scale, { minScore: 0, grade: '', remark: '' }];
    onChange(newScale.sort((a, b) => b.minScore - a.minScore));
  };

  const handleRemove = (index: number) => {
    const newScale = scale.filter((_, i) => i !== index);
    onChange(newScale);
  };

  const handleChange = (index: number, field: keyof IGradingScale, value: string | number) => {
    const newScale = [...scale];
    newScale[index] = { ...newScale[index], [field]: value };
    onChange(newScale);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">
          <Calculator className="w-3 h-3 text-purple-500" />
          Grading Scale & Remarks
        </div>
        <button 
          type="button"
          onClick={handleAdd}
          className="p-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-3">
        {scale.sort((a, b) => b.minScore - a.minScore).map((item, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm group">
            <div className="col-span-3">
              <label className="text-[0.5rem] font-bold text-gray-400 uppercase block mb-1">Min %</label>
              <input 
                type="number" 
                value={item.minScore}
                onChange={(e) => handleChange(idx, 'minScore', Number(e.target.value))}
                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-black text-gray-900 outline-none focus:border-purple-500"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[0.5rem] font-bold text-gray-400 uppercase block mb-1">Grade</label>
              <input 
                type="text" 
                value={item.grade}
                onChange={(e) => handleChange(idx, 'grade', e.target.value)}
                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-black text-gray-900 text-center outline-none focus:border-purple-500"
              />
            </div>
            <div className="col-span-6">
              <label className="text-[0.5rem] font-bold text-gray-400 uppercase block mb-1">Subject Remark</label>
              <input 
                type="text" 
                value={item.remark}
                onChange={(e) => handleChange(idx, 'remark', e.target.value)}
                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold text-gray-600 outline-none focus:border-purple-500"
              />
            </div>
            <div className="col-span-1 pt-4">
              <button 
                type="button"
                onClick={() => handleRemove(idx)}
                className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
