import React, { useState } from 'react';
import { Download, Upload, Loader2, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../../db/db';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';

export const BulkTeacherImportModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const activeSchoolId = user?.schoolId || 'school-1';
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleDownloadTemplate = async () => {
    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      const headers = ['Full Name', 'Email', 'Phone', 'Department', 'Role (Admin/Teacher)', 'Password'];
      
      const ws = XLSX.utils.aoa_to_sheet([headers, ['Jane Smith', 'jane.smith@school.local', '1234567890', 'Science', 'Teacher', 'password123']]);
      ws['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Teachers Template');
      XLSX.writeFile(wb, 'Teacher_Import_Template.xlsx');
      showToast('Template downloaded successfully', 'success');
    } catch (error) {
      showToast('Failed to generate template', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws) as any[];

          let importedCount = 0;
          let skippedCount = 0;

          const toAdd = [];

          for (const row of data) {
            const fullName = row['Full Name']?.toString().trim();
            const email = row['Email']?.toString().trim();
            const roleStr = row['Role (Admin/Teacher)']?.toString().trim().toLowerCase();
            
            if (!fullName || !email) {
               skippedCount++;
               continue;
            }

            const existingTeacher = await db.users.where('email').equals(email).first();
            if (existingTeacher) {
               // Update existing? For now, let's just skip.
               skippedCount++;
               continue;
            }

            toAdd.push({
              schoolId: activeSchoolId,
              fullName,
              email,
              phone: row['Phone']?.toString().trim(),
              department: row['Department']?.toString().trim() || 'Science',
              role: 'teacher' as const,
              isAdmin: roleStr === 'admin',
              password: row['Password']?.toString().trim() || 'password123',
              status: 'active' as const,
              joinDate: new Date().toISOString()
            });
            importedCount++;
          }

          if (toAdd.length > 0) {
            await db.users.bulkAdd(toAdd);
          }

          showToast(`Import complete: ${importedCount} teachers added, ${skippedCount} skipped.`, 'success');
          onClose();
        } catch (err) {
          showToast('Failed to process Excel file.', 'error');
        } finally {
          setIsImporting(false);
          e.target.value = '';
        }
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      showToast('Failed to upload file', 'error');
      setIsImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Import Teachers">
      <div className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            Download the template first, fill it with your teachers' data, and then upload it back here. Emails must be unique.
          </p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          disabled={isExporting}
          className="w-full py-4 bg-gray-900 text-white font-black rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2"
        >
          {isExporting ? <Loader2 className="animate-spin w-5 h-5" /> : <Download className="w-5 h-5" />}
          DOWNLOAD TEMPLATE
        </button>

        <div className="relative group">
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            disabled={isImporting}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
          />
          <div className="w-full py-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 bg-gray-50 border-gray-200 group-hover:bg-gray-100 group-hover:border-gray-300 transition-all">
            {isImporting ? (
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-gray-400" />
            )}
            <div className="text-center">
              <p className="text-sm font-bold text-gray-700">
                {isImporting ? 'Processing File...' : 'Click or Drag Excel File Here'}
              </p>
              <p className="text-[0.625rem] text-gray-400 font-bold uppercase tracking-widest mt-1">
                Supports .xlsx and .xls
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
