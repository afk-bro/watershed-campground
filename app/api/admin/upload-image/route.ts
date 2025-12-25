import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { migrationGate } from '@/lib/migration-gate';

/**
 * @deprecated SECURITY WARNING: This endpoint does NOT use org-prefixed storage keys.
 *
 * Issues:
 * - Storage keys are NOT org-prefixed (cross-org enumeration risk)
 * - Uses Date.now() + Math.random() instead of crypto UUID
 * - No file type validation (MIME or magic bytes)
 * - No file size limits
 *
 * RECOMMENDATION: Use /api/admin/campsites/[id]/images instead, which:
 * - Uses org-prefixed keys: org/<orgId>/campsites/<campsiteId>/<uuid>.<ext>
 * - Validates file headers (prevents MIME spoofing)
 * - Enforces size limits
 * - Verifies campsite ownership before upload
 *
 * This endpoint is kept for backwards compatibility only.
 * Consider removing after migrating all clients to the new endpoint.
 */
export const runtime = 'nodejs';

async function uploadImageToSupabase(file: File): Promise<string> {
    const supabase = supabaseAdmin;

    const filename = `campsite-${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;

    const { data, error } = await supabase.storage
        .from('campsite-images')
        .upload(filename, file, {
            contentType: file.type,
            cacheControl: '3600',
        });

    if (error) {
        throw new Error(`Upload error: ${error.message}`);
    }

    const { data: publicUrlData } = supabase.storage
        .from('campsite-images')
        .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
}

import { requireAdminWithOrg } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
    // HARD FAIL-CLOSED: This endpoint is NOT multi-tenant safe
    // Clients MUST migrate to /api/admin/campsites/[id]/images
    const gateResponse = migrationGate(
        '/api/admin/upload-image',
        'This endpoint does not use org-prefixed storage keys.',
        '/api/admin/campsites/[id]/images' // Replacement hint
    );
    if (gateResponse) return gateResponse;

    try {
        const { authorized, organizationId, response: authResponse } = await requireAdminWithOrg();
        if (!authorized) return authResponse!;
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const name = formData.get('name') as string;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        const url = await uploadImageToSupabase(file);

        return NextResponse.json(
            { url, name: file.name },
            { status: 200 }
        );
    } catch (error: unknown) {
        console.error('Image upload error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to upload image' },
            { status: 500 }
        );
    }
}
