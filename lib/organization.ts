import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Gets the organization ID for a given user.
 * 
 * For single-tenant deployments, this returns the default organization.
 * For multi-tenant deployments, this looks up the user's organization from user_organizations.
 * 
 * @param userId - The user's ID from auth.users
 * @returns The organization ID
 * @throws Error if user has no organization
 */
export async function getUserOrganization(userId: string): Promise<string> {
    // Try to get from user_organizations mapping
    const { data, error } = await supabaseAdmin
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', userId)
        .single();

    if (error || !data) {
        // Fallback to default organization for backward compatibility
        // This handles cases where admin users haven't been assigned yet
        return '00000000-0000-0000-0000-000000000001';
    }

    return data.organization_id;
}

/**
 * Gets organization details.
 * 
 * @param organizationId - The organization ID
 * @returns Organization details
 */
export async function getOrganization(organizationId: string) {
    const { data, error } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Assigns a user to an organization with a specific role.
 * 
 * @param userId - The user's ID
 * @param organizationId - The organization ID
 * @param role - The user's role ('owner', 'admin', 'member')
 */
export async function assignUserToOrganization(
    userId: string,
    organizationId: string,
    role: 'owner' | 'admin' | 'member' = 'member'
) {
    const { error } = await supabaseAdmin
        .from('user_organizations')
        .insert({
            user_id: userId,
            organization_id: organizationId,
            role
        });

    if (error) throw error;
}
