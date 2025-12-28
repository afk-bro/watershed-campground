/**
 * IMPORT BOUNDARY ENFORCEMENT
 *
 * This context file must ONLY import from:
 * ✅ React core (react)
 * ✅ Type-only imports (import type) from lib/* for data shapes
 * ✅ Local component types (./*)
 * ✅ Date utilities (date-fns) if needed
 *
 * ❌ NEVER import from:
 * ❌ lib/api/* or service layers (no API clients)
 * ❌ supabase/* runtime code (types only via import type)
 * ❌ Data fetching hooks or mutation utilities
 *
 * This ensures the context remains purely for UI coordination,
 * not data management.
 */
import { createContext, useContext, ReactNode } from 'react';
import type { Reservation, BlackoutDate } from '@/lib/supabase';
import type { GhostState } from '@/lib/calendar/calendar-types';
import type { ResizeSide } from './BaseCalendarBlock';

/**
 * CalendarInteractionContext
 *
 * Provides shared calendar state and handlers to all calendar rows.
 * Eliminates prop drilling of 21 shared props through the component tree.
 *
 * ARCHITECTURAL BOUNDARIES:
 *
 * ✅ ALLOWED - Ephemeral UI interaction state:
 *    - Drag/resize/selection state (isDragging, isCreating, etc.)
 *    - Hover, active workflow indicators
 *    - Validation errors from interactions
 *
 * ✅ ALLOWED - Event handlers & helpers:
 *    - Handlers that operate on already-loaded data
 *    - Hit-testing helpers (getGhost, cell targeting)
 *    - Calendar configuration (days, monthStart, etc.)
 *
 * ❌ NOT ALLOWED - Data & persistence:
 *    - Fetching, caching, or transforming reservation data
 *    - API calls or persistence (belongs in data hooks/services)
 *    - Global app state (filters, URL sync - belongs in parent)
 *
 * Benefits:
 * - Reduces CalendarRow props from 25 → 4 (row-specific data only)
 * - Single source of truth for interaction state
 * - Testable, focused responsibility
 * - Easier to add new interactions without changing signatures
 *
 * PERFORMANCE OPTIMIZATION (if needed):
 *
 * Current implementation uses a single memoized context value with
 * stable handlers (useCallback). This should be sufficient for most cases.
 *
 * If React DevTools Profiler shows excessive re-renders of rows when
 * state updates (e.g., isDragging changes), consider splitting into:
 *
 * 1. CalendarInteractionStateContext
 *    - Ephemeral state: isDragging, isCreating, dragPreview, etc.
 *    - Consumed by components that need to react to state changes
 *
 * 2. CalendarInteractionActionsContext
 *    - Event handlers: onCellPointerDown, onDragStart, etc.
 *    - Consumed by components that only trigger actions
 *    - Never changes (handlers are stable)
 *
 * This prevents components that only use actions from re-rendering when
 * state changes. However, DO NOT implement this preemptively - only if
 * profiling shows a real performance issue.
 *
 * To profile:
 * 1. Open React DevTools Profiler
 * 2. Start recording
 * 3. Perform drag/selection interactions
 * 4. Look for CalendarRow re-renders when only state changed
 * 5. If <10% of rows re-render unnecessarily, current approach is fine
 */

export interface CalendarInteractionContextValue {
  // Calendar Configuration
  days: Date[];
  monthStart: Date;
  monthEnd: Date;
  totalDays: number;

  // Creation State
  isCreating: boolean;
  selectionCampsiteId?: string | null;
  selectionStart?: string | null;
  selectionEnd?: string | null;

  // Drag & Drop State
  isDragging: boolean;
  dragPreview: { campsiteId: string; startDate: string } | null;
  draggedItemId?: string | null;
  resizeStateItemId?: string | null;

  // UI State
  showAvailability: boolean;
  validationError: string | null;

  // Interaction Handlers
  onCellPointerDown: (e: React.PointerEvent, resourceId: string, dateStr: string) => void;
  onCellPointerEnter: (resourceId: string, dateStr: string) => void;
  onReservationClick: (res: Reservation) => void;
  onBlackoutClick: (blackout: BlackoutDate) => void;
  onDragStart: (e: React.PointerEvent, item: any) => void;
  onResizeStart: (item: any, side: ResizeSide) => void;
  getGhost: (resourceId: string) => GhostState | null;
}

const CalendarInteractionContext = createContext<CalendarInteractionContextValue | null>(null);

export interface CalendarInteractionProviderProps {
  children: ReactNode;
  value: CalendarInteractionContextValue;
}

/**
 * CalendarInteractionProvider
 *
 * Wraps calendar rows to provide shared interaction state and handlers.
 * Use at the calendar grid level to eliminate prop drilling.
 *
 * @example
 * ```tsx
 * <CalendarInteractionProvider value={{
 *   days, monthStart, monthEnd, totalDays,
 *   isCreating, isDragging, showAvailability,
 *   onCellPointerDown, onReservationClick, ...
 * }}>
 *   {campsites.map(campsite => (
 *     <CalendarRow key={campsite.id} campsite={campsite} ... />
 *   ))}
 * </CalendarInteractionProvider>
 * ```
 */
export function CalendarInteractionProvider({ children, value }: CalendarInteractionProviderProps) {
  return (
    <CalendarInteractionContext.Provider value={value}>
      {children}
    </CalendarInteractionContext.Provider>
  );
}

/**
 * useCalendarInteraction
 *
 * Hook to access calendar interaction context.
 * Must be used within a CalendarInteractionProvider.
 *
 * @throws Error if used outside provider
 * @returns Calendar interaction state and handlers
 */
export function useCalendarInteraction(): CalendarInteractionContextValue {
  const context = useContext(CalendarInteractionContext);

  if (!context) {
    throw new Error('useCalendarInteraction must be used within CalendarInteractionProvider');
  }

  return context;
}
