Create a professional design system for a multi-tenant 
school management SaaS platform called AcadaCore.

COLOUR PALETTE:
- Primary: Slate 800 (#1e293b) — topbar, sidebar, primary buttons
- Accent: Slate 600 (#475569) — hover states, secondary elements
- Background: Slate 50 (#f8fafc) — main content background
- Surface: White (#ffffff) — cards, modals, panels
- Border: Slate 200 (#e2e8f0) — dividers, input borders
- Success: Emerald 500 (#10b981) — paid, present, published
- Warning: Amber 500 (#f59e0b) — pending, due soon
- Danger: Red 500 (#ef4444) — unpaid, absent, errors
- Muted text: Slate 400 (#94a3b8) — labels, placeholders

TYPOGRAPHY:
- Font family: Inter
- Heading 1: 28px, weight 700
- Heading 2: 22px, weight 600
- Heading 3: 18px, weight 600
- Body: 14px, weight 400
- Small/Label: 12px, weight 500
- All text colour default: Slate 800

SPACING SYSTEM:
- Base unit: 4px
- Component padding: 16px and 24px
- Section gaps: 32px
- Card internal padding: 20px
- Sidebar width: 240px (collapsed: 64px)
- Topbar height: 60px

BORDER & SHADOW:
- Border radius: 8px for cards and inputs, 6px for buttons, 
  full pill for badges
- Card shadow: 0 1px 3px rgba(0,0,0,0.08)
- Modal shadow: 0 8px 32px rgba(0,0,0,0.12)
- No heavy gradients, no decorative backgrounds

COMPONENT DESIGNS TO GENERATE:

1. BUTTONS
   - Primary: Slate 800 background, white text, 6px radius
   - Secondary: white background, slate 800 border, slate 800 text
   - Danger: Red 500 background, white text
   - Ghost: transparent, slate 600 text, hover shows slate 100 bg
   - Sizes: Small (32px height), Medium (40px), Large (48px)
   - States: default, hover, loading (spinner), disabled

2. BADGES
   - Success (green), Warning (amber), Danger (red), 
     Neutral (slate), Info (blue)
   - Pill shaped, 12px font, uppercase, light background 
     with matching text colour
   - Examples: PAID, PENDING, UNPAID, PRESENT, ABSENT, 
     PUBLISHED, DRAFT

3. CARDS
   - Stat card: icon top-left, large number, label below, 
     optional trend indicator
   - List card: title, subtitle, right-side action or badge
   - Content card: header with title + action button, 
     body content area, optional footer

4. TABLE
   - Header row: slate 50 background, slate 600 text, 
     12px uppercase labels
   - Body rows: white, 48px row height, bottom border only
   - Hover state: slate 50 row highlight
   - Columns: checkbox, data fields, badge, action menu (⋮)
   - Empty state: centred icon + message + CTA button

5. FORM INPUTS
   - Text input: white bg, slate 200 border, 8px radius, 
     40px height, slate 800 text, slate 400 placeholder
   - Select dropdown: same style as text input
   - Search input: with search icon left-aligned inside field
   - States: default, focused (slate 800 border), 
     error (red border + error message below)
   - Label: 12px, slate 600, weight 500, above input

6. MODAL
   - White background, 8px radius, max width 560px
   - Header: title left, X close button right
   - Body: scrollable content area with 24px padding
   - Footer: right-aligned buttons (Cancel + Confirm)
   - Backdrop: black 40% opacity overlay

7. TABS
   - Underline style (not boxed)
   - Active tab: slate 800 text, 2px slate 800 bottom border
   - Inactive: slate 400 text, no border
   - Hover: slate 600 text

8. LOADING SKELETON
   - Animated shimmer effect, slate 200 base colour
   - Variants: single line, multi-line paragraph, 
     card skeleton, table row skeleton

9. EMPTY STATE
   - Centred layout: simple icon, heading, 
     short description, optional CTA button
   - Used when tables or lists have no data

10. SIDEBAR NAVIGATION ITEM
    - Default: slate 400 icon + text, transparent background
    - Active: white text, slate 700 background, 
      left accent bar (2px emerald 500)
    - Hover: slate 100 background (light mode sidebar variant)
    - Collapsed state: icon only, tooltip on hover
    - Section dividers with small uppercase group labels

LAYOUT SHELL (Desktop):
- Left sidebar: 240px, slate 800 background, 
  full height, collapsible to 64px
- Topbar: 60px height, white background, 
  slate 200 bottom border, 
  contains: hamburger/collapse toggle left, 
  school name + logo centre-left, 
  notifications bell + user avatar right
- Main content: remaining width, slate 50 background, 
  24px padding, scrollable

LAYOUT SHELL (Mobile):
- Sidebar hidden by default, 
  slides in as overlay on hamburger tap
- Topbar remains visible always
- Content stacks vertically, 16px padding

DESIGN STYLE:
- Minimal, calm, and highly readable
- No gradients on UI elements
- No decorative illustrations on dashboards
- Consistent 8px grid alignment throughout
- Professional enough for school administrators
- Clean enough for students on low-end Android phones