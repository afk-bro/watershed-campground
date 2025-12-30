/**
 * Test helper for Supabase operations
 * 
 * IMPORTANT: This module provides both factory functions for creating test data
 * and a supabaseAdmin client for queries.
 * 
 * MULTI-TENANCY SAFETY RULES:
 * - Use factory functions for ALL insertions (createTestCampsite, createTestReservation, createTestBlackout)
 * - Use supabaseAdmin ONLY for queries (.select()) and updates/deletes that factories don't cover
 * - NEVER use supabaseAdmin.from(...).insert() directly - use factories instead
 */

// Re-export all factory functions and helpers
export {
    DEFAULT_ORG_ID,
    createTestCampsite,
    deleteTestCampsite,
    createTestReservation,
    deleteTestReservation,
    createTestBlackout,
    deleteTestBlackout,
} from './factories';

// Export internal client for queries and updates
// WARNING: Only use for .select(), .update(), .delete() - NOT for .insert()!
export { supabaseAdminInternal as supabaseAdmin } from './factories';
