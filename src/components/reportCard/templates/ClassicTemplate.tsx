import React from 'react';
import { getTermLabel, getGradeColor, formatDateDescriptive } from '../../../lib/calculationEngine';
import { ReportCardTemplateProps } from './types';

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
  isEditable,
  userRole,
  onUpdateRemark
}) => {
  const canEditTeacher = isEditable && userRole === 'teacher';
  const canEditPrincipal = isEditable && userRole === 'admin';

  return (
    <div 
      id={`report-card-${student.id}`}
      className="w-[210mm] min-h-[297mm] bg-white p-[8mm] mx-auto shadow-2xl print:shadow-none print:m-0 relative overflow-hidden text-[0.5625rem] font-sans leading-tight"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Background Watermark Logo */}
      {isPremium && settings.logoBase64 && (
        <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden select-none">
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
      <div className="flex items-center gap-4 p-4 rounded-xl mb-4 relative overflow-hidden z-10" style={brandStyle}>
        {/* Header Texture Overlay */}
        {isPremium && settings.logoBase64 && (
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
        {isPremium && settings.logoBase64 ? (
          <img 
            src={settings.logoBase64} 
            alt="School Logo" 
            className="w-16 h-16 object-contain bg-white rounded-lg p-1 no-capture"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center text-white font-black text-xl">
            {settings.schoolName.charAt(0)}
          </div>
        )}
        <div className="flex-1 text-center">
          <h1 className="text-xl font-black uppercase tracking-tight leading-none mb-0.5">{settings.schoolName}</h1>
          <p className="text-[0.625rem] font-bold italic opacity-90 mb-0.5">{settings.schoolSlogan}</p>
          <p className="text-[0.5rem] font-medium opacity-80 uppercase tracking-widest">{settings.address}</p>
          <div className="mt-2 inline-block px-3 py-0.5 bg-white/20 rounded-full text-[0.5625rem] font-black uppercase tracking-widest">
            Student Report Card
          </div>
        </div>
      </div>

      {/* Student Info Grid */}
      <div className="grid grid-cols-5 gap-4 mb-4 relative z-10">
        <div className="col-span-3 grid grid-cols-2 gap-x-6 gap-y-1">
          <InfoRow label="NAMES" value={student.fullName.toUpperCase()} bold />
          <InfoRow label="Reg. No" value={student.admissionNumber} />
          <InfoRow label="Session" value={settings.currentSession} />
          <InfoRow label="Term" value={getTermLabel(settings.currentTerm)} />
          <InfoRow label="Age" value={`${age} years`} />
          <InfoRow label="No in class" value={classSize} />
          <InfoRow label="Class" value={studentClass.className} />
          <InfoRow label="Teacher" value={studentClass.teacherName} />
        </div>
        <div className="col-span-2 border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-3 py-1 font-black uppercase tracking-widest text-[0.5rem] border-b border-gray-100 bg-gray-50">Performance Summary</div>
          <div className="p-2 grid grid-cols-2 gap-x-4 gap-y-1">
            <InfoRow label="Days Opened" value={totalDays} />
            <InfoRow label="Days Present" value={daysPresent} />
            <InfoRow label="Days Absent" value={daysAbsent} />
            <InfoRow label="Mark Obtainable" value={totalObtainable} />
            <InfoRow label="Student's Score" value={studentTotalScore.toFixed(1)} />
            <InfoRow label="Term's %" value={`${percentage}%`} />
            {showCumulative && <InfoRow label="Cumm. %" value={`${avgCumulativePercentage.toFixed(2)}%`} />}
          </div>
        </div>
      </div>

      {/* Grades Table */}
      <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden relative z-10 bg-white/90 backdrop-blur-[0.5px]">
        <table className="w-full border-collapse">
          <thead>
            <tr style={brandStyle}>
              <th className="border border-gray-200 p-1.5 text-left uppercase font-black text-[0.5rem]">Subject</th>
              {settings.caComponents.map(ca => (
                <th key={ca.id} className="border border-gray-200 p-0.5 text-center text-[0.4375rem] font-black">
                  {ca.name}<br/>({ca.maxScore})
                </th>
              ))}
              <th className="border border-gray-200 p-0.5 text-center text-[0.4375rem] font-black">EXAM<br/>({settings.examMaxScore})</th>
              <th className="border border-gray-200 p-0.5 text-center text-[0.4375rem] font-black">TOTAL<br/>(100)</th>
              <th className="border border-gray-200 p-0.5 text-center text-[0.4375rem] font-black">GRADE</th>
              {showCumulative && (
                <>
                  <th className="border border-gray-200 p-0.5 text-center text-[0.4375rem] font-black">1ST<br/>TERM</th>
                  <th className="border border-gray-200 p-0.5 text-center text-[0.4375rem] font-black">2ND<br/>TERM</th>
                  <th className="border border-gray-200 p-0.5 text-center text-[0.4375rem] font-black">CUMM<br/>AVG</th>
                </>
              )}
              <th className="border border-gray-200 p-1.5 text-left uppercase font-black text-[0.5rem]">Remarks</th>
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
                <tr key={row.subjectId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-200 p-1.5 font-bold uppercase text-[0.5rem]">{row.subjectName}</td>
                  {settings.caComponents.map(ca => (
                    <td key={ca.id} className="border border-gray-200 p-0.5 text-center font-bold">
                      {grade?.caScores?.[ca.id] ?? '-'}
                    </td>
                  ))}
                  <td className="border border-gray-200 p-0.5 text-center font-bold">
                    {grade?.examScore ?? '-'}
                  </td>
                  <td className="border border-gray-200 p-0.5 text-center font-black">
                    {displayTotal ?? '-'}
                  </td>
                  <td className={`border border-gray-200 p-0.5 text-center font-black ${
                    settings.enableGradeColors ? getGradeColor(row.grade) : 'text-gray-900'
                  }`}>
                    {row.grade}
                  </td>
                  {showCumulative && (
                    <>
                      <td className="border border-gray-200 p-0.5 text-center font-medium text-gray-400">
                        {row.term1Total ?? '-'}
                      </td>
                      <td className="border border-gray-200 p-0.5 text-center font-medium text-gray-400">
                        {row.term2Total ?? '-'}
                      </td>
                      <td className="border border-gray-200 p-0.5 text-center font-black text-blue-600">
                        {row.cumulativeAverage.toFixed(1)}
                      </td>
                    </>
                  )}
                  <td className="border border-gray-200 p-1.5 text-[0.4375rem] font-bold italic uppercase">{row.remark}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Traits & Keys Section */}
      <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
        <TraitTable 
          title="Affective Traits" 
          traits={behavioralTraits} 
          scores={traitScores} 
          brandStyle={brandStyle}
          enableGradeColors={settings.enableGradeColors}
        />
        <div className="space-y-4">
          <TraitTable 
            title="Psychomotor Skills" 
            traits={psychomotorTraits} 
            scores={traitScores} 
            brandStyle={brandStyle}
            enableGradeColors={settings.enableGradeColors}
          />
          
          <div className="grid grid-cols-2 gap-2">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-2 py-1 font-black uppercase text-[0.4375rem]" style={brandStyle}>Grading Key</div>
              <table className="w-full text-[0.375rem] border-collapse">
                <thead>
                  <tr className="bg-gray-100 font-black uppercase">
                    <th className="border border-gray-200 p-0.5">Range</th>
                    <th className="border border-gray-200 p-0.5">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.gradingScale.sort((a, b) => b.minScore - a.minScore).map(g => (
                    <tr key={g.grade}>
                      <td className="border border-gray-200 p-0.5 text-center font-bold">{g.minScore}+</td>
                      <td className="border border-gray-200 p-0.5 text-center font-black">{g.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-2 py-1 font-black uppercase text-[0.4375rem]" style={brandStyle}>Rating Key</div>
              <table className="w-full text-[0.375rem] border-collapse">
                <thead>
                  <tr className="bg-gray-100 font-black uppercase">
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
                      <td className="border border-gray-200 p-0.5 text-center font-black">{item.k}</td>
                      <td className="border border-gray-200 p-0.5 text-center font-medium uppercase">{item.m}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Remarks */}
      <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
        <div className="space-y-2">
          <div className="border-b border-gray-400 pb-0.5">
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
              <p className="text-[0.625rem] font-black italic tracking-tight text-gray-900">{teacherRemark}</p>
            )}
          </div>
          <div className="border-b border-gray-400 pb-0.5">
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
              <p className="text-[0.625rem] font-black italic tracking-tight text-gray-900">{principalRemark}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end justify-end">
          <div className="text-center space-y-1">
            {isPremium && settings.principalSignatureBase64 ? (
              <img 
                src={settings.principalSignatureBase64} 
                alt="Principal Signature" 
                className="h-8 max-w-[100px] max-h-[32px] object-contain mx-auto no-capture"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-8 w-32 border-b border-gray-400" />
            )}
            <p className="text-[0.5rem] font-black uppercase tracking-widest">Principal's Signature</p>
          </div>
        </div>
      </div>

      {/* Dates Section */}
      <div className="flex justify-between items-center text-[0.5rem] font-bold text-gray-500 uppercase tracking-widest border-t border-gray-100 pt-2 relative z-10">
        <div>Term Ended: {formatDateDescriptive(settings.termClosingDate)}</div>
        <div>Next Term Begins: {formatDateDescriptive(settings.nextTermDate)}</div>
      </div>

      {/* Watermark */}
      <div className="absolute bottom-2 right-4 text-[0.4375rem] font-black text-gray-200 uppercase tracking-widest">
        Generated by UpRecord
      </div>
    </div>
  );
};

export const InfoRow: React.FC<{ label: string, value: string | number, bold?: boolean }> = ({ label, value, bold }) => (
  <div className="flex items-center justify-between gap-2 border-b border-gray-50 pb-0.5">
    <span className="text-[0.5rem] font-black text-gray-400 uppercase tracking-widest shrink-0">{label}:</span>
    <span className={`text-[0.5625rem] text-gray-900 truncate ${bold ? 'font-black' : 'font-bold'}`}>{value}</span>
  </div>
);

export const TraitTable: React.FC<{ 
  title: string, 
  traits: any[], 
  scores: Record<number, number>, 
  brandStyle: any,
  enableGradeColors?: boolean
}> = ({ title, traits, scores, brandStyle, enableGradeColors }) => (
  <div className="border border-gray-200 rounded-lg overflow-hidden">
    <table className="w-full text-[0.4375rem] border-collapse">
      <thead>
        <tr style={brandStyle}>
          <th className="border border-gray-200 p-1 text-left uppercase font-black">{title}</th>
          <th className="border border-gray-200 p-1 text-center uppercase font-black w-12">Rating</th>
        </tr>
      </thead>
      <tbody>
        {traits.map(trait => (
          <tr key={trait.id}>
            <td className="border border-gray-200 p-1 font-bold uppercase">{trait.traitName}</td>
            <td className={`border border-gray-200 p-1 text-center font-black ${
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
