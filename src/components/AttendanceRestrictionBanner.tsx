import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Calendar } from 'lucide-react';
import { useAttendanceRestriction } from '../hooks/useAttendanceRestriction';

interface AttendanceRestrictionBannerProps {
  actionName?: string;
}

export const AttendanceRestrictionBanner: React.FC<AttendanceRestrictionBannerProps> = ({ 
  actionName = "perform secondary actions (such as grading, commenting, or writing lesson notes)" 
}) => {
  const navigate = useNavigate();
  const { isRestricted, missingClasses, isLoading } = useAttendanceRestriction();

  if (isLoading || !isRestricted) return null;

  return (
    <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-[2rem] p-6 md:p-8 shadow-sm flex flex-col md:flex-row gap-6 md:items-center justify-between transition-all" id="attendance-restriction-banner">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-red-100/80 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
          <AlertTriangle className="w-6 h-6 animate-pulse" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-black text-rose-950 uppercase tracking-tight">
            Attendance Submission Required
          </h3>
          <p className="text-xs font-bold text-rose-800 leading-relaxed max-w-2xl">
            Your school administrator requires all teachers to have their daily attendance up to date before they can {actionName}.
          </p>
          
          {missingClasses.length > 0 && (
            <div className="pt-2">
              <p className="text-[10px] font-extrabold text-rose-900/80 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Missing Attendance Days:
              </p>
              <div className="flex flex-wrap gap-2">
                {missingClasses.map((item, idx) => (
                  <span 
                    key={idx} 
                    className="px-2.5 py-1 bg-red-100 border border-red-200/50 text-red-900 text-[10px] font-black tracking-tight rounded-lg uppercase"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => navigate('/attendance')}
        className="px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all shadow-md active:scale-[0.98] select-none cursor-pointer flex items-center justify-center gap-2 shrink-0 self-start md:self-center"
      >
        Go to Attendance
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
