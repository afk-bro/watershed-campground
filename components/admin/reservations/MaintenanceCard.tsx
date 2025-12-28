"use client";

import { memo } from "react";
import { Wrench, Trash2 } from "lucide-react";
import { getNights } from "@/lib/admin/reservations/listing";
import type { BlockingEventOverviewItem } from "@/lib/supabase";

interface MaintenanceCardProps {
    item: BlockingEventOverviewItem;
    isSelected: boolean;
    isSubmitting: boolean;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
}

const MaintenanceCard = memo(function MaintenanceCard({
    item,
    isSelected,
    isSubmitting,
    onToggle,
    onDelete
}: MaintenanceCardProps) {
    const cardClass = `
        bg-[var(--color-surface-card)]
        border-2 rounded-lg p-4 transition-all opacity-70
        ${isSelected
            ? 'border-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/5'
            : 'border-[var(--color-border-default)] hover:border-[var(--color-accent-gold)] hover:shadow-md'
        }
    `;

    return (
        <div className={cardClass} data-testid={`maintenance-card-${item.id}`}>
            {/* Header Row: Checkbox + Title + Actions */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            disabled={isSubmitting}
                            aria-label="Select maintenance block"
                            className={`rounded-md border-2 border-[var(--color-border-subtle)] checked:border-[var(--color-accent-gold)] text-[var(--color-accent-gold)] focus:ring-2 focus:ring-[var(--color-accent-gold)] focus:ring-offset-0 cursor-pointer w-5 h-5 transition-all hover:border-[var(--color-accent-gold)]/60 ${
                                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            checked={isSelected}
                            onChange={() => onToggle(item.id)}
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Wrench size={16} className="text-[var(--color-text-muted)] flex-shrink-0" />
                        <span className="text-[var(--color-text-muted)] italic text-sm">Maintenance Block</span>
                    </div>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                    }}
                    disabled={isSubmitting}
                    className={`p-2 rounded-full text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors flex-shrink-0 ${
                        isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title="Delete Maintenance Block"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            {/* Status Badge */}
            <div className="mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                    🛠️ Blocked
                </span>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3">
                {/* Dates */}
                <div>
                    <div className="text-xs text-[var(--color-text-muted)] mb-0.5">Dates</div>
                    <div className="text-sm text-[var(--color-text-primary)]">
                        {new Date(item.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
                        <span className="text-[var(--color-text-muted)] mx-1">→</span>
                        {new Date(item.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                        {getNights(item.start_date, item.end_date)} days
                    </div>
                </div>

                {/* Campsite */}
                <div>
                    <div className="text-xs text-[var(--color-text-muted)] mb-0.5">Campsite</div>
                    {item.campsite_code ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] font-mono font-medium text-[var(--color-text-muted)] text-xs">
                            {item.campsite_code}
                        </span>
                    ) : (
                        <span className="text-[var(--color-text-muted)] text-xs italic">All sites</span>
                    )}
                </div>

                {/* Reason */}
                <div className="col-span-2">
                    <div className="text-xs text-[var(--color-text-muted)] mb-0.5">Reason</div>
                    <div className="text-sm text-[var(--color-text-muted)]">
                        {item.reason || 'No reason specified'}
                    </div>
                </div>
            </div>
        </div>
    );
});

MaintenanceCard.displayName = 'MaintenanceCard';

export default MaintenanceCard;
