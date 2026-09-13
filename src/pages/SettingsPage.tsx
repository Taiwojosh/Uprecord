import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Save, 
  School, 
  Calendar, 
  Settings2, 
  Calculator,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Heart,
  Plus,
  Trash2,
  Edit2
} from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useLicense } from '../hooks/useLicense';
import { useToast } from '../context/ToastContext';
import { useAudit } from '../hooks/useAudit';
import { usePermissions } from '../hooks/usePermissions';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ISettings, type ITrait } from '../db/db';
import { PageHeader } from '../components/ui/PageHeader';
import { Spinner } from '../components/ui/Spinner';
import { ImageUploader } from '../components/settings/ImageUploader';
import { CAComponentManager } from '../components/settings/CAComponentManager';
import { GradingScaleManager } from '../components/settings/GradingScaleManager';
import { LivePreview } from '../components/settings/LivePreview';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, isLoading } = useSettings();
  const { user } = useAuth();
  const { isPremium } = useLicense();
  const { showToast } = useToast();
  const { logAction } = useAudit();
  const { canManageRegistry } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!canManageRegistry) navigate('/dashboard', { replace: true });
  }, [canManageRegistry, navigate]);
  const schoolId = user?.schoolId;
  
  const traits = useLiveQuery(async () => {
    if (!schoolId) return [];
    return (await db.traits.where('schoolId').equals(schoolId).toArray()).sort((a,b) => a.displayOrder - b.displayOrder);
  }, [schoolId]) ?? [];
  
  const [formData, setFormData] = useState<Partial<ISettings>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  const [isRollingOver, setIsRollingOver] = useState(false);
  const [isRolloverConfirmOpen, setIsRolloverConfirmOpen] = useState(false);
  const [isResetTraitsConfirmOpen, setIsResetTraitsConfirmOpen] = useState(false);
  
  const [isTraitModalOpen, setIsTraitModalOpen] = useState(false);
  const [editingTrait, setEditingTrait] = useState<ITrait | null>(null);
  const [confirmDeleteTrait, setConfirmDeleteTrait] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<'identity' | 'academic' | 'grading' | 'traits' | 'governance'>('identity');

  useEffect(() => {
    // Check if a specific tab was requested via location state
    const requestedTab = (location.state as { tab?: string })?.tab;
    if (requestedTab && ['identity', 'academic', 'grading', 'traits', 'governance'].includes(requestedTab)) {
      setActiveTab(requestedTab as 'identity' | 'academic' | 'grading' | 'traits' | 'governance');
    }
  }, [location]);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Auto-save logic
  useEffect(() => {
    if (!settings || Object.keys(formData).length === 0) return;

    // Check if formData actually differs from settings to avoid redundant saves
    const hasChanges = JSON.stringify(formData) !== JSON.stringify(settings);
    if (!hasChanges) return;

    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        await updateSettings(formData);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        setSaveStatus('error');
        showToast('Auto-save failed', 'error');
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timer);
  }, [formData, settings, updateSettings, showToast]);

  const handleRollover = async () => {
    setIsRollingOver(true);
    try {
      const nextTerm = settings!.currentTerm === 3 ? 1 : settings!.currentTerm + 1;
      const updates: Partial<ISettings> = { currentTerm: nextTerm as 1|2|3 };
      
      await updateSettings(updates);
      showToast('Session/Term rollover completed successfully', 'success');
      logAction('SESSION_ROLLOVER', `Executed transition to Term ${nextTerm}`);
    } catch (e) {
      showToast('Rollover operation failed', 'error');
    } finally {
      setIsRollingOver(false);
      setIsRolloverConfirmOpen(false);
    }
  };

  const handleResetTraits = async () => {
    try {
      await db.traits.clear();
      await db.traits.bulkAdd([
        { traitName: 'Punctuality', displayOrder: 1, category: 'affective' },
        { traitName: 'Neatness', displayOrder: 2, category: 'affective' },
        { traitName: 'Politeness', displayOrder: 3, category: 'affective' },
        { traitName: 'Honesty', displayOrder: 4, category: 'affective' },
        { traitName: 'Cooperation', displayOrder: 5, category: 'affective' },
        { traitName: 'Leadership', displayOrder: 6, category: 'affective' },
        { traitName: 'Self-Control', displayOrder: 7, category: 'affective' },
        { traitName: 'Handwriting', displayOrder: 8, category: 'psychomotor' },
        { traitName: 'Games/Sports', displayOrder: 9, category: 'psychomotor' },
        { traitName: 'Handling of Tools', displayOrder: 10, category: 'psychomotor' },
        { traitName: 'Drawing/Painting', displayOrder: 11, category: 'psychomotor' },
        { traitName: 'Verbal Fluency', displayOrder: 12, category: 'psychomotor' },
      ]);
      showToast('Academic traits reset to professional defaults', 'success');
      logAction('RESET_TRAITS', 'System reset of affective and psychomotor frameworks');
    } catch (error) {
      showToast('Failed to reset trait framework', 'error');
    } finally {
      setIsResetTraitsConfirmOpen(false);
    }
  };

  const handleDeleteTrait = async () => {
    if (!confirmDeleteTrait) return;
    try {
      await db.traits.delete(confirmDeleteTrait);
      showToast('Trait removed from system', 'success');
    } catch (e) {
      showToast('Failed to remove trait', 'error');
    } finally {
      setConfirmDeleteTrait(null);
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <PageHeader 
          title="School Settings" 
          subtitle="Configure your school identity and academic parameters" 
        />
        <div className="flex items-center gap-3">
          {saveStatus === 'saving' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl animate-pulse">
              <Spinner size="sm" color="blue" />
              <span className="text-[0.625rem] font-black uppercase tracking-widest">Auto-saving...</span>
            </div>
          )}
          {saveStatus === 'saved' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 size={14} />
              <span className="text-[0.625rem] font-black uppercase tracking-widest">Changes Saved</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl">
              <AlertCircle size={14} />
              <span className="text-[0.625rem] font-black uppercase tracking-widest">Save Failed</span>
            </div>
          )}
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-2xl w-full overflow-x-auto no-scrollbar border border-gray-200">
        {[
          { id: 'identity', label: 'Identity', icon: School },
          { id: 'academic', label: 'Academic Logic', icon: Settings2 },
          { id: 'traits', label: 'Trait Framework', icon: Heart },
          { id: 'grading', label: 'Grading & CA', icon: Calculator },
          { id: 'governance', label: 'Governance', icon: RefreshCw },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[0.625rem] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${
              activeTab === tab.id 
                ? 'bg-slate-900 text-white shadow-xl shadow-gray-200' 
                : 'text-gray-400 hover:bg-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Form Content */}
        <div className="lg:col-span-7 space-y-10">
          
          {activeTab === 'identity' && (
            <section className="bg-white rounded-[2.5rem] border border-gray-100 p-8 sm:p-10 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <School className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-black tracking-tight text-gray-900">School Identity</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-gray-700 tracking-tight">School Name</label>
                  <input 
                    type="text" 
                    value={formData.schoolName || ''}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    placeholder="e.g. Royal International School"
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-gray-900"
                  />
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-gray-700 tracking-tight">School Slogan / Motto</label>
                  <input 
                    type="text" 
                    value={formData.schoolSlogan || ''}
                    onChange={(e) => setFormData({ ...formData, schoolSlogan: e.target.value })}
                    placeholder="e.g. Excellence in Character and Learning"
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-gray-600 italic"
                  />
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-gray-700 tracking-tight">School Address</label>
                  <textarea 
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Full physical address"
                    rows={3}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-gray-600 resize-none"
                  />
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-gray-700 tracking-tight">Principal's Name</label>
                  <input 
                    type="text" 
                    value={formData.principalName || ''}
                    onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                    placeholder="e.g. Dr. Jane Doe"
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-gray-900"
                  />
                </div>

                <ImageUploader 
                  label="School Logo"
                  value={formData.logoBase64 || ''}
                  onChange={(base64) => setFormData({ ...formData, logoBase64: base64 })}
                  onClear={() => setFormData({ ...formData, logoBase64: '' })}
                  description="Square PNG/JPG, max 400x400px"
                />

                <ImageUploader 
                  label="Principal's Signature"
                  value={formData.principalSignatureBase64 || ''}
                  onChange={(base64) => setFormData({ ...formData, principalSignatureBase64: base64 })}
                  onClear={() => setFormData({ ...formData, principalSignatureBase64: '' })}
                  aspectRatio="16/9"
                  description="Transparent PNG recommended"
                />

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 tracking-tight">Brand Color</label>
                  <div className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                    <input 
                      type="color" 
                      value={formData.brandColor || '#1d4ed8'}
                      onChange={(e) => setFormData({ ...formData, brandColor: e.target.value })}
                      className="w-12 h-12 rounded-xl border-none cursor-pointer bg-transparent"
                    />
                    <code className="text-sm font-black text-gray-900 uppercase tracking-widest">{formData.brandColor}</code>
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-700 tracking-tight">Report Card Template</label>
                    {!isPremium && <span className="text-[0.625rem] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">Premium Feature</span>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {(['classic', 'modern', 'minimal'] as const).map((template) => (
                      <button
                        key={template}
                        onClick={() => isPremium && setFormData({ ...formData, reportCardTemplate: template })}
                        disabled={!isPremium}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${
                          (formData.reportCardTemplate || 'classic') === template
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-100 bg-white hover:border-blue-200'
                        } ${!isPremium ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="font-black text-gray-900 capitalize mb-1">{template}</div>
                        <div className="text-xs font-medium text-gray-500">
                          {template === 'classic' && 'Traditional table layout'}
                          {template === 'modern' && 'Clean, spacious design'}
                          {template === 'minimal' && 'Compact, data-focused'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'academic' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section className="bg-white rounded-[2.5rem] border border-gray-100 p-8 sm:p-10 shadow-sm space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
                    <Settings2 className="w-6 h-6 text-amber-600" />
                  </div>
                  <h2 className="text-xl font-black tracking-tight text-gray-900">Academic Logic</h2>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <div className="flex-1 space-y-1">
                      <h3 className="text-sm font-black text-gray-900">Level-Based Subject Filtering</h3>
                      <p className="text-xs font-medium text-gray-500 leading-relaxed uppercase">
                        Restrict subjects with departments to Senior students. 
                      </p>
                    </div>
                    <button 
                      onClick={() => setFormData({ ...formData, enableLevelSubjectFiltering: !formData.enableLevelSubjectFiltering })}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.enableLevelSubjectFiltering ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          formData.enableLevelSubjectFiltering ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <div className="flex-1 space-y-1">
                      <h3 className="text-sm font-black text-gray-900">Allow Data Override</h3>
                      <p className="text-xs font-medium text-gray-500 leading-relaxed uppercase">
                        Overwrite existing records during bulk imports or saves.
                      </p>
                    </div>
                    <button 
                      onClick={() => setFormData({ ...formData, enableDataOverride: !formData.enableDataOverride })}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.enableDataOverride ? 'bg-amber-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          formData.enableDataOverride ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <div className="flex-1 space-y-1">
                      <h3 className="text-sm font-black text-gray-900">Color-Coded Grades</h3>
                      <p className="text-xs font-medium text-gray-500 leading-relaxed uppercase">
                        Apply visual status colors to final grades on reports.
                      </p>
                    </div>
                    <button 
                      onClick={() => setFormData({ ...formData, enableGradeColors: !formData.enableGradeColors })}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.enableGradeColors ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          formData.enableGradeColors ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <div className="flex-1 space-y-1">
                      <h3 className="text-sm font-black text-gray-900">Enforce Attendance Compliance</h3>
                      <p className="text-xs font-medium text-gray-500 leading-relaxed uppercase">
                        Restrict teachers from creating or editing lesson notes, grades, or comments unless up-to-date attendance is marked for their class.
                      </p>
                    </div>
                    <button 
                      onClick={() => setFormData({ ...formData, restrictTeacherActionsNoAttendance: !formData.restrictTeacherActionsNoAttendance })}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.restrictTeacherActionsNoAttendance ? 'bg-red-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          formData.restrictTeacherActionsNoAttendance ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Allow Teachers to View Fee Status */}
                  <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <div className="flex-1 space-y-1">
                      <h3 className="text-sm font-black text-gray-900">Allow Teachers to View Fee Status</h3>
                      <p className="text-xs font-medium text-gray-500 leading-relaxed uppercase">
                        Enable this to allow class teachers to see students' payment and fee outstanding statuses in lists and profiles.
                      </p>
                    </div>
                    <button 
                      onClick={() => setFormData({ ...formData, allowTeachersViewFeeStatus: !formData.allowTeachersViewFeeStatus })}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.allowTeachersViewFeeStatus ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          formData.allowTeachersViewFeeStatus ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Restrict Unpaid Students Access */}
                  <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <div className="flex-1 space-y-1">
                      <h3 className="text-sm font-black text-gray-900">Restrict Unpaid Students Access</h3>
                      <p className="text-xs font-medium text-gray-500 leading-relaxed uppercase">
                        Restrict students with unpaid/outstanding fees from accessing core resources (class materials, report cards, result sheets).
                      </p>
                    </div>
                    <button 
                      onClick={() => setFormData({ ...formData, restrictUnpaidStudentsAccess: !formData.restrictUnpaidStudentsAccess })}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.restrictUnpaidStudentsAccess ? 'bg-rose-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          formData.restrictUnpaidStudentsAccess ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-[2.5rem] border border-gray-100 p-8 sm:p-10 shadow-sm space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-black tracking-tight text-gray-900">Term Configuration</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 tracking-tight">Current Term</label>
                    <select 
                      value={formData.currentTerm}
                      onChange={(e) => setFormData({ ...formData, currentTerm: Number(e.target.value) as 1|2|3 })}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-gray-900 appearance-none"
                    >
                      <option value={1}>First Term</option>
                      <option value={2}>Second Term</option>
                      <option value={3}>Third Term</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 tracking-tight">Current Session</label>
                    <input 
                      type="text" 
                      value={formData.currentSession || ''}
                      onChange={(e) => setFormData({ ...formData, currentSession: e.target.value })}
                      placeholder="e.g. 2024/2025"
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-gray-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 tracking-tight">Current Term Resumption</label>
                    <input 
                      type="date" 
                      value={formData.resumptionDate || ''}
                      onChange={(e) => setFormData({ ...formData, resumptionDate: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-gray-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 tracking-tight">Term Closing Date</label>
                    <input 
                      type="date" 
                      value={formData.termClosingDate || ''}
                      onChange={(e) => setFormData({ ...formData, termClosingDate: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-gray-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 tracking-tight">Next Term Resumption</label>
                    <input 
                      type="date" 
                      value={formData.nextTermDate || ''}
                      onChange={(e) => setFormData({ ...formData, nextTermDate: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-gray-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 tracking-tight">Days School Opened</label>
                    <input 
                      type="number" 
                      value={formData.daysSchoolOpen || 0}
                      onChange={(e) => setFormData({ ...formData, daysSchoolOpen: Number(e.target.value) })}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-gray-900"
                    />
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'grading' && (
            <section className="bg-white rounded-[2.5rem] border border-gray-100 p-8 sm:p-10 shadow-sm space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
                  <Calculator className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-xl font-black tracking-tight text-gray-900">Score Configuration</h2>
              </div>

              <div className="space-y-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 tracking-tight">Exam Maximum Score</label>
                      <input 
                        type="number" 
                        value={formData.examMaxScore || 0}
                        onChange={(e) => setFormData({ ...formData, examMaxScore: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-gray-900 text-xl"
                      />
                    </div>

                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                      <div className="flex items-center gap-2 text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Total Subject Score
                      </div>
                      <div className="text-3xl font-black text-gray-900 tracking-tighter">
                        {formData.totalSubjectScore}
                      </div>
                    </div>
                  </div>

                  <CAComponentManager />
                </div>
                
                <div className="pt-10 border-t border-gray-100">
                  <GradingScaleManager 
                    scale={formData.gradingScale || []} 
                    onChange={(newScale) => setFormData({ ...formData, gradingScale: newScale })}
                  />
                </div>
              </div>
            </section>
          )}

          {activeTab === 'traits' && (
            <section className="bg-white rounded-[2.5rem] border border-gray-100 p-8 sm:p-10 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center">
                      <Heart className="w-6 h-6 text-pink-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight text-gray-900">Trait Framework</h2>
                      <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">Affective & Psychomotor Domains</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsResetTraitsConfirmOpen(true)}
                      className="p-3 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      title="Reset to Professional Defaults"
                    >
                      <RefreshCw size={20} />
                    </button>
                    <button 
                      onClick={() => { setEditingTrait(null); setIsTraitModalOpen(true); }}
                      className="p-3 bg-slate-900 text-white rounded-xl hover:bg-black transition-all"
                    >
                      <Plus size={20} />
                    </button>
                </div>
              </div>

              <div className="divide-y divide-gray-50 border border-gray-50 rounded-3xl overflow-hidden">
                {traits.map(trait => (
                  <div key={trait.id} className="flex items-center justify-between p-6 hover:bg-gray-50/50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <span className="w-8 h-8 bg-gray-100 text-gray-400 rounded-xl flex items-center justify-center text-[0.625rem] font-black italic">
                            {trait.displayOrder}
                        </span>
                        <div>
                            <p className="text-sm font-black text-gray-900 uppercase tracking-tight italic">{trait.traitName}</p>
                            <span className={`text-[0.5rem] font-black uppercase tracking-widest ${trait.category === 'affective' ? 'text-blue-500' : 'text-purple-500'}`}>
                              {trait.category} domain
                            </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setEditingTrait(trait); setIsTraitModalOpen(true); }}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-all"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => setConfirmDeleteTrait(trait.id!)}
                          className="p-2 text-gray-400 hover:text-rose-600 transition-all"
                        >
                            <Trash2 size={16} />
                        </button>
                      </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'governance' && (
            <section className="bg-slate-900 rounded-[2.5rem] p-8 sm:p-10 shadow-xl space-y-10 text-white animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">System Governance</h2>
                  <p className="text-[0.625rem] font-bold text-gray-500 uppercase tracking-widest">Global Session & Registry Management</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="bg-white/5 p-8 rounded-3xl border border-white/10 space-y-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h3 className="text-sm font-black uppercase tracking-tight">Term Rollover</h3>
                      <p className="text-[0.625rem] font-medium text-gray-400 leading-relaxed uppercase">Prepare registry for the next term. All current term grade entries will be locked and archived.</p>
                    </div>
                    <button 
                      onClick={() => setIsRolloverConfirmOpen(true)}
                      className="w-full py-4 bg-white text-slate-900 text-[0.625rem] font-black uppercase tracking-widest rounded-xl hover:bg-blue-400 hover:text-white transition-all"
                    >
                      Execute Transition
                    </button>
                </div>

                <div className="bg-blue-600 p-8 rounded-3xl border border-blue-500 space-y-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h3 className="text-sm font-black uppercase tracking-tight">Global Promotion</h3>
                      <p className="text-[0.625rem] font-black text-blue-100 leading-relaxed uppercase opacity-80">Increment school session and promote all active students to the next registry level.</p>
                    </div>
                    <button className="w-full py-4 bg-slate-900 text-white text-[0.625rem] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all">
                      Commence Promotion
                    </button>
                </div>
              </div>

              <div className="bg-amber-500/10 p-5 rounded-2xl border border-amber-500/20 flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-1" />
                <div className="space-y-1">
                    <p className="text-[0.625rem] font-black uppercase text-amber-500 tracking-widest">Protocol Warning</p>
                    <p className="text-[0.625rem] font-bold text-amber-500/70 uppercase leading-relaxed italic">These are destructive operations. Ensure all broadsheets for {settings?.currentSession} / Term {settings?.currentTerm} are finalized before execution.</p>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Live Preview */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-10 space-y-6">
            <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
              <AlertCircle className="w-4 h-4" />
              <p className="text-[0.625rem] font-bold uppercase tracking-widest">Preview updates in real-time</p>
            </div>
            <div className="h-[600px] sm:h-[800px]">
              <LivePreview />
            </div>
          </div>
        </div>
      </div>


      {/* Trait Modal */}
      <TraitModal 
        isOpen={isTraitModalOpen}
        onClose={() => setIsTraitModalOpen(false)}
        editingItem={editingTrait}
        schoolId={schoolId!}
      />

      <ConfirmDialog 
        isOpen={isRolloverConfirmOpen}
        title="Execute Session Rollover"
        message="Are you sure you want to transition to the next academic term? This protocol prepares the registry for fresh entries. Ensure all reports are exported."
        onConfirm={handleRollover}
        onClose={() => setIsRolloverConfirmOpen(false)}
      />

      <ConfirmDialog 
        isOpen={isResetTraitsConfirmOpen}
        title="Reset Trait Framework"
        message="Are you sure you want to revert all behavior traits to system defaults? This will overwrite your custom metrics."
        onConfirm={handleResetTraits}
        onClose={() => setIsResetTraitsConfirmOpen(false)}
      />

      <ConfirmDialog 
        isOpen={!!confirmDeleteTrait}
        title="Delete Trait Metric"
        message="Are you sure you want to remove this behavioral trait from the report card registry?"
        onConfirm={handleDeleteTrait}
        onClose={() => setConfirmDeleteTrait(null)}
      />
    </div>
  );
};

const TraitModal: React.FC<{ isOpen: boolean, onClose: () => void, editingItem: ITrait | null, schoolId: string }> = ({ isOpen, onClose, editingItem, schoolId }) => {
  const [formData, setFormData] = useState<Partial<ITrait>>({
    traitName: '',
    category: 'affective',
    displayOrder: 1
  });
  const { showToast } = useToast();

  React.useEffect(() => {
    if (editingItem) setFormData(editingItem);
    else setFormData({ traitName: '', category: 'affective', displayOrder: 1 });
  }, [editingItem, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem?.id) {
        await db.traits.update(editingItem.id, formData);
        showToast('Trait updated successfully', 'success');
      } else {
        await db.traits.add({ ...(formData as ITrait), schoolId });
        showToast('Trait registered successfully', 'success');
      }
      onClose();
    } catch (error) {
      showToast('Failed to save trait metric', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingItem ? 'Edit Trait Metric' : 'Register New Trait'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[0.625rem] font-black text-gray-500 uppercase tracking-widest ml-1">Metric Title</label>
          <input 
            required
            type="text" 
            value={formData.traitName}
            onChange={(e) => setFormData({ ...formData, traitName: e.target.value })}
            placeholder="e.g. Leadership"
            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-gray-900 uppercase italic text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[0.625rem] font-black text-gray-500 uppercase tracking-widest ml-1">Domain</label>
            <select 
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-gray-900 uppercase text-xs"
            >
              <option value="affective">Affective</option>
              <option value="psychomotor">Psychomotor</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[0.625rem] font-black text-gray-500 uppercase tracking-widest ml-1">Sequence</label>
            <input 
              type="number" 
              value={formData.displayOrder}
              onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
              className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-gray-900 text-sm"
            />
          </div>
        </div>
        <button type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl transition-all uppercase tracking-[0.2em] italic text-xs shadow-xl shadow-slate-900/20 hover:bg-black">
          {editingItem ? 'Update Metric' : 'Finalize Trait'}
        </button>
      </form>
    </Modal>
  );
};
