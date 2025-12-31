# Follow-Up TODO Checklist — Calendar DnD + Test Durability

This checklist outlines the steps to harden the Calendar Drag-and-Drop implementation and associated tests in `watershed-campground`.

## P0 — Keep CI green while preserving coverage

* [ ] **Document the de-scope**: Add a note in `tests/README.md` explaining why `tests/admin/blackout-drag-resize.spec.ts` is partially skipped and referencing `tests/admin/blackout-api.spec.ts`.
* [ ] **Add a single UI smoke test** (best-effort): Create a minimal "happy path" drag test that verifies the gesture *can* work (no conflict, no resize) in `tests/admin/blackout-drag-resize.spec.ts` (or a new smoke suite).
* [ ] **Make API tests the source of truth**: Ensure `tests/admin/blackout-api.spec.ts` covers all edge cases:
    * [ ] Validation: Date overlap logic
    * [ ] Validation: End date before start date
    * [ ] Multi-tenancy: Cross-org security checks

## P1 — Eliminate `elementsFromPoint` fragility (biggest UX + test win)

Current bottleneck: `lib/calendar/calendar-utils.ts` (`getDateFromPointer`)

* [ ] **Harden hit-testing immediately**:
  * [ ] Replace `el.hasAttribute('data-date')` with `el.closest('[data-date]')` in `getDateFromPointer`.
  * [ ] Ignore known layers: toast containers, dialogs (`div[role="dialog"]`), and `GhostPreview`.
  * [ ] Ensure `GhostPreview.tsx` and toast notifications have `pointer-events: none` applied correctly.
* [ ] **Add stable test selectors**:
  * [ ] Add `data-testid="day-cell"` to `components/admin/calendar/CalendarCell.tsx`.
  * [ ] Ensure `blackout-block` and `reservation-block` have distinct `data-testid`.
* [ ] **Move targeting to explicit events** (preferred long-term fix):
  * [ ] Update `CalendarCell.tsx` to handle `onPointerEnter` and bubble state up to context/hook.
  * [ ] Refactor `components/admin/calendar/hooks/useDragResize.ts` to consume event-based hover targets instead of polling `elementsFromPoint`.

## P2 — Remove timing dependence on React throttling

Current bottleneck: `components/admin/calendar/hooks/useDragResize.ts` relies on `throttledDragRef` (16ms).

* [ ] **Stop using “waitForTimeout” as synchronization**:
  * [ ] visual indicator: Add `data-drag-state="dragging"` to the grid container when active.
  * [ ] In tests: `await expect(grid).toHaveAttribute('data-drag-state', 'dragging')` instead of `await page.waitForTimeout(200)`.
* [ ] **Refactor drag hover sampling**:
  * [ ] Use `requestAnimationFrame` loop in `useDragResize.ts`.
  * [ ] Only `setState` when the calculated target (site/date) actually changes.

## P3 — Make conflicts deterministic without nuking seeded data

* [ ] **Create a dedicated test campsite per test**:
  * [ ] Use `createTestCampsite` from `tests/helpers/factories.ts`.
  * [ ] Test against this fresh campsite to guarantee no random reservations exist.
  * [ ] Cleanup in `afterEach` or let the global cleanup handle it by ID.
* [ ] **Compute safe landing zones (Alternative)**:
  * [ ] Query `campsites JOIN reservations` to find a verified empty gap for the test implementation.

## P4 — Improve error visibility for Supabase/API failures

* [ ] **Add `.throwOnError()`**:
  * [ ] Apply to all `supabaseAdmin` calls in `tests/helpers/factories.ts` and test files.
* [ ] **Log full failure context**:
  * [ ] Create a `safeInsert` helper to log payload + error on failure.
* [ ] **RLS sanity test**:
  * [ ] Add `tests/security/rls-sanity.spec.ts` to verify service role bypass vs. anon restrictions.

## P5 — Re-enable UI tests safely (optional / later)

* [ ] **Split UI vs logic coverage**:
  * [ ] Keep `tests/admin/blackout-drag-resize.spec.ts` for 1-2 smoke tests only.
  * [ ] Move complex logic verification to `tests/admin/blackout-api.spec.ts`.
* [ ] **Introduce a debug mode for tests**:
  * [ ] Disable toasts/animations via a "test mode" flag or CSS injection (already partially done in `test.beforeEach`).
* [ ] **Re-enable skipped cases**:
  * [ ] Resize operations (right/left handles).
  * [ ] Conflict visual indicators.

## P6 — UX polish that also helps reliability

* [ ] **Add “Confirm / Undo”**: Toast action after drop (reduces reliance on immediate perfect placement).
* [ ] **Auto-scroll**: Implement rAF-based scrolling in `useDragResize.ts`.
* [ ] **Keyboard support**: "Click to move" mode for accessibility and more reliable testing.
