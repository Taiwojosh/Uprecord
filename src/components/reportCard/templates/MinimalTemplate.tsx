import React, { useState } from 'react';
import { getTermLabel, getGradeColor, formatDateDescriptive } from '../../../lib/calculationEngine';
import { ReportCardTemplateProps, getSchoolInitials, getBrandContrastDetails } from './types';

export const MinimalTemplate: React.FC<ReportCardTemplateProps> = ({
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
      className="report-card-sheet w-[210mm] max-w-full min-h-[297mm] bg-white p-[8mm] sm:p-[10mm] print:p-0 print:w-full print:max-w-none print:min-h-0 print:h-auto mx-auto shadow-2xl print:shadow-none print:m-0 relative overflow-hidden text-[0.5625rem] font-sans leading-tight"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Minimal Header */}
      <div 
        className="avoid-break flex justify-between items-start border-b-4 pb-4 mb-6 gap-6" 
        style={{ borderColor: contrast.backgroundColor }}
      >
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-950 uppercase break-words max-w-lg leading-tight">
            {settings.schoolName || 'School Name'}
          </h1>
          {settings.address && (
            <p className="text-[0.625rem] font-bold text-gray-500 uppercase tracking-widest mt-1 break-words max-w-md">
              {settings.address}
            </p>
          )}
        </div>
        {hasValidLogo ? (
          <div className="w-16 h-16 shrink-0 flex items-center justify-center p-1 bg-white border border-gray-200 rounded-xl shadow-xs">
            <img 
              src={settings.logoBase64} 
              alt="School Logo" 
              className="max-w-full max-h-full object-contain grayscale no-capture"
              onError={() => setLogoError(true)}
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-xl border-2 border-gray-300 flex items-center justify-center text-slate-800 font-black text-sm shrink-0 bg-gray-50">
            {schoolInitials}
          </div>
        )}
      </div>

      {/* Info Grid */}
      <div className="avoid-break grid grid-cols-4 gap-x-6 gap-y-3.5 mb-6">
        <div className="col-span-2">
          <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Student Name</div>
          <div className="text-base sm:text-lg font-black text-gray-950 uppercase tracking-tight break-words leading-tight">
            {student.fullName}
          </div>
        </div>
        <div>
          <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Admission No</div>
          <div className="text-xs sm:text-sm font-mono font-bold text-gray-900">{student.admissionNumber}</div>
        </div>
        <div>
          <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Class</div>
          <div className="text-xs sm:text-sm font-bold text-gray-900">{studentClass.className}</div>
        </div>
        
        <div>
          <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Term</div>
          <div className="text-xs font-bold text-gray-800">{getTermLabel(settings.currentTerm)}</div>
        </div>
        <div>
          <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Session</div>
          <div className="text-xs font-bold text-gray-800">{settings.currentSession}</div>
        </div>
        <div>
          <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Age</div>
          <div className="text-xs font-bold text-gray-800">{age} yrs</div>
        </div>
        <div>
          <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Class Size</div>
          <div className="text-xs font-bold text-gray-800">{classSize}</div>
        </div>
      </div>

      {/* Performance Summary Bar */}
      <div className="avoid-break flex justify-between items-center bg-slate-900 text-white p-3.5 rounded-xl mb-6 shadow-sm">
        <div className="text-center flex-1">
          <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total Score</div>
          <div className="text-base sm:text-lg font-black">{studentTotalScore.toFixed(1)} <span className="text-xs text-gray-400">/ {totalObtainable}</span></div>
        </div>
        <div className="w-px h-7 bg-gray-700"></div>
        <div className="text-center flex-1">
          <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Term Average</div>
          <div className="text-base sm:text-lg font-black">{percentage}%</div>
        </div>
        {showCumulative && (
          <>
            <div className="w-px h-7 bg-gray-700"></div>
            <div className="text-center flex-1">
              <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Cumulative</div>
              <div className="text-base sm:text-lg font-black text-blue-300">{avgCumulativePercentage.toFixed(2)}%</div>
            </div>
          </>
        )}
        <div className="w-px h-7 bg-gray-700"></div>
        <div className="text-center flex-1">
          <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Attendance</div>
          <div className="text-base sm:text-lg font-black">{daysPresent} <span className="text-xs text-gray-400">/ {totalDays}</span></div>
        </div>
      </div>

      {/* Grades Table */}
      <div className="avoid-break mb-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-900">
              <th className="py-2 font-black text-[0.5625rem] uppercase tracking-wider text-gray-900">Subject</th>
              {settings.caComponents.map(ca => (
                <th key={ca.id} className="py-2 text-center font-bold text-[0.5rem] text-gray-600 uppercase">{ca.name}</th>
              ))}
              <th className="py-2 text-center font-bold text-[0.5rem] text-gray-600 uppercase">Exam</th>
              <th className="py-2 text-center font-black text-[0.5625rem] uppercase text-gray-950">Total</th>
              <th className="py-2 text-center font-black text-[0.5625rem] uppercase text-gray-950">Grade</th>
              {showCumulative && (
                <>
                  <th className="py-2 text-center font-bold text-[0.5rem] text-gray-600 uppercase">1st</th>
                  <th className="py-2 text-center font-bold text-[0.5rem] text-gray-600 uppercase">2nd</th>
                  <th className="py-2 text-center font-black text-[0.5625rem] uppercase text-blue-700">Cumm</th>
                </>
              )}
              <th className="py-2 text-right font-bold text-[0.5rem] text-gray-600 uppercase">Remark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {cumulativeRecords.map((row) => {
              const grade = gradesWithTotal.find(g => g.subjectId === row.subjectId);
              const displayTotal = grade?.total ?? (
                settings.currentTerm === 1 ? row.term1Total : 
                settings.currentTerm === 2 ? row.term2Total : 
                row.term3Total
              );

              return (
                <tr key={row.subjectId} className="avoid-break">
                  <td className="py-2 font-bold text-[0.625rem] uppercase text-gray-950 break-words max-w-[140px] leading-tight">
                    {row.subjectName}
                  </td>
                  {settings.caComponents.map(ca => (
                    <td key={ca.id} className="py-2 text-center font-mono font-medium text-gray-700">
                      {grade?.caScores?.[ca.id] ?? '-'}
                    </td>
                  ))}
                  <td className="py-2 text-center font-mono font-medium text-gray-700">
                    {grade?.examScore ?? '-'}
                  </td>
                  <td className="py-2 text-center font-mono font-black text-gray-950">
                    {displayTotal ?? '-'}
                  </td>
                  <td className={`py-2 text-center font-black ${
                    settings.enableGradeColors ? getGradeColor(row.grade) : 'text-gray-900'
                  }`}>
                    {row.grade}
                  </td>
                  {showCumulative && (
                    <>
                      <td className="py-2 text-center font-mono font-medium text-gray-500">{row.term1Total ?? '-'}</td>
                      <td className="py-2 text-center font-mono font-medium text-gray-500">{row.term2Total ?? '-'}</td>
                      <td className="py-2 text-center font-mono font-black text-blue-700">{row.cumulativeAverage.toFixed(1)}</td>
                    </>
                  )}
                  <td className="py-2 text-right text-[0.5rem] font-medium text-gray-600 italic uppercase break-words max-w-[110px] leading-tight">
                    {row.remark}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Traits & Remarks */}
      <div className="avoid-break grid grid-cols-12 gap-6 pt-2 border-t border-gray-100">
        <div className="col-span-5 grid grid-cols-2 gap-4">
          <MinimalTraitList title="Affective" traits={behavioralTraits} scores={traitScores} enableGradeColors={settings.enableGradeColors} />
          <MinimalTraitList title="Psychomotor" traits={psychomotorTraits} scores={traitScores} enableGradeColors={settings.enableGradeColors} />
        </div>
        
        <div className="col-span-7 space-y-4">
          <div>
            <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-1 border-b border-gray-200 pb-0.5">
              Class Teacher's Remark
            </div>
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
          <div>
            <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-1 border-b border-gray-200 pb-0.5">
              Principal's Remark
            </div>
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
          
          <div className="flex justify-between items-end pt-3">
            <div>
              <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Next Term Begins</div>
              <div className="text-xs font-bold text-gray-900">{formatDateDescriptive(settings.nextTermDate)}</div>
            </div>
            <div className="text-center">
              {isPremium && settings.principalSignatureBase64 && !sigError ? (
                <img 
                  src={settings.principalSignatureBase64} 
                  alt="Principal Signature" 
                  className="h-8 max-w-[120px] object-contain mx-auto mb-1 no-capture"
                  onError={() => setSigError(true)}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-8 w-32 border-b border-gray-900 mb-1" />
              )}
              <div className="text-[0.5rem] font-bold text-gray-500 uppercase tracking-widest">Principal's Signature</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="avoid-break mt-6 pt-3 flex justify-between items-center text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest border-t border-gray-100">
        <div>Official Student Report</div>
        <div className="select-none">Generated by UpRecord</div>
      </div>
    </div>
  );
};

const MinimalTraitList: React.FC<{ title: string; traits: any[]; scores: Record<number, number>; enableGradeColors?: boolean }> = ({ title, traits, scores, enableGradeColors }) => (
  <div>
    <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-1.5 border-b border-gray-200 pb-0.5">{title}</div>
    <div className="space-y-1">
      {traits.map(trait => (
        <div key={trait.id} className="flex justify-between text-[0.5rem]">
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
