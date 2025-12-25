/**
 * Storage utility functions for multi-tenant file management.
 *
 * All storage keys MUST be org-prefixed to prevent cross-tenant access.
 */

import { randomUUID } from 'crypto';

/**
 * Generates a secure, org-prefixed storage key for campsite images.
 *
 * Format: org/<orgId>/campsites/<campsiteId>/<uuid>.<ext>
 *
 * @param orgId - Organization ID (UUID)
 * @param campsiteId - Campsite ID (UUID)
 * @param filename - Original filename (used only for extension extraction)
 * @returns Secure storage key with org prefix
 *
 * @example
 * campsiteImageKey('org-123', 'camp-456', 'photo.jpg')
 * // Returns: 'org/org-123/campsites/camp-456/b4b2f7c0-...-d9a1.jpg'
 */
export function campsiteImageKey(orgId: string, campsiteId: string, filename: string): string {
    // Extract extension from validated filename
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';

    // Generate secure, unique filename
    const secureFilename = `${randomUUID()}.${ext}`;

    // Return org-prefixed path
    return `org/${orgId}/campsites/${campsiteId}/${secureFilename}`;
}

/**
 * Validates file type for campsite images (MIME type only - not secure).
 *
 * WARNING: This only checks the browser-provided MIME type, which can be spoofed.
 * Always use validateFileHeader() for security-critical validation.
 *
 * @param mimeType - MIME type from uploaded file
 * @returns true if valid image type
 */
export function isValidImageType(mimeType: string): boolean {
    const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif'
    ];
    return allowedTypes.includes(mimeType.toLowerCase());
}

/**
 * Validates file type by reading magic bytes (file header).
 *
 * This is the SECURE validation method that prevents MIME type spoofing.
 * Reads the first 12 bytes of the file and validates against known signatures.
 *
 * Supported formats:
 * - JPEG: FF D8 FF
 * - PNG: 89 50 4E 47 0D 0A 1A 0A
 * - WebP: RIFF + 4 bytes + WEBP
 * - GIF: GIF87a or GIF89a
 *
 * @param file - File object to validate
 * @returns Promise<boolean> - true if file header matches a supported image format
 */
export async function validateFileHeader(file: File): Promise<boolean> {
    try {
        // Read first 12 bytes (enough for all supported formats)
        const arrayBuffer = await file.slice(0, 12).arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        // JPEG: FF D8 FF
        if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
            return true;
        }

        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (
            bytes[0] === 0x89 &&
            bytes[1] === 0x50 &&
            bytes[2] === 0x4E &&
            bytes[3] === 0x47 &&
            bytes[4] === 0x0D &&
            bytes[5] === 0x0A &&
            bytes[6] === 0x1A &&
            bytes[7] === 0x0A
        ) {
            return true;
        }

        // GIF: "GIF87a" or "GIF89a"
        const gifHeader = String.fromCharCode(...bytes.slice(0, 6));
        if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') {
            return true;
        }

        // WebP: "RIFF" + 4 bytes + "WEBP"
        const riffHeader = String.fromCharCode(...bytes.slice(0, 4));
        const webpHeader = String.fromCharCode(...bytes.slice(8, 12));
        if (riffHeader === 'RIFF' && webpHeader === 'WEBP') {
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error validating file header:', error);
        return false;
    }
}

/**
 * Validates file size for campsite images.
 *
 * @param size - File size in bytes
 * @param maxSizeMB - Maximum size in megabytes (default: 5MB)
 * @returns true if within size limit
 */
export function isValidImageSize(size: number, maxSizeMB: number = 5): boolean {
    const maxBytes = maxSizeMB * 1024 * 1024;
    return size <= maxBytes;
}

/**
 * Extracts extension from MIME type.
 *
 * @param mimeType - MIME type (e.g., 'image/jpeg')
 * @returns File extension (e.g., 'jpg')
 */
export function getExtensionFromMimeType(mimeType: string): string {
    const map: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif'
    };
    return map[mimeType.toLowerCase()] || 'jpg';
}
