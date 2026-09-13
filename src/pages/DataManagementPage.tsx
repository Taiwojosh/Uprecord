import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  LayoutGrid, 
  Building2,
} from 'lucide-react';
import { db, type IClass } from '../db/db';
import { useSettings } from '../hooks/useSettings';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { useAudit } from '../hooks/useAudit';

type TabType = 'classes' | 'departments';

export const DataManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('classes');
  const { settings, updateSettings, isLoading } = useSettings();
  const { showToast } = useToast();
  const { logAction } = useAudit();

  // Data fetching
  const classes = useLiveQuery(() => db.classes.toArray());
  const teachers = useLiveQuery(() => db.users.where('role').equals('teacher').toArray());

  // Modals state
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IClass | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const item = await db.classes.get(confirmDelete);
      await db.classes.delete(confirmDelete);
      logAction('DELETE_CLASS', `Deleted class: ${item?.className}`);
      showToast('Class deleted permanently', 'success');
    } catch (error) {
      showToast('Failed to delete class', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  if (isLoading || !settings) return <Spinner size="lg" />;

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Institutional Logistics" 
        subtitle="Manage school class structures and departmental hierarchies" 
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-2xl w-full sm:w-fit border border-gray-200 overflow-x-auto scrollbar-none flex-nowrap whitespace-nowrap">
        <TabButton 
          active={activeTab === 'classes'} 
          onClick={() => setActiveTab('classes')}
          icon={LayoutGrid}
          label="Class Registry"
        />
        <TabButton 
          active={activeTab === 'departments'} 
          onClick={() => setActiveTab('departments')}
          icon={Building2}
          label="Departments"
        />
      </div>

      <div className="mt-8">
        {activeTab === 'classes' && (
          <ClassesTab 
            classes={classes || []} 
            settings={settings}
            onAdd={() => { setEditingItem(null); setIsClassModalOpen(true); }}
            onEdit={(item) => { setEditingItem(item); setIsClassModalOpen(true); }}
            onDelete={(id) => setConfirmDelete(id)}
          />
        )}
        {activeTab === 'departments' && (
          <div className="max-w-2xl space-y-8">
            <div className="space-y-1">
              <h3 className="text-lg font-black tracking-tight text-gray-900 uppercase italic">School Departments</h3>
              <p className="text-sm text-gray-500 font-medium">Define departmental scope and level assignments for senior grade grouping.</p>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {[1, 2, 3].map(num => (
                <div key={num} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6 group hover:border-blue-200 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-[0.2em]">Department {num} ID</label>
                      <input 
                        type="text" 
                        value={settings[`department${num}Name`] || ''}
                        onChange={(e) => updateSettings({ [`department${num}Name`]: e.target.value })}
                        placeholder="e.g. Science"
                        className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-gray-900 uppercase italic"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3 pl-16">
                    <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">Active Scope</label>
                    <div className="flex flex-wrap gap-2">
                      {(['Primary', 'junior', 'senior'] as const).map(level => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => updateSettings({ [`department${num}Level`]: level })}
                          className={`px-4 py-2 rounded-xl text-[0.625rem] font-black uppercase tracking-widest transition-all ${
                            (settings[`department${num}Level`] || 'senior') === level
                              ? 'bg-slate-900 text-white shadow-lg shadow-gray-200'
                              : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ClassModal 
        isOpen={isClassModalOpen} 
        onClose={() => setIsClassModalOpen(false)} 
        editingItem={editingItem}
        settings={settings}
        teachers={teachers || []}
      />
      <ConfirmDialog 
        isOpen={!!confirmDelete}
        title="Confirm Registry Deletion"
        message="Are you sure you want to remove this class from the system? This will disconnect all enrolled students and their academic histories."
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, icon: any, label: string }> = ({ active, onClick, icon: Icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[0.625rem] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${
      active ? 'bg-slate-900 text-white shadow-xl shadow-gray-200' : 'text-gray-400 hover:bg-gray-100'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

const ClassesTab: React.FC<{ 
  classes: IClass[], 
  settings: any,
  onAdd: () => void, 
  onEdit: (item: IClass) => void, 
  onDelete: (id: number) => void 
}> = ({ classes, settings, onAdd, onEdit, onDelete }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black tracking-tight text-gray-900 uppercase italic">Institutional Roster</h3>
        <button 
          onClick={onAdd}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-[0.625rem] font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-200"
        >
          <Plus className="w-4 h-4" />
          Initialize Class
        </button>
      </div>

      {classes.length === 0 ? (
        <EmptyState icon="LayoutGrid" message="No registry entries found. Start by defining your classes." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {classes.map(cls => (
            <div 
              key={cls.id} 
              onClick={() => onEdit(cls)}
              className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                 <LayoutGrid size={80} />
              </div>
              
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform">
                  <LayoutGrid className="w-7 h-7" />
                </div>
                <div className="flex items-center gap-2 relative z-10">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(cls); }} 
                    className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(cls.id!); }} 
                    className="p-2.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <h4 className="text-2xl font-black text-gray-900 tracking-tighter mb-1 uppercase italic">{cls.className}</h4>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Master: {cls.teacherName}</p>
              
              <div className="flex items-center gap-2">
                <span className="px-4 py-1.5 bg-gray-100 text-[0.5625rem] font-black text-gray-600 uppercase tracking-[0.2em] rounded-lg">
                  {cls.level}
                </span>
                {cls.departmentId && (
                  <span className="px-4 py-1.5 bg-blue-600 text-[0.5625rem] font-black text-white uppercase tracking-[0.2em] rounded-lg shadow-lg shadow-blue-100">
                    {settings?.[`department${cls.departmentId}Name`]}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ClassModal: React.FC<{ isOpen: boolean, onClose: () => void, editingItem: IClass | null, settings: any, teachers: any[] }> = ({ isOpen, onClose, editingItem, settings, teachers }) => {
  const [formData, setFormData] = useState<Partial<IClass>>({
    className: '',
    teacherName: '',
    level: 'Primary',
    departmentId: null
  });
  const { showToast } = useToast();

  React.useEffect(() => {
    if (editingItem) setFormData(editingItem);
    else setFormData({ className: '', teacherName: '', level: 'Primary', departmentId: null });
  }, [editingItem, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem?.id) {
        await db.classes.update(editingItem.id, formData);
        showToast('Class updated', 'success');
      } else {
        await db.classes.add(formData as IClass);
        showToast('Class added', 'success');
      }
      onClose();
    } catch (error) {
      showToast('Failed to save class', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingItem ? 'Update Registry' : 'Initialize Class'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[0.625rem] font-black text-gray-500 uppercase tracking-widest ml-1">Class Designation</label>
          <input 
            required
            type="text" 
            value={formData.className}
            onChange={(e) => setFormData({ ...formData, className: e.target.value })}
            placeholder="e.g. JS3 GOLD"
            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-gray-900 uppercase italic text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[0.625rem] font-black text-gray-500 uppercase tracking-widest ml-1">Assigned Master</label>
          <select 
            required
            value={formData.teacherName}
            onChange={(e) => {
              const teacher = teachers.find(t => t.fullName === e.target.value);
              setFormData({ 
                ...formData, 
                teacherName: e.target.value,
                teacherId: teacher?.id || null
              });
            }}
            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-gray-900 uppercase text-xs"
          >
            <option value="">Select Professional...</option>
            {teachers.map(t => (
              <option key={t.id} value={t.fullName}>{t.fullName}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[0.625rem] font-black text-gray-500 uppercase tracking-widest ml-1">Level Group</label>
            <select 
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
              className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-gray-900 uppercase text-xs"
            >
              <option value="Primary">Primary</option>
              <option value="junior">Junior Sec.</option>
              <option value="senior">Senior Sec.</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[0.625rem] font-black text-gray-500 uppercase tracking-widest ml-1">Department</label>
            <select 
              value={formData.departmentId || ''}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value ? Number(e.target.value) as any : null })}
              className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-gray-900 uppercase text-xs"
            >
              <option value="">No Department</option>
              <option value={1}>{settings?.department1Name}</option>
              <option value={2}>{settings?.department2Name}</option>
              <option value={3}>{settings?.department3Name}</option>
            </select>
          </div>
        </div>
        <button type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl transition-all shadow-xl shadow-gray-200 hover:bg-black uppercase tracking-widest italic text-xs">
          {editingItem ? 'Update Registry' : 'Confirm Initialization'}
        </button>
      </form>
    </Modal>
  );
};
