/**
 * Application-wide constants and configuration values.
 *
 * Centralizes magic numbers and configuration to improve maintainability.
 */

/**
 * Timing Constants
 */
export const TIMING = {
  /** Debounce delay for search inputs (ms) */
  DEBOUNCE_DELAY: 500,

  /** API request timeout (ms) */
  API_TIMEOUT: 30000,

  /** Toast notification duration (ms) */
  TOAST_DURATION: 5000,

  /** Auto-save debounce delay (ms) */
  AUTO_SAVE_DELAY: 1000,
} as const;

/**
 * File Upload Limits
 */
export const FILE_LIMITS = {
  /** Maximum image upload size in bytes (5MB) */
  MAX_IMAGE_SIZE: 5 * 1024 * 1024,

  /** Maximum image upload size in MB (for display) */
  MAX_IMAGE_SIZE_MB: 5,

  /** Allowed image file types */
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
} as const;

/**
 * Pagination and Limits
 */
export const PAGINATION = {
  /** Default items per page */
  DEFAULT_PAGE_SIZE: 20,

  /** Maximum items per page */
  MAX_PAGE_SIZE: 100,

  /** Search results limit */
  SEARCH_LIMIT: 50,
} as const;

/**
 * Validation Limits
 */
export const VALIDATION = {
  /** Maximum guests per campsite */
  MAX_GUESTS_PER_SITE: 8,

  /** Minimum booking length (nights) */
  MIN_BOOKING_NIGHTS: 1,

  /** Maximum booking length (nights) */
  MAX_BOOKING_NIGHTS: 30,

  /** Maximum RV length (feet) */
  MAX_RV_LENGTH: 45,

  /** Phone number min length */
  PHONE_MIN_LENGTH: 10,

  /** Phone number max length */
  PHONE_MAX_LENGTH: 15,
} as const;

/**
 * UI Constants
 */
export const UI = {
  /** Calendar cell width (pixels) */
  CALENDAR_CELL_WIDTH: 48,

  /** Mobile breakpoint (pixels) */
  MOBILE_BREAKPOINT: 640,

  /** Tablet breakpoint (pixels) */
  TABLET_BREAKPOINT: 1024,

  /** Desktop breakpoint (pixels) */
  DESKTOP_BREAKPOINT: 1280,
} as const;

/**
 * Date Format Strings
 */
export const DATE_FORMATS = {
  /** Display format for dates (e.g., "Jan 15, 2024") */
  DISPLAY: 'MMM d, yyyy',

  /** Input format for date fields (e.g., "2024-01-15") */
  INPUT: 'yyyy-MM-dd',

  /** Full datetime format */
  DATETIME: 'yyyy-MM-dd HH:mm:ss',

  /** Time only format */
  TIME: 'HH:mm',
} as const;

/**
 * Feature Flags
 *
 * NOTE: These values are evaluated at module load time (application startup).
 * If you need to change feature flags at runtime, restart the application
 * or implement a dynamic configuration system.
 */
export const FEATURES = {
  /** Enable demo data seeding */
  ENABLE_DEMO_DATA: true,

  /** Enable offline payment mode */
  ENABLE_OFFLINE_PAYMENTS: true,

  /** Enable email notifications */
  ENABLE_EMAIL_NOTIFICATIONS: !!process.env.RESEND_API_KEY,

  /** Enable Stripe payments */
  ENABLE_STRIPE: !!process.env.STRIPE_SECRET_KEY,
} as const;

/**
 * Default Organization
 */
export const DEFAULT_ORG_SLUG = 'watershed';
