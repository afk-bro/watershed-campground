/**
 * Admin Panel Constants
 *
 * Centralized constants for the admin panel to improve maintainability
 * and consistency across components.
 */

// ============================================================================
// UI Constants
// ============================================================================

export const UI_CONSTANTS = {
  // Checkbox styling
  CHECKBOX_SIZE: 'w-5 h-5',
  CHECKBOX_CLASSES: 'rounded-md border-2 border-[var(--color-border-subtle)] checked:border-[var(--color-accent-gold)] text-[var(--color-accent-gold)] focus:ring-2 focus:ring-[var(--color-accent-gold)] focus:ring-offset-0 cursor-pointer transition-all hover:border-[var(--color-accent-gold)]/60',

  // Scrolling behavior
  FLOATING_RAIL_SCROLL_THRESHOLD: 200, // px scrolled before showing floating controls
  AUTO_SCROLL_EDGE_DISTANCE: 50, // px from edge to trigger auto-scroll

  // Performance & throttling
  DRAG_THROTTLE_MS: 16, // ~60fps for smooth drag operations
  REVALIDATE_THROTTLE_MS: 3000, // Minimum time between revalidation requests
  STUCK_SAVING_TIMEOUT_MS: 10000, // Auto-revalidate if saving state persists this long

  // Calendar grid
  CELL_MIN_WIDTH: 40, // Minimum width for calendar cells
  ROW_HEIGHT: 48, // Standard row height in calendar
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  // Generic errors
  FETCH_FAILED: 'Failed to load data',
  UPDATE_FAILED: 'Failed to update',
  DELETE_FAILED: 'Failed to delete',
  NETWORK_ERROR: 'Network error occurred',
  UNKNOWN_ERROR: 'An unexpected error occurred',

  // Reservation errors
  RESERVATION_FETCH_FAILED: 'Failed to load reservations',
  RESERVATION_UPDATE_FAILED: 'Failed to update reservation',
  RESERVATION_DELETE_FAILED: 'Failed to delete reservation',
  RESERVATION_ARCHIVE_FAILED: 'Failed to archive reservation',

  // Campsite errors
  CAMPSITE_FETCH_FAILED: 'Failed to load campsites',
  CAMPSITE_UPDATE_FAILED: 'Failed to update campsite',
  CAMPSITE_ASSIGN_FAILED: 'Failed to assign campsite',

  // Bulk operation errors
  BULK_ACTION_FAILED: 'Failed to perform bulk action',
  BULK_ASSIGN_FAILED: 'Failed to run bulk assignment',
  BULK_ARCHIVE_FAILED: 'Failed to archive items',

  // Calendar errors
  BLACKOUT_CREATE_FAILED: 'Failed to create blackout',
  BLACKOUT_UPDATE_FAILED: 'Failed to update blackout',
  BLACKOUT_DELETE_FAILED: 'Failed to delete blackout',
  RESCHEDULE_FAILED: 'Failed to reschedule reservation',

  // Validation errors
  INVALID_DATE_RANGE: 'Invalid date range',
  OVERLAPPING_RESERVATION: 'Reservation overlaps with existing booking',
  SITE_UNAVAILABLE: 'Campsite is not available for selected dates',
} as const;

// ============================================================================
// Success Messages
// ============================================================================

export const SUCCESS_MESSAGES = {
  // Reservation success
  RESERVATION_UPDATED: 'Reservation updated successfully',
  RESERVATION_ARCHIVED: 'Reservation archived',
  RESERVATION_RESTORED: 'Reservation restored',
  CAMPSITE_ASSIGNED: 'Campsite assigned successfully',

  // Bulk operation success
  BULK_ACTION_SUCCESS: 'Bulk action completed',
  BULK_ARCHIVE_SUCCESS: 'Items archived',
  BULK_RESTORE_SUCCESS: 'Items restored',

  // Calendar success
  BLACKOUT_CREATED: 'Blackout created successfully',
  BLACKOUT_UPDATED: 'Blackout updated successfully',
  BLACKOUT_DELETED: 'Maintenance block deleted',
  RESERVATION_RESCHEDULED: 'Reservation rescheduled successfully',
} as const;

// ============================================================================
// Route Constants
// ============================================================================

export const ADMIN_ROUTES = {
  HOME: '/admin',
  LOGIN: '/admin/login',
  FORGOT_PASSWORD: '/admin/forgot-password',
  UPDATE_PASSWORD: '/admin/update-password',
  CALENDAR: '/admin/calendar',
  CAMPSITES: '/admin/campsites',
  SETTINGS: '/admin/settings',
  HELP: '/admin/help',
  REPORTS: '/admin/reports',
  NEW_RESERVATION: '/admin/reservations/new',
} as const;

// Auth pages that don't require authentication
export const AUTH_PAGES = [
  ADMIN_ROUTES.LOGIN,
  ADMIN_ROUTES.FORGOT_PASSWORD,
  ADMIN_ROUTES.UPDATE_PASSWORD,
] as const;

// ============================================================================
// API Endpoints
// ============================================================================

export const API_ENDPOINTS = {
  RESERVATIONS: '/api/admin/reservations',
  RESERVATION_DETAIL: (id: string) => `/api/admin/reservations/${id}`,
  RESERVATION_ASSIGN: (id: string) => `/api/admin/reservations/${id}/assign`,
  BULK_STATUS: '/api/admin/reservations/bulk-status',
  BULK_ASSIGN: '/api/admin/reservations/bulk-assign-random',
  BULK_ARCHIVE: '/api/admin/reservations/bulk-archive',

  BLACKOUT_DATES: '/api/admin/blackout-dates',
  BLACKOUT_DETAIL: (id: string) => `/api/admin/blackout-dates/${id}`,

  CALENDAR: '/api/admin/availability/calendar',
} as const;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a route is an auth page
 */
export function isAuthPage(pathname: string): boolean {
  return (AUTH_PAGES as readonly string[]).includes(pathname);
}
