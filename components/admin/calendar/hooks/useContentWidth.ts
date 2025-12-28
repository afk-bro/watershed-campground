import { useState, useEffect } from 'react';

/**
 * useContentWidth
 *
 * Measures the scroll width of a content element.
 * Used for synced scrollbar sizing.
 *
 * @param contentRef - Ref to the scrollable content element
 * @param dependencies - Array of dependencies that trigger re-measurement (e.g., days count, items count)
 * @returns Current content scroll width in pixels
 */
export function useContentWidth(
  contentRef: React.RefObject<HTMLDivElement | null>,
  dependencies: React.DependencyList
): number {
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setContentWidth(contentRef.current.scrollWidth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return contentWidth;
}
