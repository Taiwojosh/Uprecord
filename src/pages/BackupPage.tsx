import React, { useState, useRef } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert,
  Info,
  X,
  DatabaseZap
} from 'lucide-react';
import { db } from '../db/db';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Spinner } from '../components/ui/Spinner';
import { motion, AnimatePresence } from 'motion/react';

export const BackupPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [isConfirmImportOpen, setIsConfirmImportOpen] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data: Record<string, any[]> = {};
      const tables = db.tables;
      const activeSchoolId = user?.schoolId || 'school-1';
      
      for (const table of tables) {
        const records = await table.toArray();
        // Only export records belonging to the current logged-in schoolId, or general records having no school id
        data[table.name] = records.filter(r => r.schoolId === activeSchoolId || !r.schoolId);
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `UpRecord_Backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      showToast('Backup exported successfully', 'success');
    } catch (error) {
      showToast('Failed to export backup', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingImportFile(file);
      setIsConfirmImportOpen(true);
    }
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!pendingImportFile) return;
    setIsImporting(true);
    setIsConfirmImportOpen(false);

    try {
      const text = await pendingImportFile.text();
      const data = JSON.parse(text);

      // Simple validation
      if (!data.settings || !data.students || !data.classes) {
        throw new Error('Invalid backup file format');
      }

      const activeSchoolId = user?.schoolId || 'school-1';

      // Clear existing data only for the current active school
      for (const table of db.tables) {
        await table.where('schoolId').equals(activeSchoolId).delete();
      }

      // Import new data, ensuring they have the correct activeSchoolId
      for (const tableName in data) {
        const table = db.table(tableName);
        if (table) {
          const recordsToImport = (data[tableName] || []).map((r: any) => ({
            ...r,
            schoolId: r.schoolId || activeSchoolId
          })).filter((r: any) => r.schoolId === activeSchoolId);
          
          if (recordsToImport.length > 0) {
            await table.bulkAdd(recordsToImport);
          }
        }
      }

      showToast('Backup restored successfully', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      showToast('Failed to restore backup. Invalid file.', 'error');
    } finally {
      setIsImporting(false);
      setPendingImportFile(null);
    }
  };

  const handleClearData = async () => {
    try {
      const activeSchoolId = user?.schoolId || 'school-1';
      for (const table of db.tables) {
        await table.where('schoolId').equals(activeSchoolId).delete();
      }
      showToast('All data cleared successfully', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      showToast('Failed to clear data', 'error');
    } finally {
      setIsConfirmClearOpen(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <PageHeader 
        title="Backup & Recovery" 
        subtitle="Manage your local database snapshots and data safety" 
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* Export/Import Section */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
              <DatabaseZap className="w-6 h-6 text-slate-600" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800">Database Snapshots</h2>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-card space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                  <Download className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight">Export Full Snapshot</h3>
                  <p className="text-xs text-slate-400 font-medium">Download all school data as a JSON file</p>
                </div>
              </div>
              <button 
                onClick={handleExport}
                disabled={isExporting}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-black disabled:opacity-50 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
              >
                {isExporting ? <Spinner size="sm" className="text-white" /> : <Download className="w-5 h-5" />}
                Download Backup
              </button>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-card space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                  <Upload className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight">Restore from Snapshot</h3>
                  <p className="text-xs text-slate-400 font-medium">Upload a previously exported data file</p>
                </div>
              </div>
              <button 
                onClick={handleImportClick}
                disabled={isImporting}
                className="w-full py-4 bg-white border border-slate-200 text-slate-800 font-bold rounded-2xl hover:bg-slate-50 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {isImporting ? <Spinner size="sm" /> : <Upload className="w-5 h-5" />}
                Choose File & Restore
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-rose-600" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800">System Reset</h2>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-rose-100 shadow-card space-y-8">
            <div className="flex items-start gap-4 text-left">
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Wipe Application Data</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  This will permanently delete all students, teachers, grades, classes, and settings. 
                  This action is irreversible without a valid backup file.
                </p>
              </div>
            </div>

            <button 
              onClick={() => setIsConfirmClearOpen(true)}
              className="w-full py-4 bg-rose-50 text-rose-600 font-bold rounded-2xl hover:bg-rose-100 transition-all flex items-center justify-center gap-2 border border-rose-100"
            >
              <Trash2 className="w-5 h-5" />
              Clear Local Store
            </button>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-start gap-4">
            <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[0.6875rem] text-slate-400 font-medium leading-relaxed">
              Snapshots are stored as JSON files on your device. We recommend backing up your data 
              at the end of every term and storing it in a secure cloud drive.
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog 
        isOpen={isConfirmImportOpen}
        title="Start Recovery?"
        message="This will overwrite all current local data with the snapshot content. This session will restart. Continue?"
        onConfirm={handleImport}
        onClose={() => { setIsConfirmImportOpen(false); setPendingImportFile(null); }}
      />

      <ConfirmDialog 
        isOpen={isConfirmClearOpen}
        title="Reset System?"
        message="You are about to purge all local records from this device. Are you absolutely certain?"
        onConfirm={handleClearData}
        onClose={() => setIsConfirmClearOpen(false)}
      />
    </div>
  );
};
