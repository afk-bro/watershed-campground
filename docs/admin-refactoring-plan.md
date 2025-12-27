# Admin Folder Refactoring Plan

**Date:** 2025-12-27
**Scope:** `/app/admin/` and `/components/admin/`
**Strategy:** Incremental refactoring with atomic commits
**Risk Level:** Medium
**Estimated Duration:** Phase 1: 20 hours | Full: 90-100 hours

---

## Prioritization Matrix

Following the **Impact vs Effort Matrix** methodology:

###  High Impact, Low Effort → **DO FIRST** ⭐

| ID | Task | Impact | Effort | Hours | Risk |
|----|------|--------|--------|-------|------|
| R1 | Fix duplicate authPages in layout | High | Low | 1 | Low |
| R2 | Integrate AdminNav component in layout | High | Low | 2 | Low |
| R3 | Extract magic values to constants | Medium | Low | 2 | Low |
| R4 | Create Checkbox shared component | Medium | Low | 2 | Low |
| R5 | Create EmptyState shared component | Medium | Low | 2 | Low |

**Total Phase 1:** 9 hours

---

### High Impact, Medium Effort → **PLAN CAREFULLY** 📋

| ID | Task | Impact | Effort | Hours | Risk |
|----|------|--------|--------|-------|------|
| R6 | Extract admin page state to custom hooks | High | Medium | 8 | Medium |
| R7 | Create centralized API client | High | Medium | 8 | Medium |
| R8 | Standardize error handling patterns | High | Medium | 6 | Low |
| R9 | Extract bulk action handlers to hook | High | Medium | 6 | Medium |
| R10 | Refactor ReservationsTable to use composition | Medium | Medium | 4 | Low |

**Total Phase 2:** 32 hours

---

### High Impact, High Effort → **STRATEGIC REFACTORING** 🎯

| ID | Task | Impact | Effort | Hours | Risk |
|----|------|--------|--------|-------|------|
| R11 | Decompose CalendarGrid component | Very High | Very High | 20 | High |
| R12 | Add unit tests for complex hooks | High | High | 12 | Low |
| R13 | Create useReservationData hook | High | Medium-High | 6 | Medium |
| R14 | Add React.memo to performance-critical components | Medium | Medium | 4 | Low |

**Total Phase 3:** 42 hours

---

### Low Impact, Low Effort → **QUICK WINS** ✅

| ID | Task | Impact | Effort | Hours | Risk |
|----|------|--------|--------|-------|------|
| R15 | Standardize CSS variable usage | Low | Low | 4 | Low |
| R16 | Extract SkeletonLoader component | Low | Low | 2 | Low |
| R17 | Add TypeScript strict mode checks | Low | Medium | 3 | Low |

**Total Phase 4:** 9 hours

---

## Detailed Refactoring Tasks

### **R1: Fix Duplicate authPages in Layout**

**Priority:** CRITICAL
**File:** `app/admin/layout.tsx`

**Current Issue:**
```typescript
// Line 29
const authPages = ['/admin/login', '/admin/forgot-password', '/admin/update-password'];

// Line 45 - DUPLICATE!
const authPages = ['/admin/login', '/admin/forgot-password', '/admin/update-password'];
```

**Refactoring Steps:**
1. Remove duplicate `authPages` definition on line 45
2. Move single `authPages` definition to top of component
3. Reuse throughout component

**Testing:**
- Verify auth redirect works
- Test navigation on auth pages
- Run E2E auth tests

**Commit Message:**
```
refactor(admin): remove duplicate authPages definition

- Consolidated authPages array to single definition
- Removed duplicate on line 45
- No functional changes
```

---

### **R2: Integrate AdminNav Component**

**Priority:** CRITICAL
**Files:** `app/admin/layout.tsx`, `components/admin/AdminNav.tsx`

**Current Issue:**
- Navigation is hardcoded with `<a>` tags in layout
- `AdminNav.tsx` component exists but is not used
- Manual anchor tags instead of Next.js Link

**Refactoring Steps:**
1. Read `AdminNav.tsx` to understand its interface
2. Replace hardcoded nav (lines 83-119) with `<AdminNav>` component
3. Pass `userEmail` and `handleLogout` as props
4. Remove inline navigation code
5. Update styling if needed

**Testing:**
- Verify all navigation links work
- Test active state highlighting
- Verify logout functionality
- Test on mobile (bottom nav) and desktop (top nav)

**Commit Message:**
```
refactor(admin): replace hardcoded nav with AdminNav component

- Removed duplicate navigation code from layout
- Using existing AdminNav component
- Maintains mobile/desktop responsive behavior
- Cleaner separation of concerns
```

---

### **R3: Extract Magic Values to Constants**

**Priority:** HIGH
**New File:** `lib/admin/constants.ts`

**Magic Values to Extract:**
- Checkbox size classes: `w-5 h-5` (appears 10+ times)
- Scroll threshold: `200` (floating rail trigger)
- Throttle intervals: `16ms`, `3000ms`
- Auto-scroll edge distance
- Grid cell dimensions

**Implementation:**
```typescript
// lib/admin/constants.ts
export const UI_CONSTANTS = {
  // Checkbox
  CHECKBOX_SIZE: 'w-5 h-5',
  CHECKBOX_CLASSES: 'rounded-md border-2 border-[var(--color-border-subtle)] checked:border-[var(--color-accent-gold)] text-[var(--color-accent-gold)] focus:ring-2 focus:ring-[var(--color-accent-gold)]',

  // Scrolling
  FLOATING_RAIL_SCROLL_THRESHOLD: 200,
  AUTO_SCROLL_EDGE_DISTANCE: 50,

  // Performance
  DRAG_THROTTLE_MS: 16,
  REVALIDATE_THROTTLE_MS: 3000,
  STUCK_SAVING_TIMEOUT_MS: 10000,

  // Calendar
  CELL_MIN_WIDTH: 40,
  ROW_HEIGHT: 48,
} as const;

export const ERROR_MESSAGES = {
  FETCH_FAILED: 'Failed to load data',
  UPDATE_FAILED: 'Failed to update',
  DELETE_FAILED: 'Failed to delete',
  NETWORK_ERROR: 'Network error occurred',
} as const;
```

**Files to Update:**
- `app/admin/page.tsx`
- `components/admin/calendar/CalendarGrid.tsx`
- All files with checkboxes
- All files with scroll handling

**Testing:**
- Verify no visual changes
- Verify all functionality works
- Run full test suite

**Commit Message:**
```
refactor(admin): extract magic values to constants

- Created lib/admin/constants.ts
- Centralized UI constants and error messages
- Improved maintainability and consistency
- No functional changes
```

---

### **R4: Create Checkbox Shared Component**

**Priority:** HIGH
**New File:** `components/admin/shared/ui/Checkbox.tsx`

**Current Issue:**
- Checkbox styling repeated in 8+ files
- Inconsistent class application
- Hard to maintain consistent styling

**Implementation:**
```typescript
// components/admin/shared/ui/Checkbox.tsx
interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  indeterminate?: boolean;
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  disabled = false,
  indeterminate = false,
  className = ''
}: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      className={`${UI_CONSTANTS.CHECKBOX_SIZE} ${UI_CONSTANTS.CHECKBOX_CLASSES} ${className}`}
    />
  );
}
```

**Files to Update:**
- `app/admin/page.tsx` (4 checkboxes)
- `components/admin/reservations/ReservationsTable.tsx`
- `components/admin/calendar/*` (if any)

**Testing:**
- Verify all checkboxes render correctly
- Test indeterminate state
- Test disabled state
- Verify accessibility

**Commit Message:**
```
refactor(admin): create shared Checkbox component

- Extracted checkbox to reusable component
- Consistent styling across admin panel
- Supports indeterminate state
- Reduced code duplication
```

---

### **R5: Create EmptyState Shared Component**

**Priority:** HIGH
**New File:** `components/admin/shared/feedback/EmptyState.tsx`

**Current Issue:**
- Empty states duplicated in multiple components
- Inconsistent messaging and styling
- No standard pattern

**Implementation:**
```typescript
// components/admin/shared/feedback/EmptyState.tsx
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="bg-[var(--color-surface-card)] rounded-xl border border-[var(--color-border-subtle)] border-dashed p-12 text-center">
      {Icon && (
        <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <Icon className="text-gray-400" size={20} />
        </div>
      )}
      <h3 className="text-lg font-medium text-[var(--color-text-primary)]">{title}</h3>
      <p className="text-[var(--color-text-muted)] mt-1 mb-6">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-white dark:bg-gray-800 border border-[var(--color-border-subtle)] rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
```

**Files to Update:**
- `app/admin/page.tsx` (line 319)
- `components/admin/reservations/ReservationsTable.tsx` (line 50)
- Any other empty state instances

**Commit Message:**
```
refactor(admin): create shared EmptyState component

- Standardized empty state pattern
- Reusable across admin components
- Consistent UX for "no data" scenarios
```

---

### **R6: Extract Admin Page State to Custom Hooks**

**Priority:** HIGH
**New Files:**
- `hooks/admin/useReservationData.ts`
- `hooks/admin/useBulkActions.ts`
- `hooks/admin/useReservationFilters.ts`

**Current Issue:**
`app/admin/page.tsx` has 14 state variables and complex logic

**Refactoring Steps:**

#### 6.1: Create `useReservationData` Hook
```typescript
// hooks/admin/useReservationData.ts
export function useReservationData(showArchived: boolean) {
  const [items, setItems] = useState<OverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReservations = useCallback(async () => {
    // Move fetching logic here
  }, [showArchived]);

  useEffect(() => {
    void fetchReservations();
  }, [fetchReservations]);

  return { items, loading, error, refetch: fetchReservations };
}
```

#### 6.2: Create `useBulkActions` Hook
```typescript
// hooks/admin/useBulkActions.ts
export function useBulkActions() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleBulkAction = async (/* ... */) => {
    // Move bulk action logic here
  };

  const handleBulkAssignRandom = async (/* ... */) => {
    // Move logic here
  };

  const handleBulkArchive = async (/* ... */) => {
    // Move logic here
  };

  return {
    isSubmitting,
    handleBulkAction,
    handleBulkAssignRandom,
    handleBulkArchive,
  };
}
```

#### 6.3: Create `useReservationFilters` Hook
```typescript
// hooks/admin/useReservationFilters.ts
export function useReservationFilters(items: OverviewItem[]) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortMode, setSortMode] = useState<SortMode>('start_date');
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const filteredItems = useMemo(() => {
    // Move filtering logic here
  }, [items, filter, searchQuery, showArchived]);

  const sortedItems = useMemo(() => {
    // Move sorting logic here
  }, [filteredItems, sortMode]);

  return {
    filter,
    setFilter,
    sortMode,
    setSortMode,
    searchQuery,
    setSearchQuery,
    showArchived,
    setShowArchived,
    filteredItems,
    sortedItems,
  };
}
```

#### 6.4: Update `app/admin/page.tsx`
Replace state and logic with hooks:
```typescript
export default function AdminPage() {
  const { items, loading, error, refetch } = useReservationData(showArchived);
  const { filteredItems, sortedItems, ...filterProps } = useReservationFilters(items);
  const bulkActions = useBulkActions();

  // Component becomes much simpler!
}
```

**Testing:**
- Verify all functionality works
- Run E2E tests for admin dashboard
- Check performance (should be same or better)

**Commit Strategy:**
```
commit 1: refactor(admin): extract useReservationData hook
commit 2: refactor(admin): extract useBulkActions hook
commit 3: refactor(admin): extract useReservationFilters hook
commit 4: refactor(admin): integrate hooks in admin page
```

---

### **R7: Create Centralized API Client**

**Priority:** HIGH
**New File:** `lib/admin/api-client.ts`

**Current Issue:**
- Duplicate fetch calls across components
- Inconsistent error handling
- No request/response interceptors
- No retry logic

**Implementation:**
```typescript
// lib/admin/api-client.ts
class AdminAPIClient {
  private async request<T>(
    url: string,
    options?: RequestInit
  ): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Request failed: ${url}`, error);
      throw error;
    }
  }

  // Reservations
  async getReservations() {
    return this.request('/api/admin/reservations');
  }

  async updateReservation(id: string, data: Partial<Reservation>) {
    return this.request(`/api/admin/reservations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async bulkUpdateStatus(ids: string[], status: ReservationStatus) {
    return this.request('/api/admin/reservations/bulk-status', {
      method: 'POST',
      body: JSON.stringify({ reservationIds: ids, status }),
    });
  }

  // ... more methods
}

export const adminAPI = new AdminAPIClient();
```

**Files to Update:**
- `app/admin/page.tsx`
- `hooks/admin/useReservationData.ts` (if created in R6)
- Any component making API calls

**Testing:**
- Verify all API calls work
- Test error handling
- Run full E2E suite

**Commit Message:**
```
refactor(admin): create centralized API client

- Created AdminAPIClient class
- Centralized all admin API calls
- Consistent error handling
- Foundation for retry logic and caching
```

---

### **R8: Standardize Error Handling**

**Priority:** HIGH
**New File:** `lib/admin/error-handler.ts`

**Implementation:**
```typescript
// lib/admin/error-handler.ts
export class AdminError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string
  ) {
    super(message);
    this.name = 'AdminError';
  }
}

export function handleAdminError(
  error: unknown,
  context: string
): AdminError {
  console.error(`[${context}]`, error);

  if (error instanceof AdminError) {
    return error;
  }

  if (error instanceof Error) {
    return new AdminError(
      error.message,
      'UNKNOWN_ERROR',
      'An unexpected error occurred. Please try again.'
    );
  }

  return new AdminError(
    'Unknown error',
    'UNKNOWN_ERROR',
    'An unexpected error occurred. Please try again.'
  );
}

// Hook for components
export function useErrorHandler() {
  const { showToast } = useToast();

  const handleError = useCallback((error: unknown, context: string) => {
    const adminError = handleAdminError(error, context);
    showToast(adminError.userMessage, 'error');
    return adminError;
  }, [showToast]);

  return { handleError };
}
```

**Files to Update:**
- All components with try/catch blocks
- All hooks with error handling

**Commit Message:**
```
refactor(admin): standardize error handling

- Created AdminError class
- Added useErrorHandler hook
- Consistent error messages across admin panel
- Better error logging and debugging
```

---

### **R11: Decompose CalendarGrid Component**

**Priority:** VERY HIGH (but requires careful planning)
**Risk:** HIGH
**Files:** `components/admin/calendar/CalendarGrid.tsx` → Multiple files

**Strategy:** Strangler Pattern (gradual replacement)

**Phase 1: Extract Container Logic**
```
CalendarGrid.tsx (current 709 lines)
  ↓
CalendarGridContainer.tsx (orchestration - 150 lines)
└── CalendarGridView.tsx (presentation - 300 lines)
    ├── CalendarHeader.tsx (100 lines)
    ├── CalendarBody.tsx (200 lines)
    └── CalendarRow.tsx (already exists)
```

**Phase 2: Extract Data Management**
```typescript
// hooks/admin/calendar/useCalendarData.ts
export function useCalendarData(date: Date) {
  // Data fetching, filtering, memoization
}

// hooks/admin/calendar/useCalendarInteractions.ts
export function useCalendarInteractions() {
  // Drag, resize, selection logic
}
```

**Implementation Plan:**
1. Create new components alongside existing
2. Add feature flag to toggle between old/new
3. Test new implementation thoroughly
4. Remove old implementation

**Testing Requirements:**
- All drag-drop functionality
- All resize operations
- Selection and creation
- Mobile/desktop views
- Performance benchmarks

**Commit Strategy:**
```
commit 1: refactor(calendar): extract CalendarHeader component
commit 2: refactor(calendar): extract CalendarBody component
commit 3: refactor(calendar): create useCalendarData hook
commit 4: refactor(calendar): create useCalendarInteractions hook
commit 5: refactor(calendar): integrate new architecture
commit 6: refactor(calendar): remove old implementation
```

**Estimated Time:** 20 hours over 3-4 days
**Risk Mitigation:** Feature flag, comprehensive testing, incremental rollout

---

## Testing Strategy

### Pre-Refactoring
- ✅ Run full E2E test suite
- ✅ Document current behavior
- ✅ Create snapshot tests where applicable

### During Refactoring
- Run affected tests after each commit
- Manual testing of modified features
- Check for console errors

### Post-Refactoring
- Full E2E test suite must pass
- Manual regression testing
- Performance comparison
- Accessibility audit

---

## Rollback Plan

### If Issues Arise
1. Each refactoring is in its own commit
2. Can revert specific commits: `git revert <commit-hash>`
3. Feature flags allow toggling new/old code
4. Database changes (none expected) would be reversible

### Rollback Decision Criteria
- E2E tests fail
- Critical bugs in production
- Performance regression >20%
- User-reported issues increase

---

## Success Metrics

### Code Quality
- Reduce avg. component size from 300 → 150 lines
- Reduce cyclomatic complexity from 25 → 10
- Increase test coverage from 60% → 80%
- Reduce code duplication by 40%

### Performance
- No regression in render times
- Maintain <100ms interaction latency
- No increase in bundle size

### Maintainability
- Easier to onboard new developers
- Faster to implement new features
- Fewer bugs in modified areas

---

## Phase Execution Order

### Week 1: Quick Wins (R1-R5)
✅ Low risk, high value
✅ Builds confidence
✅ Immediate improvements

### Week 2: Data Layer (R6-R8)
⚠️ Medium risk
✅ Foundation for future work
✅ Reduces duplication

### Week 3-4: Component Decomposition (R11)
⚠️ High risk
✅ Biggest impact
✅ Requires careful execution

### Week 5: Polish & Testing (R12-R17)
✅ Low risk
✅ Long-term quality
✅ Documentation

---

## Communication Plan

### Daily Updates
- Progress report at end of day
- Blockers identified
- Next day plan

### Key Milestones
1. Phase 1 complete (Quick Wins)
2. Hooks extracted (Data Layer)
3. CalendarGrid refactored
4. All tests passing

### Stakeholder Review Points
- After Phase 1: Demo improvements
- After Phase 2: Review architecture
- After Phase 3: Full regression test
- After Phase 4: Final sign-off

---

## Contingency Planning

### If Timeline Slips
- Focus on Phases 1-2 only
- Defer CalendarGrid to future sprint
- Ship incremental improvements

### If Tests Fail
- Pause refactoring
- Fix tests first
- Re-evaluate approach

### If Performance Regresses
- Profile to find bottleneck
- Add React.memo where needed
- Consider virtualization

---

## Sign-off

**Reviewed By:** _____________
**Approved By:** _____________
**Start Date:** _____________
**Target Completion:** _____________

---

## Appendix: File Change Checklist

### Files to Create
- [ ] `lib/admin/constants.ts`
- [ ] `lib/admin/error-handler.ts`
- [ ] `lib/admin/api-client.ts`
- [ ] `components/admin/shared/ui/Checkbox.tsx`
- [ ] `components/admin/shared/feedback/EmptyState.tsx`
- [ ] `hooks/admin/useReservationData.ts`
- [ ] `hooks/admin/useBulkActions.ts`
- [ ] `hooks/admin/useReservationFilters.ts`
- [ ] `hooks/admin/useErrorHandler.ts`

### Files to Modify
- [ ] `app/admin/layout.tsx`
- [ ] `app/admin/page.tsx`
- [ ] `components/admin/calendar/CalendarGrid.tsx`
- [ ] `components/admin/reservations/ReservationsTable.tsx`
- [ ] All files using checkboxes (8+ files)
- [ ] All files with empty states (5+ files)

### Files to Delete
- [ ] (None in Phase 1-2)
- [ ] Old CalendarGrid.tsx (Phase 3, after migration)

---

**END OF PLAN**

*This plan follows the Code Refactoring Skill methodology with Impact vs Effort prioritization, incremental execution, and comprehensive safety measures.*
