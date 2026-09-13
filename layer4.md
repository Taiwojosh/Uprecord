# AcadaCore — Layer 4: Admin Dashboard

## Context
This is the first screen a school owner/admin sees after 
login. It must communicate full school visibility instantly.
Build on top of the shared layout shell from Layer 1 
(sidebar + topbar + main content area).
Use all components from the design system (Layer 1).
Auth routing is already handled in Layer 2.

## Route
/admin/dashboard

## Role Access
Admin only. Redirect Teacher → /teacher/dashboard, 
Student → /student/dashboard

---

## LAYOUT STRUCTURE

### Topbar (inherited from Layer 1)
- Left: Sidebar collapse toggle + School name
- Centre: Nothing
- Right: Notifications bell (with unread count badge) 
         + Admin avatar + name

### Sidebar (inherited from Layer 1)
Active item: Dashboard
Full sidebar nav items in order:
- Dashboard (active)
- Students
- Teachers
- Classes
- Subjects
- Results
- Attendance
- Fees & Payments
- Reports
- Messages
- [divider]
- Settings
- Subscription
- Audit Logs

---

## MAIN CONTENT AREA

### Page Header
- Title: "Dashboard"
- Subtitle: "Good morning, [Admin First Name]. 
             Here's what's happening at [School Name] today."
- Right side: Current term + session badge
  e.g. "First Term • 2024/2025" 
  Slate 100 background, slate 700 text, pill shape

---

### ROW 1 — STAT CARDS (Overview)
4 cards in a row. Desktop: 4 columns. 
Tablet: 2x2. Mobile: 1 column.
Each card: white bg, slate 200 border, 
           8px radius, 20px padding, 
           soft shadow

CARD 1 — Total Students
- Icon: group (slate 800, in slate 100 square, 40px)
- Number: 1,284 (28px, bold, slate 800)
- Label: "Total Students" (12px, slate 500)
- Trend badge: "+18 this term" 
  (emerald 50 bg, emerald 700 text, 11px)

CARD 2 — Total Teachers  
- Icon: school (slate 800)
- Number: 48
- Label: "Total Teachers"
- Trend badge: "+3 this term"

CARD 3 — Fee Collection Rate
- Icon: payments (emerald 500)
- Number: 73%
- Label: "Fees Collected This Term"
- Progress bar below label: 
  73% fill, emerald 500, 
  slate 200 track, 4px height, 8px radius
- Sub-label: "₦4.38M of ₦6M collected"
  (11px, slate 400)

CARD 4 — Attendance Rate
- Icon: event_available (slate 800)
- Number: 91%
- Label: "Average Attendance Today"
- Trend badge: "-2% vs last week"
  (amber 50 bg, amber 700 text, 11px)

---

### ROW 2 — TWO COLUMN LAYOUT
Left column: 65% width (Recent Activity)
Right column: 35% width (Pending Tasks)

#### LEFT — Recent Activity Feed
Card: white, slate 200 border, 8px radius

Header row:
- Title: "Recent Activity" (h3, slate 800)
- Right: "View all" link (12px, slate 500, underline)

Activity list (8 items, scrollable):
Each item is a row with:
- Icon in 32px circle (slate 100 bg, slate 600 icon)
- Activity text (14px, slate 800)
- Time stamp (11px, slate 400, right aligned)
- Bottom border between items

Sample activity items:
1. icon: edit_document
   "Term 1 results published for JSS 3A"
   "2 minutes ago"

2. icon: person_add
   "New student enrolled — Amara Okafor (JSS 1B)"
   "1 hour ago"

3. icon: payments
   "Fee payment received — ₦45,000 (Chidi Nwosu)"
   "2 hours ago"

4. icon: event_available
   "Attendance marked for 12 classes"
   "Today, 8:30 AM"

5. icon: warning
   "3 students have outstanding fees (over 30 days)"
   "Today, 8:00 AM"
   (amber 500 icon colour for this item)

6. icon: assignment
   "New assignment posted by Mr. Adeyemi (SS2 English)"
   "Yesterday, 4:15 PM"

7. icon: sms
   "SMS notification sent to 847 parents"
   "Yesterday, 2:00 PM"

8. icon: person
   "Teacher account created — Mrs. Chioma Eze"
   "Yesterday, 11:30 AM"

Loading skeleton state: 
Show 4 skeleton rows (shimmer) while data loads

Empty state:
Icon: history, 
Text: "No recent activity to show"

---

#### RIGHT — Pending Tasks
Card: white, slate 200 border, 8px radius

Header row:
- Title: "Pending Tasks" (h3, slate 800)
- Badge: "5" (slate 800 bg, white text, 
         18px circle, right of title)

Task list (each item is a row):
Checkbox left + task text + priority badge right

Task 1:
- Text: "Publish Term 1 results for SS3"
- Badge: URGENT (red 100 bg, red 700 text)

Task 2:
- Text: "Approve 4 new teacher registrations"
- Badge: PENDING (amber 100 bg, amber 700 text)

Task 3:
- Text: "Update school fees for Term 2"
- Badge: PENDING

Task 4:
- Text: "Review attendance report — Week 10"
- Badge: LOW (slate 100 bg, slate 600 text)

Task 5:
- Text: "Send fee reminder SMS to defaulters"
- Badge: URGENT

Bottom of card:
"+ Add Task" ghost button, full width, 
dashed slate 200 border, slate 500 text

---

### ROW 3 — THREE COLUMN LAYOUT

#### COLUMN 1 — Fee Status Summary
Card: white, slate 200 border, 8px radius, full height

Title: "Fee Collection" (h3)
Subtitle: "First Term 2024/2025" (12px, slate 400)

Donut chart placeholder:
- Circular progress ring, 120px diameter, centred
- 73% fill: emerald 500
- Remaining: slate 200
- Centre text: "73%" (20px, bold, slate 800)
- Label below: "Collected" (12px, slate 500)

Legend below chart:
- ● Collected: ₦4,380,000 (emerald 500 dot)
- ● Outstanding: ₦1,620,000 (amber 500 dot)
- ● Waived: ₦0 (slate 300 dot)
Each row: dot + label left, amount right, 13px

Bottom: 
"View full report →" link, 12px, slate 500

---

#### COLUMN 2 — Class Performance Summary
Card: white, slate 200 border, 8px radius, full height

Title: "Class Performance" (h3)
Subtitle: "Average scores by class — Term 1" (12px, slate 400)

Bar chart placeholder (horizontal bars):
Each row: Class name left (12px, slate 600), 
          bar middle (emerald 500 fill, slate 100 track), 
          percentage right (12px, slate 800, bold)

Rows:
SS3A    ████████████░░  84%
SS3B    ██████████░░░░  71%
SS2A    ████████████░░  82%
SS2B    ███████░░░░░░░  61%
JSS3A   ██████████░░░░  74%
JSS1A   █████████░░░░░  68%

Below chart:
"View all classes →" link, 12px, slate 500

---

#### COLUMN 3 — Quick Actions
Card: white, slate 200 border, 8px radius, full height

Title: "Quick Actions" (h3)

6 action buttons stacked vertically:
Each button: full width, 44px height, 
             left icon + label, 
             secondary button style 
             (white bg, slate 200 border, slate 800 text)
             hover: slate 50 bg

Button 1: icon add_circle → "Add New Student"
Button 2: icon person_add → "Add New Teacher"  
Button 3: icon upload_file → "Upload Results"
Button 4: icon sms → "Send SMS to Parents"
Button 5: icon receipt_long → "Record Fee Payment"
Button 6: icon download → "Download Term Report"

---

### ROW 4 — ANNOUNCEMENTS / NOTICE BOARD
Full width card: white, slate 200 border, 8px radius

Header row:
- Title: "Announcements" (h3, slate 800)
- Right: "+ New Announcement" primary button 
  (small size, slate 800 bg, white text)

Announcement items (3 shown):

Item 1 (Pinned):
- Pin icon (amber 500) + "PINNED" badge
- Title: "End of Term Examination Schedule"
- Body: "All terminal examinations begin Monday 
         18th November. Please ensure all teachers 
         submit exam timetables by Friday."
- Footer: "Posted by Admin • 2 days ago" (11px, slate 400)
- Right: Edit icon + Delete icon (ghost, on hover)

Item 2:
- Title: "PTA Meeting — Saturday 23rd November"
- Body: "All parents are invited to the Parent-Teacher 
         Association meeting at 10am in the school hall."
- Footer: "Posted by Admin • 4 days ago"

Item 3:
- Title: "New Academic Calendar Published"
- Body: "The 2024/2025 academic calendar is now 
         available for download."
- Footer: "Posted by Admin • 1 week ago"

Below items:
"View all announcements →" link, centred, 12px, slate 500

---

## LOADING STATES
- All 4 stat cards show skeleton on load
- Activity feed shows 4 skeleton rows
- Chart areas show slate 100 placeholder rectangles
- Tasks show 3 skeleton rows
- After load: smooth fade in (no jarring pop)

---

## EMPTY STATES
If no activity: 
  Icon: history, "No activity yet. 
  Start by adding students and teachers."
  
If no tasks: 
  Icon: task_alt, "All caught up! No pending tasks."
  (emerald 500 icon)

If no announcements: 
  Icon: campaign, "No announcements yet.",
  CTA: "+ Create First Announcement"

---

## RESPONSIVE BEHAVIOUR
Desktop (1280px+): All rows as described above
Tablet (768–1279px): 
  - Stat cards: 2x2 grid
  - Row 2: stacked (activity full width, tasks below)
  - Row 3: 2 columns (fee + performance), 
            quick actions moves below
Mobile (< 768px):
  - Everything single column
  - Stat cards: 1 column scroll
  - Charts: simplified (numbers only, no bars)
  - Quick actions: 2x3 grid of icon buttons

---

## INTERACTION NOTES
- Clicking stat cards navigates to relevant page
  (Students card → /admin/students, etc.)
- Task checkboxes mark tasks complete inline
- Announcement delete triggers confirmation modal
- "View all" links navigate to full pages
- Quick action buttons open relevant modals 
  or navigate to relevant pages
- Notifications bell: clicking opens dropdown panel 
  (max 5 recent, "View all" link at bottom)

---

## COMPONENT REFERENCES (from Layer 1)
- Stat cards → use Card/Stat variant
- Activity feed → use List Card variant  
- Badges → use Badge component (success/warning/danger/neutral)
- Tasks → use standard checkbox + badge
- Buttons → use Button component (primary/secondary/ghost)
- Skeletons → use Loading Skeleton component
- Empty states → use Empty State component
- All spacing → 8px grid system
- All type → Inter, design system scale