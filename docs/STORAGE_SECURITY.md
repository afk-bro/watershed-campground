# Storage Security & Multi-Tenancy

## Overview

All file uploads are org-scoped to prevent cross-tenant access and accidental data leaks.

## Storage Key Format

**Canonical Format:**
```
org/<organizationId>/campsites/<campsiteId>/<uuid>.<ext>
```

**Example:**
```
org/a1b2c3d4-5678-90ab-cdef-1234567890ab/campsites/e9f8a7b6-5432-10dc-ba98-76543210fedc/b4b2f7c0-1234-5678-9abc-def012345678.jpg
```

**Key Security Properties:**
- ✅ Organization prefix prevents cross-org guessing
- ✅ UUID filenames prevent path traversal
- ✅ UUID filenames prevent enumeration/guessing attacks
- ✅ Extension derived from validated MIME type only

## File Validation

### Defense in Depth (Multiple Layers)

1. **MIME Type Check** (UX layer)
   - Fast validation for user-friendly errors
   - `isValidImageType(file.type)`
   - Allowed: JPEG, PNG, WebP, GIF

2. **Magic Bytes Validation** (Security layer) 🔒
   - Prevents MIME type spoofing
   - Reads file header (first 12 bytes)
   - `await validateFileHeader(file)` - REQUIRED
   - Validates against known signatures:
     - JPEG: `FF D8 FF`
     - PNG: `89 50 4E 47 0D 0A 1A 0A`
     - WebP: `RIFF + 4 bytes + WEBP`
     - GIF: `GIF87a` or `GIF89a`

3. **File Size Limit**
   - Max 5MB (configurable)
   - `isValidImageSize(file.size, maxSizeMB)`

4. **Org Ownership Verification**
   - `verifyOrgResource('campsites', campsiteId, organizationId)`
   - Returns 404 if campsite doesn't belong to admin's org
   - MUST happen before upload

## Bucket Access Model

### Current Setup: Public Bucket with Org-Prefixed Keys

**Bucket:** `campsite-images` (assumed public based on `getPublicUrl()` usage)

**Security Model:**
- Storage keys are org-prefixed: `org/<orgId>/...`
- Public URLs generated via `getPublicUrl()`
- Anyone with the URL can access the image

**This is ACCEPTABLE for campsite images** because:
- Campsite images are displayed on public-facing website
- No sensitive/private data (just marketing photos)
- Org prefix prevents cross-org enumeration
- UUID filenames prevent guessing

### Alternative: Private Bucket with Signed URLs (Stronger)

If you need private/time-limited access:

```typescript
// Instead of:
const { data: publicUrlData } = supabaseAdmin.storage
    .from('campsite-images')
    .getPublicUrl(storageKey);

// Use:
const { data: signedUrlData } = await supabaseAdmin.storage
    .from('campsite-images')
    .createSignedUrl(storageKey, 3600); // 1 hour expiry
```

**Pros:**
- Time-limited access (URLs expire)
- Can revoke access by changing bucket policy
- Better for sensitive/private files

**Cons:**
- URLs expire and need regeneration
- More complex (need to regenerate on each page load)
- Higher API call volume

**Recommendation for campsite images:** Public bucket is fine, org-prefixing is sufficient.

## Orphaned File Prevention

### Problem
When replacing an image, the old storage object remains if not explicitly deleted:
- Cost: Storage accumulates over time
- Cleanup: Manual intervention needed

### Solution (Implemented)
Before uploading new image:
1. Check if campsite already has `image_url`
2. Extract old storage key from URL
3. Verify key starts with `org/<orgId>/campsites/<campsiteId>/`
4. Delete old storage object
5. Upload new image

**Code Location:** `app/api/admin/campsites/[id]/images/route.ts:73-87`

## RLS Policies (Future Hardening)

Supabase Storage supports Row Level Security on buckets.

**Recommended Policy for campsite-images bucket:**
```sql
-- Allow authenticated users (admins) to upload only to their org prefix
CREATE POLICY "Org-scoped uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'campsite-images'
    AND name LIKE 'org/' || auth.jwt() ->> 'organization_id' || '/%'
);

-- Allow public read access (for website display)
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'campsite-images');

-- Allow admins to delete only their org's files
CREATE POLICY "Org-scoped deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'campsite-images'
    AND name LIKE 'org/' || auth.jwt() ->> 'organization_id' || '/%'
);
```

**Note:** These policies are optional since application-layer checks already enforce org boundaries.

## Verification Checklist

When adding new storage endpoints:

- [ ] Storage key uses `campsiteImageKey()` or equivalent org-prefixed function
- [ ] MIME type validated with `isValidImageType()`
- [ ] File header validated with `await validateFileHeader()` (prevents spoofing)
- [ ] File size validated with `isValidImageSize()`
- [ ] Resource ownership verified with `verifyOrgResource()` BEFORE upload
- [ ] Old files deleted before replacement (prevent orphans)
- [ ] Delete operations verify storage key starts with `org/${orgId}/...`
- [ ] No hardcoded storage keys (always use utility functions)

## Common Vulnerabilities Prevented

| Attack | Prevention |
|--------|-----------|
| MIME type spoofing | Magic bytes validation (`validateFileHeader`) |
| Path traversal | UUID filenames + org prefix |
| Cross-org file access | Org prefix + verifyOrgResource |
| Cross-org deletion | Storage key prefix validation before delete |
| File enumeration/guessing | Cryptographically secure UUIDs |
| Orphaned files (cost) | Delete old file before upload |
| Malicious file upload | Multi-layer validation (MIME + magic bytes + size) |

## Testing

**Manual Test Cases:**

1. **Upload Valid Image**
   - Upload JPEG/PNG/WebP/GIF
   - Verify storage key: `org/<orgId>/campsites/<campsiteId>/<uuid>.<ext>`
   - Verify `image_url` updated in DB

2. **MIME Spoofing Attack**
   - Rename `.txt` file to `.jpg`
   - Set MIME to `image/jpeg`
   - Upload should FAIL with "Invalid file format" (magic bytes check)

3. **Cross-Org Upload Attempt**
   - Admin from Org A tries to upload to Campsite from Org B
   - Should return 404 (verifyOrgResource fails)

4. **Cross-Org Delete Attempt**
   - Manually set `image_url` to another org's image
   - Delete should return 403 (storage key prefix check fails)

5. **Replace Image**
   - Upload image A
   - Upload image B to same campsite
   - Verify image A is deleted from storage (no orphans)

## Legacy Endpoint Warning

### `/api/admin/upload-image` (DEPRECATED)

**Status:** Marked for removal - NOT org-safe

**Issues:**
- ❌ Storage keys NOT org-prefixed: `campsite-${Date.now()}-${Math.random()}`
- ❌ Uses Date.now() + Math.random() instead of crypto UUID
- ❌ No file validation (MIME or magic bytes)
- ❌ No file size limits
- ⚠️ Cross-org enumeration risk

**Migration Path:**
All clients should migrate to `/api/admin/campsites/[id]/images` which:
- ✅ Uses org-prefixed keys
- ✅ Validates file headers
- ✅ Enforces size limits
- ✅ Verifies ownership

**Action:** Remove this endpoint once all clients migrated.

## Future Considerations

1. **Image Optimization**
   - Consider adding on-upload image resizing/compression
   - Store multiple sizes (thumbnail, full-size)
   - Use CDN for faster delivery

2. **Storage Analytics**
   - Monitor storage usage per org
   - Alert on unusual upload patterns
   - Cleanup jobs for truly orphaned files (defensive)

3. **Content Scanning**
   - Consider image content moderation (ML-based)
   - Scan for inappropriate content before storage
