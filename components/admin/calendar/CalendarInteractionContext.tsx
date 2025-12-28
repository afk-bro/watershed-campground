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
 * Benefits:
 * - Reduces CalendarRow props from 25 → 4 (row-specific data only)
 * - Single source of truth for interaction state
 * - Easier to add new interactions without changing signatures
 * - Cleaner component tree
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
