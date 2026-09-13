import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'jspdf-autotable';
import JSZip from 'jszip';
import { db, type IStudent, type IGrade, type IClass, type ISubject, type ITrait, type ITraitGrade } from '../db/db';
import { calculateTotal, calculateGrade, calculateRank } from './calculationEngine';

/**
 * Service for generating report card PDFs.
 */

export interface PDFOptions {
  student: IStudent;
  grades: (IGrade & { subjectName: string })[];
  traits: (ITraitGrade & { traitName: string, category: string })[];
  settings: any;
  className: string;
  attendance: { present: number, total: number };
  position: string;
  classSize: number;
}

/**
 * Generates a single report card PDF for a student.
 */
export async function generateReportCardPDF(options: PDFOptions): Promise<jsPDF> {
  const { student, grades, traits, settings, className, attendance, position, classSize } = options;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Header Section
  if (settings.logoBase64) {
    doc.addImage(settings.logoBase64, 'PNG', margin, 10, 25, 25);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text(settings.schoolName.toUpperCase(), pageWidth / 2 + 10, 18, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(settings.address, pageWidth / 2 + 10, 24, { align: 'center' });
  // Using schoolName as a placeholder for email/phone if missing in settings
  doc.text(`UpRecord Pro Edition | ${settings.currentSession}`, pageWidth / 2 + 10, 29, { align: 'center' });

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, 38, pageWidth - margin, 38);

  // Report Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${settings.currentTerm === 1 ? 'FIRST' : settings.currentTerm === 2 ? 'SECOND' : 'THIRD'} TERM REPORT SHEET`, pageWidth / 2, 48, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`${settings.currentSession} ACADEMIC SESSION`, pageWidth / 2, 54, { align: 'center' });

  // Student Info Grid
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  
  const infoY = 65;
  const col1 = margin;
  const col2 = pageWidth / 2;

  doc.text('NAME:', col1, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(student.fullName.toUpperCase(), col1 + 15, infoY);

  doc.setFont('helvetica', 'bold');
  doc.text('ADMISSION NO:', col2, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(student.admissionNumber, col2 + 30, infoY);

  doc.setFont('helvetica', 'bold');
  doc.text('CLASS:', col1, infoY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(className, col1 + 15, infoY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('GENDER:', col2, infoY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(student.gender, col2 + 30, infoY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('POSITION:', col1, infoY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${position} OUT OF ${classSize}`, col1 + 20, infoY + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('ATTENDANCE:', col2, infoY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${attendance.present} / ${attendance.total}`, col2 + 30, infoY + 12);

  // Academic Performance Table
  const tableHeaders = [['SUBJECT', ...settings.caComponents.map((ca: any) => ca.name), 'EXAM', 'TOTAL', 'GRADE', 'REMARK']];
  const tableData = grades.map(g => {
    const total = calculateTotal(g.caScores, g.examScore);
    const grade = calculateGrade(total, settings.gradingScale);
    const remark = settings.gradingScale.find((s: any) => s.grade === grade)?.remark || '';
    
    return [
      g.subjectName,
      ...settings.caComponents.map((ca: any) => g.caScores[ca.id] || 0),
      g.examScore,
      total,
      grade,
      remark
    ];
  });

  autoTable(doc, {
    startY: infoY + 20,
    head: tableHeaders,
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
    margin: { left: margin, right: margin }
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;

  // Traits Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('AFFECTIVE & PSYCHOMOTOR DOMAINS', margin, finalY);

  const traitData = traits.map(t => [t.traitName, t.score]);
  autoTable(doc, {
    startY: finalY + 5,
    head: [['TRAIT / SKILL', 'RATING (1-5)']],
    body: traitData,
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: { left: margin, right: pageWidth / 2 + 5 },
    tableWidth: pageWidth / 2 - margin - 5
  });

  // Comments Section
  const commentX = margin;
  const commentY = finalY + 5;
  const commentWidth = pageWidth / 2 - margin - 5;

  doc.setFontSize(9);
  doc.text("CLASS TEACHER'S COMMENT:", commentX, commentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.rect(commentX, commentY + 7, commentWidth, 15);

  doc.setFont('helvetica', 'bold');
  doc.text("PRINCIPAL'S COMMENT:", commentX, commentY + 30);
  doc.setFont('helvetica', 'normal');
  doc.rect(commentX, commentY + 32, commentWidth, 15);

  // Signature Section
  if (settings.principalSignatureBase64) {
    doc.addImage(settings.principalSignatureBase64, 'PNG', pageWidth - margin - 40, (doc as any).lastAutoTable.finalY + 10, 30, 15);
  }
  doc.setFont('helvetica', 'bold');
  doc.text('PRINCIPAL\'S SIGNATURE', pageWidth - margin - 45, (doc as any).lastAutoTable.finalY + 30);

  return doc;
}

/**
 * Generates bulk report cards and returns a zip blob.
 */
export async function generateBulkReportCards(
  classId: number, 
  onProgress: (current: number, total: number) => void
): Promise<Blob> {
  const settings = await db.settings.toCollection().first();
  if (!settings) throw new Error('Settings not found');

  const students = await db.students.where('classId').equals(classId).toArray();
  const cls = await db.classes.get(classId);
  const subjects = await db.subjects.toArray();
  const traitsList = await db.traits.toArray();

  const zip = new JSZip();
  const total = students.length;

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    onProgress(i + 1, total);

    const grades = await db.grades
      .where('studentId').equals(student.id!)
      .and(g => g.term === settings.currentTerm && g.session === settings.currentSession)
      .toArray();

    const traitGrades = await db.traitGrades
      .where('studentId').equals(student.id!)
      .and(tg => tg.term === settings.currentTerm && tg.session === settings.currentSession)
      .toArray();

    // Calculate class-wide stats for position
    // (In a real app, we'd pre-calculate this for efficiency)
    const classGrades = await db.grades
      .where('term').equals(settings.currentTerm)
      .and(g => g.session === settings.currentSession)
      .toArray();
    
    const studentTotals = new Map<number, number>();
    classGrades.forEach(g => {
      const current = studentTotals.get(g.studentId) || 0;
      studentTotals.set(g.studentId, current + calculateTotal(g.caScores, g.examScore));
    });

    const sortedTotals = Array.from(studentTotals.values()).sort((a, b) => b - a);
    const studentTotal = studentTotals.get(student.id!) || 0;
    const position = calculateRank(studentTotal, sortedTotals);

    const attendance = await db.attendance
      .where('[studentId+term+session]')
      .equals([student.id!, settings.currentTerm, settings.currentSession])
      .first();

    const pdf = await generateReportCardPDF({
      student,
      grades: grades.map(g => ({ ...g, subjectName: subjects.find(s => s.id === g.subjectId)?.subjectName || 'Unknown' })),
      traits: traitGrades.map(tg => ({ 
        ...tg, 
        traitName: traitsList.find(t => t.id === tg.traitId)?.traitName || 'Unknown',
        category: traitsList.find(t => t.id === tg.traitId)?.category || 'General'
      })),
      settings,
      className: cls?.className || 'Unknown',
      attendance: { 
        present: attendance?.daysPresent || 0, 
        total: attendance?.totalDays || settings.daysSchoolOpen || 0 
      },
      position,
      classSize: students.length
    });

    zip.file(`${student.admissionNumber.replace(/\//g, '-')}_${student.fullName}.pdf`, pdf.output('blob'));
  }

  return await zip.generateAsync({ type: 'blob' });
}
