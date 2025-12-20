/**
 * useAutoScroll - Custom hook for calendar auto-scroll during drag operations
 *
 * Handles smooth auto-scrolling when user drags near container edges.
 * Works with both HTML5 drag events and mouse/pointer events.
 */

import { useRef, useCallback } from 'react';

// Constants for auto-scroll behavior
const SCROLL_ZONE_PX = 60; // Distance from edge to trigger scroll
const SCROLL_SPEED = 12; // Pixels to scroll per frame

export interface UseAutoScrollReturn {
  /** Ref to attach to the scrollable container */
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;

  /** Update scroll direction based on pointer position */
  updateScrollDirection: (clientX: number, clientY: number) => void;

  /** Stop all auto-scrolling */
  stopAutoScroll: () => void;
}

/**
 * Hook for managing auto-scroll during drag/creation operations
 *
 * @returns Object with scrollContainerRef, updateScrollDirection, and stopAutoScroll
 *
 * @example
 * const { scrollContainerRef, updateScrollDirection, stopAutoScroll } = useAutoScroll();
 *
 * // Attach ref to container
 * <div ref={scrollContainerRef}>...</div>
 *
 * // Call updateScrollDirection on pointer/mouse move
 * onMouseMove={(e) => updateScrollDirection(e.clientX, e.clientY)}
 *
 * // Call stopAutoScroll when operation ends
 * onMouseUp={() => stopAutoScroll()}
 */
export function useAutoScroll(): UseAutoScrollReturn {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollDirectionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const scrollAnimationFrameRef = useRef<number | null>(null);

  // Smooth auto-scroll using requestAnimationFrame
  const startAutoScroll = useCallback(() => {
    const tick = () => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const { x, y } = scrollDirectionRef.current;

      if (x !== 0 || y !== 0) {
        container.scrollBy({
          left: x * SCROLL_SPEED,
          top: y * SCROLL_SPEED,
          behavior: 'auto'
        });
        scrollAnimationFrameRef.current = requestAnimationFrame(tick);
      } else {
        scrollAnimationFrameRef.current = null;
      }
    };

    if (!scrollAnimationFrameRef.current) {
      scrollAnimationFrameRef.current = requestAnimationFrame(tick);
    }
  }, []);

  const stopAutoScroll = useCallback(() => {
    scrollDirectionRef.current = { x: 0, y: 0 };
    if (scrollAnimationFrameRef.current) {
      cancelAnimationFrame(scrollAnimationFrameRef.current);
      scrollAnimationFrameRef.current = null;
    }
  }, []);

  const updateScrollDirection = useCallback((clientX: number, clientY: number) => {
    const container = scrollContainerRef.current;
    if (!container) {
      console.log('[AUTO-SCROLL] No container ref');
      return;
    }

    const rect = container.getBoundingClientRect();

    // Handle container edges that may be clipped by viewport
    const leftEdge = Math.max(rect.left, 0);
    const rightEdge = Math.min(rect.right, window.innerWidth);

    let x = 0;

    // Horizontal scrolling - use container's visible edges
    if (clientX < leftEdge + SCROLL_ZONE_PX) {
      x = -1; // Scroll left
      console.log('[AUTO-SCROLL] Scrolling LEFT', { clientX, leftEdge, SCROLL_ZONE_PX });
    } else if (clientX > rightEdge - SCROLL_ZONE_PX) {
      x = 1; // Scroll right
      console.log('[AUTO-SCROLL] Scrolling RIGHT', { clientX, rightEdge, SCROLL_ZONE_PX });
    }

    // Vertical scrolling removed - page handles vertical scroll naturally

    const directionChanged = scrollDirectionRef.current.x !== x;

    scrollDirectionRef.current = { x, y: 0 }; // y always 0

    if (x !== 0 && directionChanged) {
      startAutoScroll();
    } else if (x === 0) {
      stopAutoScroll();
    }
  }, [startAutoScroll, stopAutoScroll]);

  return {
    scrollContainerRef,
    updateScrollDirection,
    stopAutoScroll,
  };
}
