import React from 'react';
import { useSettings } from '../../hooks/useSettings';
import { GraduationCap, MapPin, Phone, Mail, User, Calendar, Clock, Award } from 'lucide-react';

export const LivePreview: React.FC = () => {
  const { settings, isLoading } = useSettings();

  if (isLoading || !settings) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Award className="w-8 h-8 animate-pulse" />
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
    examMaxScore,
    totalSubjectScore,
    reportCardTemplate = 'classic'
  } = settings;

  const termLabel = currentTerm === 1 ? 'First Term' : currentTerm === 2 ? 'Second Term' : 'Third Term';

  return (
    <div className="h-full flex flex-col bg-white rounded-3xl shadow-2xl shadow-blue-100/50 border border-gray-100 overflow-hidden sticky top-10">
      <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">Live Report Card Preview</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[0.5625rem] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
            {reportCardTemplate} Template
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-red-400 rounded-full" />
            <div className="w-2 h-2 bg-amber-400 rounded-full" />
            <div className="w-2 h-2 bg-emerald-400 rounded-full" />
          </div>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto p-6 space-y-6 ${reportCardTemplate === 'minimal' ? 'p-4 space-y-4' : ''}`}>
        {/* Report Card Header */}
        <div 
          className={`p-6 text-white space-y-4 relative overflow-hidden ${
            reportCardTemplate === 'modern' ? 'rounded-[2rem] shadow-xl' : 
            reportCardTemplate === 'minimal' ? 'rounded-xl p-4' : 'rounded-2xl'
          }`}
          style={{ backgroundColor: brandColor }}
        >
          {/* Watermark pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute -top-10 -right-10 w-40 h-40 border-8 border-white rounded-full" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 border-4 border-white rounded-full" />
          </div>

          <div className={`flex items-center gap-6 relative z-10 ${reportCardTemplate === 'minimal' ? 'gap-4' : ''}`}>
            <div className={`${
              reportCardTemplate === 'modern' ? 'w-24 h-24 rounded-3xl' : 
              reportCardTemplate === 'minimal' ? 'w-16 h-16 rounded-lg' : 'w-20 h-20 rounded-2xl'
            } bg-white flex items-center justify-center p-2 shadow-lg shrink-0`}>
              {logoBase64 ? (
                <img 
                  src={logoBase64} 
                  alt="Logo" 
                  className="max-w-full max-h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <GraduationCap className={`${reportCardTemplate === 'minimal' ? 'w-8 h-8' : 'w-10 h-10'} text-gray-200`} />
              )}
            </div>
            <div className="space-y-1">
              <h1 className={`${
                reportCardTemplate === 'modern' ? 'text-2xl' : 
                reportCardTemplate === 'minimal' ? 'text-lg' : 'text-xl'
              } font-black tracking-tight leading-none uppercase`}>
                {schoolName || "Your School Name"}
              </h1>
              <p className="text-xs font-medium italic text-blue-100/80">
                {schoolSlogan || "Motto goes here..."}
              </p>
              {reportCardTemplate !== 'minimal' && (
                <div className="flex items-center gap-3 pt-2 text-[0.625rem] font-bold text-white/70">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {address || "School Address"}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="pt-4 border-t border-white/10 flex items-center justify-between relative z-10">
            <div className="px-3 py-1 bg-white/10 rounded-full text-[0.625rem] font-black uppercase tracking-widest">
              Student Report Card
            </div>
            <div className="text-[0.5rem] font-bold text-white/40 italic">
              UpRecord System
            </div>
          </div>
        </div>

        {/* Student Info Mock */}
        <div className={`grid ${reportCardTemplate === 'minimal' ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
          <div className={`space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 ${reportCardTemplate === 'minimal' ? 'p-3 rounded-xl' : ''}`}>
            <div className="flex items-center gap-2 text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">
              <User className="w-3 h-3" />
              Student Info
            </div>
            <div className="space-y-2">
              <div className="h-2 w-3/4 bg-gray-200 rounded-full" />
              <div className="h-2 w-1/2 bg-gray-200 rounded-full" />
              {reportCardTemplate !== 'minimal' && <div className="h-2 w-2/3 bg-gray-200 rounded-full" />}
            </div>
          </div>
          <div className={`space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 ${reportCardTemplate === 'minimal' ? 'p-3 rounded-xl' : ''}`}>
            <div className="flex items-center gap-2 text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">
              <Calendar className="w-3 h-3" />
              Session Info
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-700">{termLabel}</p>
              <p className="text-[0.625rem] font-bold text-blue-600">{currentSession}</p>
            </div>
          </div>
        </div>

        {/* Grades Table Mock */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">
              <Award className="w-3 h-3" />
              Academic Performance
            </div>
            <div className="text-[0.625rem] font-bold text-gray-400">Total: {totalSubjectScore}</div>
          </div>
          
          <div className={`border border-gray-100 overflow-hidden ${
            reportCardTemplate === 'modern' ? 'rounded-3xl shadow-sm' : 
            reportCardTemplate === 'minimal' ? 'rounded-xl' : 'rounded-2xl'
          }`}>
            <div 
              className={`grid grid-cols-4 p-3 text-[0.5625rem] font-black uppercase tracking-widest text-white ${
                reportCardTemplate === 'minimal' ? 'p-2' : ''
              }`}
              style={{ backgroundColor: brandColor }}
            >
              <div>Subject</div>
              {caComponents.map(ca => (
                <div key={ca.id} className="text-center">{ca.name ? ca.name.split(' ')[0] : 'CA'}</div>
              ))}
              <div className="text-center">Exam</div>
              <div className="text-right">Total</div>
            </div>
            <div className={`divide-y divide-gray-50 bg-white ${reportCardTemplate === 'modern' ? 'divide-gray-100' : ''}`}>
              {[1, 2, 3].map(i => (
                <div key={i} className={`grid grid-cols-4 p-3 text-[0.625rem] font-medium text-gray-600 ${
                  reportCardTemplate === 'minimal' ? 'p-2' : ''
                }`}>
                  <div className="font-bold text-gray-900">Subject {i}</div>
                  {caComponents.map(ca => (
                    <div key={ca.id} className="text-center text-gray-400">--</div>
                  ))}
                  <div className="text-center text-gray-400">--</div>
                  <div className="text-right font-black text-blue-600">--</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={`p-6 bg-gray-50 border-t border-gray-100 ${reportCardTemplate === 'minimal' ? 'p-4' : ''}`}>
        <div className={`flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 ${
          reportCardTemplate === 'modern' ? 'rounded-2xl shadow-sm' : ''
        }`}>
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">Next Term Resumption</p>
            <p className="text-xs font-bold text-gray-900">{settings.nextTermDate || "Not set"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
