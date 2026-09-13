Using the AcadaCore design system from Layer 1 (slate colour 
palette, Inter font, 8px radius cards, slate 800 primary), 
design the following authentication screens for a multi-tenant 
school management SaaS. Each school has its own branded 
subdomain (e.g. greenfield.acadacore.com).

SCREEN 1 — MAIN LOGIN PAGE
This is the first screen any user sees after navigating to 
their school's subdomain.

Layout: Centred card on a slate 50 background.
Card: White, 480px max width, 32px padding, 8px radius, 
      soft shadow.

TOP OF CARD:
- School logo placeholder (64px circle, slate 100 background, 
  school initial letter centred, slate 400 text)
- School name below logo: h2 size, slate 800, bold
- Tagline below name: "Powered by AcadaCore", 
  12px, slate 400, italic

ROLE SELECTOR (below school name):
- 3 pill/tab buttons in a row: Admin | Teacher | Student
- Selected state: slate 800 background, white text
- Unselected: white background, slate 300 border, slate 600 text
- Full width row, equal sizing, 8px radius

FORM FIELDS (below role selector):
- Email Address input (full width)
- Password input with show/hide toggle icon on right
- "Forgot Password?" link aligned right, 12px, slate 500
- Sign In button: full width, slate 800, white text, 
  40px height, "Sign In" label
- Loading state: spinner inside Sign In button, 
  button text changes to "Signing in..."

BOTTOM OF CARD:
- Divider line with "New school?" text centred
- "Register your school" link, slate 800, underlined
- Small text: "Having trouble? Contact support", 12px, slate 400

ERROR STATE:
- Show a red alert banner INSIDE the card, above the form, 
  when credentials are wrong
- Red 50 background, red 700 text, red 200 border
- Icon: error_outline on left
- Message: "Invalid email or password. Please try again."
- X button to dismiss on right

MOBILE VERSION:
- Full screen, no card border/shadow
- Same content, 24px horizontal padding
- Role selector stacks cleanly
- Keyboard pushes content up naturally

---

SCREEN 2 — FORGOT PASSWORD PAGE
Same card layout as login.

Content:
- Back arrow link top left of card: "Back to Login"
- Heading: "Reset your password", h2
- Subtext: "Enter your email and we'll send you 
  reset instructions.", body size, slate 500
- Email Address input (full width)
- "Send Reset Link" primary button (full width)
- Success state: replace form with green success message,
  icon: mark_email_read, 
  heading: "Check your inbox",
  body: "Reset instructions sent to your email address."
  Link: "Back to Login"

---

SCREEN 3 — SCHOOL REGISTRATION / ONBOARDING FLOW
This is a multi-step form. Schools sign themselves up 
on the public website. Design as a stepped wizard.

STEP INDICATOR (top of card):
- 4 steps shown as numbered circles connected by lines
- Active step: slate 800 filled circle, white number
- Completed step: emerald 500 filled circle, white checkmark
- Upcoming step: slate 200 circle, slate 400 number
- Step labels below circles: 
  "School Info" | "Admin Account" | "System Setup" | "Done"
- Card: white, 560px max width, 32px padding

STEP 1 — SCHOOL INFORMATION:
- Heading: "Tell us about your school"
- School Name input (required)
- School Type select: 
  (Nursery & Primary / Secondary / Combined / Higher Institution)
- State / City input
- Phone Number input
- School Logo upload area:
  dashed border box, 120px height,
  icon: upload_file, 
  text: "Click to upload school logo",
  subtext: "PNG or JPG, max 2MB"
- "Continue" primary button right-aligned

STEP 2 — ADMIN ACCOUNT SETUP:
- Heading: "Create your admin account"
- Full Name input
- Email Address input
- Password input with strength indicator below:
  4-segment bar, segments fill left to right,
  colours: red (weak) → amber (fair) → emerald (strong)
  label below bar: "Weak / Fair / Strong"
- Confirm Password input
- "Continue" primary button right-aligned
- "Back" ghost button left-aligned

STEP 3 — SYSTEM SETUP:
- Heading: "Configure your school system"
- School System select:
  (Nigerian — Term-based, WAEC Grading / 
   UK — Semester, GCSE Grading / 
   US — Semester, GPA Grading / 
   Custom — I'll configure manually)
- Academic Year input: e.g. "2024/2025"
- Current Term/Semester select: 
  (First Term / Second Term / Third Term)
- School Subdomain input:
  show preview: "[yourschool].acadacore.com"
  below input as slate 400 helper text, 
  real-time subdomain preview updates as user types
- Checkbox: "I agree to the Terms of Service 
  and Privacy Policy" (link both)
- "Complete Setup" primary button right-aligned
- "Back" ghost button left-aligned

STEP 4 — SUCCESS / DONE:
- Large emerald 500 checkmark circle, 80px, centred
- Heading: "You're all set!", h1, centred
- Body text: "Your AcadaCore school portal is ready. 
  Your admin dashboard is waiting for you.", centred
- School subdomain shown as a pill badge: 
  "greenfield.acadacore.com", slate 100 bg, slate 800 text
- Primary button: "Go to My Dashboard" (full width)
- Secondary link below: "Share portal link with staff"

---

SCREEN 4 — ROLE-BASED REDIRECT SCREEN
Brief loading screen shown after successful login 
while the system determines where to send the user.

Layout: Full screen, slate 50 background, centred content.
- AcadaCore logo top centre (same as sidebar header logo)
- Below logo: "Welcome back, [First Name]", h2, slate 800
- Below name: Role badge pill — 
  ADMIN (slate 800) / TEACHER (blue 700) / STUDENT (emerald 700)
- Below badge: animated loading bar,
  full width 320px max, slate 200 background,
  slate 800 animated fill, smooth left-to-right progress
- Below bar: "Setting up your workspace...", 
  12px, slate 400, italic
- This screen auto-advances after 2 seconds

---

DESIGN RULES FOR ALL SCREENS:
- Use Inter font throughout
- All inputs: 40px height, 8px radius, slate 200 border,
  slate 800 focus border, no focus ring/glow
- All primary buttons: slate 800 background, 
  white text, 40px height, 8px radius
- Card shadow: 0 1px 3px rgba(0,0,0,0.08)
- Background: slate 50 (#f8fafc)
- No illustrations, no decorative gradients
- Keep all screens minimal, calm, and professional
- Mobile responsive: all screens work on 375px width
- Show desktop and mobile version of Screen 1 (Login)