"use client";

import { useState } from "react";
import Container from "../../components/Container";
import SectionHeader from "../../components/SectionHeader";
import SiteGalleryGrid from "../../components/SiteGalleryGrid";
import ImageLightbox from "../../components/ImageLightbox";

const images = [
  { src: "/gallery/nelson-bc.jpg", alt: "Nelson, BC" },
  { src: "/gallery/nelson-olskool.jpg", alt: "Nelson Old School" },
  { src: "/gallery/old-steam-boats-nelson.jpg", alt: "Old Steam Boats in Nelson" },
];

export default function GalleryPage() {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const handleNext = () => {
    setSelectedImageIndex((prev) => (prev === null ? 0 : (prev + 1) % images.length));
  };

  const handlePrevious = () => {
    setSelectedImageIndex((prev) => (prev === null ? 0 : (prev - 1 + images.length) % images.length));
  };

  return (
    <main className="py-10">
      <Container size="2xl">
        <SectionHeader title="Gallery" subtitle="Scenes from around the campground" />
        <SiteGalleryGrid images={images} onSelect={setSelectedImageIndex} />
      </Container>

      {selectedImageIndex !== null && (
        <ImageLightbox
          images={images}
          currentIndex={selectedImageIndex}
          onClose={() => setSelectedImageIndex(null)}
          onNext={handleNext}
          onPrevious={handlePrevious}
        />
      )}
    </main>
  );
}
