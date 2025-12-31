/**
 * Type declarations for E2E test-specific window properties
 */

// Augment the global window type for test files
declare global {
  interface Window {
    // Calendar hit testing functions (injected in calendar-hit-test.spec.ts)
    getDateFromPointer?: (clientX: number, clientY: number) => string | null;
    getCampsiteFromPointer?: (clientX: number, clientY: number) => string | null;

    // E2E overlay debugging (set in calendarE2E.ts helpers)
    __e2e_removed_overlays__?: Array<{ tag: string; className: string; zIndex: string }>;
    __e2e_overlay_observer_installed__?: boolean;
    __e2e_overlay_scan_interval__?: NodeJS.Timeout;
    __e2e_overlay_observer__?: MutationObserver;
    __e2e_overlay_snapshot__?: unknown[];
  }
}

export {};
