# AcadaCore — Layer 7: Admin Settings, Reports, 
# Teachers & Classes Pages

## Context
Final four pages of the Admin portal.
Build on shared layout shell from Layer 1.
Use all components from design system.
These pages complete the full Admin portal.

---

# PAGE 1 — SETTINGS

## Route
/admin/settings

## Role Access
Admin only.

---

## PAGE HEADER
Left:
- Title: "Settings" (h1, slate 800)
- Subtitle: "Configure your school portal, 
             branding, and system preferences."
             (14px, slate 500)

Right:
- "Save Changes" primary button 
  (icon: save, slate 800 bg, white text)
  Disabled by default.
  Enabled when any setting is changed.
  Loading state: "Saving..." + spinner

---

## SETTINGS NAVIGATION
Left sidebar within the page content area.
NOT the main sidebar — this is a secondary 
inner navigation panel.
White card, slate 200 border, 8px radius.
Width: 220px fixed, full height of content.
Sticky on scroll.

Navigation items (underline active style):
- School Branding (active by default)
- Academic Sessions
- Grading System
- Fee Structure
- Notifications
- User Permissions
- System Preferences

Each item: 14px, slate 600 text, 
           16px padding, hover slate 50 bg.
Active: slate 800 text, 
        left border 2px emerald 500.

---

## SETTINGS CONTENT AREA
Right of inner nav. Grows to fill.
Each section is a white card, 
slate 200 border, 8px radius, 24px padding.
One card per settings group.

---

### SECTION: SCHOOL BRANDING

Card title: "School Branding" (h3, slate 800)
Subtitle: "Customise how your school 
           appears across the portal."
           (13px, slate 500)

Divider below title.

FIELDS:

School Logo:
Row layout: logo preview left, 
            upload controls right.
Logo preview: 
  80px circle, slate 100 bg, 
  school initial if no logo.
  Current logo image if uploaded.
Upload controls:
  "Change Logo" secondary button (icon: upload)
  "Remove" ghost button (red text, if logo exists)
  Helper: "PNG or JPG • Recommended 200×200px • Max 2MB"
  (11px, slate 400)

School Name:
Label: "School Name"
Input: full width text input
Value: "Greenfield Academy"

School Tagline:
Label: "Tagline (optional)"
Input: full width text input
Placeholder: "e.g. Nurturing Excellence Since 1995"

School Email:
Label: "Official School Email"
Input: email type

School Phone:
Label: "School Phone Number"
Input: tel type, +234 prefix

School Address:
Label: "School Address"
Textarea: 3 rows, full width

School Website:
Label: "Website (optional)"
Input: url type
Placeholder: "https://yourschool.edu.ng"

School Type:
Label: "School Type"
Select: Nursery & Primary | Secondary | 
        Combined | Higher Institution

State:
Label: "State"
Select: All 36 Nigerian states + FCT

---

### SECTION: ACADEMIC SESSIONS

Card title: "Academic Sessions" (h3)
Subtitle: "Manage your academic calendar 
           and active term." (13px, slate 500)

Current Session row:
Label: "Active Session"
Select: "2024/2025" (current)
Helper: "This is the session all new 
         records will be assigned to."
         (11px, slate 400)

Current Term row:
Label: "Active Term"
3 pill toggle buttons in a row:
First Term | Second Term | Third Term
Active: slate 800 bg, white text.
Inactive: white bg, slate 200 border, slate 600 text.

Term Dates section:
3 rows (one per term):

Row header: "First Term"
Start Date: date picker input
End Date: date picker input
Holidays: "+ Add Holiday" ghost link

Row header: "Second Term"
Start Date: date picker input
End Date: date picker input

Row header: "Third Term"
Start Date: date picker input
End Date: date picker input

Add New Session:
"+ Add New Academic Session" ghost button
full width, dashed slate 200 border, slate 500 text

---

### SECTION: GRADING SYSTEM

Card title: "Grading System" (h3)
Subtitle: "Define how scores are graded 
           and displayed." (13px, slate 500)

System selector row:
Label: "Grading System"
3 option cards in a row (radio card style):

Card A — Nigerian (WAEC):
Radio selected indicator top right.
Title: "Nigerian — WAEC"
Body: "A1–F9 • Term-based • 100 marks"
Border: 2px slate 800 (if selected)
        1px slate 200 (if not)

Card B — UK (GCSE):
Title: "UK — GCSE"
Body: "A*–U • Semester-based"

Card C — Custom:
Title: "Custom"
Body: "Define your own grade bands"

Grading Scale table (shows below selector):
For Nigerian system:

Editable table rows:
Columns: Grade | Min Score | Max Score | 
         Remark | Action

A1 | 75 | 100 | Excellent | (delete icon)
B2 | 70 | 74  | Very Good | (delete icon)
B3 | 65 | 69  | Good      | (delete icon)
C4 | 60 | 64  | Credit    | (delete icon)
C5 | 55 | 59  | Credit    | (delete icon)
C6 | 50 | 54  | Credit    | (delete icon)
D7 | 45 | 49  | Pass      | (delete icon)
E8 | 40 | 44  | Pass      | (delete icon)
F9 | 0  | 39  | Fail      | (delete icon)

Each row: editable inline 
          (click value to edit in place)
Last row: "+ Add Grade Band" ghost link

Pass mark setting:
Label: "Minimum Pass Mark"
Number input: "50" with helper 
"Students scoring below this are marked as Fail."

---

### SECTION: NOTIFICATIONS

Card title: "Notifications" (h3)
Subtitle: "Control when and how 
           notifications are sent." (13px, slate 500)

SMS NOTIFICATIONS subsection:
Label: "SMS Notifications" (12px, slate 500, uppercase)
Divider below label.

Toggle rows (label left, toggle right):
Each toggle: slate 800 when ON, 
             slate 300 when OFF.

Row 1: "Send SMS when results are published"
       ON by default

Row 2: "Send fee payment reminders"
       ON by default
       Sub-option (indented, shows when ON):
       "Send reminder X days before due date"
       Number input: "7" days

Row 3: "Send SMS for new announcements"
       ON by default

Row 4: "Send SMS when student is marked absent"
       OFF by default

Row 5: "Send weekly attendance summary to parents"
       OFF by default

SMS BALANCE row:
Slate 50 card, slate 200 border, 8px radius:
Left: icon sms (slate 600) + 
      "SMS Balance: 1,247 credits remaining"
      (14px, slate 800)
Right: "Buy More Credits" secondary button (small)

EMAIL NOTIFICATIONS subsection:
Label: "Email Notifications" (12px, uppercase)
Divider.

Toggle rows:
Row 1: "Email admin on new student registration" ON
Row 2: "Email teacher when results are due" ON
Row 3: "Email school owner weekly summary report" OFF

---

### SECTION: USER PERMISSIONS

Card title: "User Permissions" (h3)
Subtitle: "Control what each role 
           can see and do." (13px, slate 500)

3 permission columns (one per role):

ADMIN column:
Role label: "ADMIN" badge (slate 800 bg, white)
Permission list with checkboxes:
(All checked, most disabled — admin has full access)
☑ View all student records
☑ Edit student records
☑ Publish results
☑ Record fee payments
☑ Manage teachers
☑ Manage classes
☑ Access audit logs
☑ Manage settings

TEACHER column:
Role label: "TEACHER" badge (blue 700 bg, white)
Permission list:
☑ View assigned class students
☑ Enter results (assigned subjects)
☑ Mark attendance
☑ Post assignments
☑ View class performance reports
☐ View other class results (unchecked, toggle)
☐ Edit student personal info (unchecked, toggle)
☐ Send SMS to parents (unchecked, toggle)

STUDENT column:
Role label: "STUDENT" badge (emerald 700 bg, white)
Permission list:
☑ View own results
☑ View own attendance
☑ Submit assignments
☑ View timetable
☑ View announcements
☐ Download report cards (unchecked, toggle)
☐ View class rankings (unchecked, toggle)

---

### SECTION: SYSTEM PREFERENCES

Card title: "System Preferences" (h3)

Fields:

Portal Language:
Select: English (default) | French | Hausa | 
        Yoruba | Igbo

Date Format:
Select: DD/MM/YYYY (default) | MM/DD/YYYY | 
        YYYY-MM-DD

Time Zone:
Select: Africa/Lagos (WAT, UTC+1) — default

Result Display Format:
Radio options:
○ Show scores only (e.g. 78)
○ Show scores and grade (e.g. 78 — A1)
● Show scores, grade and remark 
  (e.g. 78 — A1 — Excellent) ← default

Danger Zone section:
Red 50 bg card, red 200 border, 8px radius:
Title: "Danger Zone" (red 700, h3)
Body: "These actions are permanent 
       and cannot be undone."

Two action rows:
Row 1:
Label: "Reset All Results for Current Term"
Body: "This will delete all score entries 
       for the current term." (13px, slate 500)
Button: "Reset Results" 
(white bg, red 600 border, red 600 text)

Row 2:
Label: "Delete School Account"
Body: "Permanently delete this school 
       and all associated data." (13px, slate 500)
Button: "Delete Account" 
(red 600 bg, white text)

Both buttons trigger confirmation modals.

---

# PAGE 2 — REPORTS

## Route
/admin/reports

## Role Access
Admin only.

---

## PAGE HEADER
Left:
- Title: "Reports" (h1, slate 800)
- Subtitle: "Analyse school performance 
             and export data." (14px, slate 500)

Right:
- "Export Report" primary button 
  (icon: download, slate 800)

---

## SESSION/TERM FILTER BAR
Same pattern as Results and Fees pages.
Session | Term | Class selectors in white card bar.

---

## REPORTS OVERVIEW CARDS
4 stat cards in a row:

Card 1 — School Average
Icon: grade (slate 800)
Number: 74%
Label: "School Average Score"
Trend: "+2% vs last term" (emerald)

Card 2 — Highest Performing Class
Icon: emoji_events (amber 500)
Number: "SS3A"
Label: "Highest Performing Class"
Sub: "84% average" (13px, slate 500)

Card 3 — Students at Risk
Icon: warning (red 500)
Number: 127
Label: "Students Scoring Below 50%"
Sub: "Across all classes" (13px, slate 500)

Card 4 — Pass Rate
Icon: task_alt (emerald 500)
Number: 89%
Label: "Overall Pass Rate This Term"
Trend: "-1% vs last term" (amber)

---

## REPORTS TABS
Underline tab style:
Overview | By Class | By Subject | 
By Student | Attendance | Fee Collection

### TAB: OVERVIEW

Two column row:

LEFT — Performance Trend Chart:
White card, slate 200 border, 8px radius.
Title: "School Performance Trend" (h3)
Subtitle: "Average score per term 
           over last 3 sessions" (12px, slate 400)

Line chart placeholder:
X-axis: Term 1 '23 | Term 2 '23 | Term 3 '23 | 
         Term 1 '24 | Term 2 '24 | Term 3 '24
Y-axis: 0% to 100%
Line: slate 800 colour, smooth curve
Data points: filled circles, slate 800
Chart area fill below line: 
slate 800 at 8% opacity

RIGHT — Subject Performance:
White card, slate 200 border, 8px radius.
Title: "Average Score by Subject" (h3)
Subtitle: "First Term 2024/2025" (12px, slate 400)

Horizontal bar chart:
Mathematics:  ██████████░░ 72%
English:      ████████████ 80%
Physics:      ████████░░░░ 65%
Chemistry:    ███████░░░░░ 61%
Biology:      ██████████░░ 74%
Economics:    ████████████ 82%
Government:   █████████░░░ 70%
Literature:   ██████████░░ 75%

Bars: emerald 500 fill, slate 100 track
Labels: 12px, slate 600 left, 
        percentage bold right

Below chart:
Weakest subject callout:
Amber 50 card, amber 200 border:
icon: trending_down (amber 500)
"Chemistry has the lowest average (61%). 
Consider targeted support."

---

### TAB: BY CLASS

Full width table:
Columns: Class | Teacher | Students | 
         Avg Score | Pass Rate | 
         Highest | Lowest | Action

Performance colour coding on Avg Score:
80%+: emerald 700
65–79%: blue 600
50–64%: amber 600
Below 50%: red 600

Action column: "View Details" link (slate 500)

---

### TAB: BY STUDENT

Search bar: "Search student name..."

Table columns:
Student (name + ID) | Class | 
Avg Score | Grade | Attendance | 
Fee Status | Action

Sort by: Avg Score descending by default

Top performers section above table:
"Top 5 Students This Term" 
(amber 50 card, medal icons 🥇🥈🥉)
Horizontal scroll cards on mobile.

At-risk section (below table):
"Students Needing Attention"
Red 50 card, red 200 border:
Students scoring below 50% listed with:
Name | Class | Score | 
"Notify Teacher" action button

---

## EXPORT OPTIONS CARD
White card, slate 200 border, 8px radius.
Full width, below tabs.

Title: "Export Reports" (h3)
Subtitle: "Download school data for 
           offline use or printing." (13px, slate 500)

6 export option rows:
Each row: icon left + title + description + 
          "Export" secondary button right

Row 1:
icon: description
"Full School Report — PDF"
"Complete performance report for current term"
Button: "Export PDF"

Row 2:
icon: table_view
"Student Results — Excel"
"All student scores in spreadsheet format"
Button: "Export Excel"

Row 3:
icon: payments
"Fee Collection Report — PDF"
"Fee status and payment records for current term"
Button: "Export PDF"

Row 4:
icon: event_available
"Attendance Report — Excel"
"Daily attendance records for all classes"
Button: "Export Excel"

Row 5:
icon: groups
"Student List — Excel"
"Full student roster with contact details"
Button: "Export Excel"

Row 6:
icon: badge
"Teacher Report — PDF"
"Teacher workload and class assignments"
Button: "Export PDF"

---

# PAGE 3 — TEACHERS

## Route
/admin/teachers

## Role Access
Admin only.

---

## PAGE HEADER
Left:
- Title: "Teachers" (h1, slate 800)
- Subtitle: "Manage teacher accounts 
             and class assignments." (14px, slate 500)

Right:
- "Invite Teacher" primary button 
  (icon: person_add, slate 800 bg, white text)

---

## FILTER BAR
White card, slate 200 border, 8px radius.

Controls:
1. Search: "Search by name or email..."
2. Subject filter select: "All Subjects"
3. Class filter select: "All Classes"
4. Status filter select: "All | Active | Inactive"

---

## TEACHERS TABLE
White card, slate 200 border, 8px radius.

### Table Columns
1. "TEACHER" (avatar + name + email) — grows
2. "SUBJECTS" — 180px (badge list)
3. "CLASSES" — 150px (badge list)
4. "STUDENTS" — 100px
5. "STATUS" — 110px (badge)
6. "JOINED" — 120px
7. "" (actions) — 64px

### Sample Data

Row 1:
Mr. Adeyemi Oluwafemi | adeyemi@school.com |
English, Literature | SS2A, SS3A |
60 students | Active | Aug 2023

Row 2:
Mrs. Chioma Eze | chioma@school.com |
Mathematics, Further Maths | JSS1A, JSS2A |
65 students | Active | Jan 2024

Row 3:
Mr. Ibrahim Hassan | ibrahim@school.com |
Physics, Chemistry | SS1A, SS2B |
58 students | Active | Sep 2022

Row 4:
Mrs. Balogun Folake | balogun@school.com |
Biology, Agricultural Science | SS2B, SS3B |
60 students | Inactive | Sep 2021

### Subject & Class Badges
Each subject/class shown as a small pill badge:
Slate 100 bg, slate 700 text, 11px.
If more than 2: show "+N more" badge.

### Row Action Menu (⋮)
- icon: visibility → "View Profile"
- icon: edit → "Edit Details"
- icon: class → "Manage Classes"
- icon: lock_reset → "Reset Password"
- [divider]
- icon: block → "Deactivate Account" (slate 600)
- icon: delete → "Remove Teacher" (red 600)

---

## INVITE TEACHER MODAL
Header: "Invite Teacher"
Max width: 480px.

Body fields:
- Full Name (required)
- Email Address (required)
  Helper: "An invitation will be sent to this email."
- Phone Number
- Subjects (multi-select tags input):
  Type subject name, press Enter to add tag.
  Tags: slate 100 bg, slate 700 text, 
        X to remove each tag.
- Assign Classes (multi-select checkboxes):
  Grid of class checkboxes:
  □ JSS1A □ JSS1B □ JSS2A □ JSS2B
  □ JSS3A □ JSS3B □ SS1A □ SS1B
  □ SS2A □ SS2B □ SS3A □ SS3B

Footer:
"Cancel" secondary +
"Send Invitation" primary

Success state:
Emerald checkmark + 
"Invitation sent to adeyemi@school.com"
"The teacher will receive an email with 
 login instructions."

---

## TEACHER PROFILE PAGE
Route: /admin/teachers/[teacherId]

Back: "← Back to Teachers"

### Profile Header Card
Same pattern as Student Profile (Layer 5):
- Avatar (80px circle, initials if no photo)
- Full name (h1)
- Subject badges row
- Class badges row
- Status badge
- Meta row: icon mail + email | 
            icon phone + number | 
            icon calendar_today + joined date

Right actions:
- "Edit Profile" secondary
- "Reset Password" ghost
- Three dot: "Deactivate" | "Remove Teacher"

### Profile Tabs
Overview | Classes & Subjects | 
Results | Attendance | Activity Log

#### TAB: OVERVIEW
Two columns:

Left — Personal Info card:
Full Name | Email | Phone | 
Date Joined | Qualification | 
Teaching Experience

Right — Workload Summary card:
Total Classes: 2
Total Students: 60
Subjects Teaching: 2
Results Entered This Term: 94%
Avg Class Performance: 76%

#### TAB: CLASSES & SUBJECTS
Table of assigned classes:
Class | Subject | Students | 
Results Status | Attendance Rate | Action

---

# PAGE 4 — CLASSES

## Route
/admin/classes

## Role Access
Admin only.

---

## PAGE HEADER
Left:
- Title: "Classes" (h1, slate 800)
- Subtitle: "Manage classes, 
             class teachers and student groupings." 
             (14px, slate 500)

Right:
- "Add Class" primary button 
  (icon: add, slate 800 bg, white text)

---

## CLASSES GRID VIEW
Default view: card grid (not table).
Toggle in top right to switch to table view:
icon: grid_view (active) | icon: table_rows

Grid: 3 columns desktop, 
      2 columns tablet, 
      1 column mobile.

### Class Card
White card, slate 200 border, 8px radius, 
20px padding, hover: slate 50 bg.

Card structure:

TOP ROW:
Left: Class name (h2, slate 800, bold)
      e.g. "SS2A"
Right: Three-dot menu (⋮)

MIDDLE SECTION:
Class Teacher row:
icon: person (slate 400, 16px) + 
Teacher name (14px, slate 600)
e.g. "Mr. Adeyemi Oluwafemi"

If no teacher assigned:
"No class teacher assigned" 
(amber 500, 13px, italic)
"Assign Teacher" link (12px, slate 500)

Students count:
icon: group (slate 400, 16px) + 
"32 students" (14px, slate 600)

Subjects count:
icon: book (slate 400, 16px) + 
"9 subjects" (14px, slate 600)

BOTTOM STATS ROW (3 mini stats):
Divider above.
Three columns:
Attendance | Fee Collection | Avg Score
   94%     |      78%       |    82%
(12px, slate 500 label, 
 14px slate 800 bold value)

CARD FOOTER:
Divider above.
Two ghost links:
"View Students" (slate 500) | 
"View Results" (slate 500)

### Sample Class Cards

JSS1A:
Teacher: Mrs. Chioma Eze
Students: 35 | Subjects: 10
Attendance: 96% | Fees: 82% | Score: 68%

JSS1B:
Teacher: Mr. Peters Okoro
Students: 33 | Subjects: 10
Attendance: 91% | Fees: 75% | Score: 65%

JSS2A:
Teacher: Mrs. Adaeze Nwachukwu
Students: 30 | Subjects: 10
Attendance: 94% | Fees: 88% | Score: 72%

JSS3A:
Teacher: Mrs. Obi Ngozi
Students: 32 | Subjects: 10
Attendance: 90% | Fees: 70% | Score: 74%

SS1A:
Teacher: Mr. Ibrahim Hassan
Students: 28 | Subjects: 9
Attendance: 93% | Fees: 85% | Score: 76%

SS2A:
Teacher: Mr. Adeyemi Oluwafemi
Students: 30 | Subjects: 9
Attendance: 95% | Fees: 91% | Score: 82%

SS3A:
Teacher: Mrs. Eze Chidinma
Students: 30 | Subjects: 9
Attendance: 97% | Fees: 94% | Score: 84%

UNASSIGNED class card:
Dashed border (slate 300), 
slate 100 bg, slate 400 text.
Centre content:
icon: add_circle (48px, slate 300)
"Add New Class" (14px, slate 500)

---

## ADD CLASS MODAL
Header: "Add New Class"
Max width: 400px.

Fields:
- Class Name (required)
  Input: text, placeholder "e.g. SS2C or JSS1C"
- Arm/Section (optional)
  Input: text, placeholder "e.g. A, B, C, Gold, Blue"
- Class Teacher (select, searchable):
  Shows list of active teachers
  Placeholder: "Select class teacher..."
- Capacity (number input):
  Placeholder: "Max number of students"
  Default: 40

Footer:
"Cancel" secondary +
"Create Class" primary

---

## LOADING STATES
Settings: 
  Inner nav loads immediately,
  Content sections show skeleton cards.

Reports:
  Stat cards: skeleton on load.
  Charts: slate 100 placeholder rectangles.
  Tables: skeleton rows.

Teachers:
  Table: 8 skeleton rows.

Classes:
  Grid: 6 skeleton cards with shimmer.

## EMPTY STATES

No teachers:
icon: school
"No teachers yet."
"Invite your first teacher to get started."
"Invite Teacher" primary button

No classes:
icon: class
"No classes created yet."
"Create your first class."
"Add Class" primary button

---

## RESPONSIVE BEHAVIOUR

Settings:
Desktop: Inner nav sidebar left + content right
Tablet: Inner nav collapses to horizontal 
        scrollable tabs above content
Mobile: Inner nav becomes full-width 
        select dropdown above content

Reports:
Desktop: Charts side by side
Tablet: Charts stacked
Mobile: Charts simplified to 
        number summaries only

Teachers:
Desktop: Full table all columns
Tablet: Hide "Joined" and "Students" columns
Mobile: Card list view 
        (avatar + name + subjects + status badge)

Classes:
Desktop: 3-column card grid
Tablet: 2-column card grid
Mobile: 1-column card list

---

## INTERACTION NOTES

Settings:
- Inner nav scrolls content to that section
- "Save Changes" button becomes active on 
  any field change
- Danger zone actions require typing 
  school name to confirm (extra safety)
- Toggle changes take effect after Save

Reports:
- Chart tooltips on hover (show exact values)
- Export buttons show download progress 
  (progress bar in button)
- At-risk student "Notify Teacher" sends 
  in-app message to class teacher

Teachers:
- Clicking teacher row → opens Teacher Profile
- "Reset Password" → sends password reset email,
  shows success toast notification
- Deactivate → teacher loses login access 
  immediately, confirmation modal required

Classes:
- Clicking class card (anywhere except footer links)
  → opens class detail view
- "View Students" → navigates to Students page 
  filtered by that class
- "View Results" → navigates to Results page 
  filtered by that class
- Drag and drop to reorder classes 
  (desktop only, optional)
- Table view: 
  Columns: Class | Teacher | Students | 
           Subjects | Attendance | Avg Score | 
           Actions

---

## COMPONENT REFERENCES (Layer 1)
- Settings toggles → custom toggle component
  ON: slate 800 bg, white circle
  OFF: slate 300 bg, white circle
  Transition: smooth slide
- All tables → Data table component
- All modals → Modal component
- All cards → Card component variants
- Badges → Badge component
- Tabs → Tab component (underline style)
- Inner settings nav → adapted sidebar 
  nav item component
- Buttons → Button component
- Skeletons → Loading skeleton component
- Empty states → Empty state component
- Toast notifications → 
  Bottom right corner, 
  white card, slate 200 border, 
  emerald/red/amber left border 4px,
  icon + message + auto-dismiss 4 seconds