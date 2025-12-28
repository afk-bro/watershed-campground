import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useImageUpload } from '@/components/admin/hooks/useImageUpload';

// Mock FileReader
class MockFileReader {
  result: string | ArrayBuffer | null = null;
  onloadend: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;

  readAsDataURL(blob: Blob) {
    // Simulate async file reading
    setTimeout(() => {
      this.result = `data:image/png;base64,mockBase64Data`;
      if (this.onloadend) {
        this.onloadend.call(this as any, {} as any);
      }
    }, 0);
  }
}

global.FileReader = MockFileReader as any;

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useImageUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() => useImageUpload());

      expect(result.current.imagePreview).toBeNull();
      expect(result.current.imageFile).toBeNull();
      expect(result.current.uploadingImage).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('initializes with provided initial image URL', () => {
      const initialUrl = 'https://example.com/image.jpg';
      const { result } = renderHook(() =>
        useImageUpload({ initialImageUrl: initialUrl })
      );

      expect(result.current.imagePreview).toBe(initialUrl);
      expect(result.current.imageFile).toBeNull();
      expect(result.current.uploadingImage).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('File Validation', () => {
    it('rejects non-image files', async () => {
      const { result } = renderHook(() => useImageUpload());

      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const event = {
        target: { files: [textFile] },
      } as any;

      await act(async () => {
        await result.current.handleImageChange(event);
      });

      expect(result.current.error).toBe('Please select a valid image file');
      expect(result.current.imageFile).toBeNull();
      expect(result.current.imagePreview).toBeNull();
    });

    it('accepts valid image files', async () => {
      const { result } = renderHook(() => useImageUpload());

      const imageFile = new File(['image'], 'test.png', { type: 'image/png' });
      const event = {
        target: { files: [imageFile] },
      } as any;

      await act(async () => {
        await result.current.handleImageChange(event);
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.imageFile).toBe(imageFile);
        expect(result.current.imagePreview).toBe('data:image/png;base64,mockBase64Data');
      });
    });

    it('rejects files exceeding max size', async () => {
      const maxSize = 1024; // 1KB
      const { result } = renderHook(() =>
        useImageUpload({ maxSizeBytes: maxSize })
      );

      // Create a file larger than maxSize
      const largeContent = new Array(maxSize + 1).fill('x').join('');
      const largeFile = new File([largeContent], 'large.png', { type: 'image/png' });
      const event = {
        target: { files: [largeFile] },
      } as any;

      await act(async () => {
        await result.current.handleImageChange(event);
      });

      expect(result.current.error).toBe('Image must be less than 0MB');
      expect(result.current.imageFile).toBeNull();
      expect(result.current.imagePreview).toBeNull();
    });

    it('accepts files within max size limit', async () => {
      const maxSize = 5 * 1024 * 1024; // 5MB
      const { result } = renderHook(() =>
        useImageUpload({ maxSizeBytes: maxSize })
      );

      const smallFile = new File(['small'], 'small.png', { type: 'image/png' });
      const event = {
        target: { files: [smallFile] },
      } as any;

      await act(async () => {
        await result.current.handleImageChange(event);
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.imageFile).toBe(smallFile);
      });
    });
  });

  describe('Preview Generation', () => {
    it('generates preview for selected image', async () => {
      const { result } = renderHook(() => useImageUpload());

      const imageFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const event = {
        target: { files: [imageFile] },
      } as any;

      await act(async () => {
        await result.current.handleImageChange(event);
      });

      await waitFor(() => {
        expect(result.current.imagePreview).toBe('data:image/png;base64,mockBase64Data');
      });
    });

    it('handles no file selected', async () => {
      const { result } = renderHook(() => useImageUpload());

      const event = {
        target: { files: [] },
      } as any;

      await act(async () => {
        await result.current.handleImageChange(event);
      });

      expect(result.current.imageFile).toBeNull();
      expect(result.current.imagePreview).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('Clear Image', () => {
    it('clears selected image and preview', async () => {
      const { result } = renderHook(() => useImageUpload());

      // First, select an image
      const imageFile = new File(['image'], 'test.png', { type: 'image/png' });
      const event = {
        target: { files: [imageFile] },
      } as any;

      await act(async () => {
        await result.current.handleImageChange(event);
      });

      await waitFor(() => {
        expect(result.current.imageFile).toBe(imageFile);
        expect(result.current.imagePreview).toBeTruthy();
      });

      // Then clear it
      act(() => {
        result.current.clearImage();
      });

      expect(result.current.imageFile).toBeNull();
      expect(result.current.imagePreview).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('Image Upload', () => {
    it('successfully uploads image', async () => {
      const mockUrl = 'https://example.com/uploaded-image.jpg';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: mockUrl }),
      });

      const { result } = renderHook(() => useImageUpload());

      // First, select an image
      const imageFile = new File(['image'], 'test.png', { type: 'image/png' });
      const event = {
        target: { files: [imageFile] },
      } as any;

      await act(async () => {
        await result.current.handleImageChange(event);
      });

      await waitFor(() => {
        expect(result.current.imageFile).toBe(imageFile);
      });

      // Then upload it
      let uploadedUrl: string = '';
      await act(async () => {
        uploadedUrl = await result.current.uploadImage();
      });

      expect(uploadedUrl).toBe(mockUrl);
      expect(result.current.imagePreview).toBe(mockUrl);
      expect(result.current.imageFile).toBeNull();
      expect(result.current.uploadingImage).toBe(false);
      expect(result.current.error).toBeNull();

      // Verify fetch was called correctly
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/upload-image',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );
    });

    it('throws error when no file selected', async () => {
      const { result } = renderHook(() => useImageUpload());

      await expect(async () => {
        await act(async () => {
          await result.current.uploadImage();
        });
      }).rejects.toThrow('No image selected for upload');
    });

    it('handles upload failure and sets error state', async () => {
      const errorMessage = 'Upload failed: Server error';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: errorMessage }),
      });

      const { result } = renderHook(() => useImageUpload());

      // First, select an image
      const imageFile = new File(['image'], 'test.png', { type: 'image/png' });
      const event = {
        target: { files: [imageFile] },
      } as any;

      await act(async () => {
        await result.current.handleImageChange(event);
      });

      await waitFor(() => {
        expect(result.current.imageFile).toBe(imageFile);
      });

      // Attempt upload (should fail)
      await expect(async () => {
        await act(async () => {
          await result.current.uploadImage();
        });
      }).rejects.toThrow(errorMessage);

      // Verify error state is set
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.uploadingImage).toBe(false);
      expect(result.current.imageFile).toBe(imageFile); // File should remain
    });

    it('tracks uploading progress state during upload', async () => {
      const mockUrl = 'https://example.com/uploaded-image.jpg';
      
      // Create a promise that we control
      let resolveUpload: (value: { ok: boolean; json: () => Promise<{ url: string }> }) => void;
      const uploadPromise = new Promise((resolve) => {
        resolveUpload = resolve;
      });

      mockFetch.mockReturnValueOnce(uploadPromise);

      const { result } = renderHook(() => useImageUpload());

      // First, select an image
      const imageFile = new File(['image'], 'test.png', { type: 'image/png' });
      const event = {
        target: { files: [imageFile] },
      } as any;

      await act(async () => {
        await result.current.handleImageChange(event);
      });

      await waitFor(() => {
        expect(result.current.imageFile).toBe(imageFile);
      });

      // Start upload (don't await yet)
      const uploadPromiseResult = act(async () => {
        return result.current.uploadImage();
      });

      // Check that uploading state is true
      await waitFor(() => {
        expect(result.current.uploadingImage).toBe(true);
      });

      // Now resolve the upload
      await act(async () => {
        resolveUpload({
          ok: true,
          json: async () => ({ url: mockUrl }),
        });
        await uploadPromiseResult;
      });

      // Verify uploading state is back to false
      expect(result.current.uploadingImage).toBe(false);
      expect(result.current.imagePreview).toBe(mockUrl);
    });

    it('handles network errors during upload', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useImageUpload());

      // First, select an image
      const imageFile = new File(['image'], 'test.png', { type: 'image/png' });
      const event = {
        target: { files: [imageFile] },
      } as any;

      await act(async () => {
        await result.current.handleImageChange(event);
      });

      await waitFor(() => {
        expect(result.current.imageFile).toBe(imageFile);
      });

      // Attempt upload (should fail)
      await expect(async () => {
        await act(async () => {
          await result.current.uploadImage();
        });
      }).rejects.toThrow('Network error');

      // Verify error state is set
      expect(result.current.error).toBe('Network error');
      expect(result.current.uploadingImage).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('sets error for invalid file type', async () => {
      const { result } = renderHook(() => useImageUpload());

      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const event = {
        target: { files: [textFile] },
      } as any;

      await act(async () => {
        await result.current.handleImageChange(event);
      });

      expect(result.current.error).toBe('Please select a valid image file');
    });

    it('provides clearError function', () => {
      const { result } = renderHook(() => useImageUpload());

      expect(result.current.clearError).toBeInstanceOf(Function);
    });
  });
});
