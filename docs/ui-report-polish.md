# Report-Card Presentation and Printing Polish (GlobePen)

## 1. Executive Summary

This document details the enhancements made to the GlobePen report-card presentation and printing subsystems across the three core templates (**Classic**, **Modern**, **Minimal**) and the **Live Preview** component.

All changes were implemented strictly within the designated worktree (`feature/ui-report-polish`) without modifying global CSS, shared UI primitives, `SettingsPage.tsx`, routing, backend APIs, database schemas, or package dependencies.

---

## 2. Key Areas of Improvement

### 2.1 Arbitrary School-Color Contrast
* **Problem**: When a school configured a light brand color (e.g., gold `#FFD700`, bright yellow `#FACC15`, or pastel hues), previous hardcoded white elements (`text-white`, `border-white/20`, `bg-white/20`) became unreadable or washed out against the brand background.
* **Solution**:
  - Implemented `BrandContrastDetails` and `getBrandContrastDetails(hexColor)` in `src/components/reportCard/templates/types.ts`.
  - Dynamically calculates luminance based on WCAG 2.1 formulas (`brandContrast`), deriving appropriate contrast tokens:
    - Text color (`#000000` for light backgrounds, `#ffffff` for dark backgrounds).
    - Subtext/slogan color (`rgba(0,0,0,0.75)` vs `rgba(255,255,255,0.85)`).
    - Badge backgrounds and borders (`rgba(0,0,0,0.08)` / `rgba(0,0,0,0.15)` vs `rgba(255,255,255,0.20)` / `rgba(255,255,255,0.25)`).
    - Table header borders using subtle opacity (`border-current/20` and `borderSubtle`).
  - Applied across headers, badges, trait tables, and grading keys in `ClassicTemplate`, `ModernTemplate`, `MinimalTemplate`, and `LivePreview`.

### 2.2 School Identity & Long-Name Wrapping
* **Problem**: Very long school names, mottos, addresses, or compound student names caused header clipping, layout breakage, or awkward truncation with ellipsis (`...`).
* **Solution**:
  - Added `break-words`, `leading-tight`, and maximum width constraints across school headers and slogans.
  - In `InfoRow` and `ModernInfoRow`, added wrapping support for student full names and teacher names (`break-words max-w-[145px]` / `break-words max-w-md`), ensuring official names are never truncated with `...`.
  - In the grades tables, subject columns now feature `break-words max-w-[125px]` (or `max-w-[140px]`) and `leading-tight`, allowing long subjects (e.g., "Christian Religious Studies", "Technical Drawing") to wrap cleanly without misaligning score columns.

### 2.3 Logo Failure & Missing-Logo Fallbacks
* **Problem**: If `settings.logoBase64` was missing, corrupt, invalid base64, or failed to load over the network, browsers displayed a broken image icon. Furthermore, background watermarks would display distorted image errors.
* **Solution**:
  - Added `onError={() => setLogoError(true)}` state management in all templates and `LivePreview`.
  - Gracefully falls back to uppercase school initials via `getSchoolInitials(settings.schoolName)` (e.g. "Devickys Gem Schools" -> `DGS`).
  - School initials badge is styled with high-contrast borders and backgrounds matching the template's aesthetic.
  - Background watermark images automatically suppress if the logo fails to load, preventing visual corruption.
  - Added `onError` fallback on `principalSignatureBase64` to cleanly fall back to a traditional signature line.

### 2.4 Mobile Preview Overflow
* **Problem**: Report cards have an A4 dimension (`210mm` ≈ 794px). On mobile devices (< 640px), rendering a fixed 210mm container blew out the parent viewport. Similarly, `LivePreview.tsx` in `SettingsPage` caused horizontal cramping.
* **Solution**:
  - **`ReportCard.tsx`**: Wrapped templates in a responsive `.report-card-viewport` container with `w-full max-w-full overflow-x-auto py-2 sm:py-6 flex justify-center`. This contains the sheet within the mobile screen, allowing smooth horizontal panning without breaking the app layout.
  - **`LivePreview.tsx`**: Overhauled with responsive stacking (`flex-col sm:flex-row`), adaptive padding (`p-3.5 sm:p-5`), and truncated/compact grid cells for mobile viewports.

### 2.5 Printed Page Layout (`@media print`)
* **Problem**: Standard A4 printing suffered from unwanted second blank pages caused by `min-h-[297mm]` plus browser print margins, and tables/signatures were often awkwardly split across page breaks.
* **Solution**:
  - Added component-scoped `<style>` block in `ReportCard.tsx`:
    ```css
    @page {
      size: A4 portrait;
      margin: 6mm 8mm;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .report-card-viewport {
        width: 100% !important;
        max-width: 100% !important;
        overflow: visible !important;
        padding: 0 !important;
        margin: 0 !important;
        display: block !important;
      }
      .report-card-sheet {
        width: 100% !important;
        max-width: 100% !important;
        min-height: auto !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        border: none !important;
        overflow: visible !important;
      }
      .avoid-break {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
    }
    ```
  - Added `avoid-break` class to headers, student info grids, performance summary cards, table rows, trait tables, grading keys, remarks, and signature blocks.
  - Single-term and standard report cards now fit comfortably on a single A4 page without trailing blank sheets.

### 2.6 Calculation & Data Preservation
* **Verification**:
  - Total obtainable score: `currentTermSubjects.length * settings.totalSubjectScore` (preserved).
  - Student total score: sum of CA + Exam scores (preserved).
  - Average percentage: `(studentTotalScore / totalObtainable) * 100` (preserved).
  - Cumulative averages and remark generation functions (`generateTeacherRemark`, `generatePrincipalRemark`) preserved completely.

---

## 3. Files Modified

| File | Changes Made |
| :--- | :--- |
| `src/components/reportCard/templates/types.ts` | Added `BrandContrastDetails`, `getBrandContrastDetails`, `getSchoolInitials`, and extended `ReportCardTemplateProps`. |
| `src/components/reportCard/ReportCard.tsx` | Added contrast resolution, responsive mobile scroll container, and `@page`/print CSS rules. |
| `src/components/reportCard/templates/ClassicTemplate.tsx` | Added contrast-safe header/badges/tables, logo error fallback, word wrapping, and `avoid-break` print rules. |
| `src/components/reportCard/templates/ModernTemplate.tsx` | Fixed hardcoded text-white on brand badges, logo error fallback, responsive header, and print optimization. |
| `src/components/reportCard/templates/MinimalTemplate.tsx` | Added logo error fallback, word wrapping for long school/student names, contrast borders, and print optimization. |
| `src/components/settings/LivePreview.tsx` | Added mobile viewport containment, responsive stacking, logo error handling, and contrast-safe styling. |
| `docs/ui-report-polish.md` | Comprehensive documentation of design decisions, implementation, and verification evidence. |

---

## 4. Verification Evidence

1. **Lint & Typecheck**:
   - `npm run lint` (`tsc --noEmit`) completed with exit code `0` (zero errors).
2. **Automated Test Suite**:
   - `npm test` (`vitest run`) passed all **89 tests across 7 test files**:
     - `auth-hardening.test.ts` (11 tests passed)
     - `security.test.ts` (27 tests passed)
     - `phase2-regressions.test.ts` (16 tests passed)
     - `globepen-multitenancy.test.ts` (18 tests passed)
     - `pilot-registry.test.ts` (4 tests passed)
     - `demo-release.test.ts` (2 tests passed)
     - `brand-contrast.test.ts` (1 test passed)
3. **Production Build**:
   - `npm run build` (`vite build`) successfully transformed all 3,167 modules and generated production assets.

---

## 5. Remaining Limitations

1. **Browser Print Background Graphics**:
   - Exact color and background printing in Chromium/Safari requires the user or browser default to have "Background graphics" enabled in the print preview dialog. We set `-webkit-print-color-adjust: exact` and `print-color-adjust: exact`, but browser security policies allow users to uncheck this box.
2. **Extremely High Subject Counts**:
   - For classes with 18+ subjects, a single A4 page naturally paginates onto a second page. The `avoid-break` rules ensure individual rows and footer blocks do not slice across the page boundary, but very large subject lists will span two pages by necessity.
