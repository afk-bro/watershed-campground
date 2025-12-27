"use client";

import { useEffect, useState, useRef } from 'react';

/**
 * Global viewport modes based on device capabilities
 * Used consistently across the entire application
 */
export type ViewportMode = 'phone' | 'tablet' | 'desktop';

/**
 * Pointer input type (touch vs mouse/trackpad)
 */
export type PointerType = 'touch' | 'mouse';

/**
 * Viewport mode state returned by the hook
 */
export interface ViewportModeState {
  mode: ViewportMode;
  pointerType: PointerType;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  isMouseDevice: boolean;
}

/**
 * Mode detection based on viewport width
 * Breakpoints: <768 (phone), 768-1023 (tablet), >=1024 (desktop)
 */
function detectMode(width: number): ViewportMode {
  if (width < 768) return 'phone';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Robust pointer type detection using multiple media queries
 * Handles hybrids and DevTools emulation correctly
 */
function detectPointerType(): PointerType {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'mouse'; // SSR default
  }

  const fine = window.matchMedia('(pointer: fine)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const hover = window.matchMedia('(hover: hover)').matches;

  // Strong signal for mouse/trackpad
  if (fine && hover) return 'mouse';

  // Strong signal for touch
  if (coarse && !fine) return 'touch';

  // Hybrids: choose conservative (touch) if coarse is available
  if (coarse) return 'touch';
  if (fine) return 'mouse';

  return 'touch'; // Conservative fallback
}

/**
 * Shared viewport mode hook
 *
 * Provides consistent viewport mode detection across the entire application.
 * Use this instead of creating custom breakpoint logic in individual components.
 *
 * @example
 * ```tsx
 * const { mode, pointerType, isPhone } = useViewportMode();
 *
 * if (isPhone) {
 *   return <MobileView />;
 * }
 *
 * return <DesktopView />;
 * ```
 */
export function useViewportMode(): ViewportModeState {
  // Detect initial mode and pointer type
  const [mode, setMode] = useState<ViewportMode>(() => {
    if (typeof window === 'undefined') return 'desktop';
    return detectMode(window.innerWidth);
  });

  const [pointerType, setPointerType] = useState<PointerType>(() => {
    return detectPointerType();
  });

  // Ref to avoid stale closures in resize handler
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Update mode on window resize (boundary-cross only, with debounce)
  useEffect(() => {
    let timeoutId: number | undefined;

    const getWidth = () =>
      Math.round(window.visualViewport?.width ?? window.innerWidth);

    const handleResize = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        const newMode = detectMode(getWidth());

        // Only update if mode actually changed (crossing breakpoint boundary)
        if (newMode !== modeRef.current) {
          setMode(newMode);
        }
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update pointer type on media query change (listen to all relevant queries)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mqs = [
      window.matchMedia('(pointer: fine)'),
      window.matchMedia('(pointer: coarse)'),
      window.matchMedia('(hover: hover)'),
      window.matchMedia('(hover: none)'),
    ];

    const update = () => setPointerType(detectPointerType());

    // Initial check
    update();

    // Listen for changes on all queries
    mqs.forEach(mq => mq.addEventListener('change', update));
    return () => mqs.forEach(mq => mq.removeEventListener('change', update));
  }, []);

  // Compute convenience flags
  const isPhone = mode === 'phone';
  const isTablet = mode === 'tablet';
  const isDesktop = mode === 'desktop';
  const isTouchDevice = pointerType === 'touch';
  const isMouseDevice = pointerType === 'mouse';

  return {
    mode,
    pointerType,
    isPhone,
    isTablet,
    isDesktop,
    isTouchDevice,
    isMouseDevice,
  };
}
