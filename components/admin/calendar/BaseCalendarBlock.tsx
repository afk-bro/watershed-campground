"use client";

import { ReactNode, useState } from "react";
import { differenceInDays } from "date-fns";

export type ResizeSide = "left" | "right";

interface BaseCalendarBlockProps {
  children: ReactNode;
  startDate: Date;
  endDate: Date;
  monthStart: Date;
  monthEnd: Date;
  isInteractive: boolean;
  statusColorClass: string;
  isDragging?: boolean;
  isResizing?: boolean;
  isSaving?: boolean;
  isGlobalDragging?: boolean;
  onSelect: () => void;
  onDragStart: (e: React.PointerEvent) => void;
  onResizeStart: (side: ResizeSide, e: React.PointerEvent) => void;
  
  // Custom metadata for hit-testing or debugging
  dataAttributes?: Record<string, string | undefined>;
  title?: string;
  className?: string;
}

export default function BaseCalendarBlock({
  children,
  startDate,
  endDate,
  monthStart,
  monthEnd,
  isInteractive,
  statusColorClass,
  isDragging = false,
  isResizing = false,
  isSaving = false,
  isGlobalDragging = false,
  onSelect,
  onDragStart,
  onResizeStart,
  dataAttributes = {},
  title,
  className = "",
}: BaseCalendarBlockProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Position and width calculations
  const displayStart = startDate < monthStart ? monthStart : startDate;
  const displayEnd = endDate > monthEnd ? monthEnd : endDate;

  const offsetDays = differenceInDays(displayStart, monthStart);
  let span = differenceInDays(displayEnd, displayStart) + 1;
  if (span < 1) span = 1;

  const totalDays = differenceInDays(monthEnd, monthStart) + 1;
  const leftPercent = (offsetDays / totalDays) * 100;
  const widthPercent = (span / totalDays) * 100;

  const handleResize = (side: ResizeSide, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isInteractive) {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onResizeStart(side, e);
    }
  };

  return (
    <div
      className={`absolute top-1 bottom-1 text-xs font-medium px-2 py-1 flex items-center gap-1 shadow-sm border truncate transition-all hover:brightness-110 hover:shadow-md z-10 group ${statusColorClass} ${
        isDragging ? 'opacity-40 pointer-events-none' : ''
      } ${isResizing ? 'opacity-60' : ''} ${
        isSaving ? 'opacity-70' : ''
      } ${
        isGlobalDragging && !isDragging ? 'pointer-events-none' : ''
      } [.is-panning_&]:pointer-events-none ${
        startDate < monthStart ? 'rounded-l-none border-l-0' : 'rounded-l-lg'
      } ${
        endDate > monthEnd ? 'rounded-r-none border-r-0' : 'rounded-r-lg'
      } ${className}`}
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        cursor: isInteractive && !isResizing ? 'grab' : 'pointer',
        touchAction: 'none',
      }}
      onClick={onSelect}
      onPointerDown={(e) => {
        if (isResizing || !isInteractive || e.button !== 0) return;
        onDragStart(e);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={title}
      {...dataAttributes}
    >
      {/* Left Resize Handle */}
      {isInteractive && (isHovered || isResizing) && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-8 bg-[var(--color-surface-card)]/80 border border-[var(--color-border-strong)] rounded-full cursor-ew-resize hover:bg-[var(--color-surface-card)] hover:border-[var(--color-border-strong)] transition-surface z-20"
          onPointerDown={(e) => handleResize("left", e)}
          style={{ touchAction: 'none' }}
          data-testid="resize-handle-left"
        />
      )}

      {children}

      {/* Saving indicator Overlay (optional, or just pass as children) */}
      {isSaving && (
        <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded text-[10px] text-[var(--color-text-secondary)] whitespace-nowrap shadow-md z-30 pointer-events-none">
          Saving...
        </span>
      )}

      {/* Right Resize Handle */}
      {isInteractive && (isHovered || isResizing) && (
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-8 bg-[var(--color-surface-card)]/80 border border-[var(--color-border-strong)] rounded-full cursor-ew-resize hover:bg-[var(--color-surface-card)] hover:border-[var(--color-border-strong)] transition-surface z-20"
          onPointerDown={(e) => handleResize("right", e)}
          style={{ touchAction: 'none' }}
          data-testid="resize-handle-right"
        />
      )}
    </div>
  );
}
