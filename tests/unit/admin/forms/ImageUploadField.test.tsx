import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImageUploadField } from '@/components/admin/shared/forms/ImageUploadField';

// Mock the useImageUpload hook
vi.mock('@/components/admin/hooks/useImageUpload', () => ({
  useImageUpload: vi.fn(),
}));

import { useImageUpload } from '@/components/admin/hooks/useImageUpload';

describe('ImageUploadField', () => {
  const mockUseImageUpload = useImageUpload as any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    mockUseImageUpload.mockReturnValue({
      imagePreview: null,
      imageFile: null,
      uploadingImage: false,
      error: null,
      handleImageChange: vi.fn(),
      clearImage: vi.fn(),
      uploadImage: vi.fn(),
      clearError: vi.fn(),
    });
  });

  describe('Rendering', () => {
    it('renders with default label', () => {
      const onImageUrlChange = vi.fn();
      render(<ImageUploadField onImageUrlChange={onImageUrlChange} />);

      expect(screen.getByText('Image')).toBeInTheDocument();
    });

    it('renders with custom label', () => {
      const onImageUrlChange = vi.fn();
      render(
        <ImageUploadField
          label="Campsite Photo"
          onImageUrlChange={onImageUrlChange}
        />
      );

      expect(screen.getByText('Campsite Photo')).toBeInTheDocument();
    });

    it('shows required indicator when required prop is true', () => {
      const onImageUrlChange = vi.fn();
      render(
        <ImageUploadField
          label="Image"
          required
          onImageUrlChange={onImageUrlChange}
        />
      );

      // Find the asterisk in the label
      const label = screen.getByText(/Image/);
      const asterisk = label.querySelector('span');
      expect(asterisk).toHaveTextContent('*');
    });

    it('displays hint text when provided', () => {
      const onImageUrlChange = vi.fn();
      render(
        <ImageUploadField
          hint="Maximum file size: 5MB"
          onImageUrlChange={onImageUrlChange}
        />
      );

      expect(screen.getByText('Maximum file size: 5MB')).toBeInTheDocument();
    });
  });

  describe('Upload Mode (No Preview)', () => {
    it('shows upload dropzone when no preview', () => {
      const onImageUrlChange = vi.fn();
      render(<ImageUploadField onImageUrlChange={onImageUrlChange} />);

      expect(screen.getByText('Click to upload or drag and drop')).toBeInTheDocument();
      expect(screen.getByText(/PNG, JPG, WebP/)).toBeInTheDocument();
    });

    it('shows correct max size in dropzone text', () => {
      const onImageUrlChange = vi.fn();
      const maxSize = 10 * 1024 * 1024; // 10MB

      render(
        <ImageUploadField
          maxSizeBytes={maxSize}
          onImageUrlChange={onImageUrlChange}
        />
      );

      expect(screen.getByText(/max 10MB/)).toBeInTheDocument();
    });

    it('calls handleImageChange when file is selected', () => {
      const handleImageChange = vi.fn();
      mockUseImageUpload.mockReturnValue({
        imagePreview: null,
        imageFile: null,
        uploadingImage: false,
        error: null,
        handleImageChange,
        clearImage: vi.fn(),
        uploadImage: vi.fn(),
        clearError: vi.fn(),
      });

      const onImageUrlChange = vi.fn();
      const { container } = render(<ImageUploadField onImageUrlChange={onImageUrlChange} />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['image'], 'test.png', { type: 'image/png' });

      fireEvent.change(input, { target: { files: [file] } });

      expect(handleImageChange).toHaveBeenCalled();
    });
  });

  describe('Preview Mode', () => {
    it('shows preview when imagePreview is set', () => {
      mockUseImageUpload.mockReturnValue({
        imagePreview: 'https://example.com/preview.jpg',
        imageFile: null,
        uploadingImage: false,
        error: null,
        handleImageChange: vi.fn(),
        clearImage: vi.fn(),
        uploadImage: vi.fn(),
        clearError: vi.fn(),
      });

      const onImageUrlChange = vi.fn();
      render(<ImageUploadField onImageUrlChange={onImageUrlChange} />);

      const img = screen.getByAltText('Preview');
      expect(img).toHaveAttribute('src', 'https://example.com/preview.jpg');
    });

    it('shows remove button in preview mode', () => {
      mockUseImageUpload.mockReturnValue({
        imagePreview: 'https://example.com/preview.jpg',
        imageFile: null,
        uploadingImage: false,
        error: null,
        handleImageChange: vi.fn(),
        clearImage: vi.fn(),
        uploadImage: vi.fn(),
        clearError: vi.fn(),
      });

      const onImageUrlChange = vi.fn();
      render(<ImageUploadField onImageUrlChange={onImageUrlChange} />);

      expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    });

    it('calls clearImage and onImageUrlChange when remove button is clicked', () => {
      const clearImage = vi.fn();
      mockUseImageUpload.mockReturnValue({
        imagePreview: 'https://example.com/preview.jpg',
        imageFile: null,
        uploadingImage: false,
        error: null,
        handleImageChange: vi.fn(),
        clearImage,
        uploadImage: vi.fn(),
        clearError: vi.fn(),
      });

      const onImageUrlChange = vi.fn();
      render(<ImageUploadField onImageUrlChange={onImageUrlChange} />);

      const removeButton = screen.getByRole('button', { name: 'Remove' });
      fireEvent.click(removeButton);

      expect(clearImage).toHaveBeenCalled();
      expect(onImageUrlChange).toHaveBeenCalledWith('');
    });
  });

  describe('Upload Progress', () => {
    it('shows uploading indicator when uploadingImage is true', () => {
      mockUseImageUpload.mockReturnValue({
        imagePreview: null,
        imageFile: new File(['image'], 'test.png', { type: 'image/png' }),
        uploadingImage: true,
        error: null,
        handleImageChange: vi.fn(),
        clearImage: vi.fn(),
        uploadImage: vi.fn(),
        clearError: vi.fn(),
      });

      const onImageUrlChange = vi.fn();
      render(<ImageUploadField onImageUrlChange={onImageUrlChange} />);

      expect(screen.getByText('Uploading image...')).toBeInTheDocument();
    });

    it('automatically uploads when imageFile is set', async () => {
      const uploadImage = vi.fn().mockResolvedValue('https://example.com/uploaded.jpg');
      const file = new File(['image'], 'test.png', { type: 'image/png' });

      mockUseImageUpload.mockReturnValue({
        imagePreview: null,
        imageFile: file,
        uploadingImage: false,
        error: null,
        handleImageChange: vi.fn(),
        clearImage: vi.fn(),
        uploadImage,
        clearError: vi.fn(),
      });

      const onImageUrlChange = vi.fn();
      render(
        <ImageUploadField onImageUrlChange={onImageUrlChange} />
      );

      // Wait for useEffect to trigger upload
      await waitFor(() => {
        expect(uploadImage).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(onImageUrlChange).toHaveBeenCalledWith('https://example.com/uploaded.jpg');
      });
    });
  });

  describe('Error Display', () => {
    it('shows error message when error is set', () => {
      mockUseImageUpload.mockReturnValue({
        imagePreview: null,
        imageFile: null,
        uploadingImage: false,
        error: 'File too large',
        handleImageChange: vi.fn(),
        clearImage: vi.fn(),
        uploadImage: vi.fn(),
        clearError: vi.fn(),
      });

      const onImageUrlChange = vi.fn();
      render(<ImageUploadField onImageUrlChange={onImageUrlChange} />);

      expect(screen.getByText('File too large')).toBeInTheDocument();
    });

    it('shows dismiss button for error', () => {
      mockUseImageUpload.mockReturnValue({
        imagePreview: null,
        imageFile: null,
        uploadingImage: false,
        error: 'File too large',
        handleImageChange: vi.fn(),
        clearImage: vi.fn(),
        uploadImage: vi.fn(),
        clearError: vi.fn(),
      });

      const onImageUrlChange = vi.fn();
      render(<ImageUploadField onImageUrlChange={onImageUrlChange} />);

      expect(screen.getByText('Dismiss')).toBeInTheDocument();
    });

    it('calls clearError when dismiss button is clicked', () => {
      const clearError = vi.fn();
      mockUseImageUpload.mockReturnValue({
        imagePreview: null,
        imageFile: null,
        uploadingImage: false,
        error: 'File too large',
        handleImageChange: vi.fn(),
        clearImage: vi.fn(),
        uploadImage: vi.fn(),
        clearError,
      });

      const onImageUrlChange = vi.fn();
      render(<ImageUploadField onImageUrlChange={onImageUrlChange} />);

      const dismissButton = screen.getByText('Dismiss');
      fireEvent.click(dismissButton);

      expect(clearError).toHaveBeenCalled();
    });

    it('does not show hint text when error is present', () => {
      mockUseImageUpload.mockReturnValue({
        imagePreview: null,
        imageFile: null,
        uploadingImage: false,
        error: 'File too large',
        handleImageChange: vi.fn(),
        clearImage: vi.fn(),
        uploadImage: vi.fn(),
        clearError: vi.fn(),
      });

      const onImageUrlChange = vi.fn();
      render(
        <ImageUploadField
          hint="This is a hint"
          onImageUrlChange={onImageUrlChange}
        />
      );

      expect(screen.getByText('File too large')).toBeInTheDocument();
      expect(screen.queryByText('This is a hint')).not.toBeInTheDocument();
    });

    it('applies error border to dropzone when error is present', () => {
      mockUseImageUpload.mockReturnValue({
        imagePreview: null,
        imageFile: null,
        uploadingImage: false,
        error: 'Invalid file type',
        handleImageChange: vi.fn(),
        clearImage: vi.fn(),
        uploadImage: vi.fn(),
        clearError: vi.fn(),
      });

      const onImageUrlChange = vi.fn();
      const { container } = render(
        <ImageUploadField onImageUrlChange={onImageUrlChange} />
      );

      // Find the dropzone label (not the field label)
      const dropzone = container.querySelector('label.flex');
      expect(dropzone).toHaveClass('border-[var(--color-error)]');
    });
  });

  describe('Disabled State', () => {
    it('disables file input when disabled prop is true', () => {
      const onImageUrlChange = vi.fn();
      const { container } = render(
        <ImageUploadField
          disabled
          onImageUrlChange={onImageUrlChange}
        />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeDisabled();
    });

    it('disables remove button when disabled prop is true', () => {
      mockUseImageUpload.mockReturnValue({
        imagePreview: 'https://example.com/preview.jpg',
        imageFile: null,
        uploadingImage: false,
        error: null,
        handleImageChange: vi.fn(),
        clearImage: vi.fn(),
        uploadImage: vi.fn(),
        clearError: vi.fn(),
      });

      const onImageUrlChange = vi.fn();
      render(
        <ImageUploadField
          disabled
          onImageUrlChange={onImageUrlChange}
        />
      );

      const removeButton = screen.getByRole('button', { name: 'Remove' });
      expect(removeButton).toBeDisabled();
    });

    it('disables file input when uploading', () => {
      mockUseImageUpload.mockReturnValue({
        imagePreview: null,
        imageFile: new File(['image'], 'test.png', { type: 'image/png' }),
        uploadingImage: true,
        error: null,
        handleImageChange: vi.fn(),
        clearImage: vi.fn(),
        uploadImage: vi.fn(),
        clearError: vi.fn(),
      });

      const onImageUrlChange = vi.fn();
      const { container } = render(<ImageUploadField onImageUrlChange={onImageUrlChange} />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeDisabled();
    });
  });

  describe('Custom Class Name', () => {
    it('applies custom className to wrapper', () => {
      const onImageUrlChange = vi.fn();
      const { container } = render(
        <ImageUploadField
          className="custom-class"
          onImageUrlChange={onImageUrlChange}
        />
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-class');
    });
  });
});
