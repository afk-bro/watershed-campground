'use client';

import React, { useEffect } from 'react';
import { useImageUpload } from '@/components/admin/hooks/useImageUpload';

/**
 * Props for ImageUploadField component
 */
export interface ImageUploadFieldProps {
  /** Field label */
  label?: string;
  /** Hint text below field */
  hint?: string;
  /** Initial image URL */
  initialImageUrl?: string;
  /** Callback when image URL changes (after upload) */
  onImageUrlChange: (url: string) => void;
  /** Whether field is required */
  required?: boolean;
  /** Disable field */
  disabled?: boolean;
  /** Maximum file size in bytes (default: 5MB) */
  maxSizeBytes?: number;
  /** Additional className for wrapper */
  className?: string;
}

/**
 * Image upload field component with preview
 *
 * Provides a complete image upload UI including:
 * - File selection via click or drag-and-drop
 * - Image preview with remove button
 * - File validation (type, size)
 * - Upload progress indicator
 * - Error display
 *
 * Uses the useImageUpload hook for all upload logic.
 *
 * @example
 * ```tsx
 * <ImageUploadField
 *   label="Campsite Image"
 *   hint="This image will be displayed as a thumbnail"
 *   initialImageUrl={campsite.imageUrl}
 *   onImageUrlChange={(url) => setFormData({ ...formData, imageUrl: url })}
 * />
 * ```
 */
export function ImageUploadField({
  label = 'Image',
  hint,
  initialImageUrl,
  onImageUrlChange,
  required = false,
  disabled = false,
  maxSizeBytes = 5 * 1024 * 1024,
  className = '',
}: ImageUploadFieldProps) {
  const {
    imagePreview,
    imageFile,
    uploadingImage,
    error,
    handleImageChange,
    clearImage,
    uploadImage,
    clearError,
  } = useImageUpload({ initialImageUrl, maxSizeBytes });

  // Automatically upload when file is selected
  useEffect(() => {
    if (imageFile && !uploadingImage) {
      uploadImage()
        .then((url) => {
          onImageUrlChange(url);
        })
        .catch((err) => {
          console.error('Image upload failed:', err);
          // Error is already set by the hook
        });
    }
  }, [imageFile, uploadingImage, uploadImage, onImageUrlChange]);

  // Handle remove button click
  const handleRemove = () => {
    clearImage();
    onImageUrlChange('');
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
        {label}
        {required && <span className="text-[var(--color-error)] ml-1">*</span>}
      </label>

      <div className="space-y-3">
        {imagePreview ? (
          // Preview mode: Show image with remove button
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-48 object-cover rounded-lg border border-[var(--color-border-default)]"
            />
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || uploadingImage}
              className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Remove
            </button>
          </div>
        ) : (
          // Upload mode: Show dropzone
          <label
            className={`flex items-center justify-center w-full h-32 border-2 border-dashed border-[var(--color-border-default)] rounded-lg transition-colors ${
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-[var(--color-accent-gold)]'
            } ${error ? 'border-[var(--color-error)]' : ''}`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg
                className="w-8 h-8 text-[var(--color-text-muted)] mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm text-[var(--color-text-muted)]">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                PNG, JPG, WebP (max {(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB)
              </p>
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleImageChange}
              disabled={disabled || uploadingImage}
              required={required && !imagePreview}
            />
          </label>
        )}

        {/* Upload progress indicator */}
        {uploadingImage && (
          <p className="text-sm text-[var(--color-accent-gold)]">
            Uploading image...
          </p>
        )}

        {/* Error display */}
        {error && (
          <div className="flex items-start gap-2">
            <p className="text-sm text-[var(--color-error)] flex-1">
              {error}
            </p>
            <button
              type="button"
              onClick={clearError}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Hint text */}
      {hint && !error && (
        <p className="text-xs text-[var(--color-text-muted)] mt-2">
          {hint}
        </p>
      )}
    </div>
  );
}
