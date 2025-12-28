import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, ArrowLeftToLine, Calendar as CalendarIcon } from 'lucide-react';
import { UI_CONSTANTS } from '@/lib/admin/constants';

interface FloatingCalendarRailProps {
  /** Current date being viewed */
  date: Date;
  /** Callback to change the displayed month */
  onDateChange: (date: Date) => void;
  /** Ref to the scrollable calendar container */
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * FloatingCalendarRail
 *
 * Floating navigation rail that appears when scrolling down the calendar.
 * Provides quick access to:
 * - Scroll to start
 * - Month picker
 * - Horizontal scroll navigation
 *
 * Auto-hides when at top of page, appears when scrolled past threshold.
 *
 * @param props - Date, navigation callbacks, and scroll container ref
 */
export default function FloatingCalendarRail({
  date,
  onDateChange,
  scrollContainerRef
}: FloatingCalendarRailProps) {
  const [isVisible, setIsVisible] = useState(false);
  const monthPickerRef = useRef<HTMLInputElement>(null);

  // Toggle visibility based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      // Show when scrolled down past threshold
      setIsVisible(window.scrollY > UI_CONSTANTS.FLOATING_RAIL_SCROLL_THRESHOLD);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1.5 rounded-full bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] shadow-xl transition-all duration-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
      <button
        onClick={() => {
          if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        }}
        className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        title="Scroll to Start"
      >
        <ArrowLeftToLine size={18} />
      </button>
      <div className="w-px h-4 bg-[var(--color-border-subtle)] mx-1" />
      <div
        className="relative flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors font-medium text-sm cursor-pointer group"
        onClick={() => monthPickerRef.current?.showPicker()}
      >
        <CalendarIcon size={16} />
        <span className="whitespace-nowrap">{format(date, "MMMM yyyy")}</span>
        <input
          ref={monthPickerRef}
          type="month"
          className="absolute inset-0 opacity-0 pointer-events-none"
          value={format(date, 'yyyy-MM')}
          onChange={(e) => {
            if (e.target.value) {
              const [y, m] = e.target.value.split('-').map(Number);
              onDateChange(new Date(y, m - 1, 1));
            }
          }}
          tabIndex={-1}
          aria-label="Change Month"
        />
      </div>
      <div className="w-px h-4 bg-[var(--color-border-subtle)] mx-1" />
      <button
        onClick={() => {
          if (scrollContainerRef.current) scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
        }}
        className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={() => {
          if (scrollContainerRef.current) scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }}
        className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
