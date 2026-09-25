# Communication navigation

Messages and announcements now share one sidebar entry and a common page with two section links. Old URLs redirect to the corresponding section. Dashboard comes first; the School Registry link no longer also appears selected on Historical Records.

The previous messages page contained hard-coded delivery records and a success toast without a send operation. The routed replacement states that messaging is unavailable. Announcements are explicitly browser-local drafts, filtered by school, with school ownership checked before pinning or deletion. Unassigned legacy records are left intact and are not silently adopted by the current school.

School administrators can create drafts. The draft form includes field labels, keyboard focus containment, Escape dismissal and a scrollable mobile body. Pinned drafts appear first. The global header search has a flexible width, and student/teacher shortcuts lead to the shared registry.

Parallel work boundaries: Antigravity owns report previews/templates in feature/ui-report-polish; Cline owns RegistryPage and new registry components in feature/ui-registry-polish. Each assignment requires its own worktree, validation and a separate commit. Neither is authorized to deploy by those assignments.

This change does not implement shared announcement publishing or message delivery.

Validation: TypeScript passed; all 89 tests passed on a sequential retry; production build passed in 1m 55s. The initial concurrent test run exhausted machine memory. Local browser preview startup crashed, so desktop/mobile visual verification remains outstanding. No production deployment was performed.
