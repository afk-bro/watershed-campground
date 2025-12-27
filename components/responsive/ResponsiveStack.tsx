"use client";

import { ReactNode } from 'react';
import { useViewportModeContext } from '@/components/providers/ViewportModeProvider';

interface ResponsiveStackProps {
  children: ReactNode;
  /**
   * Gap between items
   * @default "4" (16px)
   */
  gap?: '2' | '3' | '4' | '6' | '8';
  /**
   * Alignment of items
   * @default "stretch"
   */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /**
   * Justify content
   * @default "start"
   */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  /**
   * Custom className for additional styling
   */
  className?: string;
  /**
   * Force column layout even on desktop
   * @default false
   */
  alwaysColumn?: boolean;
}

const gapClasses = {
  '2': 'gap-2',
  '3': 'gap-3',
  '4': 'gap-4',
  '6': 'gap-6',
  '8': 'gap-8',
};

const alignClasses = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

const justifyClasses = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
};

/**
 * ResponsiveStack - Automatically becomes column on phone, row on desktop
 *
 * Provides consistent spacing and alignment across viewport modes:
 * - Phone: Always vertical (flex-col)
 * - Tablet/Desktop: Horizontal (flex-row), unless alwaysColumn is true
 *
 * @example
 * ```tsx
 * <ResponsiveStack gap="4" align="center">
 *   <button>Cancel</button>
 *   <button>Save</button>
 * </ResponsiveStack>
 * ```
 */
export function ResponsiveStack({
  children,
  gap = '4',
  align = 'stretch',
  justify = 'start',
  className = '',
  alwaysColumn = false,
}: ResponsiveStackProps) {
  const { isPhone } = useViewportModeContext();

  const directionClass = isPhone || alwaysColumn ? 'flex-col' : 'flex-row';

  return (
    <div
      className={`flex ${directionClass} ${gapClasses[gap]} ${alignClasses[align]} ${justifyClasses[justify]} ${className}`}
    >
      {children}
    </div>
  );
}
