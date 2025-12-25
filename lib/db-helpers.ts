import { supabaseAdmin } from '@/lib/supabase-admin';
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';

/**
 * Database helper utilities for multi-tenant operations.
 * 
 * These helpers ensure all queries are properly scoped to an organization,
 * preventing accidental cross-tenant data access.
 */

/**
 * Creates an org-scoped query builder for a table.
 * 
 * **Always use this instead of direct supabaseAdmin.from() calls**
 * to ensure organization filtering is never missed.
 * 
 * @param table - Table name
 * @param organizationId - Organization ID to scope to
 * @returns Query builder with org filter pre-applied
 * 
 * @example
 * ```typescript
 * const { data } = await withOrg('reservations', orgId)
 *     .select('*')
 *     .eq('status', 'confirmed');
 * ```
 */
export function withOrg(table: string, organizationId: string) {
    return supabaseAdmin
        .from(table)
        .select('*')
        .eq('organization_id', organizationId);
}

/**
 * Verifies that a resource belongs to the specified organization.
 * Returns the resource if found, null if not found or belongs to different org.
 * 
 * **Use this for foreign key verification** before updates/deletes.
 * 
 * @param table - Table name
 * @param id - Resource ID
 * @param organizationId - Organization ID
 * @returns Resource if found in org, null otherwise
 * 
 * @example
 * ```typescript
 * const campsite = await verifyOrgResource('campsites', campsiteId, orgId);
 * if (!campsite) {
 *     return NextResponse.json({ error: 'Not found' }, { status: 404 });
 * }
 * ```
 */
export async function verifyOrgResource<T = any>(
    table: string,
    id: string,
    organizationId: string
): Promise<T | null> {
    const { data, error } = await supabaseAdmin
        .from(table)
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

    if (error || !data) {
        return null;
    }

    return data as T;
}

/**
 * Inserts a record with organization_id automatically included.
 * 
 * @param table - Table name
 * @param data - Record data (organization_id will be added)
 * @param organizationId - Organization ID
 * @returns Insert query builder
 * 
 * @example
 * ```typescript
 * const { data, error } = await insertWithOrg('campsites', {
 *     name: 'Site A',
 *     type: 'RV'
 * }, orgId);
 * ```
 */
export function insertWithOrg(
    table: string,
    data: Record<string, any>,
    organizationId: string
) {
    return supabaseAdmin
        .from(table)
        .insert({
            ...data,
            organization_id: organizationId
        })
        .select();
}

/**
 * Updates a record, ensuring it belongs to the organization.
 * 
 * @param table - Table name
 * @param id - Record ID
 * @param data - Update data
 * @param organizationId - Organization ID
 * @returns Update query builder
 * 
 * @example
 * ```typescript
 * const { data, error } = await updateWithOrg('reservations', id, {
 *     status: 'confirmed'
 * }, orgId);
 * ```
 */
export function updateWithOrg(
    table: string,
    id: string,
    data: Record<string, any>,
    organizationId: string
) {
    return supabaseAdmin
        .from(table)
        .update(data)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select();
}

/**
 * Deletes a record, ensuring it belongs to the organization.
 * 
 * @param table - Table name
 * @param id - Record ID
 * @param organizationId - Organization ID
 * @returns Delete query builder
 * 
 * @example
 * ```typescript
 * const { error } = await deleteWithOrg('blackout_dates', id, orgId);
 * ```
 */
export function deleteWithOrg(
    table: string,
    id: string,
    organizationId: string
) {
    return supabaseAdmin
        .from(table)
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);
}
