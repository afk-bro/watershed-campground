"use client";

import Image from "next/image";

type Props = {
  images: { src: string; alt: string }[];
  columns?: 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
  onSelect?: (index: number) => void;
};

const gapMap = { sm: "gap-3", md: "gap-4", lg: "gap-6" } as const;

export default function SiteGalleryGrid({ images, columns = 3, gap = "md", onSelect }: Props) {
  const gridCols =
    columns === 4 ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : columns === 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3";
  return (
    <div className={`grid ${gridCols} ${gapMap[gap]}`}>
      {images.map((img, i) => (
        <button key={img.src} className="group relative overflow-hidden rounded-md" onClick={() => onSelect?.(i)}>
          <Image src={img.src} alt={img.alt} width={800} height={600} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        </button>
      ))}
    </div>
  );
}
