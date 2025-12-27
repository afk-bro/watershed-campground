interface SkeletonLoaderProps {
    /**
     * Number of skeleton rows to display
     * @default 5
     */
    rows?: number;
    /**
     * Layout variant for the skeleton
     * @default 'table-row'
     */
    variant?: 'table-row' | 'card' | 'list-item';
    /**
     * Custom className for the container
     */
    className?: string;
}

/**
 * SkeletonLoader - Reusable loading skeleton component
 *
 * Displays animated placeholder content while data is loading.
 * Supports different layouts for tables, cards, and list items.
 *
 * @example
 * ```tsx
 * {loading && <SkeletonLoader rows={6} variant="table-row" />}
 * ```
 */
export default function SkeletonLoader({
    rows = 5,
    variant = 'table-row',
    className = ''
}: SkeletonLoaderProps) {
    const renderTableRowSkeleton = () => (
        <div className="flex items-center p-4 gap-4 animate-pulse">
            <div className="w-5 h-5 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="w-48 h-5 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="w-32 h-5 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="flex-1" />
            <div className="w-24 h-5 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
    );

    const renderCardSkeleton = () => (
        <div className="p-6 space-y-4 animate-pulse">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-lg" />
                <div className="flex-1 space-y-2">
                    <div className="w-3/4 h-5 bg-gray-200 dark:bg-gray-800 rounded" />
                    <div className="w-1/2 h-4 bg-gray-200 dark:bg-gray-800 rounded" />
                </div>
            </div>
            <div className="space-y-2">
                <div className="w-full h-4 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="w-5/6 h-4 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
        </div>
    );

    const renderListItemSkeleton = () => (
        <div className="flex items-center gap-3 p-3 animate-pulse">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-full" />
            <div className="flex-1 space-y-2">
                <div className="w-2/3 h-4 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="w-1/3 h-3 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
        </div>
    );

    const skeletonMap = {
        'table-row': renderTableRowSkeleton,
        'card': renderCardSkeleton,
        'list-item': renderListItemSkeleton,
    };

    const renderSkeleton = skeletonMap[variant];

    return (
        <div className={`bg-[var(--color-surface-card)] rounded-xl border border-[var(--color-border-subtle)] shadow-sm overflow-hidden ${className}`}>
            <div className="divide-y divide-[var(--color-border-subtle)]">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i}>
                        {renderSkeleton()}
                    </div>
                ))}
            </div>
        </div>
    );
}
