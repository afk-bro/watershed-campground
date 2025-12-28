import { useState, useCallback } from 'react';

/**
 * Options for configuring the image upload hook
 */
export interface UseImageUploadOptions {
  /** Initial image URL to display as preview */
  initialImageUrl?: string;
  /** Maximum file size in bytes (default: 5MB) */
  maxSizeBytes?: number;
  /** Allowed image MIME types (default: all images) */
  allowedTypes?: string[];
}

/**
 * Return value from useImageUpload hook
 */
export interface UseImageUploadReturn {
  // State
  /** Preview URL for the selected/uploaded image */
  imagePreview: string | null;
  /** Selected file object (not yet uploaded) */
  imageFile: File | null;
  /** Upload operation in progress */
  uploadingImage: boolean;
  /** Error message from validation or upload */
  error: string | null;

  // Actions
  /** Handle file input change event */
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  /** Clear selected image and preview */
  clearImage: () => void;
  /** Upload the selected image to the server */
  uploadImage: () => Promise<string>;
  /** Clear error message */
  clearError: () => void;
}

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Custom hook for handling image uploads with validation and preview
 *
 * Provides complete image upload functionality including:
 * - File validation (type and size)
 * - Preview generation using FileReader
 * - Upload to API endpoint
 * - Error handling
 *
 * @example
 * ```tsx
 * const { imagePreview, error, handleImageChange, clearImage, uploadImage } = useImageUpload({
 *   initialImageUrl: campsite.imageUrl,
 *   maxSizeBytes: 5 * 1024 * 1024,
 * });
 *
 * // In form submission:
 * const imageUrl = await uploadImage();
 * ```
 */
export function useImageUpload(options: UseImageUploadOptions = {}): UseImageUploadReturn {
  const {
    initialImageUrl,
    maxSizeBytes = DEFAULT_MAX_SIZE,
    allowedTypes = ['image/'],
  } = options;

  // State management
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Validate file type against allowed types
   */
  const validateFileType = useCallback(
    (file: File): boolean => {
      return allowedTypes.some(type => file.type.startsWith(type));
    },
    [allowedTypes]
  );

  /**
   * Validate file size against maximum
   */
  const validateFileSize = useCallback(
    (file: File): boolean => {
      return file.size <= maxSizeBytes;
    },
    [maxSizeBytes]
  );

  /**
   * Generate preview URL using FileReader
   */
  const generatePreview = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };

      reader.readAsDataURL(file);
    });
  }, []);

  /**
   * Handle file input change event
   * Validates file, generates preview
   */
  const handleImageChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!validateFileType(file)) {
        setError('Please select a valid image file');
        setImageFile(null);
        setImagePreview(null);
        return;
      }

      // Validate file size
      if (!validateFileSize(file)) {
        const maxSizeMB = Math.ceil(maxSizeBytes / (1024 * 1024));
        setError(`Image must be less than ${maxSizeMB}MB`);
        setImageFile(null);
        setImagePreview(null);
        return;
      }

      // Generate preview
      try {
        setError(null);
        setImageFile(file);
        const preview = await generatePreview(file);
        setImagePreview(preview);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate preview');
        setImageFile(null);
        setImagePreview(null);
      }
    },
    [validateFileType, validateFileSize, generatePreview, maxSizeBytes]
  );

  /**
   * Clear selected image and preview
   */
  const clearImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    setError(null);
  }, []);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Upload image to API endpoint
   * @returns URL of uploaded image
   * @throws Error if upload fails or no file selected
   */
  const uploadImage = useCallback(async (): Promise<string> => {
    if (!imageFile) {
      throw new Error('No image selected for upload');
    }

    setUploadingImage(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('name', `campsite-${Date.now()}-${Math.random().toString(36).substring(7)}`);

      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload image');
      }

      const { url } = await response.json();

      // Update preview to uploaded URL
      setImagePreview(url);
      setImageFile(null);

      return url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image';
      setError(errorMessage);
      throw err;
    } finally {
      setUploadingImage(false);
    }
  }, [imageFile]);

  return {
    // State
    imagePreview,
    imageFile,
    uploadingImage,
    error,

    // Actions
    handleImageChange,
    clearImage,
    uploadImage,
    clearError,
  };
}
