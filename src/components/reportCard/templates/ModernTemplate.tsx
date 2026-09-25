import React, { useState } from 'react';
import { getTermLabel, getGradeColor, formatDateDescriptive } from '../../../lib/calculationEngine';
import { ReportCardTemplateProps, getSchoolInitials, getBrandContrastDetails } from './types';

export const ModernTemplate: React.FC<ReportCardTemplateProps> = ({
  student,
  studentClass,
  settings,
  gradesWithTotal,
  cumulativeRecords,
  classSize,
  isPremium,
  age,
  totalDays,
  daysPresent,
  daysAbsent,
  totalObtainable,
  studentTotalScore,
  percentage,
  avgCumulativePercentage,
  showCumulative,
  teacherRemark,
  principalRemark,
  localTeacherRemark,
  setLocalTeacherRemark,
  localPrincipalRemark,
  setLocalPrincipalRemark,
  behavioralTraits,
  psychomotorTraits,
  traitScores,
  brandStyle,
  contrastDetails: propContrastDetails,
  isEditable,
  userRole,
  onUpdateRemark
}) => {
  const canEditTeacher = isEditable && userRole === 'teacher';
  const canEditPrincipal = isEditable && userRole === 'admin';
  const [logoError, setLogoError] = useState(false);
  const [sigError, setSigError] = useState(false);

  const contrast = propContrastDetails || getBrandContrastDetails(brandStyle?.backgroundColor);
  const hasValidLogo = isPremium && settings.logoBase64 && !logoError;
  const schoolInitials = getSchoolInitials(settings.schoolName);

  return (
    <div 
      id={`report-card-${student.id}`}
      className="report-card-sheet w-[210mm] max-w-full min-h-[297mm] bg-white p-[8mm] sm:p-[10mm] print:p-0 print:w-full print:max-w-none print:min-h-0 print:h-auto mx-auto shadow-2xl print:shadow-none print:m-0 relative overflow-hidden text-[0.625rem] font-sans leading-relaxed"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Background Watermark Logo */}
      {hasValidLogo && (
        <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden select-none opacity-[0.02]">
          <img 
            src={settings.logoBase64} 
            alt="" 
            className="w-[120%] h-[120%] object-contain grayscale no-capture"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {/* Modern Header */}
      <div 
        className="avoid-break flex items-start justify-between border-b-2 pb-6 mb-6 relative z-10 gap-6"
        style={{ borderColor: contrast.backgroundColor }}
      >
        <div className="flex items-start gap-6 min-w-0">
          {hasValidLogo ? (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white p-1.5 shadow-sm border border-gray-100 shrink-0 flex items-center justify-center">
              <img 
                src={settings.logoBase64} 
                alt="School Logo" 
                className="max-w-full max-h-full object-contain relative z-10 no-capture"
                onError={() => setLogoError(true)}
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div 
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center font-black text-xl sm:text-2xl shadow-sm border px-1 shrink-0 transition-all"
              style={{
                backgroundColor: contrast.badgeBackground,
                color: contrast.textColor,
                borderColor: contrast.badgeBorder
              }}
            >
              {schoolInitials}
            </div>
          )}
          <div className="pt-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-[Outfit] font-black tracking-tight text-gray-900 leading-tight mb-2 break-words max-w-md select-all">
              {settings.schoolName || 'School Name'}
            </h1>
            {settings.schoolSlogan && (
              <div className="flex items-center gap-3 mb-2">
                <span className="h-px w-6 bg-gray-300 shrink-0" />
                <p className="text-[0.625rem] font-[Inter] font-bold text-gray-500 tracking-[0.12em] uppercase break-words max-w-sm">
                  {settings.schoolSlogan}
                </p>
              </div>
            )}
            {settings.address && (
              <p className="text-[0.5625rem] font-mono text-gray-500 uppercase tracking-wider bg-gray-50 px-3 py-1 rounded-full w-fit break-words border border-gray-100 max-w-sm">
                {settings.address}
              </p>
            )}
          </div>
        </div>
        <div className="text-right flex flex-col items-end pt-1 shrink-0">
          <div 
            className="px-4 py-2 rounded-2xl text-[0.625rem] font-black uppercase tracking-[0.18em] mb-3 shadow-xs"
            style={{ 
              backgroundColor: contrast.backgroundColor, 
              color: contrast.textColor,
              border: `1px solid ${contrast.borderSubtle}`
            }}
          >
            Official Report Card
          </div>
          <div className="space-y-0.5">
            <p className="text-xs sm:text-sm font-black text-gray-900 font-[Outfit] tracking-tight">{settings.currentSession} Session</p>
            <p className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">{getTermLabel(settings.currentTerm)}</p>
          </div>
        </div>
      </div>

      {/* Student Info Cards */}
      <div className="avoid-break grid grid-cols-4 gap-4 mb-6 relative z-10">
        <div className="col-span-3 bg-white p-5 rounded-[2rem] border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16 opacity-50" />
          <h3 className="text-[0.5625rem] font-black uppercase tracking-[0.25em] text-gray-400 mb-4 relative z-10">Student Profile</h3>
          <div className="grid grid-cols-2 gap-y-4 gap-x-8 relative z-10">
            <ModernInfoRow label="Full Name" value={student.fullName} bold size="lg" allowWrap />
            <ModernInfoRow label="Admission No" value={student.admissionNumber} mono />
            <ModernInfoRow label="Class Section" value={studentClass.className} />
            <ModernInfoRow label="Biological Age" value={`${age} years`} />
          </div>
        </div>
        
        <div className="bg-slate-900 rounded-[2rem] p-5 text-white relative overflow-hidden flex flex-col justify-between shadow-lg shadow-slate-100">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12" />
          <h3 className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-white/50 mb-2">Performance</h3>
          <div className="space-y-3">
            <div>
              <p className="text-[0.5rem] font-bold text-white/60 uppercase mb-0.5">Overall Average</p>
              <p className="text-3xl font-[Outfit] font-black text-white">{percentage}%</p>
            </div>
            {showCumulative && (
              <div className="pt-2 border-t border-white/10">
                <p className="text-[0.5rem] font-bold text-white/60 uppercase mb-0.5">Cumulative</p>
                <p className="text-base font-black text-blue-300">{avgCumulativePercentage.toFixed(1)}%</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grades Table - Modern Style */}
      <div className="avoid-break mb-6 relative z-10">
        <h3 className="text-[0.625rem] font-black uppercase tracking-[0.25em] text-gray-400 mb-2.5">Academic Record</h3>
        <div className="rounded-[1.5rem] border border-gray-100 overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.02)] bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                <th className="p-3 text-left uppercase font-black text-[0.5625rem] text-gray-500 tracking-wider font-[Outfit]">Subject</th>
                {settings.caComponents.map(ca => (
                  <th key={ca.id} className="p-1.5 text-center text-[0.5rem] font-bold text-gray-500 font-[Inter] leading-tight">
                    {ca.name}<br/><span className="text-[0.4375rem] opacity-60">({ca.maxScore})</span>
                  </th>
                ))}
                <th className="p-1.5 text-center text-[0.5rem] font-black text-gray-500 font-[Outfit] leading-tight uppercase tracking-wider">Exam<br/><span className="text-[0.4375rem] opacity-60">({settings.examMaxScore})</span></th>
                <th className="p-1.5 text-center text-[0.5625rem] font-black text-gray-900 font-[Outfit] uppercase tracking-wider bg-gray-50/50">Total</th>
                <th className="p-1.5 text-center text-[0.5625rem] font-black text-gray-900 font-[Outfit] uppercase tracking-wider bg-gray-50/50">Grade</th>
                {showCumulative && (
                  <th className="p-1.5 text-center text-[0.5625rem] font-black text-blue-700 font-[Outfit] uppercase tracking-wider bg-blue-50/30">CUMM</th>
                )}
                <th className="p-3 text-left uppercase font-black text-[0.5625rem] text-gray-500 tracking-wider font-[Outfit]">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cumulativeRecords.map((row) => {
                const grade = gradesWithTotal.find(g => g.subjectId === row.subjectId);
                const displayTotal = grade?.total ?? (
                  settings.currentTerm === 1 ? row.term1Total : 
                  settings.currentTerm === 2 ? row.term2Total : 
                  row.term3Total
                );

                return (
                  <tr key={row.subjectId} className="avoid-break hover:bg-gray-50/30 transition-colors">
                    <td className="p-3 font-black text-[0.6875rem] text-gray-900 font-[Outfit] tracking-tight break-words max-w-[140px] leading-snug">
                      {row.subjectName}
                    </td>
                    {settings.caComponents.map(ca => (
                      <td key={ca.id} className="p-1.5 text-center font-bold text-[0.625rem] text-gray-500 font-mono">
                        {grade?.caScores?.[ca.id] ?? '-'}
                      </td>
                    ))}
                    <td className="p-1.5 text-center font-bold text-[0.625rem] text-gray-500 font-mono">
                      {grade?.examScore ?? '-'}
                    </td>
                    <td className="p-1.5 text-center font-black text-[0.6875rem] text-gray-900 font-mono bg-gray-50/20">
                      {displayTotal ?? '-'}
                    </td>
                    <td className="p-1.5 text-center bg-gray-50/20">
                      <span className={`inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded-md text-[0.625rem] font-black ${
                        settings.enableGradeColors ? (
                          row.grade === 'A' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          row.grade === 'B' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          row.grade === 'C' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          row.grade === 'D' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                          row.grade === 'E' ? 'bg-red-50 text-red-700 border border-red-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        ) : 'bg-gray-100 text-gray-700'
                      }`}>
                        {row.grade}
                      </span>
                    </td>
                    {showCumulative && (
                      <td className="p-1.5 text-center font-black text-[0.6875rem] text-blue-700 font-mono bg-blue-50/20">
                        {row.cumulativeAverage.toFixed(1)}
                      </td>
                    )}
                    <td className="p-3 text-[0.5625rem] font-bold text-gray-500 italic tracking-tight break-words max-w-[110px] leading-snug">
                      {row.remark}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Traits & Attendance */}
      <div className="avoid-break grid grid-cols-3 gap-5 mb-6 relative z-10">
        <div className="col-span-2 grid grid-cols-2 gap-4">
          <ModernTraitTable title="Affective Traits" traits={behavioralTraits} scores={traitScores} enableGradeColors={settings.enableGradeColors} />
          <ModernTraitTable title="Psychomotor Skills" traits={psychomotorTraits} scores={traitScores} enableGradeColors={settings.enableGradeColors} />
        </div>
        <div className="space-y-3.5">
          <div className="bg-gray-50/80 rounded-2xl p-3.5 border border-gray-100 shadow-xs">
            <h3 className="text-[0.5625rem] font-black uppercase tracking-widest text-gray-400 mb-2">Attendance</h3>
            <div className="space-y-1.5">
              <ModernInfoRow label="Days Opened" value={totalDays} />
              <ModernInfoRow label="Days Present" value={daysPresent} />
              <ModernInfoRow label="Days Absent" value={daysAbsent} />
            </div>
          </div>
          <div className="bg-gray-50/80 rounded-2xl p-3.5 border border-gray-100 shadow-xs">
            <h3 className="text-[0.5625rem] font-black uppercase tracking-widest text-gray-400 mb-1.5">Grading Key</h3>
            <div className="space-y-0.5">
              {settings.gradingScale.sort((a, b) => b.minScore - a.minScore).map(g => (
                <div key={g.grade} className="flex justify-between text-[0.5rem]">
                  <span className="font-bold text-gray-500">{g.minScore} - 100</span>
                  <span className="font-black text-gray-900">{g.grade} ({g.remark})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Remarks & Signatures */}
      <div className="avoid-break grid grid-cols-2 gap-6 relative z-10 pt-2 border-t border-gray-100">
        <div className="space-y-4">
          <div>
            <h3 className="text-[0.5625rem] font-black uppercase tracking-widest text-gray-400 mb-1">Class Teacher's Remark</h3>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 min-h-[48px]">
              {canEditTeacher ? (
                <textarea
                  value={localTeacherRemark}
                  onChange={(e) => setLocalTeacherRemark(e.target.value)}
                  onBlur={() => onUpdateRemark?.('teacher', localTeacherRemark)}
                  className="w-full bg-transparent border-none focus:ring-0 resize-none p-0 font-medium italic text-[0.625rem] text-gray-900 leading-relaxed"
                  rows={2}
                />
              ) : (
                <p className="text-[0.625rem] font-medium italic text-gray-900 leading-relaxed break-words">{teacherRemark}</p>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-[0.5625rem] font-black uppercase tracking-widest text-gray-400 mb-1">Principal's Remark</h3>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 min-h-[48px]">
              {canEditPrincipal ? (
                <textarea
                  value={localPrincipalRemark}
                  onChange={(e) => setLocalPrincipalRemark(e.target.value)}
                  onBlur={() => onUpdateRemark?.('principal', localPrincipalRemark)}
                  className="w-full bg-transparent border-none focus:ring-0 resize-none p-0 font-medium italic text-[0.625rem] text-gray-900 leading-relaxed"
                  rows={2}
                />
              ) : (
                <p className="text-[0.625rem] font-medium italic text-gray-900 leading-relaxed break-words">{principalRemark}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-end items-end pb-2">
          <div className="text-center">
            {isPremium && settings.principalSignatureBase64 && !sigError ? (
              <img 
                src={settings.principalSignatureBase64} 
                alt="Principal Signature" 
                className="h-10 max-w-[140px] object-contain mx-auto mb-1.5 no-capture"
                onError={() => setSigError(true)}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-10 w-36 border-b-2 border-gray-300 mb-1.5" />
            )}
            <p className="text-[0.625rem] font-black uppercase tracking-widest text-gray-900">{settings.principalName || 'Principal'}</p>
            <p className="text-[0.5rem] font-bold text-gray-400 uppercase">Principal</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="avoid-break mt-6 pt-3 flex justify-between items-center text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest border-t border-gray-100">
        <div>Next Term Begins: <span className="text-gray-900">{formatDateDescriptive(settings.nextTermDate)}</span></div>
        <div className="select-none">Generated by UpRecord</div>
      </div>
    </div>
  );
};

const ModernInfoRow: React.FC<{ 
  label: string; 
  value: string | number; 
  bold?: boolean; 
  size?: 'sm' | 'md' | 'lg'; 
  mono?: boolean;
  allowWrap?: boolean;
}> = ({ label, value, bold, size = 'md', mono, allowWrap }) => (
  <div className="flex flex-col">
    <span className="text-[0.5rem] font-black text-gray-400 uppercase tracking-[0.18em] mb-0.5">{label}</span>
    <span className={`text-gray-900 leading-snug ${
      bold ? 'font-black' : 'font-medium'
    } ${
      size === 'lg' ? 'text-[0.8125rem] font-[Outfit]' : 'text-[0.6875rem]'
    } ${
      mono ? 'font-mono' : ''
    } ${
      allowWrap ? 'break-words' : 'truncate'
    }`}>{value}</span>
  </div>
);

const ModernTraitTable: React.FC<{ title: string; traits: any[]; scores: Record<number, number>; enableGradeColors?: boolean }> = ({ title, traits, scores, enableGradeColors }) => (
  <div>
    <h3 className="text-[0.5625rem] font-black uppercase tracking-widest text-gray-400 mb-2">{title}</h3>
    <div className="space-y-1">
      {traits.map(trait => (
        <div key={trait.id} className="flex justify-between items-center text-[0.5625rem] border-b border-gray-50 pb-1">
          <span className="font-medium text-gray-700 break-words pr-2">{trait.traitName}</span>
          <span className={`font-mono font-black shrink-0 ${
            enableGradeColors ? (
              scores[trait.id!] === 5 ? 'text-emerald-600' :
              scores[trait.id!] === 4 ? 'text-blue-600' :
              scores[trait.id!] === 3 ? 'text-amber-600' :
              scores[trait.id!] === 2 ? 'text-orange-500' :
              'text-red-600'
            ) : 'text-gray-900'
          }`}>{scores[trait.id!] || '-'}</span>
        </div>
      ))}
    </div>
  </div>
);
