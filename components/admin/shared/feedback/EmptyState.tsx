"use client";

import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * EmptyState - Reusable empty state component for admin panel
 *
 * Displays a consistent empty state message across the admin panel
 * when there's no data to show.
 *
 * Features:
 * - Optional icon
 * - Title and message
 * - Optional action button
 * - Consistent styling
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={Search}
 *   title="No reservations found"
 *   message="Try adjusting your search or filters."
 *   action={{
 *     label: "Clear filters",
 *     onClick: handleClearFilters
 *   }}
 * />
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`bg-[var(--color-surface-card)] rounded-xl border border-[var(--color-border-subtle)] border-dashed p-12 text-center ${className}`}
    >
      {Icon && (
        <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <Icon className="text-gray-400" size={20} />
        </div>
      )}

      <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
        {title}
      </h3>

      <p className="text-[var(--color-text-muted)] mt-1 mb-6">
        {message}
      </p>

      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-white dark:bg-gray-800 border border-[var(--color-border-subtle)] rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
