"use client";

import { ReactNode } from 'react';
import { useViewportModeContext } from '@/components/providers/ViewportModeProvider';

interface PageShellProps {
  children: ReactNode;
  /**
   * Max width constraint for content
   * @default "7xl" (1280px)
   */
  maxWidth?: 'full' | '7xl' | '6xl' | '5xl' | '4xl';
  /**
   * Whether to include default padding
   * @default true
   */
  withPadding?: boolean;
  /**
   * Custom className for additional styling
   */
  className?: string;
}

const maxWidthClasses = {
  full: 'max-w-full',
  '7xl': 'max-w-7xl',
  '6xl': 'max-w-6xl',
  '5xl': 'max-w-5xl',
  '4xl': 'max-w-4xl',
};

/**
 * PageShell - Responsive page container
 *
 * Handles consistent max-width and padding across all viewport modes.
 * Automatically adjusts padding based on device type:
 * - Phone: p-4 (16px)
 * - Tablet: p-6 (24px)
 * - Desktop: p-8 (32px)
 *
 * @example
 * ```tsx
 * <PageShell>
 *   <h1>My Page</h1>
 *   <p>Content here...</p>
 * </PageShell>
 * ```
 */
export function PageShell({
  children,
  maxWidth = '7xl',
  withPadding = true,
  className = '',
}: PageShellProps) {
  const { isPhone, isTablet } = useViewportModeContext();

  const paddingClass = withPadding
    ? isPhone
      ? 'p-4'
      : isTablet
      ? 'p-6'
      : 'p-8'
    : '';

  return (
    <div className={`${maxWidthClasses[maxWidth]} mx-auto ${paddingClass} ${className}`}>
      {children}
    </div>
  );
}
