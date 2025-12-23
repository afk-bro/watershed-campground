import { forwardRef, RefObject } from 'react';

interface SyncedScrollbarProps {
  contentWidth: number;
  className?: string;
}

const SyncedScrollbar = forwardRef<HTMLDivElement, SyncedScrollbarProps>(({ contentWidth, className }, ref) => {
  return (
    <div
      ref={ref}
      className={`overflow-x-auto overflow-y-hidden sticky top-0 h-3 ${className || ''}`}
    >
      <div style={{ width: contentWidth, height: '1px' }} />
    </div>
  );
});

SyncedScrollbar.displayName = 'SyncedScrollbar';

export default SyncedScrollbar;
