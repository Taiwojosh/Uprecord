# Shell and Communication browser review

Reviewed locally with an isolated synthetic API fixture and Edge via agent-browser. No production data or credentials were used. Screenshots therefore show zero students/teachers/classes, not live school totals.

Verified at desktop 1280x800 and mobile 390x844:
- Desktop school identity appears in the sidebar without duplicating the dashboard heading.
- Long sidebar branding wraps instead of being clipped; mobile header retains the school name.
- Closed mobile navigation is inert and removed from the accessibility tree.
- Mobile menu opens, Communication navigation works and the drawer closes after navigation.
- A synthetic announcement draft saves and remains after reload.
- Dashboard's New announcement draft shortcut opens the form in one click.
- Escape closes the draft dialog.
- Draft dialog renders above floating actions in light and dark modes.
- Communication uses one top-level heading; summary counts no longer consume three cards.

Removed an unconditional unread badge, made the skip-link target focusable, labelled header controls, allowed search results to extend below the header, and removed the unrelated academic-storage warning from Communication.

These are browser-local announcement drafts. Shared publishing and message delivery remain unavailable. Registry deep links were requested as a follow-up for Cline's separate branch and have not been wired into dashboard count tiles yet.

Screenshots are saved outside the repository in the current task outputs directory: ui-dashboard-desktop-final.png and ui-draft-mobile-final.png.

No production deployment performed. A later PWA commit appeared on the branch during this work; this review does not certify its service worker or install behavior.
