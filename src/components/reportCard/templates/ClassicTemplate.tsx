import React, { useState } from 'react';
import { getTermLabel, getGradeColor, formatDateDescriptive } from '../../../lib/calculationEngine';
import { ReportCardTemplateProps, getSchoolInitials, getBrandContrastDetails } from './types';

export const ClassicTemplate: React.FC<ReportCardTemplateProps> = ({
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
      className="report-card-sheet w-[210mm] max-w-full min-h-[297mm] bg-white p-[7mm] sm:p-[8mm] print:p-0 print:w-full print:max-w-none print:min-h-0 print:h-auto mx-auto shadow-2xl print:shadow-none print:m-0 relative overflow-hidden text-[0.5625rem] font-sans leading-tight"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Background Watermark Logo */}
      {hasValidLogo && (
        <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden select-none print:opacity-40">
          <div 
            className="w-full h-full opacity-[0.03] flex items-center justify-center"
            style={{ 
              perspective: '1500px',
              transformStyle: 'preserve-3d'
            }}
          >
            <img 
              src={settings.logoBase64} 
              alt="" 
              className="w-[180%] h-[180%] object-contain no-capture"
              style={{ 
                transform: 'rotateX(35deg) rotateZ(-15deg) scale(1.1) translateY(100px)',
                filter: 'grayscale(100%) brightness(1.1)'
              }}
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div 
        className="avoid-break flex items-center gap-4 p-4 rounded-xl mb-3.5 relative overflow-hidden z-10 transition-colors shadow-sm"
        style={{ backgroundColor: contrast.backgroundColor, color: contrast.textColor }}
      >
        {/* Header Texture Overlay */}
        {hasValidLogo && (
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <img 
              src={settings.logoBase64} 
              alt="" 
              className="w-full h-full object-cover scale-[3] -rotate-12 opacity-20"
              style={{ transform: 'perspective(500px) rotateX(20deg) scale(4)' }}
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {hasValidLogo ? (
          <div className="w-16 h-16 bg-white rounded-xl p-1 shadow-sm shrink-0 flex items-center justify-center border border-black/5">
            <img 
              src={settings.logoBase64} 
              alt="School Logo" 
              className="max-w-full max-h-full object-contain no-capture"
              onError={() => setLogoError(true)}
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div 
            className="w-16 h-16 rounded-xl flex items-center justify-center font-black text-sm tracking-tight px-1 shrink-0 shadow-sm border transition-all"
            style={{
              backgroundColor: contrast.badgeBackground,
              color: contrast.textColor,
              borderColor: contrast.badgeBorder
            }}
          >
            {schoolInitials}
          </div>
        )}

        <div className="flex-1 text-center min-w-0">
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-tight mb-1 break-words max-w-full">
            {settings.schoolName || 'School Name'}
          </h1>
          {settings.schoolSlogan && (
            <p 
              className="text-[0.625rem] font-bold italic mb-1 break-words max-w-full"
              style={{ color: contrast.subtextColor }}
            >
              {settings.schoolSlogan}
            </p>
          )}
          {settings.address && (
            <p 
              className="text-[0.5rem] font-medium uppercase tracking-wider break-words max-w-full"
              style={{ color: contrast.subtextColor }}
            >
              {settings.address}
            </p>
          )}
          <div 
            className="mt-2 inline-block px-3 py-0.5 rounded-full text-[0.5625rem] font-black uppercase tracking-widest shadow-xs"
            style={{
              backgroundColor: contrast.badgeBackground,
              color: contrast.badgeTextColor,
              border: `1px solid ${contrast.badgeBorder}`
            }}
          >
            Student Report Card
          </div>
        </div>
      </div>

      {/* Student Info Grid */}
      <div className="avoid-break grid grid-cols-5 gap-3.5 mb-3.5 relative z-10">
        <div className="col-span-3 grid grid-cols-2 gap-x-5 gap-y-1">
          <InfoRow label="NAMES" value={student.fullName.toUpperCase()} bold allowWrap />
          <InfoRow label="Reg. No" value={student.admissionNumber} />
          <InfoRow label="Session" value={settings.currentSession} />
          <InfoRow label="Term" value={getTermLabel(settings.currentTerm)} />
          <InfoRow label="Age" value={`${age} years`} />
          <InfoRow label="No in class" value={classSize} />
          <InfoRow label="Class" value={studentClass.className} />
          <InfoRow label="Teacher" value={studentClass.teacherName} allowWrap />
        </div>
        <div className="col-span-2 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
          <div 
            className="px-3 py-1 font-black uppercase tracking-widest text-[0.5rem] border-b border-gray-100"
            style={{
              backgroundColor: contrast.isLight ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.02)',
              color: '#374151'
            }}
          >
            Performance Summary
          </div>
          <div className="p-2 grid grid-cols-2 gap-x-3 gap-y-1">
            <InfoRow label="Days Opened" value={totalDays} />
            <InfoRow label="Days Present" value={daysPresent} />
            <InfoRow label="Days Absent" value={daysAbsent} />
            <InfoRow label="Mark Obtainable" value={totalObtainable} />
            <InfoRow label="Student's Score" value={studentTotalScore.toFixed(1)} bold />
            <InfoRow label="Term's %" value={`${percentage}%`} bold />
            {showCumulative && <InfoRow label="Cumm. %" value={`${avgCumulativePercentage.toFixed(2)}%`} bold />}
          </div>
        </div>
      </div>

      {/* Grades Table */}
      <div className="avoid-break mb-3.5 border border-gray-200 rounded-lg overflow-hidden relative z-10 bg-white shadow-xs">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: contrast.backgroundColor, color: contrast.textColor }}>
              <th 
                className="p-1.5 text-left uppercase font-black text-[0.5rem] tracking-wider"
                style={{ borderRight: `1px solid ${contrast.borderSubtle}` }}
              >
                Subject
              </th>
              {settings.caComponents.map(ca => (
                <th 
                  key={ca.id} 
                  className="p-0.5 text-center text-[0.4375rem] font-black leading-tight"
                  style={{ borderRight: `1px solid ${contrast.borderSubtle}` }}
                >
                  {ca.name}<br/>({ca.maxScore})
                </th>
              ))}
              <th 
                className="p-0.5 text-center text-[0.4375rem] font-black leading-tight uppercase"
                style={{ borderRight: `1px solid ${contrast.borderSubtle}` }}
              >
                EXAM<br/>({settings.examMaxScore})
              </th>
              <th 
                className="p-0.5 text-center text-[0.4375rem] font-black leading-tight uppercase"
                style={{ borderRight: `1px solid ${contrast.borderSubtle}` }}
              >
                TOTAL<br/>(100)
              </th>
              <th 
                className="p-0.5 text-center text-[0.4375rem] font-black leading-tight uppercase"
                style={{ borderRight: `1px solid ${contrast.borderSubtle}` }}
              >
                GRADE
              </th>
              {showCumulative && (
                <>
                  <th 
                    className="p-0.5 text-center text-[0.4375rem] font-black leading-tight"
                    style={{ borderRight: `1px solid ${contrast.borderSubtle}` }}
                  >
                    1ST<br/>TERM
                  </th>
                  <th 
                    className="p-0.5 text-center text-[0.4375rem] font-black leading-tight"
                    style={{ borderRight: `1px solid ${contrast.borderSubtle}` }}
                  >
                    2ND<br/>TERM
                  </th>
                  <th 
                    className="p-0.5 text-center text-[0.4375rem] font-black leading-tight"
                    style={{ borderRight: `1px solid ${contrast.borderSubtle}` }}
                  >
                    CUMM<br/>AVG
                  </th>
                </>
              )}
              <th className="p-1.5 text-left uppercase font-black text-[0.5rem] tracking-wider">
                Remarks
              </th>
            </tr>
          </thead>
          <tbody>
            {cumulativeRecords.map((row, idx) => {
              const grade = gradesWithTotal.find(g => g.subjectId === row.subjectId);
              const displayTotal = grade?.total ?? (
                settings.currentTerm === 1 ? row.term1Total : 
                settings.currentTerm === 2 ? row.term2Total : 
                row.term3Total
              );

              return (
                <tr key={row.subjectId} className={`avoid-break ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}`}>
                  <td className="border border-gray-200 p-1.5 font-bold uppercase text-[0.5rem] leading-tight break-words max-w-[125px]">
                    {row.subjectName}
                  </td>
                  {settings.caComponents.map(ca => (
                    <td key={ca.id} className="border border-gray-200 p-0.5 text-center font-mono font-bold text-[0.5rem]">
                      {grade?.caScores?.[ca.id] ?? '-'}
                    </td>
                  ))}
                  <td className="border border-gray-200 p-0.5 text-center font-mono font-bold text-[0.5rem]">
                    {grade?.examScore ?? '-'}
                  </td>
                  <td className="border border-gray-200 p-0.5 text-center font-mono font-black text-[0.53rem] text-gray-950">
                    {displayTotal ?? '-'}
                  </td>
                  <td className={`border border-gray-200 p-0.5 text-center font-black ${
                    settings.enableGradeColors ? getGradeColor(row.grade) : 'text-gray-900'
                  }`}>
                    {row.grade}
                  </td>
                  {showCumulative && (
                    <>
                      <td className="border border-gray-200 p-0.5 text-center font-mono font-medium text-gray-500">
                        {row.term1Total ?? '-'}
                      </td>
                      <td className="border border-gray-200 p-0.5 text-center font-mono font-medium text-gray-500">
                        {row.term2Total ?? '-'}
                      </td>
                      <td className="border border-gray-200 p-0.5 text-center font-mono font-black text-blue-700">
                        {row.cumulativeAverage.toFixed(1)}
                      </td>
                    </>
                  )}
                  <td className="border border-gray-200 p-1.5 text-[0.4375rem] font-bold italic uppercase leading-tight break-words max-w-[110px]">
                    {row.remark}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Traits & Keys Section */}
      <div className="avoid-break grid grid-cols-2 gap-3.5 mb-3.5 relative z-10">
        <TraitTable 
          title="Affective Traits" 
          traits={behavioralTraits} 
          scores={traitScores} 
          contrast={contrast}
          enableGradeColors={settings.enableGradeColors}
        />
        <div className="space-y-3.5">
          <TraitTable 
            title="Psychomotor Skills" 
            traits={psychomotorTraits} 
            scores={traitScores} 
            contrast={contrast}
            enableGradeColors={settings.enableGradeColors}
          />
          
          <div className="grid grid-cols-2 gap-2">
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-xs">
              <div 
                className="px-2 py-1 font-black uppercase text-[0.4375rem] tracking-wider" 
                style={{ backgroundColor: contrast.backgroundColor, color: contrast.textColor }}
              >
                Grading Key
              </div>
              <table className="w-full text-[0.375rem] border-collapse">
                <thead>
                  <tr className="bg-gray-100 font-black uppercase text-gray-600">
                    <th className="border border-gray-200 p-0.5">Range</th>
                    <th className="border border-gray-200 p-0.5">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.gradingScale.sort((a, b) => b.minScore - a.minScore).map(g => (
                    <tr key={g.grade}>
                      <td className="border border-gray-200 p-0.5 text-center font-mono font-bold text-gray-700">{g.minScore}+</td>
                      <td className="border border-gray-200 p-0.5 text-center font-black text-gray-900">{g.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-xs">
              <div 
                className="px-2 py-1 font-black uppercase text-[0.4375rem] tracking-wider" 
                style={{ backgroundColor: contrast.backgroundColor, color: contrast.textColor }}
              >
                Rating Key
              </div>
              <table className="w-full text-[0.375rem] border-collapse">
                <thead>
                  <tr className="bg-gray-100 font-black uppercase text-gray-600">
                    <th className="border border-gray-200 p-0.5">Key</th>
                    <th className="border border-gray-200 p-0.5">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { k: 5, m: 'EXCELLENT' },
                    { k: 4, m: 'HIGH' },
                    { k: 3, m: 'ACCEPTABLE' },
                    { k: 2, m: 'MINIMAL' },
                    { k: 1, m: 'LOW' }
                  ].map(item => (
                    <tr key={item.k}>
                      <td className="border border-gray-200 p-0.5 text-center font-mono font-black text-gray-800">{item.k}</td>
                      <td className="border border-gray-200 p-0.5 text-center font-medium uppercase text-gray-700">{item.m}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Remarks */}
      <div className="avoid-break grid grid-cols-2 gap-4 mb-3 relative z-10 pt-1 border-t border-gray-100">
        <div className="space-y-2">
          <div className="border-b border-gray-300 pb-0.5">
            <p className="text-[0.4375rem] font-black uppercase tracking-widest text-gray-400">Class Teacher's Remark</p>
            {canEditTeacher ? (
              <textarea
                value={localTeacherRemark}
                onChange={(e) => setLocalTeacherRemark(e.target.value)}
                onBlur={() => onUpdateRemark?.('teacher', localTeacherRemark)}
                className="w-full bg-blue-50/30 border-none focus:ring-0 resize-none p-0 font-black italic text-[0.625rem] text-gray-900 leading-tight min-h-[24px]"
                rows={2}
              />
            ) : (
              <p className="text-[0.625rem] font-black italic tracking-tight text-gray-900 leading-snug break-words">
                {teacherRemark}
              </p>
            )}
          </div>
          <div className="border-b border-gray-300 pb-0.5">
            <p className="text-[0.4375rem] font-black uppercase tracking-widest text-gray-400">Principal's Remark</p>
            {canEditPrincipal ? (
              <textarea
                value={localPrincipalRemark}
                onChange={(e) => setLocalPrincipalRemark(e.target.value)}
                onBlur={() => onUpdateRemark?.('principal', localPrincipalRemark)}
                className="w-full bg-blue-50/30 border-none focus:ring-0 resize-none p-0 font-black italic text-[0.625rem] text-gray-900 leading-tight min-h-[24px]"
                rows={2}
              />
            ) : (
              <p className="text-[0.625rem] font-black italic tracking-tight text-gray-900 leading-snug break-words">
                {principalRemark}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end justify-end">
          <div className="text-center space-y-1">
            {isPremium && settings.principalSignatureBase64 && !sigError ? (
              <img 
                src={settings.principalSignatureBase64} 
                alt="Principal Signature" 
                className="h-8 max-w-[120px] max-h-[32px] object-contain mx-auto no-capture"
                onError={() => setSigError(true)}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-8 w-32 border-b border-gray-400" />
            )}
            <p className="text-[0.5rem] font-black uppercase tracking-widest text-gray-800">Principal's Signature</p>
          </div>
        </div>
      </div>

      {/* Dates Section */}
      <div className="avoid-break flex justify-between items-center text-[0.5rem] font-bold text-gray-500 uppercase tracking-widest border-t border-gray-100 pt-2 relative z-10">
        <div>Term Ended: <span className="text-gray-800">{formatDateDescriptive(settings.termClosingDate)}</span></div>
        <div>Next Term Begins: <span className="text-gray-800">{formatDateDescriptive(settings.nextTermDate)}</span></div>
      </div>

      {/* Watermark Branding */}
      <div className="absolute bottom-2 right-4 text-[0.4375rem] font-black text-gray-300 uppercase tracking-widest select-none">
        Generated by UpRecord
      </div>
    </div>
  );
};

export const InfoRow: React.FC<{ 
  label: string; 
  value: string | number; 
  bold?: boolean;
  allowWrap?: boolean;
}> = ({ label, value, bold, allowWrap }) => (
  <div className="flex items-start justify-between gap-1.5 border-b border-gray-50 pb-0.5 min-h-[17px]">
    <span className="text-[0.5rem] font-black text-gray-400 uppercase tracking-widest shrink-0 pt-0.5">{label}:</span>
    <span 
      className={`text-[0.5625rem] text-gray-900 text-right leading-tight ${
        bold ? 'font-black' : 'font-bold'
      } ${
        allowWrap ? 'break-words max-w-[145px]' : 'truncate'
      }`}
    >
      {value}
    </span>
  </div>
);

export const TraitTable: React.FC<{ 
  title: string; 
  traits: any[]; 
  scores: Record<number, number>; 
  contrast: any;
  enableGradeColors?: boolean;
}> = ({ title, traits, scores, contrast, enableGradeColors }) => (
  <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-xs">
    <table className="w-full text-[0.4375rem] border-collapse">
      <thead>
        <tr style={{ backgroundColor: contrast.backgroundColor, color: contrast.textColor }}>
          <th 
            className="p-1 text-left uppercase font-black tracking-wider"
            style={{ borderRight: `1px solid ${contrast.borderSubtle}` }}
          >
            {title}
          </th>
          <th className="p-1 text-center uppercase font-black w-12 tracking-wider">Rating</th>
        </tr>
      </thead>
      <tbody>
        {traits.map(trait => (
          <tr key={trait.id} className="border-b border-gray-100 last:border-none">
            <td className="border-r border-gray-200 p-1 font-bold uppercase text-gray-800 break-words leading-tight">
              {trait.traitName}
            </td>
            <td className={`p-1 text-center font-mono font-black ${
              enableGradeColors ? (
                scores[trait.id!] === 5 ? 'text-emerald-600' :
                scores[trait.id!] === 4 ? 'text-blue-600' :
                scores[trait.id!] === 3 ? 'text-amber-600' :
                scores[trait.id!] === 2 ? 'text-orange-500' :
                'text-red-600'
              ) : 'text-gray-900'
            }`}>
              {scores[trait.id!] || '-'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
