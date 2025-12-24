/**
 * GhostPreview - Unified ghost rendering for all drag/resize operations
 *
 * Replaces 4 separate ghost preview render paths with a single component.
 * Handles: move (drag), resize-start, resize-end, and create modes.
 */

import { GhostState } from "@/lib/calendar/calendar-types";
import { format, parseISO, differenceInDays } from "date-fns";

interface GhostPreviewProps {
  /** Ghost state - null means no ghost */
  ghost: GhostState | null;

  /** Month boundaries for positioning calculations */
  monthStart: Date;
  monthEnd: Date;

  /** Total days in month (for percentage calculations) */
  totalDays: number;

  /** Optional label to display inside ghost */
  label?: string;
}

export default function GhostPreview({
  ghost,
  monthStart,
  monthEnd,
  totalDays,
  label,
}: GhostPreviewProps) {
  if (!ghost) return null;

  // Calculate position using same formula as ReservationBlock
  const startDate = parseISO(ghost.startDate);
  const endDate = parseISO(ghost.endDate);

  const offsetDays = differenceInDays(startDate, monthStart);
  const span = differenceInDays(endDate, startDate) + 1; // Inclusive

  const leftPercent = (offsetDays / totalDays) * 100;
  const widthPercent = (span / totalDays) * 100;

  // Determine styling based on validation state
  const bgColor = ghost.isValid
    ? ghost.mode === 'create'
      ? 'bg-[var(--color-accent-gold)]/20'
      : 'bg-[var(--color-success)]/20'
    : 'bg-[var(--color-error)]/20';

  const borderColor = ghost.isValid
    ? ghost.mode === 'create'
      ? 'border-[var(--color-accent-gold)]'
      : 'border-[var(--color-success)]'
    : 'border-[var(--color-error)]';

  // Build display label
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "MMM d");
    } catch {
      return dateStr;
    }
  };

  const displayLabel = label || (() => {
    switch (ghost.mode) {
      case 'move':
        return `${formatDate(ghost.startDate)} → ${formatDate(ghost.endDate)}`;
      case 'resize-start':
      case 'resize-end':
        return `${differenceInDays(endDate, startDate)} nights`;
      case 'create':
        return `${formatDate(ghost.startDate)} → ${formatDate(ghost.endDate)}`;
      default:
        return '';
    }
  })();

  return (
    <div
      className={`absolute top-0 bottom-0 rounded-sm px-2 py-1 border-2 border-dashed ${bgColor} ${borderColor} opacity-60 z-50 pointer-events-none shadow-sm`}
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
      }}
      data-ghost-mode={ghost.mode}
    >
      <div className="text-xs truncate">
        {displayLabel}
      </div>
    </div>
  );
}
