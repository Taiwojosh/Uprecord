import React, { useState } from 'react';
import { Download, Upload, Loader2, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../../db/db';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';

export const BulkStudentImportModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const activeSchoolId = user?.schoolId || 'school-1';
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleDownloadTemplate = async () => {
    setIsExporting(true);
    try {
      const classes = await db.classes.toArray();
      if (classes.length === 0) {
         showToast('Please add at least one class before importing students.', 'error');
         return;
      }
      
      const wb = XLSX.utils.book_new();
      const headers = ['Admission Number', 'Full Name', 'Date of Birth (YYYY-MM-DD)', 'Gender (Male/Female)', 'Class Name', 'Student Email', 'Student Password', 'Parent Email', 'Parent Phone', 'Department'];
      
      const ws = XLSX.utils.aoa_to_sheet([headers, ['STU-001', 'John Doe', '2010-05-14', 'Male', classes[0].className, 'john.doe@school.edu', 'password123', 'parent@example.com', '1234567890', 'Science']]);
      ws['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 20 }];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Students Template');
      XLSX.writeFile(wb, 'Student_Import_Template.xlsx');
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

          const settings = await db.settings.toCollection().first();
          const canOverride = settings?.enableDataOverride ?? true;

          const classes = await db.classes.toArray();
          const classMap = new Map(classes.map(c => [c.className.toLowerCase(), c.id]));

          let importedCount = 0;
          let skippedCount = 0;

          const toAdd = [];

          for (const row of data) {
            // Highly robust header mapping to allow sashes, hyphens, spaces, and casing in headers
            const admNo = (row['Admission Number'] || row['admission number'] || row['AdmissionNumber'] || row['Admission No'] || row['admission no'] || row['AdmissionNo'] || row['Roll Number'] || row['roll_number'] || row['RN'] || row['ID'] || row['id'] || '')?.toString().trim();
            const fullName = (row['Full Name'] || row['fullName'] || row['full name'] || row['Student Name'] || row['student name'] || row['Name'] || row['name'] || '')?.toString().trim();
            const className = (row['Class Name'] || row['className'] || row['class name'] || row['Class'] || row['class'] || '')?.toString().trim();
            const genderStr = (row['Gender (Male/Female)'] || row['Gender'] || row['gender'] || '')?.toString().trim();
            
            if (!admNo || !fullName) {
               skippedCount++;
               continue;
            }

            // Auto-detect and auto-create missing classes if not exist, or fallback to first class as general
            let classId: number | undefined = undefined;
            if (className) {
              classId = classMap.get(className.toLowerCase());
              if (!classId) {
                try {
                  const newClassId = await db.classes.add({
                    className: className,
                    level: 'junior', // default
                    teacherName: 'Unassigned',
                    schoolId: activeSchoolId
                  });
                  classId = newClassId;
                  classMap.set(className.toLowerCase(), newClassId);
                } catch (classErr) {
                  console.error('Failed to auto-create class', classErr);
                }
              }
            }

            // If still no classId, default to first available, or create fallback
            if (!classId) {
              const currentClasses = await db.classes.toArray();
              if (currentClasses.length > 0) {
                classId = currentClasses[0].id!;
              } else {
                try {
                  const fallbackId = await db.classes.add({
                    className: 'General',
                    level: 'junior',
                    teacherName: 'Unassigned',
                    schoolId: activeSchoolId
                  });
                  classId = fallbackId;
                  classMap.set('general', fallbackId);
                } catch (generalErr) {
                  console.error('Failed to create general fallback class', generalErr);
                  classId = 1;
                }
              }
            }

            // Case-insensitive lookups on Admission Number (preserves all '/ , - _' characters!)
            const existingStudent = await db.students.where('admissionNumber').equalsIgnoreCase(admNo).first();
            if (existingStudent) {
               if (canOverride) {
                 await db.students.update(existingStudent.id!, {
                   fullName: fullName,
                   classId: classId,
                   dateOfBirth: row['Date of Birth (YYYY-MM-DD)']?.toString().trim() || row['Date of Birth']?.toString().trim() || existingStudent.dateOfBirth,
                   gender: (genderStr?.toLowerCase() === 'female' ? 'Female' : 'Male') as 'Male' | 'Female',
                   parentEmail: row['Parent Email']?.toString().trim() || existingStudent.parentEmail,
                   parentPhone: row['Parent Phone']?.toString().trim() || existingStudent.parentPhone,
                   departmentName: row['Department']?.toString().trim() || existingStudent.departmentName
                 });
                 importedCount++;
               } else {
                 skippedCount++;
               }
               continue;
            }

            const email = (row['Student Email'] || row['student email'] || row['Email'] || row['email'] || '')?.toString().trim();
            const password = (row['Student Password'] || row['student password'] || row['Password'] || row['password'] || '')?.toString().trim();

            let deptId: number | null = null;
            const deptName = row['Department']?.toString().trim();
            if (deptName && settings) {
              const dName = deptName.toLowerCase();
              if (settings.department1Name && settings.department1Name.toLowerCase() === dName) {
                deptId = 1;
              } else if (settings.department2Name && settings.department2Name.toLowerCase() === dName) {
                deptId = 2;
              } else if (settings.department3Name && settings.department3Name.toLowerCase() === dName) {
                deptId = 3;
              }
            }

            let addedStudentId: number | undefined = undefined;
            try {
              addedStudentId = await db.students.add({
                schoolId: activeSchoolId,
                admissionNumber: admNo,
                fullName,
                dateOfBirth: row['Date of Birth (YYYY-MM-DD)']?.toString().trim() || row['Date of Birth']?.toString().trim() || new Date().toISOString().split('T')[0],
                classId,
                gender: (genderStr?.toLowerCase() === 'female' ? 'Female' : 'Male') as 'Male' | 'Female',
                status: 'Active' as const,
                enrolledDate: new Date().toISOString().split('T')[0],
                parentEmail: row['Parent Email']?.toString().trim(),
                parentPhone: row['Parent Phone']?.toString().trim(),
                departmentName: deptName,
                departmentId: deptId
              });
              importedCount++;
            } catch (addErr) {
              console.error('Failed to add student in db', addErr);
              skippedCount++;
              continue;
            }

            if (email && addedStudentId) {
              try {
                const existingUser = await db.users.where('email').equalsIgnoreCase(email).first();
                if (existingUser) {
                  await db.users.update(existingUser.id!, {
                    fullName: fullName,
                    password: password || existingUser.password
                  });
                } else {
                  await db.users.add({
                    email,
                    fullName: fullName,
                    password: password || 'password123',
                    role: 'student',
                    schoolId: activeSchoolId,
                    isAdmin: false,
                    studentId: addedStudentId
                  });
                }
              } catch (userErr) {
                console.error('Failed to create companion user profile', userErr);
              }
            }
          }

          showToast(`Import complete: ${importedCount} students registered or updated. ${skippedCount} items skipped/unchanged.`, 'success');
          onClose();
        } catch (err) {
          console.error(err);
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
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Import Students">
      <div className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            Download the template first, fill it with your students' data, and then upload it back here. Ensure class names match exactly what is in the system.
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
