"use client";

import { ReactNode } from 'react';
import { useViewportModeContext } from '@/components/providers/ViewportModeProvider';

interface ResponsiveGridProps {
  children: ReactNode;
  /**
   * Number of columns on phone
   * @default 1
   */
  phoneCols?: 1 | 2;
  /**
   * Number of columns on tablet
   * @default 2
   */
  tabletCols?: 1 | 2 | 3;
  /**
   * Number of columns on desktop
   * @default 3
   */
  desktopCols?: 1 | 2 | 3 | 4;
  /**
   * Gap between items
   * @default "4" (16px)
   */
  gap?: '2' | '3' | '4' | '6' | '8';
  /**
   * Custom className for additional styling
   */
  className?: string;
}

const colClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

const gapClasses = {
  '2': 'gap-2',
  '3': 'gap-3',
  '4': 'gap-4',
  '6': 'gap-6',
  '8': 'gap-8',
};

/**
 * ResponsiveGrid - Automatic column count based on viewport mode
 *
 * Provides consistent grid layouts across devices:
 * - Phone: 1 column (default)
 * - Tablet: 2 columns (default)
 * - Desktop: 3 columns (default)
 *
 * @example
 * ```tsx
 * <ResponsiveGrid desktopCols={4} gap="6">
 *   <Card />
 *   <Card />
 *   <Card />
 * </ResponsiveGrid>
 * ```
 */
export function ResponsiveGrid({
  children,
  phoneCols = 1,
  tabletCols = 2,
  desktopCols = 3,
  gap = '4',
  className = '',
}: ResponsiveGridProps) {
  const { isPhone, isTablet } = useViewportModeContext();

  const colClass = isPhone
    ? colClasses[phoneCols]
    : isTablet
    ? colClasses[tabletCols]
    : colClasses[desktopCols];

  return (
    <div className={`grid ${colClass} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}
