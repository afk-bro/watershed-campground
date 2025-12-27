"use client";

import { ReactNode } from 'react';

interface DataCardField {
  label: string;
  value: ReactNode;
  /**
   * Whether to highlight this field
   */
  highlight?: boolean;
  /**
   * Whether to show this field as full width
   */
  fullWidth?: boolean;
}

interface DataCardProps {
  /**
   * Fields to display in the card
   */
  fields: DataCardField[];
  /**
   * Optional title for the card
   */
  title?: ReactNode;
  /**
   * Optional actions (buttons, menu, etc.)
   */
  actions?: ReactNode;
  /**
   * Optional status indicator
   */
  status?: ReactNode;
  /**
   * Click handler for the entire card
   */
  onClick?: () => void;
  /**
   * Custom className
   */
  className?: string;
}

/**
 * DataCard - Mobile-friendly replacement for table rows
 *
 * Displays data in a card format optimized for phone screens.
 * Use this instead of tables on mobile for better UX.
 *
 * @example
 * ```tsx
 * <DataCard
 *   title="John Doe"
 *   status={<Badge>Confirmed</Badge>}
 *   fields={[
 *     { label: "Check-in", value: "Dec 25, 2024" },
 *     { label: "Nights", value: "3" },
 *     { label: "Site", value: "A-12", highlight: true },
 *   ]}
 *   actions={
 *     <button>View Details</button>
 *   }
 *   onClick={() => handleCardClick()}
 * />
 * ```
 */
export function DataCard({
  fields,
  title,
  actions,
  status,
  onClick,
  className = '',
}: DataCardProps) {
  const isClickable = Boolean(onClick);

  return (
    <div
      className={`
        bg-[var(--color-surface-card)]
        border border-[var(--color-border-default)]
        rounded-lg
        p-4
        ${isClickable ? 'cursor-pointer hover:border-[var(--color-accent-gold)] hover:shadow-md transition-all' : ''}
        ${className}
      `}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      } : undefined}
    >
      {/* Header: Title + Status + Actions */}
      {(title || status || actions) && (
        <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-[var(--color-border-subtle)]">
          <div className="flex-1 min-w-0">
            {title && (
              <div className="font-medium text-[var(--color-text-primary)] truncate">
                {title}
              </div>
            )}
            {status && (
              <div className="mt-1">
                {status}
              </div>
            )}
          </div>
          {actions && (
            <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Fields Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {fields.map((field, index) => (
          <div
            key={index}
            className={`
              ${field.fullWidth ? 'col-span-2' : 'col-span-1'}
              min-w-0
            `}
          >
            <div className="text-xs text-[var(--color-text-muted)] mb-0.5">
              {field.label}
            </div>
            <div
              className={`
                text-sm truncate
                ${field.highlight
                  ? 'text-[var(--color-accent-gold)] font-medium'
                  : 'text-[var(--color-text-primary)]'
                }
              `}
            >
              {field.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
