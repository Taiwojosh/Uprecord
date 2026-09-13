import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../db/db';
import { useNavigate, useLocation } from 'react-router-dom';
import { getMissingAttendanceList, type IMissingAttendanceItem } from '../lib/attendance';
import { AlertCircle, CalendarDays, ArrowRight } from 'lucide-react';

export const AttendanceGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [missingItems, setMissingItems] = useState<IMissingAttendanceItem[]>([]);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (user?.role !== 'teacher') {
        setIsChecking(false);
        return;
      }

      const userId = user?.id && !isNaN(Number(user.id)) ? Number(user.id) : -1;
      const classes = await db.classes.filter(c => c.teacherId === userId || c.teacherName === user?.fullName).toArray();
      const classIds = classes.map(c => c.id!);

      const missingList = await getMissingAttendanceList(userId, classIds);
      setMissingItems(missingList);
      setIsChecking(false);
    };
    check();
  }, [user, location.pathname]);

  if (isChecking) return null; // Or a loading spinner

  if (missingItems.length > 0 && location.pathname !== '/attendance') {
    const firstItem = missingItems[0];
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="w-full max-w-lg bg-white p-10 rounded-[2.5rem] shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-[1.5rem] flex items-center justify-center mx-auto relative animate-pulse">
            <AlertCircle size={32} />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-xl font-black text-slate-900 uppercase italic">Attendance Pending</h1>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed max-w-sm mx-auto">
              You have {missingItems.length} missing daily attendance record{missingItems.length > 1 ? 's' : ''} for your managed classes. Please complete pending records to continue.
            </p>
          </div>

          <div className="border border-slate-100 rounded-2xl bg-slate-50/50 p-4 space-y-2.5 text-left max-h-[220px] overflow-y-auto">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">
              Select a date registry to mark:
            </span>
            {missingItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => navigate(`/attendance?classId=${item.classId}&date=${item.date}`)}
                className="w-full bg-white hover:bg-amber-50 border border-slate-100 hover:border-amber-200 p-3 rounded-xl flex items-center justify-between transition-all group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-101/40 text-amber-600 rounded-lg flex items-center justify-center">
                    <CalendarDays size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-left">
                      {item.className}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {item.formattedDate}
                    </span>
                  </div>
                </div>
                <div className="w-6 h-6 bg-slate-100 group-hover:bg-amber-100 rounded-full flex items-center justify-center text-slate-400 group-hover:text-amber-600 transition-all">
                  <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            ))}
          </div>

          <button 
            onClick={() => navigate(`/attendance?classId=${firstItem.classId}&date=${firstItem.date}`)}
            className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-amber-100 flex items-center justify-center gap-2"
          >
            Mark Most Recent ({firstItem.className})
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

