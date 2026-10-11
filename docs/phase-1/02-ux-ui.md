# UX and UI Specification

## Design direction
Build a polished, calm, professional file-management application. Use a restrained visual system, consistent spacing, readable typography, clear hierarchy, and high-quality empty/loading/error states. It must not look like a hackathon dashboard or a generic AI-generated admin template. Do not overuse gradients, glassmorphism, oversized hero sections, decorative cards, or emoji. The authenticated workspace should prioritize files and actions.

## Information architecture
- Public: landing page, sign in, sign up, forgot password, reset password, privacy, terms placeholder clearly marked for owner completion.
- Authenticated app shell: sidebar/navigation, account switcher, top search, upload action, notification/operation center, user menu.
- Main destinations: All files, My Drive / account views, Recent, Starred, Trash, Connected accounts, Uploads and operations, Settings.
- Shared drives are not a Phase 1 destination.
- All files view groups or labels every file by its source account. Never hide source account identity in a tooltip only.

## Core screens
1. Landing page: explain the multi-account value, security model, supported provider, and sign-in action. Do not claim Google endorsement.
2. Authentication: accessible forms, validation, pending/error feedback, password visibility toggle, and password reset flow.
3. First-run onboarding: connect first Google account, explain permissions, show connection result, then invite connection of another account.
4. Dashboard / All files: file table/list, search, sorting, filters, breadcrumbs, upload, new-folder action where supported, multi-select, source labels.
5. Account details: connected account email, connection status, quota values and timestamp, sync status, refresh, reconnect, disconnect confirmation.
6. File preview/details: appropriate preview or open action, metadata, source account, actions permitted by provider capabilities.
7. Upload manager: queued/uploading/verifying/completed/failed/cancelled states, progress, destination account, retry and cancel where safe.
8. Operations center: long-running copy/move/trash/restore/sync jobs and partial failure details.
9. Trash: source account, deletion date, restore availability, restore action, explicit permanent-delete action.
10. Settings: profile, sessions/security, preferences, and account management.

## File list behavior
- Support list view first; grid view is optional only after list behavior is complete.
- Columns on desktop: name/type, source account, modified time, size when meaningful, and contextual actions.
- For Google-native documents, size may be unavailable; show a clear placeholder instead of fabricated values.
- Use file-type icons or safe thumbnails. Do not assume a thumbnail URL is public.
- Row click opens a preview/details route; actions are separate buttons with accessible names.
- Right-click context menus are optional and must not be the only route to actions.
- Keyboard selection and multi-select must be supported.
- Sorting and filtering must remain consistent across pagination.
- Folder navigation must handle deleted, inaccessible, shortcut, and stale items gracefully.
- Display an explicit empty state with next actions when no files are found.

## Upload interaction
- Drop zone is available without obstructing normal navigation.
- Show destination selection with “Automatic (best fit)” and explicit connected-account options.
- Before transfer, show the selected destination and explain if placement is manual or automatic.
- For multiple files, report progress and errors per file.
- Distinguish transfer progress from server verification; do not mark complete merely because bytes were sent.
- Retry only when safe; if the prior outcome is ambiguous, reconcile before retry.
- For cancellation, explain whether an already-created provider file may need cleanup.
- On placement failure, show which accounts were ineligible and safe, user-friendly reasons.

## Cross-account move UX
- Use language that explains it is a copy followed by optional source removal.
- Show source account, destination account, file count, and known limitations.
- Copy first, verify destination, and only then ask for source-removal confirmation.
- Never bundle source deletion into a generic “Move” click without the second confirmation.
- Show partial results per item; preserve source when verification fails.
- If permissions, comments, versions, ownership, shortcuts, or native document behavior may not transfer, disclose the relevant limitation before the operation.

## Trash UX
- Clearly distinguish “Move to Conflux trash / provider trash” from “Permanently delete”.
- Show whether restoration is available according to the last known provider state.
- Do not promise recovery after permanent provider deletion.
- If state is stale, explain that Conflux is checking the provider before acting.

## Status language
Use clear statuses: Connected, Needs attention, Disconnected, Syncing, Up to date, Stale, Uploading, Verifying, Completed, Partially completed, Failed, Cancelled, Restore unavailable. Avoid ambiguous status colors without text labels.

## Visual system
- Define design tokens for spacing, typography, radii, borders, elevation, and semantic colors.
- Use a consistent icon library rather than emoji.
- Keep motion subtle and respect reduced-motion preferences.
- Use responsive breakpoints and ensure actions remain accessible on narrow screens.
- Provide skeleton loading for initial content and inline refresh states for stale data.
- Ensure light/dark mode only if it can be completed consistently; do not ship a broken half-theme.

## Accessibility
- Semantic landmarks and heading hierarchy.
- Keyboard access to navigation, search, menus, dialogs, tables, and uploads.
- Focus trapping and restoration in modal dialogs.
- Accessible labels and descriptions for icon-only buttons.
- Announce asynchronous status changes without excessive screen-reader noise.
- Contrast meets WCAG AA for normal text where practical.
- Never communicate errors or selection state only through color.

## UX completion checklist
- No dead buttons or links.
- Every asynchronous screen has loading, success, empty, and error behavior.
- Destructive actions have explicit confirmation.
- Source account is visible on file and operation views.
- API errors become understandable messages with a safe retry path where appropriate.
- No fabricated file data, fake quota values, fake sync completion, or fake provider operations.
