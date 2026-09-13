# AcadaCore — Layer 6: Admin Results & Fees/Payments Pages

## Context
Two of the most critical admin pages.
Results page manages academic records for the whole school.
Fees page gives the school owner full financial visibility.
Build on shared layout shell from Layer 1.
Use all components from design system.

---

# PAGE 1 — RESULTS MANAGEMENT

## Route
/admin/results

## Role Access
Admin only.

---

## PAGE HEADER
Left:
- Title: "Results" (h1, slate 800)
- Subtitle: "Manage, validate and publish 
             student results." (14px, slate 500)

Right (action buttons):
- "Upload Results" secondary button (icon: upload_file)
- "Generate Report Cards" primary button 
  (icon: description, slate 800 bg, white text)

---

## SESSION & TERM SELECTOR BAR
Full width white card, slate 200 border, 
8px radius, 16px padding.
Horizontal row, wraps on mobile.

Controls (left to right):
1. Academic Session select:
   Label: "Session"
   Options: 2024/2025 (current) | 2023/2024 | 
            2022/2023 | 2021/2022

2. Term select:
   Label: "Term"
   Options: First Term | Second Term | Third Term

3. Class select:
   Label: "Class"
   Options: All Classes | JSS1A | JSS1B | JSS2A | 
            JSS2B | JSS3A | JSS3B | SS1A | SS1B | 
            SS2A | SS2B | SS3A | SS3B

4. Status filter select:
   Label: "Status"
   Options: All | Draft | Pending Validation | 
            Published

5. "Apply" primary button (small size)

Active filter summary below bar (when filters applied):
"Showing: First Term • 2024/2025 • All Classes"
(12px, slate 500, italic)
"Clear filters" link beside it

---

## RESULTS OVERVIEW STAT CARDS
4 cards in a row (same pattern as dashboard cards)

Card 1 — Total Results Entries
Icon: fact_check (slate 800)
Number: 3,847
Label: "Score entries this term"
Trend: "+284 this week" (emerald badge)

Card 2 — Classes With Results
Icon: class (slate 800)
Number: 11/14
Label: "Classes with results entered"
Sub-label: "3 classes pending" (amber 500, 11px)

Card 3 — Published Results
Icon: publish (emerald 500)
Number: 8
Label: "Classes with published results"
Trend badge: "6 still in draft" (amber)

Card 4 — Avg. School Score
Icon: grade (slate 800)
Number: 74%
Label: "School average this term"
Trend: "-2% vs last term" (amber badge)

---

## RESULTS TABLE
White card, slate 200 border, 8px radius.

### Table Header
Left: "Results by Class" (h3, slate 800)
Right: 
- "Validate All" ghost button (icon: verified)
- "Publish All" secondary button (icon: publish)

### Table Columns
1. "CLASS" — 120px
2. "CLASS TEACHER" — grows
3. "SUBJECTS" — 100px
4. "ENTRIES" — 120px
   (shows X/Y format e.g. "28/30 students")
5. "COMPLETION" — 140px (progress bar)
6. "STATUS" — 130px (badge)
7. "LAST UPDATED" — 130px
8. "" (actions) — 80px

### Table Rows (sample data)

Row 1:
Class: SS3A | Teacher: Mr. Adeyemi | 
Subjects: 9 | Entries: 30/30 | 
Completion: 100% (full emerald bar) | 
Status: PUBLISHED | Updated: Today

Row 2:
Class: SS3B | Teacher: Mrs. Eze |
Subjects: 9 | Entries: 28/30 |
Completion: 93% (emerald bar) |
Status: PENDING VALIDATION | Updated: Yesterday

Row 3:
Class: SS2A | Teacher: Mr. Okonkwo |
Subjects: 8 | Entries: 30/30 |
Completion: 100% |
Status: PUBLISHED | Updated: 2 days ago

Row 4:
Class: SS2B | Teacher: Mrs. Balogun |
Subjects: 8 | Entries: 22/30 |
Completion: 73% (amber bar) |
Status: DRAFT | Updated: 3 days ago

Row 5:
Class: SS1A | Teacher: Mr. Ibrahim |
Subjects: 8 | Entries: 15/30 |
Completion: 50% (amber bar) |
Status: DRAFT | Updated: 4 days ago

Row 6:
Class: JSS3A | Teacher: Mrs. Obi |
Subjects: 10 | Entries: 0/32 |
Completion: 0% (slate 200 bar, empty) |
Status: NOT STARTED | Updated: —

### Status Badge Colours
PUBLISHED: emerald 100 bg, emerald 700 text
PENDING VALIDATION: blue 100 bg, blue 700 text
DRAFT: amber 100 bg, amber 700 text
NOT STARTED: slate 100 bg, slate 500 text

### Row Action Menu (three-dot ⋮)
- icon: visibility → "View Results"
- icon: edit → "Edit Scores"
- icon: verified → "Validate Results"
- icon: publish → "Publish Results"
- icon: unpublished → "Unpublish Results"
- [divider]
- icon: description → "Generate Report Cards"
- icon: download → "Export to Excel"
- [divider]
- icon: delete → "Clear All Scores" (red, danger)

---

## RESULT DETAIL PAGE
Route: /admin/results/[classId]
Navigated to from "View Results" action.

### Page Header
Back: "← Back to Results"
Title: "SS3A — First Term Results 2024/2025" (h1)
Right:
- Status badge: PUBLISHED (emerald)
- "Unpublish" ghost button (icon: unpublished)
- "Export" secondary button (icon: download)
- "Generate Report Cards" primary button

### Subject Tabs
One tab per subject:
Mathematics | English | Physics | Chemistry | 
Biology | Economics | Government | Literature | CRS

Each tab shows results table for that subject.

### Results Table (per subject)
Columns:
1. "STUDENT NAME" — grows
2. "CA SCORE" — 100px (max: 40)
3. "EXAM SCORE" — 110px (max: 60)
4. "TOTAL" — 100px (max: 100)
5. "GRADE" — 80px
6. "REMARK" — 100px

Grade colour coding:
A1 (75–100): emerald 700 text
B2 (70–74): emerald 600 text
B3 (65–69): blue 600 text
C4 (60–64): blue 500 text
C5 (55–59): amber 600 text
C6 (50–54): amber 500 text
D7 (45–49): orange 600 text
E8 (40–44): red 500 text
F9 (0–39): red 700 text, bold

Remark colour coding:
Excellent / Very Good / Good: emerald
Credit / Pass: amber
Fail: red 600

Footer row:
Class average highlighted:
"Class Average: 78 | Highest: 96 | Lowest: 42"
(slate 50 bg row, slate 700 text, bold)

---

## UPLOAD RESULTS MODAL
Triggered by "Upload Results" button.
Max width: 480px.

Header: "Upload Results"

Body:
Session/Term/Class selectors (3 dropdowns, full width)

Subject select: which subject to upload for

Download template row:
Info card (slate 50):
"Use our template to avoid upload errors."
"Download Template" link (icon: download, emerald text)

Upload area:
Dashed box, 140px height:
icon: upload_file (48px, slate 400)
"Drop Excel file here or click to browse"
".xlsx files only • Max 5MB"

After upload validation:
Success card (emerald 50):
"✓ 30 student scores ready to upload"
"Subject: Mathematics • SS3A • First Term"

Error card (red 50):
"⚠ 3 rows have errors"
"Download error report" link

Footer:
"Cancel" secondary + "Upload Scores" primary
(disabled until validation passes)

---

## PUBLISH CONFIRMATION MODAL
Triggered by "Publish Results" action.
Max width: 480px.

Header: "Publish Results"

Body:
Amber info banner:
icon: warning (amber 500)
"Once published, students and teachers 
can view these results. 
You can unpublish at any time."

Summary card (slate 50):
"Class: SS3A"
"Term: First Term 2024/2025"
"Students: 30"
"Subjects: 9"
"Completion: 100%"

Checkbox:
"Send SMS notification to parents 
when results are published"
(checked by default)

Footer:
"Cancel" secondary + 
"Publish Results" primary (emerald 600 bg)

---

# PAGE 2 — FEES & PAYMENTS

## Route
/admin/fees

## Role Access
Admin only.

---

## PAGE HEADER
Left:
- Title: "Fees & Payments" (h1, slate 800)
- Subtitle: "Track fee collection and 
             payments across all students." (14px, slate 500)

Right:
- "Record Payment" primary button 
  (icon: add, slate 800 bg, white text)
- "Send Fee Reminder" secondary button 
  (icon: sms)

---

## SESSION & TERM SELECTOR
Same pattern as Results page.
Session | Term | Class filters in white card bar.

---

## FEE OVERVIEW STAT CARDS
4 cards in a row:

Card 1 — Total Expected
Icon: account_balance (slate 800)
Number: ₦6,000,000
Label: "Total Fees Expected This Term"
Sub-label: "1,284 students" (11px, slate 400)

Card 2 — Total Collected
Icon: payments (emerald 500)
Number: ₦4,380,000
Label: "Total Collected"
Trend: "73% collection rate" 
(emerald 50 bg, emerald 700 text badge)

Card 3 — Outstanding
Icon: money_off (amber 500)
Number: ₦1,620,000
Label: "Outstanding Balance"
Sub-label: "347 students with balance" 
(amber 500, 11px)

Card 4 — Overdue (30+ days)
Icon: schedule (red 500)
Number: ₦480,000
Label: "Overdue (30+ days)"
Sub-label: "67 students" (red 500, 11px)

---

## FEE COLLECTION CHART ROW
Two columns:

### LEFT — Monthly Collection Bar Chart
White card, slate 200 border, 8px radius, 24px padding.
Title: "Monthly Fee Collection" (h3)
Subtitle: "First Term 2024/2025" (12px, slate 400)

Horizontal bar chart:
Each month shows:
- Month label left (12px, slate 600)
- Collected bar (emerald 500)
- Outstanding bar stacked (amber 200)
- Total amount label right (12px, slate 800, bold)

Months:
September: ₦2,100,000 collected / ₦900,000 outstanding
October: ₦1,580,000 / ₦620,000
November: ₦700,000 / ₦100,000 (current month)

Legend: 
● Collected (emerald) ● Outstanding (amber)

### RIGHT — Fee Status Breakdown
White card, slate 200 border, 8px radius, 24px padding.
Title: "Student Fee Status" (h3)
Subtitle: "Current term breakdown" (12px, slate 400)

Donut chart (same style as dashboard):
- PAID: emerald 500 — 937 students (73%)
- PARTIAL: amber 500 — 187 students (15%)
- UNPAID: red 400 — 160 students (12%)

Legend rows below chart:
Each row: coloured dot + label + count + percentage
● Paid: 937 students — 73%
● Partial: 187 students — 15%
● Unpaid: 160 students — 12%

---

## PAYMENTS TABLE

### Table Controls Bar
Left: "Payment Records" (h3, slate 800)
Right:
- Search input (180px): "Search student name..."
- Status filter select
- "Export" ghost button (icon: download)

### Table Columns
1. Checkbox — 48px
2. "STUDENT" (name + ID) — grows
3. "CLASS" — 100px
4. "AMOUNT PAID" — 130px
5. "BALANCE" — 120px
6. "STATUS" — 120px (badge)
7. "LAST PAYMENT" — 140px
8. "" (actions) — 64px

### Sample Data Rows

Row 1:
Amara Okafor | STU-2024-0001 | SS2A | 
₦45,000 | ₦0 | PAID | 15 Sep 2024

Row 2:
Chidi Nwosu | STU-2024-0002 | SS3B | 
₦0 | ₦50,000 | UNPAID | —

Row 3:
Fatima Abdullahi | STU-2024-0003 | JSS1A | 
₦25,000 | ₦20,000 | PARTIAL | 2 Oct 2024

Row 4:
Emeka Eze | STU-2024-0004 | SS1A | 
₦40,000 | ₦0 | PAID | 1 Sep 2024

Row 5:
Tunde Bakare | STU-2024-0006 | SS2B | 
₦0 | ₦45,000 | UNPAID | —

### Status Badges
PAID: emerald 100, emerald 700
PARTIAL: amber 100, amber 700
UNPAID: red 100, red 700

### Row Action Menu (⋮)
- icon: visibility → "View Payment History"
- icon: add → "Record Payment"
- icon: receipt → "Print Receipt"
- icon: sms → "Send Payment Reminder"
- [divider]
- icon: edit → "Edit Fee Record"

### Bulk Action Bar (when rows selected)
Same pattern as Students page:
- "Send SMS Reminder"
- "Export Selected"
- "Mark as Paid" (use with caution badge)
- "Clear Selection"

---

## RECORD PAYMENT MODAL
Triggered by "Record Payment" button.
Max width: 480px.

Header: "Record Fee Payment"

Body fields:

Student search:
Label: "Student"
Search input with autocomplete dropdown:
Type student name or ID to search.
Dropdown shows matching students:
Each result: Avatar + Name + Class + 
             Current balance badge

After student selected:
Summary card (slate 50 bg):
"Amara Okafor — SS2A"
"Expected: ₦45,000"
"Previously Paid: ₦0"
"Balance: ₦45,000" (red 600, bold)

Payment fields:
- Amount Paid (number input, ₦ prefix, required)
- Payment Date (date picker, default today)
- Payment Method (select):
  Cash | Bank Transfer | Paystack | Cheque | POS
- Reference Number (optional, text input)
  Placeholder: "Bank teller no. or transfer reference"
- Notes (optional textarea, 2 rows)

After amount entered:
Show live balance update below amount field:
"New balance after payment: ₦0" 
(emerald text if fully paid, amber if partial)

Footer:
"Cancel" secondary +
"Record Payment" primary +
"Record & Print Receipt" ghost button

---

## FEE STRUCTURE SETTINGS CARD
Below payments table.
White card, slate 200 border, 8px radius.

Header row:
Title: "Fee Structure — First Term 2024/2025" (h3)
Right: "Edit Fee Structure" ghost button (icon: edit)

Table (read-only):
Columns: Class | Term Fee | Due Date | 
         Students | Total Expected

Rows:
JSS1 | ₦35,000 | 30 Sep 2024 | 180 | ₦6,300,000
JSS2 | ₦35,000 | 30 Sep 2024 | 165 | ₦5,775,000
JSS3 | ₦40,000 | 30 Sep 2024 | 172 | ₦6,880,000
SS1  | ₦45,000 | 30 Sep 2024 | 168 | ₦7,560,000
SS2  | ₦45,000 | 30 Sep 2024 | 180 | ₦8,100,000
SS3  | ₦50,000 | 30 Sep 2024 | 150 | ₦7,500,000

Footer total row:
Bold: "Total Expected This Term: ₦42,115,000"

---

## LOADING STATES
- Stat cards: 4 skeleton cards on load
- Charts: slate 100 placeholder rectangles
- Table: 10 skeleton rows
- All smooth fade in after data loads

## EMPTY STATES

No payment records:
icon: payments
"No payment records yet."
"Start by recording the first payment 
or setting up your fee structure."
"Record Payment" primary button

No results for class:
icon: fact_check
"No results have been entered 
for this class yet."
"Notify Teacher" secondary button

---

## RESPONSIVE BEHAVIOUR

Results Page:
Desktop: Full table all columns
Tablet: Hide "Last Updated", show scroll
Mobile: Card list — class name + 
        completion badge + status badge + 
        action button

Fees Page:
Desktop: Charts side by side, full table
Tablet: Charts stack vertically, 
        table hides balance column
Mobile: 
- Stat cards single column
- Charts simplified (numbers only)
- Table becomes card list:
  Name + amount + status badge + 
  action button

---

## INTERACTION NOTES
Results:
- Clicking class row → opens Result Detail page
- Publish action → always shows confirmation modal
- Unpublish → same confirmation modal pattern
- "Generate Report Cards" → shows progress modal 
  with loading bar then download link

Fees:
- Student search in modal: 
  minimum 2 characters to trigger search
- Amount field: 
  only accepts numbers, 
  auto-formats with commas (₦45,000)
- "Mark as Paid" bulk action:
  always requires confirmation modal
- Receipt: opens print preview in new tab
- Export: downloads .xlsx file immediately

---

## COMPONENT REFERENCES (Layer 1)
- All tables → Data table component
- All badges → Badge component
- All modals → Modal component
- Charts → placeholder divs 
  (chart library integrated in Layer 10)
- Stat cards → Card/Stat variant
- Progress bars → inline CSS, 
  emerald 500 fill, slate 200 track
- All buttons → Button component
- Skeletons → Loading skeleton component
- Empty states → Empty state component