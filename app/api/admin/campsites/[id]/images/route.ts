import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyOrgResource } from '@/lib/db-helpers';
import { campsiteImageKey, isValidImageType, validateFileHeader, isValidImageSize, getExtensionFromMimeType } from '@/lib/storage-utils';
import { logger } from "@/lib/logger";
import { withAdminAuth } from '@/lib/admin/api-wrapper';

export const runtime = 'nodejs';

/**
 * POST /api/admin/campsites/[id]/images
 *
 * Upload campsite image with org-scoped storage key.
 *
 * Security:
 * - Verifies campsite belongs to admin's org before upload
 * - Storage key is org-prefixed: org/<orgId>/campsites/<campsiteId>/<uuid>.<ext>
 * - Validates file type and size server-side
 * - Uses cryptographically secure UUID for filename
 */
export const POST = withAdminAuth(async ({ request, organizationId, params }) => {
    const { id: campsiteId } = params;

    // 1. Verify Campsite Ownership (404 if not found or wrong org)
    const campsite = await verifyOrgResource<{ image_url: string | null }>('campsites', campsiteId, organizationId);

    if (!campsite) {
        return NextResponse.json(
            { error: 'Campsite not found or access denied' },
            { status: 404 }
        );
    }

    // 2. Parse Form Data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
        return NextResponse.json(
            { error: 'No file provided' },
            { status: 400 }
        );
    }

    // 3. Server-side Validation (defense in depth)
    // First check MIME type (fast, user-friendly error)
    if (!isValidImageType(file.type)) {
        return NextResponse.json(
            { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' },
            { status: 400 }
        );
    }

    // Then validate file header (secure, prevents MIME spoofing)
    const isValidHeader = await validateFileHeader(file);
    if (!isValidHeader) {
        return NextResponse.json(
            { error: 'Invalid file format. File header does not match declared type.' },
            { status: 400 }
        );
    }

    if (!isValidImageSize(file.size)) {
        return NextResponse.json(
            { error: 'File too large. Maximum size: 5MB' },
            { status: 400 }
        );
    }

    // 4. Delete Old Image (prevent orphaned files)
    if (campsite.image_url) {
        const urlParts = campsite.image_url.split('/campsite-images/');
        if (urlParts.length === 2) {
            const oldStorageKey = urlParts[1];
            // Only delete if it matches our org prefix (safety check)
            const expectedPrefix = `org/${organizationId}/campsites/${campsiteId}/`;
            if (oldStorageKey.startsWith(expectedPrefix)) {
                await supabaseAdmin.storage
                    .from('campsite-images')
                    .remove([oldStorageKey]);
                // Ignore errors - old file might not exist
            }
        }
    }

    // 5. Generate Org-Prefixed Storage Key
    const extension = getExtensionFromMimeType(file.type);
    const storageKey = campsiteImageKey(organizationId, campsiteId, `file.${extension}`);

    // 6. Upload to Supabase Storage with org-prefixed key
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('campsite-images')
        .upload(storageKey, file, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: true // Allow replacing existing image
        });

    if (uploadError) {
        logger.error('Storage upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // 7. Get Public URL
    const { data: publicUrlData } = supabaseAdmin.storage
        .from('campsite-images')
        .getPublicUrl(uploadData.path);

    // 8. Update Campsite Record (org-scoped)
    const { error: updateError } = await supabaseAdmin
        .from('campsites')
        .update({
            image_url: publicUrlData.publicUrl,
            updated_at: new Date().toISOString()
        })
        .eq('id', campsiteId)
        .eq('organization_id', organizationId);

    if (updateError) {
        logger.error('Database update error:', updateError);
        // Attempt to clean up uploaded file
        await supabaseAdmin.storage
            .from('campsite-images')
            .remove([storageKey]);
        throw new Error('Failed to update campsite record');
    }

    return NextResponse.json({
        url: publicUrlData.publicUrl,
        storageKey: uploadData.path,
        message: 'Image uploaded successfully'
    }, { status: 200 });
});

/**
 * DELETE /api/admin/campsites/[id]/images
 *
 * Delete campsite image with ownership verification.
 *
 * Security:
 * - Verifies campsite belongs to admin's org before deletion
 * - Only deletes files with org-prefixed keys matching admin's org
 * - Clears DB reference atomically
 */
export const DELETE = withAdminAuth(async ({ organizationId, params }) => {
    const { id: campsiteId } = params;

    // 1. Verify Campsite Ownership (404 if not found or wrong org)
    const campsite = await verifyOrgResource<{ image_url: string | null }>('campsites', campsiteId, organizationId);

    if (!campsite) {
        return NextResponse.json(
            { error: 'Campsite not found or access denied' },
            { status: 404 }
        );
    }

    if (!campsite.image_url) {
        return NextResponse.json(
            { error: 'No image to delete' },
            { status: 404 }
        );
    }

    // 2. Extract Storage Key from URL
    // URL format: https://<project>.supabase.co/storage/v1/object/public/campsite-images/<storageKey>
    const urlParts = campsite.image_url.split('/campsite-images/');
    if (urlParts.length !== 2) {
        logger.error('Invalid image URL format:', campsite.image_url);
        return NextResponse.json(
            { error: 'Invalid image URL format' },
            { status: 400 }
        );
    }

    const storageKey = urlParts[1];

    // 3. Verify Storage Key Belongs to This Org (prevent cross-org deletion)
    const expectedPrefix = `org/${organizationId}/campsites/${campsiteId}/`;
    if (!storageKey.startsWith(expectedPrefix)) {
        logger.warn(`[Security] Attempted cross-org deletion: ${storageKey} does not match ${expectedPrefix}`);
        return NextResponse.json(
            { error: 'Unauthorized: storage key does not belong to this organization' },
            { status: 403 }
        );
    }

    // 4. Delete from Storage
    const { error: storageError } = await supabaseAdmin.storage
        .from('campsite-images')
        .remove([storageKey]);

    if (storageError) {
        logger.error('Storage deletion error:', storageError);
        // Continue even if storage deletion fails (file might not exist)
    }

    // 5. Clear DB Reference (org-scoped)
    const { error: updateError } = await supabaseAdmin
        .from('campsites')
        .update({
            image_url: null,
            updated_at: new Date().toISOString()
        })
        .eq('id', campsiteId)
        .eq('organization_id', organizationId);

    if (updateError) {
        logger.error('Database update error:', updateError);
        throw new Error('Failed to update campsite record');
    }

    return NextResponse.json({
        message: 'Image deleted successfully'
    }, { status: 200 });
});
