---
name: Academic Precision
colors:
  surface: '#fbf8fa'
  surface-dim: '#dcd9db'
  surface-bright: '#fbf8fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f4'
  surface-container: '#f0edef'
  surface-container-high: '#eae7e9'
  surface-container-highest: '#e4e2e3'
  on-surface: '#1b1b1d'
  on-surface-variant: '#45474c'
  inverse-surface: '#303032'
  inverse-on-surface: '#f3f0f2'
  outline: '#75777d'
  outline-variant: '#c5c6cd'
  surface-tint: '#545f73'
  primary: '#091426'
  on-primary: '#ffffff'
  primary-container: '#1e293b'
  on-primary-container: '#8590a6'
  inverse-primary: '#bcc7de'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fc'
  on-secondary-container: '#57657a'
  tertiary: '#1e1200'
  on-tertiary: '#ffffff'
  tertiary-container: '#35260c'
  on-tertiary-container: '#a38c6a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e3fb'
  primary-fixed-dim: '#bcc7de'
  on-primary-fixed: '#111c2d'
  on-primary-fixed-variant: '#3c475a'
  secondary-fixed: '#d5e3fc'
  secondary-fixed-dim: '#b9c7df'
  on-secondary-fixed: '#0d1c2e'
  on-secondary-fixed-variant: '#3a485b'
  tertiary-fixed: '#fadfb8'
  tertiary-fixed-dim: '#ddc39d'
  on-tertiary-fixed: '#271902'
  on-tertiary-fixed-variant: '#564427'
  background: '#fbf8fa'
  on-background: '#1b1b1d'
  surface-variant: '#e4e2e3'
typography:
  h1:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
  h2:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: '1.3'
  h3:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
  body:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 24px
  container_max_width: 1440px
---

## Brand & Style

The design system is anchored in a philosophy of **Institutional Clarity**. It prioritizes a calm, systematic environment that reduces cognitive load for administrators managing complex data, while remaining approachable and organized for students. 

The visual style is **Corporate Minimalism**. It avoids decorative flourishes in favor of structural integrity. Depth is communicated through subtle layering rather than heavy shadows, ensuring the interface feels grounded and reliable. This system relies on strict 8px grid alignment to create a sense of order and predictability across the multi-tenant platform.

## Colors

The palette is dominated by **Slate**, providing a sophisticated, neutral foundation that feels more modern and less clinical than pure greys. 

- **Primary & Text:** Slate 800 is used for primary branding and core readability to ensure high contrast.
- **Accents:** Slate 600 provides a softer secondary layer for less prominent actions or secondary navigation elements.
- **Functional Colors:** Emerald, Amber, and Red are reserved strictly for status communication (e.g., passing grades, pending tuition, or attendance alerts) to maintain the "calm" aesthetic.
- **Surface Strategy:** The background uses Slate 50 to allow White surfaces to "pop" slightly, creating a clear distinction between the application canvas and interactive containers.

## Typography

This design system utilizes **Inter** for its exceptional legibility in data-dense SaaS environments. The type scale is compact to accommodate the high volume of information typical in school management software.

Headings use a tighter line height to create strong visual blocks, while the body text utilizes a 1.5 line height to maximize readability during long periods of use. Labels are slightly bolder (Medium/500) to ensure they remain legible at small scales in dashboards and data tables.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. While the sidebar remains fixed, the main content area utilizes a 12-column fluid grid that adheres to a maximum container width of 1440px to prevent line lengths from becoming unreadable on ultra-wide monitors.

A base unit of 4px governs all measurements. Component internal padding should default to 16px (MD) for standard density, increasing to 24px (LG) for section headers and primary card containers. Section gaps are locked at 32px (XL) to provide clear breathing room between distinct functional areas.

## Elevation & Depth

This design system uses **Tonal Layering** and **Low-Contrast Outlines** as the primary methods of establishing hierarchy.

1.  **Level 0 (Background):** Slate 50 (#f8fafc).
2.  **Level 1 (Surface):** White (#ffffff) with a 1px border of Slate 200. This is the default state for cards and content blocks.
3.  **Depth (Shadows):** 
    *   **Cards:** A minimal ambient shadow (0 1px 3px rgba(0,0,0,0.08)) is used to provide a slight lift from the background.
    *   **Modals:** A more pronounced shadow (0 8px 32px rgba(0,0,0,0.12)) is used to pull the element into the foreground, effectively dimming the rest of the interface through visual focus.

Avoid backdrop blurs or heavy gradients; clarity is maintained through crisp border lines and subtle shifts in value.

## Shapes

The shape language is **Soft and Functional**. 

- **Cards:** 8px radius provides a modern, approachable feel without appearing overly juvenile.
- **Buttons:** A slightly sharper 6px radius distinguishes interactive elements from static containers.
- **Pills:** 9999px radius is reserved exclusively for status indicators (tags, badges) to make them instantly recognizable against the rectangular grid of the layout.

## Components

- **Buttons:** Primary buttons use Slate 800 background with White text. Secondary buttons use a Slate 200 border with Slate 800 text. Use 6px radius and 8px/16px padding.
- **Cards:** White surface, 8px radius, Slate 200 border, and the defined Card Shadow. Headers within cards should have a bottom border of Slate 200.
- **Input Fields:** 1px Slate 200 border, 4px vertical padding, and Inter Body (14px). Focus state should use a 1px Slate 600 border.
- **Chips/Badges:** Pill-shaped (9999px radius). Use light tints of the success/warning/danger colors with high-contrast text for status indicators.
- **Data Tables:** Use Slate 800 for headers with a 1px Slate 200 bottom border. Rows should have a subtle hover state of Slate 50.
- **Attendance Toggles:** Use the Pill shape for the toggle track.
- **Grade Badges:** Small (12px) bold text within a 24px x 24px rounded-square container (4px radius) for quick scanning.
