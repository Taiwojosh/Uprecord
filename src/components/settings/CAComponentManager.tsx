import React from 'react';
import { Plus, Trash2, GripVertical, AlertCircle } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import type { CAComponent } from '../../db/db';

export const CAComponentManager: React.FC = () => {
  const { settings, updateSettings, addCAComponent, removeCAComponent } = useSettings();

  if (!settings) return null;

  const handleUpdateComponent = (id: string, updates: Partial<CAComponent>) => {
    const newComponents = settings.caComponents.map(c => 
      c.id === id ? { ...c, ...updates } : c
    );
    updateSettings({ caComponents: newComponents });
  };

  const handleAdd = () => {
    if (settings.caComponents.length >= 4) return;
    const nextId = `ca${settings.caComponents.length + 1}`;
    addCAComponent({
      id: nextId,
      name: `New CA ${settings.caComponents.length + 1}`,
      maxScore: 10
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-gray-900 tracking-tight">Continuous Assessment (CA)</h3>
          <p className="text-xs text-gray-400 font-medium">Configure tests and assignments (Min 2, Max 4)</p>
        </div>
        <button 
          onClick={handleAdd}
          disabled={settings.caComponents.length >= 4}
          className="flex items-center justify-center gap-2 px-3 py-2 sm:py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all w-full sm:w-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Component
        </button>
      </div>

      <div className="space-y-3">
        {settings.caComponents.map((component, index) => (
          <div 
            key={component.id}
            className="flex items-center gap-4 p-4 bg-gray-50/50 border border-gray-100 rounded-2xl group transition-all hover:bg-white hover:shadow-sm"
          >
            <div className="text-gray-300 group-hover:text-gray-400 transition-colors">
              <GripVertical className="w-4 h-4" />
            </div>

            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">Name</label>
                <input 
                  type="text" 
                  value={component.name}
                  onChange={(e) => handleUpdateComponent(component.id, { name: e.target.value })}
                  placeholder="e.g. 1st Test"
                  className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold text-gray-900"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">Max Score</label>
                <input 
                  type="number" 
                  value={component.maxScore}
                  onChange={(e) => handleUpdateComponent(component.id, { maxScore: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold text-gray-900"
                />
              </div>
            </div>

            <button 
              onClick={() => removeCAComponent(component.id)}
              disabled={settings.caComponents.length <= 2}
              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl disabled:opacity-0 transition-all"
              title="Remove component"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-blue-600" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-blue-900">Total CA Score</p>
            <p className="text-[0.625rem] text-blue-600 font-medium uppercase tracking-widest">Auto-calculated</p>
          </div>
        </div>
        <div className="text-2xl font-black text-blue-700 tracking-tighter">
          {settings.caMaxScore}
        </div>
      </div>
    </div>
  );
};
