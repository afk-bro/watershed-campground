import React from "react";

/**
 * Props for Container component
 *
 * Responsive container with configurable max-width and horizontal padding.
 */
interface ContainerProps {
  /** Container size - controls max-width (default: "lg" for 72rem/1152px) */
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";

  /** Content to render inside the container */
  children: React.ReactNode;
}

const widthMap = {
  sm: "max-w-3xl",        // 48rem / 768px - tight prose
  md: "max-w-4xl",        // 56rem / 896px - forms, shared content
  lg: "max-w-6xl",        // 72rem / 1152px - most main content (default)
  xl: "max-w-7xl",        // 80rem / 1280px - wide, cinematic sections
  "2xl": "max-w-screen-2xl", // 96rem / 1536px - ultra-wide layouts
  "3xl": "max-w-[1680px]",   // 105rem / 1680px - maximum width
} as const;

export default function Container({ size = "lg", children }: ContainerProps) {
  return <div className={`${widthMap[size]} mx-auto px-4 sm:px-6 lg:px-8`}>{children}</div>;
}
