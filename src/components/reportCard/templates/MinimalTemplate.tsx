import React from 'react';
import { getTermLabel, getGradeColor, formatDateDescriptive } from '../../../lib/calculationEngine';
import { ReportCardTemplateProps } from './types';

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
  isEditable,
  userRole,
  onUpdateRemark
}) => {
  const canEditTeacher = isEditable && userRole === 'teacher';
  const canEditPrincipal = isEditable && userRole === 'admin';

  return (
    <div 
      id={`report-card-${student.id}`}
      className="w-[210mm] min-h-[297mm] bg-white p-[12mm] mx-auto shadow-2xl print:shadow-none print:m-0 relative overflow-hidden text-[0.5625rem] font-sans leading-tight"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Minimal Header */}
      <div className="flex justify-between items-start border-b-4 pb-4 mb-6" style={{ borderColor: brandStyle.backgroundColor }}>
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-gray-900 uppercase">{settings.schoolName}</h1>
          <p className="text-[0.625rem] font-bold text-gray-500 uppercase tracking-widest mt-1">{settings.address}</p>
        </div>
        {isPremium && settings.logoBase64 && (
          <img 
            src={settings.logoBase64} 
            alt="School Logo" 
            className="w-16 h-16 object-contain grayscale no-capture"
            referrerPolicy="no-referrer"
          />
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-4 gap-x-8 gap-y-4 mb-8">
        <div className="col-span-2">
          <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-1">Student Name</div>
          <div className="text-lg font-black text-gray-900 uppercase tracking-tight">{student.fullName}</div>
        </div>
        <div>
          <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-1">Admission No</div>
          <div className="text-sm font-bold text-gray-900">{student.admissionNumber}</div>
        </div>
        <div>
          <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-1">Class</div>
          <div className="text-sm font-bold text-gray-900">{studentClass.className}</div>
        </div>
        
        <div>
          <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-1">Term</div>
          <div className="text-xs font-bold text-gray-900">{getTermLabel(settings.currentTerm)}</div>
        </div>
        <div>
          <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-1">Session</div>
          <div className="text-xs font-bold text-gray-900">{settings.currentSession}</div>
        </div>
        <div>
          <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-1">Age</div>
          <div className="text-xs font-bold text-gray-900">{age} yrs</div>
        </div>
        <div>
          <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-1">Class Size</div>
          <div className="text-xs font-bold text-gray-900">{classSize}</div>
        </div>
      </div>

      {/* Performance Summary Bar */}
      <div className="flex justify-between items-center bg-gray-900 text-white p-4 rounded-lg mb-8">
        <div className="text-center">
          <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Score</div>
          <div className="text-lg font-black">{studentTotalScore.toFixed(1)} <span className="text-xs text-gray-500">/ {totalObtainable}</span></div>
        </div>
        <div className="w-px h-8 bg-gray-700"></div>
        <div className="text-center">
          <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-1">Term Average</div>
          <div className="text-lg font-black">{percentage}%</div>
        </div>
        {showCumulative && (
          <>
            <div className="w-px h-8 bg-gray-700"></div>
            <div className="text-center">
              <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-1">Cumulative</div>
              <div className="text-lg font-black text-blue-400">{avgCumulativePercentage.toFixed(2)}%</div>
            </div>
          </>
        )}
        <div className="w-px h-8 bg-gray-700"></div>
        <div className="text-center">
          <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-1">Attendance</div>
          <div className="text-lg font-black">{daysPresent} <span className="text-xs text-gray-500">/ {totalDays}</span></div>
        </div>
      </div>

      {/* Grades Table */}
      <div className="mb-8">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-900">
              <th className="py-2 font-black text-[0.5625rem] uppercase tracking-widest">Subject</th>
              {settings.caComponents.map(ca => (
                <th key={ca.id} className="py-2 text-center font-bold text-[0.5rem] text-gray-500 uppercase">{ca.name}</th>
              ))}
              <th className="py-2 text-center font-bold text-[0.5rem] text-gray-500 uppercase">Exam</th>
              <th className="py-2 text-center font-black text-[0.5625rem] uppercase">Total</th>
              <th className="py-2 text-center font-black text-[0.5625rem] uppercase">Grade</th>
              {showCumulative && (
                <>
                  <th className="py-2 text-center font-bold text-[0.5rem] text-gray-500 uppercase">1st</th>
                  <th className="py-2 text-center font-bold text-[0.5rem] text-gray-500 uppercase">2nd</th>
                  <th className="py-2 text-center font-black text-[0.5625rem] uppercase text-blue-600">Cumm</th>
                </>
              )}
              <th className="py-2 text-right font-bold text-[0.5rem] text-gray-500 uppercase">Remark</th>
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
                <tr key={row.subjectId}>
                  <td className="py-2 font-bold text-[0.625rem] uppercase text-gray-900">{row.subjectName}</td>
                  {settings.caComponents.map(ca => (
                    <td key={ca.id} className="py-2 text-center font-medium text-gray-600">
                      {grade?.caScores?.[ca.id] ?? '-'}
                    </td>
                  ))}
                  <td className="py-2 text-center font-medium text-gray-600">
                    {grade?.examScore ?? '-'}
                  </td>
                  <td className="py-2 text-center font-black text-gray-900">
                    {displayTotal ?? '-'}
                  </td>
                  <td className={`py-2 text-center font-black ${
                    settings.enableGradeColors ? getGradeColor(row.grade) : 'text-gray-900'
                  }`}>
                    {row.grade}
                  </td>
                  {showCumulative && (
                    <>
                      <td className="py-2 text-center font-medium text-gray-400">{row.term1Total ?? '-'}</td>
                      <td className="py-2 text-center font-medium text-gray-400">{row.term2Total ?? '-'}</td>
                      <td className="py-2 text-center font-black text-blue-600">{row.cumulativeAverage.toFixed(1)}</td>
                    </>
                  )}
                  <td className="py-2 text-right text-[0.5rem] font-medium text-gray-500 italic uppercase">{row.remark}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Traits & Remarks */}
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-5 grid grid-cols-2 gap-4">
          <MinimalTraitList title="Affective" traits={behavioralTraits} scores={traitScores} enableGradeColors={settings.enableGradeColors} />
          <MinimalTraitList title="Psychomotor" traits={psychomotorTraits} scores={traitScores} enableGradeColors={settings.enableGradeColors} />
        </div>
        
        <div className="col-span-7 space-y-6">
          <div>
            <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-1 border-b border-gray-200 pb-1">Class Teacher's Remark</div>
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
          <div>
            <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-1 border-b border-gray-200 pb-1">Principal's Remark</div>
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
          
          <div className="flex justify-between items-end pt-4">
            <div>
              <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-1">Next Term Begins</div>
              <div className="text-xs font-bold text-gray-900">{formatDateDescriptive(settings.nextTermDate)}</div>
            </div>
            <div className="text-center">
              {isPremium && settings.principalSignatureBase64 ? (
                <img 
                  src={settings.principalSignatureBase64} 
                  alt="Principal Signature" 
                  className="h-8 max-w-[120px] object-contain mx-auto mb-1 no-capture"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-8 w-32 border-b border-gray-900 mb-1" />
              )}
              <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Principal's Signature</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MinimalTraitList: React.FC<{ title: string, traits: any[], scores: Record<number, number>, enableGradeColors?: boolean }> = ({ title, traits, scores, enableGradeColors }) => (
  <div>
    <div className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">{title}</div>
    <div className="space-y-1">
      {traits.map(trait => (
        <div key={trait.id} className="flex justify-between text-[0.5rem]">
          <span className="font-medium text-gray-700 truncate pr-2">{trait.traitName}</span>
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
