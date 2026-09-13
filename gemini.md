# GEMINI — ScholarSync Instructions

## ARCHITECTURE

- Frontend: React + Vite (Client-side)
- Database/Auth: Firebase (Firestore + Auth)
- Backend: Express (Node.js)
- Hosting: Render (for Express server)
- Licensing: Paystack Webhooks -> n8n -> Firebase

Read this file completely before every response.
No exceptions. These rules override everything.

---

## WHAT YOU ARE DOING

You are improving an existing React + TypeScript +
Tailwind + Dexie.js application called ScholarSync.
The app already has code. Your job is to fix, improve,
and complete it — not rebuild from scratch.

---

## THE ONE RULE THAT MATTERS MOST

Write ONE file per response. Then stop completely.
Wait for the developer to confirm it works.
Do not write the next file until told to proceed.
Do not add anything not asked for in the current prompt.

---

## BEFORE WRITING ANY LINE OF CODE

Ask yourself these four questions:
1. Is this file listed in blueprint.md FOLDER STRUCTURE?
2. Does every import I need already exist?
3. Have I checked blueprint.md DATABASE SCHEMA
   for the exact field names I need?
4. Am I writing only what this specific prompt asks?

If any answer is NO — stop and explain why.

---

## STRICT CODING RULES

### Imports
- Types only: import type { X } from 'y'
- Values only: import { X } from 'y'
- Never mix on same line
- Never import from a file not yet confirmed working

### Toast
showToast(message, type)
message FIRST — type SECOND — always
Valid types: 'success' | 'error' | 'info'
'warning' does NOT exist — never use it

### EmptyState component
Accepts ONLY: icon (string) and message (string)
No title prop. No action prop. No children.

### Icons
Use lucide-react only
No emoji as functional icons in components
No other icon libraries

### Dexie queries
CORRECT:
  db.grades
    .where('studentId').equals(id)
    .and(g => g.term === term && g.session === s)

WRONG — do not use object syntax:
  db.grades.where({ studentId: id, term: term })

### PDF
jsPDF + jspdf-autotable for all PDF generation
html2canvas only for logo and signature images
Never use react-to-print
Every downloaded PDF must have a meaningful filename

### Mobile
320px minimum width for every component
Sidebar hidden on mobile with hamburger button
Tables always wrapped in overflow-x-auto
Tailwind mobile-first: base = mobile, lg: = desktop

---

## FIELD NAMES — CHECK EVERY TIME

Full schema in blueprint.md → DATABASE SCHEMA

Never guess. Always verify. Common mistakes:

ISettings  → brandColor        NOT color
ISettings  → totalSubjectScore NOT maxScore
ISettings  → caComponents      NOT components
IClass     → className         NOT name
IClass     → teacherName       NOT teacher
IStudent   → fullName          NOT name
IStudent   → dateOfBirth       NOT dob
IGrade     → caScores          NOT scores
IGrade     → NO classId field on IGrade
ITrait     → traitName         NOT name
ITrait     → displayOrder      NOT order
ITrait     → category field: 'affective'|'psychomotor'

---

## IMPORT PATHS BY LOCATION

src/pages/
  '../db/db'
  '../lib/xxx'
  '../hooks/xxx'
  '../context/ToastContext'
  '../types/xxx'
  '../components/ui/xxx'
  '../components/layout/xxx'
  '../components/reportCard/xxx'
  '../components/settings/xxx'

src/components/reportCard/
  '../../db/db'
  '../../lib/xxx'
  '../../types/xxx'

src/components/settings/
  '../../db/db'
  '../../lib/xxx'

src/hooks/
  '../db/db'
  '../lib/xxx'
  '../types/xxx'

src/lib/
  '../db/db'
  '../types/xxx'

---

## FILES THAT DO NOT EXIST — NEVER IMPORT

../lib/reportService
../lib/gradeService
../components/reports/ReportContainer
../components/settings/GeneralSettings
../components/settings/ScoreSettings
../components/ui/Button

---

## APPROVED PACKAGES ONLY

react-router-dom, dexie, dexie-react-hooks,
lucide-react, jspdf, jspdf-autotable,
html2canvas, jszip, xlsx, @tauri-apps/api, vitest

Do not install anything else without asking first.

---

## ALL REQUIRED PAGES

/                 ActivationPage.tsx
/dashboard        DashboardPage.tsx
/data-management  DataManagementPage.tsx
/students         StudentsPage.tsx
/excel-hub        ExcelHubPage.tsx
/data-entry       DataEntryPage.tsx
/report-cards     ReportCardsPage.tsx
/reports          ReportsPage.tsx
/settings         SettingsPage.tsx
/backup           BackupPage.tsx
/license          LicensePage.tsx

ReportsPage = analytics query builder (rankings,
  attendance, subject performance tables).
ReportCardsPage = individual student report card
  preview and PDF export.
These serve completely different purposes.
Never merge them. Never delete either.

---

## HOW TO END EVERY RESPONSE

Always end with exactly this format:
"✅ Step [N] done — run npm run dev, test [specific
thing to test], then reply Step [N] works or
paste the error."

Nothing after this line. Stop. Wait.