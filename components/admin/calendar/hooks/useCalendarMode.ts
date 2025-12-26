"use client";

import { useEffect, useState } from 'react';
import { useViewportModeContext } from '@/components/providers/ViewportModeProvider';
import type { ViewportMode } from '@/lib/hooks/useViewportMode';

/**
 * Calendar UX Modes (aligned with global viewport modes)
 */
export type CalendarMode = ViewportMode;

/**
 * Pointer input type (aligned with global pointer types)
 */
export type PointerType = 'coarse' | 'fine';

/**
 * Available calendar view types
 */
export type CalendarView = 'agenda' | 'weekGrid' | 'fullGrid';

/**
 * Interaction capabilities for each mode
 */
export interface InteractionCapabilities {
  canDragCreate: boolean;
  canDragMove: boolean;
  canResizeByDrag: boolean;
}

/**
 * Complete calendar mode state
 */
export interface CalendarModeState {
  mode: CalendarMode;
  pointer: PointerType;
  view: CalendarView;
  capabilities: InteractionCapabilities;
  setView: (view: CalendarView) => void;
}

/**
 * Convert global pointer type to calendar pointer type
 */
function toCalendarPointerType(globalType: 'touch' | 'mouse'): PointerType {
  return globalType === 'mouse' ? 'fine' : 'coarse';
}

/**
 * Default view for each mode
 */
const DEFAULT_VIEW_BY_MODE: Record<CalendarMode, CalendarView> = {
  phone: 'agenda',
  tablet: 'weekGrid',
  desktop: 'fullGrid',
};

/**
 * Interaction capabilities by mode and pointer type
 */
function getCapabilities(mode: CalendarMode, pointer: PointerType): InteractionCapabilities {
  // Phone mode: tap-only, no drag/resize
  if (mode === 'phone') {
    return {
      canDragCreate: false,
      canDragMove: false,
      canResizeByDrag: false,
    };
  }

  // Tablet mode: drag-move optional, no resize-by-drag
  if (mode === 'tablet') {
    return {
      canDragCreate: false,
      canDragMove: pointer === 'fine', // Only with mouse/trackpad
      canResizeByDrag: false,
    };
  }

  // Desktop mode: full interactions with fine pointer
  return {
    canDragCreate: pointer === 'fine',
    canDragMove: pointer === 'fine',
    canResizeByDrag: pointer === 'fine',
  };
}

/**
 * Storage key for all view preferences (versioned, single JSON blob)
 */
const VIEW_PREFS_KEY = 'watershed:calendar:viewPrefs:v1';

type ViewPrefs = Partial<Record<CalendarMode, CalendarView>>;

/**
 * Load all view preferences from localStorage
 */
function loadAllViewPrefs(): ViewPrefs {
  try {
    const raw = localStorage.getItem(VIEW_PREFS_KEY);
    return raw ? (JSON.parse(raw) as ViewPrefs) : {};
  } catch {
    return {};
  }
}

/**
 * Save all view preferences to localStorage
 */
function saveAllViewPrefs(prefs: ViewPrefs): void {
  try {
    localStorage.setItem(VIEW_PREFS_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn('Failed to save view preferences:', e);
  }
}

/**
 * Persist view preference for a specific mode
 */
function saveViewPreference(mode: CalendarMode, view: CalendarView): void {
  const prefs = loadAllViewPrefs();
  prefs[mode] = view;
  saveAllViewPrefs(prefs);
}

/**
 * Load saved view preference for a specific mode
 */
function loadViewPreference(mode: CalendarMode): CalendarView | null {
  const prefs = loadAllViewPrefs();
  const saved = prefs[mode];
  return saved && ['agenda', 'weekGrid', 'fullGrid'].includes(saved) ? saved : null;
}

/**
 * Custom hook for calendar mode detection and management
 *
 * Delegates mode/pointer detection to the shared viewport mode context.
 * Handles calendar-specific view selection with per-mode persistence.
 */
export function useCalendarMode(): CalendarModeState {
  // Use shared viewport mode for consistent detection across the app
  const { mode: globalMode, pointerType: globalPointerType } = useViewportModeContext();

  // Convert to calendar types
  const mode = globalMode as CalendarMode;
  const pointer = toCalendarPointerType(globalPointerType);

  // View state with lazy initialization
  const [view, setViewState] = useState<CalendarView>(() => {
    if (typeof window === 'undefined') return 'fullGrid';

    // Use current mode from context for initial view
    const saved = loadViewPreference(globalMode as CalendarMode);
    return saved || DEFAULT_VIEW_BY_MODE[globalMode as CalendarMode];
  });

  // Track the last mode to prevent unnecessary view resets
  const [lastMode, setLastMode] = useState<CalendarMode>(mode);

  // When mode changes, update view if needed
  useEffect(() => {
    if (mode !== lastMode) {
      // Mode boundary crossed - load saved preference or use default
      const savedView = loadViewPreference(mode);
      const newView = savedView || DEFAULT_VIEW_BY_MODE[mode];
      setViewState(newView);
      setLastMode(mode);
    }
  }, [mode, lastMode]);

  // Custom setView that persists preference
  const setView = (newView: CalendarView) => {
    setViewState(newView);
    saveViewPreference(mode, newView);
  };

  // Calculate capabilities based on current mode and pointer
  const capabilities = getCapabilities(mode, pointer);

  return {
    mode,
    pointer,
    view,
    capabilities,
    setView,
  };
}
