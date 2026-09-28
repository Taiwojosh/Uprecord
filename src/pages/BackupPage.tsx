import React, { useState } from 'react';
import { Download, Info } from 'lucide-react';
import { db } from '../db/db';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Spinner } from '../components/ui/Spinner';

// This export covers only school-tagged records in this browser. It is not a
// backup of the server registry, accounts, CBT, or data on other devices.
export const BackupPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if ((!user?.isAdmin && user?.role !== 'admin') || !user?.schoolId) return;
    setIsExporting(true);
    try {
      const records: Record<string, unknown[]> = {};
      for (const table of db.tables) {
        if (table.name === 'activation' || table.name === 'users') continue;
        // Never include untagged legacy records or another school's records.
        records[table.name] = await table.where('schoolId').equals(user.schoolId).toArray();
      }

      const file = {
        type: 'sefernote-local-export',
        version: 1,
        exportedAt: new Date().toISOString(),
        schoolId: user.schoolId,
        records,
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `SeferNote_Local_Export_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('Local records downloaded', 'success');
    } catch {
      showToast('Could not download local records', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  if ((!user?.isAdmin && user?.role !== 'admin') || !user?.schoolId) {
    return <p className="p-6 text-sm text-slate-700">Only school administrators can download local records.</p>;
  }

  return (
    <div className="space-y-6 pb-20">
      <PageHeader title="Local records" subtitle="Download a copy of records saved in this browser" />
      <section className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
        <p className="text-sm leading-6 text-slate-700">
          This download includes only this school's records stored on this device. It does not include
          school registry accounts, CBT, or records saved on other devices. Keep the file private because
          it may contain student information.
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isExporting ? <Spinner size="sm" /> : <Download className="h-4 w-4" />}
          Download local records
        </button>
      </section>
      <p className="flex max-w-2xl items-start gap-2 text-sm leading-6 text-slate-600">
        <Info className="mt-1 h-4 w-4 shrink-0" />
        School-wide recovery is handled separately from this browser download. Local restore is unavailable
        until it can be verified without risking existing records.
      </p>
    </div>
  );
};
