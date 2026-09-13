# ScholarSync — Project Blueprint

## APP NAME
ScholarSync

## WHAT THIS APP DOES

ScholarSync is a commercial offline-first report card
generator for Nigerian and international primary and
secondary schools. Sold to school owners as a
hardware-locked licensed product.

Core workflow:
1. School admin sets up school, classes, subjects
2. Import student scores via Excel or enter manually
3. Preview report cards per student or per class
4. Export individual named PDF per student
5. Bulk export entire class as ZIP of named PDFs
6. Upload PDFs to school portal for parents

No login. No signup. No cloud database.
No backend except license verification.
Works fully offline after first activation.

---

## LICENSING SYSTEM ARCHITECTURE

- **Payment Processing:** Paystack
- **Webhook Verification & License Generation:** n8n
- **Secure Storage:** Firebase (Firestore)
- **License Delivery:** Email
- **Backend API:** Express (Node.js) hosted on Render

Workflow:
1. User pays via Paystack.
2. Paystack sends webhook to Express server (hosted on Render).
3. Express verifies webhook and triggers n8n workflow.
4. n8n generates a secure license key.
5. n8n saves license key to Firebase (Firestore).
6. n8n sends license key to user via email.
7. ScholarSync app verifies license against Firebase.

---

## TECH STACK

React 18 + Vite + TypeScript
Tailwind CSS v3 (mobile-first)
React Router DOM v6
Dexie.js — IndexedDB, the ONLY database
Lucide React — icons
jsPDF + jspdf-autotable — PDF generation
html2canvas — logo/signature capture only
JSZip — bulk PDF packaging
SheetJS (xlsx) — Excel import/export
Tauri v2 — desktop wrapper (configure last)
Vitest — unit tests (calculationEngine only)

---

## FOLDER STRUCTURE
```
src/
  components/
    layout/
      AppLayout.tsx
      Sidebar.tsx
      ExpiryWarningBanner.tsx
      TrialBanner.tsx
    reportCard/
      ReportCard.tsx
    settings/
      ImageUploader.tsx
      CAComponentManager.tsx
      LivePreview.tsx
    ui/
      Modal.tsx
      ConfirmDialog.tsx
      Toast.tsx
      Spinner.tsx
      EmptyState.tsx
      ErrorBoundary.tsx
      PageHeader.tsx
  context/
    ToastContext.tsx
  db/
    db.ts
  hooks/
    useSettings.ts
    useReportCardData.ts
    useCurrentSession.ts
  lib/
    hardwareId.ts
    activationService.ts
    calculationEngine.ts
    calculationEngine.test.ts
    excelService.ts
    pdfService.ts
    reportBuilder.ts
    reportColumns.ts
    backupService.ts
    sessionDetector.ts
    imageProcessor.ts
  pages/
    ActivationPage.tsx
    DashboardPage.tsx
    DataManagementPage.tsx
    StudentsPage.tsx
    ExcelHubPage.tsx
    DataEntryPage.tsx
    ReportCardsPage.tsx
    ReportsPage.tsx
    SettingsPage.tsx
    BackupPage.tsx
    LicensePage.tsx
  types/
    reportCard.ts
    reportBuilder.ts
  App.tsx
  main.tsx
  index.css
```

---

## DATABASE SCHEMA

This is the single source of truth.
Never guess a field name. Always check here.
```typescript
interface IActivation {
  id?: number;
  hardwareId: string;
  licenseKey: string;
  activatedAt: string;
  expiresAt: string | null;
  plan: 'trial'|'monthly'|'term'|'yearly'|'lifetime';
  lastVerifiedAt: string;
}

interface CAComponent {
  id: string;       // e.g. "ca1"
  name: string;     // e.g. "1st Test"
  maxScore: number; // e.g. 20
}

interface ISettings {
  id?: number;
  schoolName: string;
  schoolSlogan: string;
  address: string;
  logoBase64: string;
  principalSignatureBase64: string;
  brandColor: string;           // NOT color
  nextTermDate: string;
  termClosingDate: string;
  currentTerm: 1 | 2 | 3;
  currentSession: string;       // "2024/2025"
  totalSubjectScore: number;    // default 100
  examMaxScore: number;         // default 60
  caMaxScore: number;           // READ ONLY auto-calc
  caComponents: CAComponent[];  // min 2 max 4
  daysSchoolOpen: number;
  department1Name: string;      // "Arts and Humanities"
  department2Name: string;      // "Business"
  department3Name: string;      // "Science"
}

interface IClass {
  id?: number;
  className: string;            // NOT name
  teacherName: string;          // NOT teacher
  level: 'Primary' | 'junior' | 'senior';
  departmentId: 1 | 2 | 3 | null;
}

interface ISubject {
  id?: number;
  subjectName: string;
  isCore: boolean;
  departmentIds: number[];
}

interface ITrait {
  id?: number;
  traitName: string;                      // NOT name
  displayOrder: number;                   // NOT order
  category: 'affective' | 'psychomotor'; // required
}

interface IStudent {
  id?: number;
  admissionNumber: string;  // UNIQUE
  fullName: string;         // NOT name
  dateOfBirth: string;      // NOT dob "YYYY-MM-DD"
  classId: number;
  gender: 'Male' | 'Female';
}

interface IGrade {
  id?: number;
  studentId: number;
  subjectId: number;
  term: 1 | 2 | 3;
  session: string;
  caScores: Record<string, number>; // NOT scores
  examScore: number;
  total?: number;
  grade?: string;
  remark?: string;
  // NO classId field
}

interface ITraitRating {
  id?: number;
  studentId: number;
  traitId: number;
  term: 1 | 2 | 3;
  session: string;
  rating: 1 | 2 | 3 | 4 | 5;
}

interface IAttendance {
  id?: number;
  studentId: number;
  term: 1 | 2 | 3;
  session: string;
  daysPresent: number;
  totalDays: number;
}
```

Dexie table indexes:
```
activation:   '++id'
settings:     '++id'
classes:      '++id, className, level, departmentId'
subjects:     '++id, subjectName, isCore'
traits:       '++id, displayOrder, category'
students:     '++id, &admissionNumber, classId, fullName'
grades:       '++id, [studentId+subjectId+term+session],
               studentId, subjectId, term, session'
traitRatings: '++id, [studentId+traitId+term+session],
               studentId'
attendance:   '++id, [studentId+term+session], studentId'
```

Schema version: bump version number on any change.
Current version: 4

---

## DEFAULT SEED DATA

On first boot when tables are empty:

Default settings:
```
caComponents: [
  { id:'ca1', name:'1st Test', maxScore:20 },
  { id:'ca2', name:'2nd Test', maxScore:20 },
]
examMaxScore: 60
totalSubjectScore: 100
brandColor: '#1d4ed8'
currentTerm: auto-detected
currentSession: auto-detected
```

Default traits:
```
AFFECTIVE (category:'affective'):
Punctuality(1), Mental Alertness(2), Behavior(3),
Reliability(4), Attentiveness(5), Respect(6),
Neatness(7), Politeness(8), Honesty(9),
Relationship with staff(10),
Relationship with students(11),
Attitude to school(12), Self-control(13)

PSYCHOMOTOR (category:'psychomotor'):
Handwriting(1), Reading(2),
Verbal fluency/Diction(3), Musical Skills(4),
Creative arts(5), Physical activities(6),
General Reasoning(7), Physical Fitness(8)
```

---

## SESSION AUTO-DETECTION
```typescript
// src/lib/sessionDetector.ts
export function detectCurrentSession(): string {
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  return month >= 9
    ? `${year}/${year + 1}`
    : `${year - 1}/${year}`;
}

export function detectCurrentTerm(): 1 | 2 | 3 {
  const month = new Date().getMonth() + 1;
  if (month >= 9 && month <= 12) return 1;
  if (month >= 1 && month <= 3) return 2;
  return 3;
}
```

useCurrentSession hook:
- Read session from settings first
- If empty use auto-detect
- Admin can override in Settings
- Every page uses this hook — never ask user to type

Current session displayed in AppLayout header always:
"First Term | 2024/2025"

---

## GRADING SYSTEM

Grade = (total / totalSubjectScore) * 100 percentage
```
0%  - 29%  → F → FAIL
30% - 39%  → E → POOR
40% - 49%  → D → PASS
50% - 59%  → C → CREDIT
60% - 69%  → B → VERY GOOD
70% - 100% → A → EXCELLENT
```

Trait rating meaning:
```
5 → EXCELLENCE
4 → HIGH
3 → ACCEPTABLE
2 → MINIMAL
1 → LOW
```

---

## REPORT CARD LAYOUT

Based on real school template. Matches exactly.
A4 portrait. Must fit ONE page. No overflow ever.

Font: 10px global. Trait/key sections: 8px.
Cell padding: 3px 6px. Section gap: 4px.

### HEADER
brandColor background, white text.
Left: school logo 80px.
Center: schoolName.toUpperCase() bold large
        "schoolSlogan" italic
        address small
        STUDENT REPORT CARD subtitle
        ScholarSync watermark tiny bottom right

### STUDENT INFO GRID
Left column:
  NAMES: fullName
  Reg. No: admissionNumber
  Session: currentSession
  Term: First/Second/Third Term
  Age: calculateAge(dateOfBirth) + " years"
  No in class: classSize
  Class: className
  Teacher: teacherName

Right column header: PERFORMANCE
  No of days school opened: daysSchoolOpen
  Mark Obtainable: subjects.length * totalSubjectScore
  No of days absent: daysSchoolOpen - daysPresent
  Student's score: sum of all subject totals
  Term Ended: termClosingDate formatted
  Term's %: (score/obtainable*100).toFixed(2) + "%"
  Cummulative%: cumulative average percentage

### GRADES TABLE
Header: brandColor background, white text.
Rows alternate: white / #f9fafb.
Border: 1px solid #374151.

Junior class: one table "GENERAL SUBJECTS"
Senior class: two tables
  "CORE SUBJECTS"
  "[department name] SUBJECTS"

Columns:
SUBJECT | [CA1 name(max)] | [CA2 name(max)] | ...
| EXAM(max) | TOTAL(100) | GRADE
| 1ST TERM TOTAL | 2ND TERM TOTAL
| CUMM TOTAL | CUMM AVERAGE | REMARKS

CA columns dynamic from settings.caComponents.
Format: "1st Test(20)" "2nd Test(20)"

Term 1: 2ND TERM and CUMM columns show dashes
Term 2: CUMM = T1+T2 average
Term 3: all columns filled

### TRAITS (two columns side by side)
LEFT: AFFECTIVE TRAITS | RATING (1-5)
RIGHT: PSYCHOMOTOR SKILLS | RATING (1-5)

### GRADE KEY + RATING KEY
Side by side at bottom.
Left: RANGE | GRADE | MEANING table
Right: KEY | MEANING table

### FOOTER
Teacher's report: auto-generated remark
Principal's report: auto-generated remark
Principal's Signature: image or blank line

---

## PDF GENERATION

### Single student
Render ReportCard hidden off-screen.
Capture logo with html2canvas.
Build PDF with jsPDF + autotable.
Filename: sanitize(fullName)_className_term.pdf

sanitize(): UPPERCASE, spaces→_, remove special chars

### Bulk export
User chooses before export:
  A: Individual PDFs as ZIP (recommended)
  B: Combined single PDF

Option A:
  Batch of 10 students at a time
  50ms delay between batches
  Progress: "Generating 12 of 47..."
  ZIP: className_term_session_reports.zip

Option B:
  One PDF, each student = new page
  Filename: className_term_session_AllReports.pdf

Also support window.print() for paper printing.

---

## EXCEL IMPORT

Three types in excelService.ts:

1. Admission numbers only
   Column: admissionNumber
   fullName defaults to "[Name Pending]"
   Requires class selection

2. Full student data
   admissionNumber | fullName | dateOfBirth |
   gender | className
   Match by admissionNumber, case-insensitive

3. Grades
   admissionNumber | subjectName |
   [CA component names] | exam
   CA headers match component.name from Settings
   Match student + subject case-insensitively

All return: { inserted, updated, errors[] }
Errors: "Row X: reason. Skipped."
Never silent failures.

Students with "[Name Pending]" show warning
banner and are excluded from PDF generation.

---

## LICENSING

Backend URL:
https://rcpro-license-server.rcpro-license.workers.dev

Plans:
  trial    5 days one-per-device
  monthly  31 days
  term     95 days
  yearly   366 days
  lifetime null

Boot check order:
1. No Dexie record → ActivationPage
2. Has record, lifetime → allow in
3. Has record, not expired → allow in
4. lastVerifiedAt > 7 days → silent re-verify
5. ≤ 7 days left → warning banner + upgrade prompt
6. Expired → lock, show renewal options

Trial: "Start Free Trial" on ActivationPage
→ POST /api/trial with hardwareId
→ Check HWID not used before
→ Return key → auto-fill → activate

Hardware ID stored in Dexie for stability.
Fingerprint only as fallback.

All payment links from .env VITE_PAYMENT_* only.

---

## PAGE SPECIFICATIONS

### ActivationPage (/)
Full screen gradient background.
Center card:
  Hardware ID display (copyable, break-all text)
  License key input (uppercase, RCG- format)
  "Activate" button with spinner
  "Start Free Trial" prominent button
  Plan cards: Monthly | Per Term | Yearly | Lifetime
  Each card links to VITE_PAYMENT_* env variable
  If expired: show expiry message + renewal options

### DashboardPage (/dashboard)
Welcome + school name + auto-detected term/session
4 stat cards: Students, Classes, Subjects, Grades
Quick actions: 4 cards to key pages
Setup checklist: shown until all items complete

### DataManagementPage (/data-management)
Three tabs: Classes | Subjects & Traits | Departments
Classes: CRUD, level (junior/senior), department
Subjects: CRUD, isCore toggle, department assignment
Traits: CRUD, category (affective/psychomotor),
  displayOrder number
Departments: edit 3 department names

### StudentsPage (/students)
Search by name or admission number
Filter by class
Sort: Name | Admission No | Class | DOB (asc/desc)
Table: Admission No | Full Name | DOB | Gender | Class
Add/Edit modal with all fields
"Download List" exports filtered+sorted to Excel
Warning banner if any "[Name Pending]" students exist

### ExcelHubPage (/excel-hub)
Download Templates section:
  Student template
  Grades template (requires class selection)
Import section:
  Admission numbers (requires class)
  Full student data
  Grades (requires class)
All show progress and detailed error list

### DataEntryPage (/data-entry)
Sticky filter bar: Class | Subject | Term | Session
Session auto-populated from useCurrentSession
Subject dropdown filtered by class level/department
Grade table: one row per student
  Columns: Name | [CA dynamic] | Exam | Total | Grade
Total and Grade auto-calc on input change
Traits: star ratings per student per trait
Attendance: days present input
Sticky "Save All" button

### ReportCardsPage (/report-cards)
Filter: Class | Student or "All Class" | Term | Session
Toggle: Single Student / Full Class
Single: preview one ReportCard
Class: all students scrollable
Export buttons:
  Download PDF (single student, named)
  Export Class ZIP (individual named PDFs)
  Export Combined PDF (all students one file)
Progress bar during bulk export

### ReportsPage (/reports)
ANALYTICS ONLY — not report cards
Report types:
  Academic Performance | Attendance |
  Class Ranking | Subject Ranking | Cumulative
Filters: Class | Term | Session | Subject |
  Gender | Score range | Grade | Top N | Bottom N
Column selector per report type
Export: table view | Excel | PDF table

### SettingsPage (/settings)
Two column: form 60% | live preview 40%
Sections:
  School Identity: name, slogan, address,
    logo, signature, brand color
  Term Config: term, session (auto-detected,
    can override), dates, days school open
  Departments: 3 name inputs
  Score Config: total, exam, CA (readonly)
  CA Components: dynamic list 2-4 items
Live preview: scaled report card

### LicensePage (/license)
Plan badge + days remaining progress bar
Hardware ID (copyable)
License key (masked)
Renewal buttons → payment links
Plan comparison table

### BackupPage (/backup)
Export full DB as JSON
Never includes activation table
Restore from JSON with overwrite warning
Last backup timestamp
Schema version in export file

---

## VITE CONFIG
```typescript
server: { port: 1420, strictPort: true },
build: {
  target: ['es2021', 'chrome100', 'safari13']
},
envPrefix: ['VITE_', 'TAURI_'],
test: { globals: true },
```

---

## CALCULATION ENGINE

Pure functions only. No Dexie. No React.

calculateAge(dateOfBirth: string): number
calculateTotal(caScores, examScore): number
deriveGradeAndRemark(total, totalSubjectScore):
  { grade: string, remark: string }
calculateClassRank(avg, allAverages[]): string
computeStudentAverage(grades[], subjects[],
  settings): number
computeOverallPercentage(avg, totalSubjectScore):
  string
buildCumulativeRecord(t1[], t2[], t3[],
  subjects[], currentTerm, settings): CumulativeRow[]
getTermLabel(term: 1|2|3): string
sanitizeFileName(name: string): string

Run vitest unit tests after writing this file.
Do not proceed to UI until all tests pass.

---

## BUILD ORDER

Complete and test each step before next.
Never skip. Never combine two steps.

PHASE 1 — FOUNDATION (Steps 1-10)
1.  vite.config.ts + tailwind config
2.  src/db/db.ts
3.  src/context/ToastContext.tsx
4.  src/components/ui/ — all 6 primitives
5.  src/lib/sessionDetector.ts
6.  src/hooks/useCurrentSession.ts
7.  src/lib/calculationEngine.ts
7a. src/lib/calculationEngine.test.ts
8.  src/components/layout/Sidebar.tsx
9.  src/components/layout/AppLayout.tsx
10. src/App.tsx
    TEST: loads, sidebar, all routes work

PHASE 2 — ACTIVATION (Steps 11-15)
11. src/lib/hardwareId.ts
12. src/lib/activationService.ts
13. src/pages/ActivationPage.tsx
14. src/components/layout/ExpiryWarningBanner.tsx
15. src/components/layout/TrialBanner.tsx
    TEST: trial activates, license works, expiry shows

PHASE 3 — SETTINGS (Steps 16-21)
16. src/lib/imageProcessor.ts
17. src/hooks/useSettings.ts
18. src/components/settings/ImageUploader.tsx
19. src/components/settings/CAComponentManager.tsx
20. src/components/settings/LivePreview.tsx
21. src/pages/SettingsPage.tsx
    TEST: save all fields, preview updates

PHASE 4 — DATA MANAGEMENT (Step 22)
22. src/pages/DataManagementPage.tsx
    TEST: add class, subject, trait — all save

PHASE 5 — STUDENTS (Step 23)
23. src/pages/StudentsPage.tsx
    TEST: add, search, sort, filter, export

PHASE 6 — EXCEL (Steps 24-25)
24. src/lib/excelService.ts
25. src/pages/ExcelHubPage.tsx
    TEST: download template, import students

PHASE 7 — DATA ENTRY (Step 26)
26. src/pages/DataEntryPage.tsx
    TEST: enter scores, total calculates, saves

PHASE 8 — REPORT CARDS + PDF (Steps 27-30)
27. src/components/reportCard/ReportCard.tsx
28. src/hooks/useReportCardData.ts
29. src/lib/pdfService.ts
30. src/pages/ReportCardsPage.tsx
    TEST: preview shows, PDF named correctly,
    bulk ZIP has individual named files

PHASE 9 — ANALYTICS (Steps 31-33)
31. src/lib/reportBuilder.ts
32. src/lib/reportColumns.ts
33. src/pages/ReportsPage.tsx
    TEST: class ranking generates, Excel export works

PHASE 10 — SUPPORT (Steps 34-37)
34. src/pages/DashboardPage.tsx
35. src/lib/backupService.ts
36. src/pages/BackupPage.tsx
37. src/pages/LicensePage.tsx
    TEST: all pages load, backup works

---

## ENVIRONMENT VARIABLES (.env)
```
VITE_LICENSE_API_URL=https://rcpro-license-server.rcpro-license.workers.dev
VITE_LICENSE_PORTAL_URL=https://rcpro-license-server.rcpro-license.workers.dev/api/portal
VITE_PAYMENT_MONTHLY_URL=https://replace-me
VITE_PAYMENT_TERM_URL=https://replace-me
VITE_PAYMENT_YEARLY_URL=https://replace-me
VITE_PAYMENT_LIFETIME_URL=https://replace-me
VITE_PAYMENT_TRIAL_URL=https://replace-me
```