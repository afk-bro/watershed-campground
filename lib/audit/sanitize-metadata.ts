/**
 * Audit Metadata Sanitization
 *
 * Provides guardrails against accidentally logging PII (Personally Identifiable Information)
 * in audit metadata.
 *
 * **Design Principle**: Audit logs should contain business context (IDs, dates, statuses),
 * not guest details (names, emails, addresses, payment info).
 *
 * Usage:
 * ```typescript
 * const metadata = sanitizeAuditMetadata({
 *   campsite_id: 'abc-123',
 *   guest_email: 'john@example.com',  // ❌ STRIPPED
 *   check_in: '2025-06-01',           // ✅ ALLOWED
 * });
 * // Result: { campsite_id: 'abc-123', check_in: '2025-06-01' }
 * ```
 */

/**
 * Allowlist of safe metadata keys
 *
 * These keys contain business/operational context without guest PII.
 */
const ALLOWED_METADATA_KEYS = [
  // Resource IDs (business context)
  'campsite_id',
  'from_campsite_id',
  'to_campsite_id',
  'reservation_id',
  'blackout_id',

  // Dates (operational context)
  'check_in',
  'check_out',
  'start_date',
  'end_date',

  // Status/enums (business state)
  'status',
  'status_transition',
  'old_status',
  'new_status',

  // Operational flags
  'email_sent',
  'conflict_detected',
  'auto_confirmed',

  // Admin-entered notes (non-PII)
  'reason',
  'admin_notes',

  // Nested objects (for before/after comparisons)
  'before',
  'after',
] as const;

/**
 * Keys that should NEVER appear in audit metadata (PII)
 *
 * This is a safety net - if these appear, they'll be flagged in logs.
 */
const FORBIDDEN_KEYS = [
  // Guest identifiers
  'first_name',
  'last_name',
  'email',
  'phone',
  'guest_email',
  'guest_phone',

  // Addresses
  'address',
  'address1',
  'address2',
  'city',
  'state',
  'postal_code',
  'country',

  // Payment info (NEVER log these)
  'card_number',
  'cvv',
  'expiry',
  'payment_method',
  'stripe_payment_intent',
  'amount_paid',
  'balance_due',

  // Sensitive IDs
  'stripe_customer_id',
  'payment_intent_id',
] as const;

type AllowedKey = typeof ALLOWED_METADATA_KEYS[number];
type ForbiddenKey = typeof FORBIDDEN_KEYS[number];

/**
 * Sanitize audit metadata by removing PII
 *
 * Recursively processes nested objects (e.g., before/after comparisons)
 * while preserving allowed business context.
 *
 * @param metadata - Raw metadata object
 * @param depth - Recursion depth limit (prevents infinite loops)
 * @returns Sanitized metadata with only allowed keys
 */
export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | null | undefined,
  depth = 0
): Record<string, unknown> | null {
  // Guard: null/undefined input
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  // Guard: prevent deep recursion (shouldn't happen, but safety net)
  if (depth > 3) {
    console.warn('[Audit] Metadata recursion depth exceeded, truncating');
    return {};
  }

  const sanitized: Record<string, unknown> = {};
  const strippedKeys: string[] = [];
  const forbiddenKeysFound: string[] = [];

  for (const [key, value] of Object.entries(metadata)) {
    // Check if key is forbidden (PII)
    if (FORBIDDEN_KEYS.includes(key as ForbiddenKey)) {
      forbiddenKeysFound.push(key);
      continue;
    }

    // Check if key is allowed
    if (ALLOWED_METADATA_KEYS.includes(key as AllowedKey)) {
      // Recursively sanitize nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = sanitizeAuditMetadata(
          value as Record<string, unknown>,
          depth + 1
        );
      } else {
        // Primitive value or array - include as-is
        sanitized[key] = value;
      }
    } else {
      // Not explicitly allowed - strip it
      strippedKeys.push(key);
    }
  }

  // Log warnings if forbidden keys were found (potential PII leak attempt)
  if (forbiddenKeysFound.length > 0) {
    console.error('[Audit] FORBIDDEN KEYS in metadata (PII risk):', forbiddenKeysFound);
  }

  // Log info if keys were stripped (helps identify missing allowlist entries)
  if (strippedKeys.length > 0) {
    console.info('[Audit] Stripped keys from metadata:', strippedKeys);
  }

  return sanitized;
}

/**
 * Type-safe metadata builder with allowlist validation
 *
 * Use this helper to build metadata objects with TypeScript validation.
 *
 * @example
 * ```typescript
 * const metadata = buildAuditMetadata({
 *   campsite_id: 'abc-123',
 *   check_in: '2025-06-01',
 *   status_transition: 'pending → confirmed',
 * });
 * ```
 */
export function buildAuditMetadata(
  metadata: Partial<Record<AllowedKey, unknown>>
): Record<string, unknown> {
  return sanitizeAuditMetadata(metadata) || {};
}

/**
 * Validate metadata object (for testing/debugging)
 *
 * Returns warnings if metadata contains forbidden or unallowed keys.
 */
export function validateAuditMetadata(
  metadata: Record<string, unknown>
): {
  valid: boolean;
  forbiddenKeys: string[];
  unallowedKeys: string[];
} {
  const forbiddenKeys: string[] = [];
  const unallowedKeys: string[] = [];

  for (const key of Object.keys(metadata)) {
    if (FORBIDDEN_KEYS.includes(key as ForbiddenKey)) {
      forbiddenKeys.push(key);
    } else if (!ALLOWED_METADATA_KEYS.includes(key as AllowedKey)) {
      unallowedKeys.push(key);
    }
  }

  return {
    valid: forbiddenKeys.length === 0,
    forbiddenKeys,
    unallowedKeys,
  };
}
