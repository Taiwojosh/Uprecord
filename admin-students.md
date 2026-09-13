# AcadaCore — Layer 5: Admin Students Page

## Context
This is the Students management page for the Admin portal.
Build on top of the shared layout shell from Layer 1.
This is the most data-heavy page in the admin portal.
It must support large student lists efficiently.

## Route
/admin/students

## Role Access
Admin only.

---

## LAYOUT STRUCTURE

### Sidebar
Active item: Students
All other sidebar items unchanged from Layer 4.

### Page Header
Left:
- Title: "Students" (h1, slate 800)
- Subtitle: "Manage all student records 
             across your school." (14px, slate 500)

Right (action buttons row):
- "Bulk Import" secondary button 
  (icon: upload_file, slate 800 border)
- "Add Student" primary button 
  (icon: add, slate 800 bg, white text)

---

## FILTER & SEARCH BAR
Full width bar below page header.
White card, slate 200 border, 8px radius, 16px padding.
Single horizontal row (wraps on mobile):

1. Search input (grows to fill space):
   - Icon: search (left inside input)
   - Placeholder: "Search by name, student ID, 
                   or parent phone..."

2. Class filter select:
   - Placeholder: "All Classes"
   - Options: All Classes | JSS1 | JSS2 | JSS3 | 
              SS1 | SS2 | SS3

3. Status filter select:
   - Placeholder: "All Status"
   - Options: All | Active | Inactive | Graduated | 
              Suspended

4. Gender filter select:
   - Placeholder: "All Gender"
   - Options: All | Male | Female

5. "Filter" ghost button (icon: tune)

6. "Reset" ghost button (icon: restart_alt, 
    slate 400 text — only visible when filters active)

---

## BULK ACTION BAR
Hidden by default.
Appears ABOVE the table when any checkbox is selected.
Slate 800 background, white text, 
full width, 48px height, 12px padding.
Slides down smoothly when visible.

Content (horizontal row):
- Left: "[N] students selected" (14px, white)
- Right (action buttons, white ghost style):
  - icon: mail → "Send SMS"
  - icon: class → "Move Class"
  - icon: block → "Deactivate"
  - icon: delete → "Delete"
    (red 400 text, danger action)
  - Divider
  - icon: close → "Clear Selection" 
    (dismisses bulk bar, unchecks all)

---

## STUDENTS TABLE

### Table Header Row
Background: slate 50
Border bottom: slate 200
Height: 40px

Columns (left to right):
1. Checkbox (select all) — 48px width
2. "STUDENT" — sortable, grows to fill
3. "CLASS" — sortable, 120px
4. "GENDER" — 100px
5. "FEES STATUS" — 140px
6. "STATUS" — 120px
7. "ENROLLED" — sortable, 130px
8. "" (actions column) — 64px

### Table Body Rows
Height: 56px per row
Bottom border: slate 100
Hover: slate 50 background
Transition: smooth colour change

Each row contains:

Column 1 — Checkbox:
Standard checkbox, slate 800 checked colour

Column 2 — Student (combined cell):
- Avatar circle (36px):
  If photo: show photo
  If no photo: slate 200 bg, 
  student initials (slate 600, 13px, bold)
- Right of avatar:
  Student full name (14px, slate 800, medium weight)
  Student ID below name (11px, slate 400)
  e.g. "STU-2024-0042"

Column 3 — Class:
Pill badge: slate 100 bg, slate 700 text, 12px
e.g. "SS2A" | "JSS1B"

Column 4 — Gender:
Plain text, 14px, slate 600
"Male" or "Female"

Column 5 — Fees Status:
Badge component:
- PAID: emerald 100 bg, emerald 700 text
- PARTIAL: amber 100 bg, amber 700 text
- UNPAID: red 100 bg, red 700 text

Column 6 — Status:
Badge component:
- Active: emerald 100 bg, emerald 700 text
- Inactive: slate 100 bg, slate 500 text
- Suspended: red 100 bg, red 700 text

Column 7 — Enrolled:
Plain text, 14px, slate 500
e.g. "Sep 2024"

Column 8 — Actions:
Three-dot menu button (⋮)
Hidden by default, visible on row hover
On click: dropdown menu appears (white card, 
shadow, 8px radius, slate 200 border)

Dropdown items:
- icon: visibility → "View Profile"
- icon: edit → "Edit Details"
- icon: class → "Change Class"
- icon: receipt_long → "View Fee Record"
- [divider]
- icon: block → "Deactivate Account"
  (slate 600 text)
- icon: delete → "Delete Student"
  (red 600 text, danger)

### Sample Data Rows (10 rows)

Row 1: 
Amara Okafor | STU-2024-0001 | SS2A | Female | PAID | Active | Sep 2024

Row 2:
Chidi Nwosu | STU-2024-0002 | SS3B | Male | UNPAID | Active | Sep 2023

Row 3:
Fatima Abdullahi | STU-2024-0003 | JSS1A | Female | PARTIAL | Active | Sep 2024

Row 4:
Emeka Eze | STU-2024-0004 | SS1A | Male | PAID | Active | Sep 2024

Row 5:
Ngozi Adeyemi | STU-2024-0005 | JSS3B | Female | PAID | Active | Sep 2022

Row 6:
Tunde Bakare | STU-2024-0006 | SS2B | Male | UNPAID | Suspended | Sep 2023

Row 7:
Aisha Mohammed | STU-2024-0007 | JSS2A | Female | PARTIAL | Active | Sep 2023

Row 8:
Obinna Obi | STU-2024-0008 | SS3A | Male | PAID | Active | Sep 2022

Row 9:
Chisom Ike | STU-2024-0009 | JSS1B | Female | UNPAID | Active | Sep 2024

Row 10:
Samuel Adewale | STU-2024-0010 | SS1B | Male | PAID | Active | Sep 2024

---

## TABLE FOOTER / PAGINATION
Full width, white bg, slate 200 top border,
16px padding, flex row space-between.

Left:
"Showing 1–10 of 1,284 students" (13px, slate 500)

Centre:
Rows per page select: "10 | 25 | 50 | 100"
(small select, slate 200 border)

Right (pagination controls):
[First] [← Prev] [1] [2] [3] ... [129] [Next →] [Last]
Current page: slate 800 bg, white text, 8px radius
Other pages: white bg, slate 200 border

---

## ADD STUDENT MODAL
Triggered by "Add Student" button.
Uses modal component from Layer 1.
Max width: 560px. Scrollable body.

Header: "Add New Student"

Body — tabbed form (2 tabs):
Tab 1: "Personal Info" (active by default)
Tab 2: "Academic Info"

TAB 1 — PERSONAL INFO:
Fields in 2-column grid (single column on mobile):

Row 1:
- First Name (required)
- Last Name (required)

Row 2:
- Date of Birth (date picker input)
- Gender (select: Male / Female)

Row 3:
- Phone Number (parent/guardian)
- Email Address (parent/guardian, optional)

Row 4:
- Home Address (full width textarea, 3 rows)

Row 5:
- Student Photo upload:
  Dashed box, 80px height, full width
  icon: add_photo_alternate
  Text: "Upload student photo (optional)"
  Subtext: "JPG or PNG, max 1MB"

TAB 2 — ACADEMIC INFO:
Row 1:
- Class (select, required):
  JSS1A | JSS1B | JSS2A | JSS2B | JSS3A | JSS3B |
  SS1A | SS1B | SS2A | SS2B | SS3A | SS3B

- Admission Number (auto-generated, 
  show as disabled input with generated value)
  e.g. "STU-2024-0085"

Row 2:
- Date of Admission (date picker)
- Previous School (optional text input)

Row 3:
- Medical Notes (optional textarea, 2 rows)
  Placeholder: "Any medical conditions or 
                allergies to note..."

Footer buttons:
Left: "Cancel" secondary button
Right: "Save Student" primary button
       Loading state: "Saving..." + spinner

Success state (after save):
Replace modal content with:
- Emerald checkmark circle (48px)
- "Student Added Successfully"
- "Amara Okafor has been added to SS2A."
- Two buttons: 
  "Add Another Student" (secondary)
  "View Student Profile" (primary)

---

## BULK IMPORT MODAL
Triggered by "Bulk Import" button.
Max width: 480px.

Header: "Bulk Import Students"

Body:
Step 1 — Download Template:
- Info card (slate 50 bg, slate 200 border):
  icon: info (slate 500)
  Text: "Download our Excel template, fill in 
         student data, then upload it below."
- "Download Template" secondary button 
  (icon: download)

Step 2 — Upload File:
- Large dashed upload box:
  icon: upload_file (48px, slate 400)
  Heading: "Drop your Excel file here"
  Subtext: "or click to browse"
  Accepted: ".xlsx or .csv files only"

After file selected:
- Show file name + size
- Show "Validating..." progress bar
- Then show validation result:
  
  Success: 
  Emerald 50 bg card:
  "✓ 47 students ready to import"
  "0 errors found"
  
  Warning (with errors):
  Amber 50 bg card:
  "⚠ 44 students ready to import"
  "3 rows have errors — download error report"

Footer:
"Cancel" secondary + "Import Students" primary
(primary disabled until validation passes)

---

## STUDENT PROFILE PAGE
Route: /admin/students/[studentId]
Full page (not modal) — navigated to from table row.

Back navigation:
"← Back to Students" (14px, slate 500, top left)

### Profile Header Card
White card, full width, slate 200 border, 8px radius.
Horizontal layout:

Left section:
- Student photo (80px circle, slate 200 bg if none)
- Below photo: Upload photo link (12px, slate 500)

Centre section:
- Student full name (h1, slate 800)
- Student ID badge: "STU-2024-0001" 
  (slate 100 bg, slate 700, pill)
- Class badge: "SS2A" (slate 800 bg, white, pill)
- Status badge: "Active" (emerald)
- Row of meta info (14px, slate 500):
  icon: cake "15 years old"
  icon: female/male "Female"  
  icon: calendar_today "Enrolled Sep 2024"

Right section:
Action buttons (top right of card):
- "Edit Profile" secondary button (icon: edit)
- "Print Profile" ghost button (icon: print)
- Three dot menu: 
  "Change Class" | "Deactivate" | "Delete Student"

### Profile Tabs
Underline tab style (from Layer 1):
Overview | Academic | Attendance | Fees | 
Results | Documents

#### TAB: OVERVIEW (default)
Two column layout:

Left column — Personal Information card:
Title: "Personal Information" (h3)
Edit icon top right (pencil, ghost)
Field rows (label left, value right):
- Full Name: Amara Okafor
- Date of Birth: 14 March 2009
- Gender: Female
- Phone (Parent): +234 803 000 0001
- Email (Parent): parent@email.com
- Home Address: 12 Adeyemi Street, Surulere, Lagos
- Medical Notes: None

Right column — Academic Summary card:
Title: "Academic Summary" (h3)
- Current Class: SS2A
- Class Teacher: Mr. Adeyemi Oluwafemi
- Admission Date: September 2024
- Previous School: Greenfield Primary School
- Avg. Score (This Term): 78%
- Attendance Rate: 94%

#### TAB: FEES
Full width table of fee records:
Columns: Term | Session | Amount | Paid | 
         Balance | Status | Date Paid

#### TAB: RESULTS
Term selector dropdown top right.
Results table:
Columns: Subject | CA Score | Exam Score | 
         Total | Grade | Remark

#### TAB: ATTENDANCE
Month/week view switcher.
Calendar grid showing:
- Present: emerald dot
- Absent: red dot  
- Late: amber dot
Summary row: Present X | Absent X | Late X

---

## LOADING STATES
- Table: show 10 skeleton rows on load
- Profile page: skeleton for header card + tabs
- Filter selects: disabled with shimmer while loading

## EMPTY STATES
No students found (after filter):
icon: search_off
"No students match your search."
"Try adjusting your filters or search term."
"Clear Filters" ghost button

No students at all:
icon: group_add
"No students yet."
"Start building your student roster."
"Add First Student" primary button

---

## RESPONSIVE BEHAVIOUR
Desktop: Full table with all columns
Tablet: Hide "Enrolled" and "Gender" columns,
        show horizontal scroll indicator
Mobile: 
- Replace table with card list view
- Each card: Avatar + Name + Class + 
             Fees badge + Status badge + 
             three-dot menu
- Search bar full width, stacked filters below
- Add Student button: floating action button 
  bottom right (slate 800 circle, white + icon)

---

## INTERACTION NOTES
- Clicking student name → opens Student Profile page
- Clicking avatar → opens Student Profile page
- Selecting any checkbox → shows Bulk Action Bar
- Selecting all checkbox → selects current page only,
  show "Select all 1,284 students" link if needed
- Sort clicking column header: 
  shows sort arrow (up/down), re-orders table
- Delete student → confirmation modal:
  "Are you sure you want to delete Amara Okafor? 
   This action cannot be undone."
  Cancel | "Delete Student" (danger red button)
- Deactivate → confirmation modal (same pattern)
- All modals closeable via X button or 
  clicking backdrop

---

## COMPONENT REFERENCES (Layer 1)
- Table → Data table component
- Badges → Badge component (all variants)
- Modals → Modal component
- Tabs → Tab component (underline style)
- Inputs → Form input components
- Buttons → Button component (all variants)
- Skeletons → Loading skeleton component
- Empty states → Empty state component
- Pagination → Standard pagination pattern