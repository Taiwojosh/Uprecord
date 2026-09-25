import React, { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { brandContrast } from '../../lib/brandContrast';
import { getSchoolInitials } from '../reportCard/templates/types';
import { GraduationCap, MapPin, Phone, Mail, User, Calendar, Clock, Award } from 'lucide-react';

export const LivePreview: React.FC = () => {
  const { settings, isLoading } = useSettings();
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setLogoError(false);
  }, [settings?.logoBase64]);

  if (isLoading || !settings) {
    return (
      <div className="h-full min-h-[300px] flex items-center justify-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Award className="w-8 h-8 animate-pulse text-blue-500" />
          <p className="text-xs font-bold uppercase tracking-widest">Loading Preview...</p>
        </div>
      </div>
    );
  }

  const {
    schoolName,
    schoolSlogan,
    address,
    logoBase64,
    brandColor,
    currentTerm,
    currentSession,
    caComponents,
    totalSubjectScore,
    reportCardTemplate = 'classic'
  } = settings;

  const termLabel = currentTerm === 1 ? 'First Term' : currentTerm === 2 ? 'Second Term' : 'Third Term';
  
  // Keep preview text and accents readable under arbitrary brand colors (e.g. gold, yellow, navy, crimson)
  const brandBackground = brandColor && brandColor.trim() ? brandColor.trim() : '#1f2937';
  let brandOnBackground: '#000000' | '#ffffff' = '#ffffff';
  try {
    brandOnBackground = brandContrast(brandBackground);
  } catch {
    brandOnBackground = '#ffffff';
  }
  const isLightBrand = brandOnBackground === '#000000';

  const badgeBg = isLightBrand ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.18)';
  const badgeBorder = isLightBrand ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.22)';
  const subtextColor = isLightBrand ? 'rgba(0, 0, 0, 0.72)' : 'rgba(255, 255, 255, 0.85)';
  const hasValidLogo = Boolean(logoBase64 && !logoError);
  const initials = getSchoolInitials(schoolName);

  return (
    <div className="w-full max-w-full flex flex-col bg-white rounded-3xl shadow-2xl shadow-blue-100/50 border border-gray-100 overflow-hidden sticky top-6">
      {/* Top Bar Indicator */}
      <div className="p-3.5 sm:p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0" />
          <p className="text-[0.625rem] font-bold text-gray-500 uppercase tracking-widest truncate">Live Report Preview</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[0.5625rem] font-black uppercase tracking-widest text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
            {reportCardTemplate}
          </span>
          <div className="hidden sm:flex items-center gap-1.5">
            <div className="w-2 h-2 bg-red-400 rounded-full" />
            <div className="w-2 h-2 bg-amber-400 rounded-full" />
            <div className="w-2 h-2 bg-emerald-400 rounded-full" />
          </div>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6 ${reportCardTemplate === 'minimal' ? 'p-3 sm:p-4 space-y-3 sm:space-y-4' : ''}`}>
        {/* Report Card Header Preview */}
        <div 
          className={`p-4 sm:p-5 space-y-3 relative overflow-hidden transition-colors shadow-xs ${
            reportCardTemplate === 'modern' ? 'rounded-[1.75rem]' : 
            reportCardTemplate === 'minimal' ? 'rounded-xl p-3 sm:p-4' : 'rounded-2xl'
          }`}
          style={{ backgroundColor: brandBackground, color: brandOnBackground }}
        >
          {/* Subtle Watermark pattern */}
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none select-none">
            <div className="absolute -top-10 -right-10 w-40 h-40 border-8 border-current rounded-full" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 border-4 border-current rounded-full" />
          </div>

          <div className={`flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3.5 sm:gap-4 relative z-10 min-w-0 ${reportCardTemplate === 'minimal' ? 'gap-3' : ''}`}>
            {/* Logo or Initials Fallback */}
            <div className={`${
              reportCardTemplate === 'modern' ? 'w-16 h-16 sm:w-20 sm:h-20 rounded-2xl' : 
              reportCardTemplate === 'minimal' ? 'w-14 h-14 rounded-lg' : 'w-16 h-16 rounded-xl'
            } bg-white flex items-center justify-center p-1.5 shadow-sm border border-black/5 shrink-0`}>
              {hasValidLogo ? (
                <img 
                  src={logoBase64} 
                  alt="School Logo" 
                  className="max-w-full max-h-full object-contain"
                  onError={() => setLogoError(true)}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="font-black text-slate-800 text-sm sm:text-base select-none">
                  {initials}
                </span>
              )}
            </div>

            <div className="space-y-0.5 min-w-0 flex-1">
              <h1 className={`${
                reportCardTemplate === 'modern' ? 'text-lg sm:text-xl' : 
                reportCardTemplate === 'minimal' ? 'text-base sm:text-lg' : 'text-base sm:text-lg'
              } font-black tracking-tight leading-tight uppercase break-words max-w-full`}>
                {schoolName || "Your School Name"}
              </h1>
              <p className="text-[0.625rem] sm:text-xs font-medium italic break-words max-w-full" style={{ color: subtextColor }}>
                {schoolSlogan || "Excellence and Integrity"}
              </p>
              {reportCardTemplate !== 'minimal' && address && (
                <div className="flex items-center justify-center sm:justify-start gap-1 pt-1 text-[0.5625rem] sm:text-[0.625rem] font-bold" style={{ color: subtextColor }}>
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="break-words max-w-full">{address}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="pt-3 border-t border-current/15 flex items-center justify-between relative z-10 gap-2">
            <div 
              className="px-2.5 py-0.5 rounded-full text-[0.5625rem] font-black uppercase tracking-wider"
              style={{ backgroundColor: badgeBg, color: brandOnBackground, border: `1px solid ${badgeBorder}` }}
            >
              Student Report Card
            </div>
            <div className="text-[0.5rem] font-bold opacity-60 italic shrink-0">
              GlobePen
            </div>
          </div>
        </div>

        {/* Student Info Mock */}
        <div className={`grid ${reportCardTemplate === 'minimal' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-3`}>
          <div className={`space-y-2 p-3 sm:p-4 bg-gray-50 rounded-2xl border border-gray-100 ${reportCardTemplate === 'minimal' ? 'p-2.5 rounded-xl' : ''}`}>
            <div className="flex items-center gap-1.5 text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">
              <User className="w-3 h-3" />
              Student Profile
            </div>
            <div className="space-y-1.5">
              <div className="h-2 w-3/4 bg-gray-200 rounded-full" />
              <div className="h-2 w-1/2 bg-gray-200 rounded-full" />
              {reportCardTemplate !== 'minimal' && <div className="h-2 w-2/3 bg-gray-200 rounded-full" />}
            </div>
          </div>
          <div className={`space-y-2 p-3 sm:p-4 bg-gray-50 rounded-2xl border border-gray-100 ${reportCardTemplate === 'minimal' ? 'p-2.5 rounded-xl' : ''}`}>
            <div className="flex items-center gap-1.5 text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">
              <Calendar className="w-3 h-3" />
              Academic Term
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-gray-800">{termLabel}</p>
              <p className="text-[0.625rem] font-bold text-blue-600">{currentSession || 'Current Session'}</p>
            </div>
          </div>
        </div>

        {/* Grades Table Mock */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
              <Award className="w-3 h-3 text-blue-600" />
              Academic Performance
            </div>
            <span>Total: {totalSubjectScore}</span>
          </div>
          
          <div className={`border border-gray-100 overflow-hidden shadow-xs ${
            reportCardTemplate === 'modern' ? 'rounded-2xl' : 
            reportCardTemplate === 'minimal' ? 'rounded-xl' : 'rounded-xl'
          }`}>
            <div 
              className={`grid grid-cols-4 p-2.5 text-[0.53rem] font-black uppercase tracking-wider ${
                reportCardTemplate === 'minimal' ? 'p-2 text-[0.5rem]' : ''
              }`}
              style={{ backgroundColor: brandBackground, color: brandOnBackground }}
            >
              <div className="truncate">Subject</div>
              <div className="text-center truncate">CA</div>
              <div className="text-center truncate">Exam</div>
              <div className="text-right truncate">Total</div>
            </div>
            <div className="divide-y divide-gray-100 bg-white">
              {['English Language', 'Mathematics', 'Basic Science'].map((sub, i) => (
                <div key={sub} className={`grid grid-cols-4 p-2.5 text-[0.5625rem] sm:text-[0.625rem] font-medium text-gray-600 items-center ${
                  reportCardTemplate === 'minimal' ? 'p-2' : ''
                }`}>
                  <div className="font-bold text-gray-900 truncate pr-1">{sub}</div>
                  <div className="text-center font-mono text-gray-400">{20 + i * 2}</div>
                  <div className="text-center font-mono text-gray-400">{50 + i * 5}</div>
                  <div className="text-right font-mono font-black text-blue-700">{70 + i * 7}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info Box */}
      <div className={`p-3.5 sm:p-5 bg-gray-50 border-t border-gray-100 ${reportCardTemplate === 'minimal' ? 'p-3' : ''}`}>
        <div className="flex items-center gap-3 p-2.5 sm:p-3 bg-white rounded-xl border border-gray-200/80 shadow-xs">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[0.5625rem] sm:text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest truncate">Next Term Resumption</p>
            <p className="text-xs font-bold text-gray-900 truncate">{settings.nextTermDate || "Not set"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
