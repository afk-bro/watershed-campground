"use client";

import { useEffect } from "react";
import Image from "next/image";

type Props = {
  images: { src: string; alt: string }[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
};

export default function ImageLightbox({ images, currentIndex, onClose, onNext, onPrevious }: Props) {
  const currentImage = images[currentIndex];

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrevious();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onNext, onPrevious]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-brand-forest/80 border border-accent-gold/30 text-accent-gold hover:bg-brand-forest hover:border-accent-gold/50 transition-all"
        aria-label="Close lightbox"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Previous button */}
      {images.length > 1 && (
        <button
          onClick={onPrevious}
          className="absolute left-4 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-brand-forest/80 border border-accent-gold/30 text-accent-gold hover:bg-brand-forest hover:border-accent-gold/50 transition-all"
          aria-label="Previous image"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Next button */}
      {images.length > 1 && (
        <button
          onClick={onNext}
          className="absolute right-4 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-brand-forest/80 border border-accent-gold/30 text-accent-gold hover:bg-brand-forest hover:border-accent-gold/50 transition-all"
          aria-label="Next image"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Image container - click to close */}
      <div
        onClick={onClose}
        className="relative w-full h-full flex items-center justify-center p-4 sm:p-8 md:p-16"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-7xl max-h-full w-full h-full flex flex-col items-center justify-center"
        >
          {/* Image */}
          <div className="relative w-full h-full">
            <Image
              src={currentImage.src}
              alt={currentImage.alt}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>

          {/* Image caption */}
          {currentImage.alt && (
            <div className="mt-4 text-center">
              <p className="text-accent-beige/90 text-sm sm:text-base">
                {currentImage.alt}
              </p>
              <p className="text-accent-beige/50 text-xs mt-1">
                {currentIndex + 1} / {images.length}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
