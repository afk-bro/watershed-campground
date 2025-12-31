# Test ID Policy

## Purpose

Stable, semantic `data-testid` attributes prevent test brittleness caused by:
- UI refactoring (CSS class changes, layout restructuring)
- Text content changes (i18n, copy updates)
- DOM structure changes (component composition)

## Rules

### 1. Use `data-testid` for Critical UI Elements

**Critical elements** are those that:
- Are targets for user interaction (buttons, inputs, selectors)
- Represent key states or data (calendar views, reservation cards)
- Are used across multiple tests

**Examples:**
```tsx
// Good: Stable selector for calendar component
<div data-testid="availability-calendar">

// Good: Stable selector for interactive elements
<div data-testid="calendar-cell-${campsiteId}-${date}">
<button data-testid="blackout-drag-handle">

// Bad: Relying on CSS classes (brittle)
<div className="calendar-grid">  // Tests break on class rename
```

### 2. Use Semantic Role Selectors for Standard UI

Prefer semantic selectors when the element has a clear ARIA role:

```typescript
// Good: Semantic role selector
page.getByRole('button', { name: /book now/i })

// Good: Label association
page.getByLabel('Check-in Date')

// Only use testid when: role is ambiguous OR element is highly dynamic
page.getByTestId('calendar-cell-A1-2025-01-15')
```

### 3. Naming Convention

Format: `{component}-{element}-{qualifier?}`

```tsx
// Component-level identifiers
data-testid="availability-calendar"
data-testid="reservation-card"
data-testid="admin-sidebar"

// Element-level identifiers with context
data-testid="campsite-option-{code}"
data-testid="calendar-cell-{campsiteId}-{date}"
data-testid="blackout-drag-handle"

// State-based qualifiers
data-testid="reservation-status-confirmed"
data-testid="calendar-day-sold-out"
```

### 4. Scope Test IDs to Component Files

Add `data-testid` in the component itself, not in parent layouts:

```tsx
// Good: DateStep.tsx owns its test ID
export default function DateStep() {
  return <div data-testid="availability-calendar">...</div>
}

// Bad: Test ID added in parent page
<DateStep className="..." data-testid="...">  // Props drilling = noise
```

### 5. Dynamic IDs for Grid/List Items

Use template literals for repeated elements with unique identifiers:

```tsx
// Calendar cells
<div data-testid={`calendar-cell-${campsite.id}-${date}`}>

// Reservation cards
<div data-testid={`reservation-card-${reservation.id}`}>

// Campsite options
<button data-testid={`campsite-option-${campsite.code}`}>
```

### 6. When NOT to Add Test IDs

Avoid test IDs for:
- Static content (headings, paragraphs) → Use `getByText()` or `getByRole('heading')`
- Standard form fields with labels → Use `getByLabel()`
- Buttons with unique text → Use `getByRole('button', { name: /text/i })`
- One-off interactions → Use CSS selectors sparingly

### 7. Document Test IDs in Component Comments

For complex interactive components, document test IDs at the top:

```tsx
/**
 * DateStep - Calendar date range selector
 *
 * Test IDs:
 * - availability-calendar: Root container
 * - calendar-cell-{yyyy-mm-dd}: Individual day cells (future)
 */
export default function DateStep() { ... }
```

### 8. Keep Test IDs Stable Across Refactors

**Never change a test ID without updating all dependent tests.**

If refactoring requires a new ID structure:
1. Add new ID alongside old ID
2. Update all tests to use new ID
3. Remove old ID in separate commit

### 9. Prefer Text Content Over Test IDs When Possible

```typescript
// Good: Content-based (survives refactors, self-documenting)
await page.getByRole('button', { name: /make a reservation/i }).click()

// OK: Test ID for ambiguous elements
await page.getByTestId('availability-calendar').isVisible()

// Bad: Test ID for everything
await page.getByTestId('hero-cta-button').click()  // Overkill
```

### 10. Test ID Audit During Code Review

When reviewing PRs:
- ✅ Check test IDs follow naming convention
- ✅ Verify test IDs are used consistently across test files
- ✅ Ensure removed components remove orphaned test IDs from tests
- ✅ **Anti-.first() Rule:** Never select campsites with `.first()` - always select by code or test ID

## Anti-Pattern: Selecting Campsites with .first()

**Never do this:**
```typescript
// ❌ BAD: Causes 409 conflicts in parallel tests
const campsiteCard = page.locator('[data-testid*="campsite-"]').first();
await campsiteCard.click();
```

**Why it fails:**
- Multiple tests run in parallel
- Test A selects `.first()` → assigns campsite S1
- Test B selects `.first()` → tries to assign S1 → **409 Conflict**

**Always do this:**
```typescript
// ✅ GOOD: Select by unique code from createDedicatedCampsite()
const { code, cleanup } = await createDedicatedCampsite({ codePrefix: 'MYTEST' });

try {
    const campsiteOption = page.locator('[data-testid="campsite-option"]')
        .filter({ hasText: code });
    await campsiteOption.click();
} finally {
    await cleanup();
}
```

**CI Enforcement:**
Run `scripts/check-campsite-selectors.sh` in CI to catch violations automatically.

## Current Test IDs in Use

### Public Booking Flow
- `availability-calendar` (DateStep.tsx:74) - Calendar root container

### Admin Calendar (Planned)
- `calendar-cell-{campsiteId}-{yyyy-mm-dd}` - Individual calendar cells
- `blackout-drag-handle` - Drag handle for blackout blocks
- `reservation-drag-handle` - Drag handle for reservation blocks

### Future Additions
- Document new test IDs here as they're added
- Link to component file and line number
- Note when test IDs are deprecated

## See Also

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Factory Migration Guide](./factory-migration-tech-debt.md)
- Rate limiting test philosophy (TODO: document in rate-limiting-tests.md)
