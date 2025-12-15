Goals

Faster admin workflow: click a row → see/edit details, assign campsite without context switching, handle many reservations at once.

Planning
Scope + Order

Details Drawer (foundation for editing, status changes, assignment, notes)

Inline Assign (quick win; can reuse drawer/dialog pieces)

Bulk Actions (needs row identity, selection state, and assignment logic)

Definition of Done

Row click opens drawer with correct reservation data

Inline Assign works from table row (and optionally inside drawer)

Bulk select + bulk action bar works, handles conflicts + errors gracefully

All writes server-validated (conflicts, inactive campsite, date overlap)

UI feedback: loading, success, error, optimistic updates where safe

Implementation
Feature 1: Details Drawer
1. Verify / Reuse ReservationDrawer

Checklist

Confirm component exists and already supports:

Reservation summary (guest, dates, unit, party)

Status updates (confirm/check-in/check-out/cancel)

Campsite assignment (if not, add later)

Notes (optional)

Confirm it can accept either:

reservationId (drawer fetches details) or

full reservation object (table passes it)

Decision

Prefer reservationId + fetch in drawer if table list is “thin”

Prefer passing object if list already has everything needed

2. Add onRowClick handler to Table

Behavior

Clicking anywhere on the row opens drawer

Clicking on action icons (check-in, cancel, assign) should NOT trigger row open (stop propagation)

State

selectedReservationId: string | null

isDrawerOpen: boolean

3. Drawer UX Requirements

Close via ESC, overlay click, close button

Skeleton loading state

Clear primary action (e.g., “Save”, “Update status”)

Persist last-opened reservation on refresh? (optional)

Edge cases

Reservation is deleted/changed elsewhere → show “Reservation not found” and close option

Conflicting edits → server wins; show error toast and refresh drawer data

Feature 2: Inline Assign
1. Create AssignmentDialog (or reuse)

Re-use check

If you already have an assignment UI in calendar drag/drop confirmation or an admin edit page, reuse the same dialog component.

Dialog contents

Campsite picker (filtered by:

available for the reservation date range

correct campsite type / guest limits if applicable

active only)

“Assign” button + loading state

Optional: show why a campsite is disabled (conflict)

2. Wire up “Assign” button

Placement

In the “Campsite” column, when UNASSIGNED, show:

⚠ UNASSIGNED pill + small “Assign” button/link

When assigned, show campsite label + subtle “Change” option (optional)

API

POST /api/admin/reservations/:id/assign

body: { campsiteId }

server checks: overlap conflicts, campsite active, constraints

returns updated reservation (or at least updated campsite info)

After success

Update row data in list (local state or re-fetch)

If drawer is open for same reservation, update drawer too

Feature 3: Bulk Actions
1. Add Checkbox Column

UI rules

Header checkbox = select all visible (after filter/search)

Each row checkbox toggles selection

Selected rows should have a subtle row highlight

Clicking checkbox does not open drawer (stop propagation)

State

selectedIds: Set<string>

Derived:

selectedCount

selectedReservations (from list)

allVisibleSelected

2. Create BulkActionBar (sticky bottom or floating)

Layout

Appears when selectedCount > 0

Shows:

“X selected”

Clear selection

Bulk Assign (if any are unassigned)

Bulk Cancel

Optional: Export CSV later

Placement

Sticky bottom is usually best for admin tables

Ensure it doesn’t cover pagination controls (add padding-bottom when visible)

3. Implement Bulk Logic
Option A: Assign Random (quick utility)

For each selected reservation:

request server “auto-assign” from available campsites

API:

POST /api/admin/reservations/bulk-assign-random

body: { reservationIds: [] }

Server:

For each reservation:

find available campsites

pick best candidate (or random)

assign

Return results:

updated: [ids]

failed: [{id, reason}]

Option B: Bulk Cancel (most common)

Confirm dialog:

“Cancel X reservations?”

Optional message to guests (future)

API:

POST /api/admin/reservations/bulk-cancel

body: { reservationIds: [] }

Server returns updated statuses + failures

UX for partial success

Toast: “7 cancelled, 2 failed”

Keep failed ones selected and show inline error indicators

Suggested File/Component Breakdown

components/admin/reservations/ReservationTable.tsx

components/admin/reservations/ReservationDrawer.tsx (reuse)

components/admin/reservations/AssignmentDialog.tsx

components/admin/reservations/BulkActionBar.tsx

app/api/admin/reservations/[id]/assign/route.ts

app/api/admin/reservations/bulk-cancel/route.ts

app/api/admin/reservations/bulk-assign-random/route.ts

Notes on UX Consistency (matches your new table style)

Keep inline actions as icons + tooltips

Use pills for state, buttons for action

“Unassigned” remains the loudest operational signal

Bulk action bar uses the same token styling as admin cards/buttons

## Feature 4: Deletion Strategy (Best Practice)
Avoid hard deletes to preserve integrity (accounting, disputes, history).

### Conceptual Model: Soft Delete (Archiving)
- **Field**: `archived_at` (timestamp, nullable) + `archived_by` (user_id)
- **Default View**: Shows only `active` (non-archived) records.
- **Archive Action**: Moves status to 'Archived' (conceptually) or just hides it.
- **Restore Action**: Available in "Archived" view.

### If "Delete" is required:
- **Admin Only**.
- **Restricted**: Only for `cancelled` / `no_show` / `checked_out` status.
- **Safety**: Require payment check (prevent deleting if payments exist).
- **Confirmation**: Explicit "Type DELETE to confirm" dialog.
- **Location**: Settings or Deep Drawer Action, not inline.