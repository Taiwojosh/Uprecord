import React, { useState } from 'react';
import { 
  Edit2, 
  Trash2, 
  User, 
  Hash, 
  GraduationCap, 
  Calendar, 
  ArrowUpDown, 
  UserX,
  MoreVertical,
  Eye,
  CreditCard,
  UserCheck,
  UserMinus,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { IStudent, IClass, IAttendance } from '../../db/db';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { getStudentFeeStatus } from '../../lib/calculationEngine';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';

type SortField = 'fullName' | 'admissionNumber' | 'classId' | 'enrolledDate';
type SortOrder = 'asc' | 'desc';

interface StudentTableProps {
  students: IStudent[];
  classes: IClass[];
  attendance: IAttendance[];
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onEdit: (student: IStudent) => void;
  onDelete: (id: number) => void;
  isLoading?: boolean;
}

export const StudentTable: React.FC<StudentTableProps> = ({
  students,
  classes,
  attendance,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
  isLoading
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sortField, setSortField] = useState<SortField>('fullName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [expandedStudentIds, setExpandedStudentIds] = useState<number[]>([]);

  const schoolId = user?.schoolId || 'school-1';
  const settings = useLiveQuery(() => db.settings.where('schoolId').equals(schoolId).first(), [schoolId]);
  const payments = useLiveQuery(() => db.payments.toArray()) || [];

  const isTeacher = user?.role === 'teacher';

  const toggleExpandStudent = (id: number) => {
    setExpandedStudentIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const getClassLabel = (classId: number) => {
    return classes.find(c => c.id === classId)?.className || 'UNALLOCATED';
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedStudents = [...students].sort((a, b) => {
    let valA = a[sortField] as any;
    let valB = b[sortField] as any;

    if (sortField === 'classId') {
      valA = getClassLabel(a.classId);
      valB = getClassLabel(b.classId);
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 space-y-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
          <div key={i} className="h-14 bg-gray-50 animate-pulse rounded-2xl border border-gray-50" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <p className="text-[0.625rem] md:text-xs font-bold text-slate-400 italic">
          Showing {sortedStudents.length} {sortedStudents.length === 1 ? 'student' : 'students'}
        </p>
        {sortedStudents.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const allIds = sortedStudents.map(s => s.id!).filter(Boolean);
              const isAllExpanded = expandedStudentIds.length === allIds.length;
              setExpandedStudentIds(isAllExpanded ? [] : allIds);
            }}
            className="md:hidden inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-[10px] font-bold text-slate-600 hover:text-slate-800 transition-colors shadow-sm select-none active:scale-[0.98]"
          >
            {expandedStudentIds.length === sortedStudents.length ? 'Collapse All' : 'Expand All'}
          </button>
        )}
      </div>

      <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
      {/* Desktop view */}
      <div className="hidden md:block overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-6 py-5 w-[60px] h-[58.9781px]">
                 <div className="flex items-center">
                    <input 
                      type="checkbox"
                      checked={students.length > 0 && selectedIds.length === students.length}
                      onChange={onToggleSelectAll}
                      className="w-5 h-5 rounded-lg border-gray-200 text-slate-900 focus:ring-slate-900 appearance-none bg-white border checked:bg-slate-900 transition-all cursor-pointer relative after:content-[''] after:hidden checked:after:block after:absolute after:left-[6px] after:top-[2px] after:w-[6px] after:h-[10px] after:border-white after:border-r-2 after:border-b-2 after:rotate-45"
                    />
                 </div>
              </th>
              <th className="px-6 py-5 w-[320px]">
                <button onClick={() => toggleSort('fullName')} className="flex items-center gap-2 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest hover:text-slate-900 transition-colors italic">
                  Student Identity {sortField === 'fullName' && <ArrowUpDown className="w-3 h-3" />}
                </button>
              </th>
              <th className="px-6 py-5 w-[220px]">
                <button onClick={() => toggleSort('classId')} className="flex items-center gap-2 text-[0.625rem] font-black text-gray-400 uppercase tracking-widest hover:text-indigo-600 transition-colors italic">
                  Academic Level {sortField === 'classId' && <ArrowUpDown className="w-3 h-3" />}
                </button>
              </th>
              <th className="px-6 py-5 w-[120px] text-[0.625rem] font-black text-gray-400 uppercase tracking-widest italic">Gender</th>
              <th className="px-6 py-5" />
              <th className="px-6 py-5 text-right w-[100px]" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 flex-1">
            {sortedStudents.map((student, studentIndex) => {
               const studentClass = classes.find(c => c.id === student.classId);
               const isClassTeacher = studentClass && (studentClass.teacherId === Number(user?.id) || studentClass.teacherName === user?.fullName);
               const isAuthorizedToManage = user?.role === 'admin' || user?.isAdmin || (user?.role === 'teacher' && isClassTeacher);
               const isNearBottom = studentIndex >= sortedStudents.length - 2 && sortedStudents.length > 2;
               return (
                <tr key={student.id} className="hover:bg-gray-50/50 transition-colors group relative">
                  <td className="px-6 py-5 w-[60px]">
                    {isAuthorizedToManage && (
                      <input 
                        type="checkbox"
                        checked={selectedIds.includes(student.id!)}
                        onChange={() => onToggleSelect(student.id!)}
                        className="w-5 h-5 rounded-lg border-gray-200 text-slate-900 focus:ring-slate-900 appearance-none bg-white border checked:bg-slate-900 transition-all cursor-pointer relative after:content-[''] after:hidden checked:after:block after:absolute after:left-[6px] after:top-[2px] after:w-[6px] after:h-[10px] after:border-white after:border-r-2 after:border-b-2 after:rotate-45"
                      />
                    )}
                  </td>
                  <td className="px-6 py-5 w-[320px]">
                    <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate(`/students/${student.id}`)}>
                      <div className="relative shrink-0 group/avatar">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200 overflow-hidden">
                          {student.photoBase64 ? (
                            <img src={student.photoBase64} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[0.6875rem] font-black text-gray-400 uppercase">{student.fullName ? student.fullName.split(' ').map(n => n[0]).join('') : 'ST'}</span>
                          )}
                        </div>
                        {/* Status Signal Dot Badge on Student's Avatar */}
                        <div 
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center cursor-pointer shadow-sm z-10 ${
                            student.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                          title={`Status: ${student.status === 'Active' ? 'Active / Present in Registry' : 'Inactive / Absent in Registry'}`}
                        >
                          {student.status === 'Active' && (
                            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" style={{ animationDuration: '2s' }} />
                          )}
                        </div>
                        {/* Custom Hover Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/avatar:block bg-slate-900/95 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md whitespace-nowrap z-50 pointer-events-none shadow-lg border border-slate-800">
                          {student.status === 'Active' ? 'Active / Present' : 'Inactive / Absent'}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900 tracking-tight italic uppercase group-hover:text-blue-600 transition-colors">{student.fullName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">{student.admissionNumber}</p>
                          <span className="text-gray-300 text-[10px]">•</span>
                          <span className="text-[0.55rem] font-semibold text-gray-400 uppercase tracking-wider">Enrolled: {student.enrolledDate || 'Sep 2024'}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 w-[220px]">
                     <Badge className="bg-gray-100 text-gray-700 text-[0.5625rem] font-black uppercase tracking-widest border border-gray-200 rounded-lg">
                        {getClassLabel(student.classId)}
                     </Badge>
                  </td>
                  <td className="px-6 py-5 w-[120px]">
                     <span className="text-xs font-black text-gray-500 italic">{student.gender}</span>
                  </td>
                  <td className="px-6 py-5" />
                  <td className="px-6 py-5 text-right w-[100px]">
                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === student.id ? null : student.id!);
                        }}
                        className={`p-2 rounded-xl transition-all duration-150 ${
                          activeMenuId === student.id 
                            ? 'bg-slate-900 text-white' 
                            : 'text-gray-600 hover:text-slate-950 bg-gray-50 hover:bg-gray-100 border border-gray-200/50'
                        }`}
                        title="Actions Menu"
                      >
                        <MoreVertical size={16} />
                      </button>
                      
                      {activeMenuId === student.id && (
                        <div className={`absolute right-0 ${isNearBottom ? 'bottom-full mb-2' : 'top-full mt-2'} w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 py-2 animate-in fade-in zoom-in duration-200`}>
                          <ActionButton icon={Eye} label="View Profile" onClick={() => navigate(`/students/${student.id}`)} />
                          {isAuthorizedToManage && (
                            <>
                              <ActionButton icon={Edit2} label="Edit Details" onClick={() => onEdit(student)} />
                              <ActionButton icon={CreditCard} label="Fee Record" onClick={() => {}} />
                              <div className="my-2 border-t border-gray-50" />
                              <ActionButton icon={UserMinus} label="Deactivate" color="text-gray-600" onClick={() => {}} />
                              <ActionButton icon={Trash2} label="Delete Record" color="text-rose-600" onClick={() => onDelete(student.id!)} />
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile view - List/Card Layout with dropdown expand arrow */}
      <div className="block md:hidden divide-y divide-gray-100">
        <div className="p-5 bg-gray-50/50 flex items-center justify-between">
          <span className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest italic">Students Registry ({sortedStudents.length})</span>
          {students.length > 0 && selectedIds.length === students.length ? (
            <button onClick={onToggleSelectAll} className="text-[0.55rem] font-black text-blue-600 uppercase tracking-widest hover:underline">Deselect All</button>
          ) : (
            <button onClick={onToggleSelectAll} className="text-[0.55rem] font-black text-blue-600 uppercase tracking-widest hover:underline">Select All</button>
          )}
        </div>

        {sortedStudents.map((student, studentIndex) => {
          const studentClass = classes.find(c => c.id === student.classId);
          const isClassTeacher = studentClass && (studentClass.teacherId === Number(user?.id) || studentClass.teacherName === user?.fullName);
          const isAuthorizedToManage = user?.role === 'admin' || user?.isAdmin || (user?.role === 'teacher' && isClassTeacher);
          const isExpanded = expandedStudentIds.includes(student.id!);
          const isNearBottomValue = studentIndex >= sortedStudents.length - 2 && sortedStudents.length > 2;

          return (
            <div key={student.id} className="p-4 hover:bg-gray-50/20 transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {isAuthorizedToManage && (
                    <input 
                      type="checkbox"
                      checked={selectedIds.includes(student.id!)}
                      onChange={() => onToggleSelect(student.id!)}
                      className="w-5 h-5 rounded-lg border-gray-200 text-slate-900 focus:ring-slate-900 appearance-none bg-white border checked:bg-slate-900 transition-all cursor-pointer relative after:content-[''] after:hidden checked:after:block after:absolute after:left-[6px] after:top-[2px] after:w-[6px] after:h-[10px] after:border-white after:border-r-2 after:border-b-2 after:rotate-45 shrink-0"
                    />
                  )}
                  {/* Student Avatar with Status Badge Dot */}
                  <div className="relative shrink-0 group/avatar">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200 overflow-hidden">
                      {student.photoBase64 ? (
                        <img src={student.photoBase64} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[0.6875rem] font-black text-gray-400 uppercase">
                          {student.fullName ? student.fullName.split(' ').map(n => n[0]).join('') : 'ST'}
                        </span>
                      )}
                    </div>
                    {/* Status Dot badge on Avatar */}
                    <div 
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center cursor-pointer shadow-sm z-10 ${
                        student.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    >
                      {student.status === 'Active' && (
                        <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" style={{ animationDuration: '2s' }} />
                      )}
                    </div>
                    {/* Custom Hover/Touch Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/avatar:block bg-slate-900/95 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md whitespace-nowrap z-50 pointer-events-none shadow-lg border border-slate-800">
                      {student.status === 'Active' ? 'Active / Present' : 'Inactive / Absent'}
                    </div>
                  </div>

                  <div className="min-w-0" onClick={() => navigate(`/students/${student.id}`)}>
                    <p className="text-sm font-black text-gray-900 tracking-tight italic uppercase truncate">{student.fullName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">{student.admissionNumber}</p>
                      <span className="text-gray-300 text-[10px]">•</span>
                      <span className="text-[0.55rem] font-semibold text-gray-400 uppercase tracking-wider">{getClassLabel(student.classId)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Dropdown Expand Chevron */}
                  <button
                    onClick={() => toggleExpandStudent(student.id!)}
                    className="p-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-500 hover:text-slate-900 hover:bg-gray-100 transition-all flex items-center justify-center shadow-sm"
                    title={isExpanded ? "Collapse Details" : "Expand Details"}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Expandable Details Container */}
              {isExpanded && (
                <div className="mt-4 p-4 bg-gray-50/70 border border-gray-100/50 rounded-2xl space-y-3.5 text-xs animate-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[0.55rem] font-black text-gray-400 uppercase tracking-widest leading-none">Gender</p>
                      <p className="font-bold text-gray-800 italic mt-1.5 leading-none">{student.gender}</p>
                    </div>
                    <div>
                      <p className="text-[0.55rem] font-black text-gray-400 uppercase tracking-widest leading-none">Department</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[0.55rem] font-black uppercase tracking-wider border border-blue-200 rounded leading-none">
                        {student.departmentName || 'GENERAL'}
                      </span>
                    </div>
                    <div>
                      <p className="text-[0.55rem] font-black text-gray-400 uppercase tracking-widest leading-none">Register Status</p>
                      <div className="flex items-center gap-1.5 mt-1 leading-none">
                        <div className={`w-1.5 h-1.5 rounded-full ${student.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        <span className="font-semibold text-gray-800 uppercase tracking-wider text-[11px] leading-none">{student.status}</span>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[0.55rem] font-black text-gray-400 uppercase tracking-widest leading-none">Enrolled Date</p>
                      <p className="font-bold text-gray-800 italic mt-1.5 leading-none">{student.enrolledDate || 'Sep 2024'}</p>
                    </div>
                  </div>

                  {/* Actions pill triggers securely housed inside details panel */}
                  <div className="pt-2.5 border-t border-gray-150/60 flex flex-wrap gap-1.5">
                    <button
                      onClick={() => navigate(`/students/${student.id}`)}
                      className="flex items-center gap-1 px-2 py-1.5 bg-white hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 text-[9px] font-black uppercase tracking-wider transition-all"
                    >
                      <Eye size={11} />
                      Profile
                    </button>
                    {isAuthorizedToManage && (
                      <>
                        <button
                          onClick={() => onEdit(student)}
                          className="flex items-center gap-1 px-2 py-1.5 bg-white hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 text-[9px] font-black uppercase tracking-wider transition-all"
                        >
                          <Edit2 size={11} />
                          Edit
                        </button>
                        <button
                          onClick={() => {}}
                          className="flex items-center gap-1 px-2 py-1.5 bg-white hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 text-[9px] font-black uppercase tracking-wider transition-all"
                        >
                          <CreditCard size={11} />
                          Fees
                        </button>
                        <button
                          onClick={() => onDelete(student.id!)}
                          className="flex items-center gap-1 px-2 py-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-150 rounded-lg transition-all font-black text-[9px] uppercase tracking-wider ml-auto"
                        >
                          <Trash2 size={11} />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {sortedStudents.length === 0 && (
          <div className="p-8 text-center text-gray-400 text-xs italic uppercase tracking-wider">
            No students found in registry
          </div>
        )}
      </div>
      
      {/* Click away to close menu */}
      {activeMenuId && (
        <div className="fixed inset-0 z-0" onClick={() => setActiveMenuId(null)} />
      )}
    </div>
    </div>
  );
};

const ActionButton: React.FC<{ icon: any, label: string, color?: string, onClick: () => void }> = ({ icon: Icon, label, color = 'text-slate-700', onClick }) => (
  <button 
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${color}`}
  >
    <Icon size={16} />
    <span className="text-[0.625rem] font-black uppercase tracking-widest">{label}</span>
  </button>
);

