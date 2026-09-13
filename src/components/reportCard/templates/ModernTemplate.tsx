import React from 'react';
import { getTermLabel, getGradeColor, formatDateDescriptive } from '../../../lib/calculationEngine';
import { ReportCardTemplateProps } from './types';

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
  isEditable,
  userRole,
  onUpdateRemark
}) => {
  const canEditTeacher = isEditable && userRole === 'teacher';
  const canEditPrincipal = isEditable && userRole === 'admin';

  return (
    <div 
      id={`report-card-${student.id}`}
      className="w-[210mm] min-h-[297mm] bg-white p-[10mm] mx-auto shadow-2xl print:shadow-none print:m-0 relative overflow-hidden text-[0.625rem] font-sans leading-relaxed"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Background Watermark Logo */}
      {isPremium && settings.logoBase64 && (
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
      <div className="flex items-start justify-between border-b-2 pb-8 mb-8 relative z-10" style={{ borderColor: brandStyle.backgroundColor }}>
        <div className="flex items-start gap-8">
          {isPremium && settings.logoBase64 ? (
            <div className="relative group">
              <div className="absolute -inset-2 bg-gray-100 rounded-3xl scale-95 group-hover:scale-100 transition-transform opacity-0 group-hover:opacity-100" />
              <img 
                src={settings.logoBase64} 
                alt="School Logo" 
                className="w-24 h-24 object-contain relative z-10 no-capture"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-white font-black text-4xl shadow-xl shadow-gray-200" style={brandStyle}>
              {settings.schoolName.charAt(0)}
            </div>
          )}
          <div className="pt-2">
            <h1 className="text-3xl font-[Outfit] font-black tracking-tight text-gray-900 leading-none mb-2 select-all">{settings.schoolName}</h1>
            <div className="flex items-center gap-3 mb-3">
              <span className="h-px w-8 bg-gray-200" />
              <p className="text-[0.6875rem] font-[Inter] font-bold text-gray-500 tracking-[0.15em] uppercase">{settings.schoolSlogan}</p>
            </div>
            <p className="text-[0.5625rem] font-mono text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full w-fit">{settings.address}</p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end pt-2">
          <div className="px-5 py-2.5 rounded-[1.5rem] text-[0.625rem] font-black uppercase tracking-[0.2em] mb-4 shadow-sm" style={brandStyle}>
            Official Report Card
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-black text-gray-900 font-[Outfit] tracking-tight">{settings.currentSession} Academic Session</p>
            <p className="text-[0.6875rem] font-black text-gray-400 uppercase tracking-widest">{getTermLabel(settings.currentTerm)}</p>
          </div>
        </div>
      </div>

      {/* Student Info Cards */}
      <div className="grid grid-cols-4 gap-4 mb-10 relative z-10">
        <div className="col-span-3 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16 opacity-50" />
          <h3 className="text-[0.5625rem] font-black uppercase tracking-[0.25em] text-gray-300 mb-6 relative z-10">Student Profile</h3>
          <div className="grid grid-cols-2 gap-y-6 gap-x-12 relative z-10">
            <ModernInfoRow label="Full Name" value={student.fullName} bold size="lg" />
            <ModernInfoRow label="Admission No" value={student.admissionNumber} mono />
            <ModernInfoRow label="Class Section" value={studentClass.className} />
            <ModernInfoRow label="Biological Age" value={`${age} years`} />
          </div>
        </div>
        
        <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white relative overflow-hidden flex flex-col justify-between shadow-xl shadow-slate-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12" />
          <h3 className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-white/40 mb-4">Performance</h3>
          <div className="space-y-4">
            <div>
              <p className="text-[0.5rem] font-bold text-white/50 uppercase mb-1">Overall Average</p>
              <p className="text-4xl font-[Outfit] font-black">{percentage}%</p>
            </div>
            {showCumulative && (
              <div className="pt-3 border-t border-white/10">
                <p className="text-[0.5rem] font-bold text-white/50 uppercase mb-1">Cumulative</p>
                <p className="text-lg font-black">{avgCumulativePercentage.toFixed(1)}%</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grades Table - Modern Style */}
      <div className="mb-10 relative z-10">
        <h3 className="text-[0.625rem] font-black uppercase tracking-[0.25em] text-gray-300 mb-4">Academic Record</h3>
        <div className="rounded-[2rem] border border-gray-100 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="p-4 text-left uppercase font-black text-[0.5625rem] text-gray-400 tracking-widest font-[Outfit]">Subject</th>
                {settings.caComponents.map(ca => (
                  <th key={ca.id} className="p-2 text-center text-[0.5rem] font-bold text-gray-400 font-[Inter] leading-tight">
                    {ca.name}<br/><span className="text-[0.4375rem] opacity-60">({ca.maxScore})</span>
                  </th>
                ))}
                <th className="p-2 text-center text-[0.5rem] font-black text-gray-400 font-[Outfit] leading-tight uppercase tracking-widest">Exam<br/><span className="text-[0.4375rem] opacity-60">({settings.examMaxScore})</span></th>
                <th className="p-2 text-center text-[0.5625rem] font-black text-gray-900 font-[Outfit] uppercase tracking-widest bg-gray-50/50">Total</th>
                <th className="p-2 text-center text-[0.5625rem] font-black text-gray-900 font-[Outfit] uppercase tracking-widest bg-gray-50/50">Grade</th>
                {showCumulative && (
                  <th className="p-2 text-center text-[0.5625rem] font-black text-blue-600 font-[Outfit] uppercase tracking-widest bg-blue-50/30">CUMM</th>
                )}
                <th className="p-4 text-left uppercase font-black text-[0.5625rem] text-gray-400 tracking-widest font-[Outfit]">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cumulativeRecords.map((row) => {
                const grade = gradesWithTotal.find(g => g.subjectId === row.subjectId);
                const displayTotal = grade?.total ?? (
                  settings.currentTerm === 1 ? row.term1Total : 
                  settings.currentTerm === 2 ? row.term2Total : 
                  row.term3Total
                );

                return (
                  <tr key={row.subjectId} className="hover:bg-gray-50/30 transition-colors">
                    <td className="p-4 font-black text-[0.6875rem] text-gray-900 font-[Outfit] tracking-tight">{row.subjectName}</td>
                    {settings.caComponents.map(ca => (
                      <td key={ca.id} className="p-2 text-center font-bold text-[0.625rem] text-gray-500 font-mono">
                        {grade?.caScores?.[ca.id] ?? '-'}
                      </td>
                    ))}
                    <td className="p-2 text-center font-bold text-[0.625rem] text-gray-500 font-mono">
                      {grade?.examScore ?? '-'}
                    </td>
                    <td className="p-2 text-center font-black text-[0.6875rem] text-gray-900 font-mono bg-gray-50/30">
                      {displayTotal ?? '-'}
                    </td>
                    <td className="p-2 text-center bg-gray-50/30">
                      <span className={`inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-lg text-[0.625rem] font-black ${
                        settings.enableGradeColors ? (
                          row.grade === 'A' ? 'bg-emerald-50 text-emerald-700' :
                          row.grade === 'B' ? 'bg-blue-50 text-blue-700' :
                          row.grade === 'C' ? 'bg-amber-50 text-amber-700' :
                          row.grade === 'D' ? 'bg-orange-50 text-orange-700' :
                          row.grade === 'E' ? 'bg-red-50 text-red-700' :
                          'bg-rose-50 text-rose-700'
                        ) : 'bg-gray-100 text-gray-600'
                      }`}>
                        {row.grade}
                      </span>
                    </td>
                    {showCumulative && (
                      <td className="p-2 text-center font-black text-[0.6875rem] text-blue-600 font-mono bg-blue-50/30">
                        {row.cumulativeAverage.toFixed(1)}
                      </td>
                    )}
                    <td className="p-4 text-[0.5625rem] font-bold text-gray-400 italic tracking-tight">{row.remark}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Traits & Attendance */}
      <div className="grid grid-cols-3 gap-6 mb-8 relative z-10">
        <div className="col-span-2 grid grid-cols-2 gap-4">
          <ModernTraitTable title="Affective Traits" traits={behavioralTraits} scores={traitScores} enableGradeColors={settings.enableGradeColors} />
          <ModernTraitTable title="Psychomotor Skills" traits={psychomotorTraits} scores={traitScores} enableGradeColors={settings.enableGradeColors} />
        </div>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <h3 className="text-[0.5625rem] font-black uppercase tracking-widest text-gray-400 mb-3">Attendance</h3>
            <div className="space-y-2">
              <ModernInfoRow label="Days Opened" value={totalDays} />
              <ModernInfoRow label="Days Present" value={daysPresent} />
              <ModernInfoRow label="Days Absent" value={daysAbsent} />
            </div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <h3 className="text-[0.5625rem] font-black uppercase tracking-widest text-gray-400 mb-2">Grading Key</h3>
            <div className="space-y-1">
              {settings.gradingScale.sort((a, b) => b.minScore - a.minScore).map(g => (
                <div key={g.grade} className="flex justify-between text-[0.5rem]">
                  <span className="font-bold text-gray-500">{g.minScore} - 100</span>
                  <span className="font-black text-gray-900">{g.grade} - {g.remark}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Remarks & Signatures */}
      <div className="grid grid-cols-2 gap-8 relative z-10">
        <div className="space-y-6">
          <div>
            <h3 className="text-[0.5625rem] font-black uppercase tracking-widest text-gray-400 mb-2">Class Teacher's Remark</h3>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 min-h-[60px]">
              {canEditTeacher ? (
                <textarea
                  value={localTeacherRemark}
                  onChange={(e) => setLocalTeacherRemark(e.target.value)}
                  onBlur={() => onUpdateRemark?.('teacher', localTeacherRemark)}
                  className="w-full bg-transparent border-none focus:ring-0 resize-none p-0 font-medium italic text-[0.625rem] text-gray-900 leading-relaxed"
                  rows={2}
                />
              ) : (
                <p className="text-[0.625rem] font-medium italic text-gray-900 leading-relaxed">{teacherRemark}</p>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-[0.5625rem] font-black uppercase tracking-widest text-gray-400 mb-2">Principal's Remark</h3>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 min-h-[60px]">
              {canEditPrincipal ? (
                <textarea
                  value={localPrincipalRemark}
                  onChange={(e) => setLocalPrincipalRemark(e.target.value)}
                  onBlur={() => onUpdateRemark?.('principal', localPrincipalRemark)}
                  className="w-full bg-transparent border-none focus:ring-0 resize-none p-0 font-medium italic text-[0.625rem] text-gray-900 leading-relaxed"
                  rows={2}
                />
              ) : (
                <p className="text-[0.625rem] font-medium italic text-gray-900 leading-relaxed">{principalRemark}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-end items-end pb-4">
          <div className="text-center">
            {isPremium && settings.principalSignatureBase64 ? (
              <img 
                src={settings.principalSignatureBase64} 
                alt="Principal Signature" 
                className="h-12 max-w-[150px] object-contain mx-auto mb-2 no-capture"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-12 w-40 border-b-2 border-gray-300 mb-2" />
            )}
            <p className="text-[0.625rem] font-black uppercase tracking-widest text-gray-900">{settings.principalName}</p>
            <p className="text-[0.5rem] font-bold text-gray-500 uppercase">Principal</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-center text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest border-t border-gray-100 bg-white">
        <div>Next Term Begins: <span className="text-gray-900">{formatDateDescriptive(settings.nextTermDate)}</span></div>
        <div>Generated by UpRecord</div>
      </div>
    </div>
  );
};

const ModernInfoRow: React.FC<{ label: string, value: string | number, bold?: boolean, size?: 'sm' | 'md' | 'lg', mono?: boolean }> = ({ label, value, bold, size = 'md', mono }) => (
  <div className="flex flex-col">
    <span className="text-[0.5rem] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">{label}</span>
    <span className={`text-gray-900 truncate leading-tight ${
      bold ? 'font-black' : 'font-medium'
    } ${
      size === 'lg' ? 'text-[0.8125rem] font-[Outfit]' : 'text-[0.6875rem]'
    } ${
      mono ? 'font-mono' : ''
    }`}>{value}</span>
  </div>
);

const ModernTraitTable: React.FC<{ title: string, traits: any[], scores: Record<number, number>, enableGradeColors?: boolean }> = ({ title, traits, scores, enableGradeColors }) => (
  <div>
    <h3 className="text-[0.5625rem] font-black uppercase tracking-widest text-gray-400 mb-2">{title}</h3>
    <div className="space-y-1">
      {traits.map(trait => (
        <div key={trait.id} className="flex justify-between items-center text-[0.5625rem] border-b border-gray-50 pb-1">
          <span className="font-medium text-gray-700">{trait.traitName}</span>
          <span className={`font-black ${
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
