"use client";

import { Wrench, Trash2 } from "lucide-react";
import { getNights } from "@/lib/admin/reservations/listing";
import type { OverviewItem, BlockingEventOverviewItem } from "@/lib/supabase";

interface MaintenanceRowProps {
    item: BlockingEventOverviewItem;
    isSelected: boolean;
    isSubmitting: boolean;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
}

export default function MaintenanceRow({
    item,
    isSelected,
    isSubmitting,
    onToggle,
    onDelete
}: MaintenanceRowProps) {
    const rowClass = `group transition-colors cursor-pointer border-l-2 opacity-70 ${
        isSelected
            ? 'border-l-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/5'
            : 'border-l-transparent hover:bg-[var(--color-surface-elevated)]'
    }`;

    return (
        <tr className={rowClass}>
            <td className="px-3 pl-4 py-4 w-10 align-middle" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center min-h-[28px]">
                    <input
                        type="checkbox"
                        disabled={isSubmitting}
                        className={`rounded-md border-2 border-[var(--color-border-subtle)] checked:border-[var(--color-accent-gold)] text-[var(--color-accent-gold)] focus:ring-2 focus:ring-[var(--color-accent-gold)] focus:ring-offset-0 cursor-pointer w-5 h-5 transition-all hover:border-[var(--color-accent-gold)]/60 ${
                            isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        checked={isSelected}
                        onChange={() => onToggle(item.id)}
                    />
                </div>
            </td>

            <td className="px-5 py-4 align-top border-l border-[var(--color-border-default)]/20">
                <div className="flex items-center gap-2">
                    <Wrench size={16} className="text-[var(--color-text-muted)]" />
                    <span className="text-[var(--color-text-muted)] italic">Maintenance Block</span>
                </div>
            </td>

            <td className="px-5 py-4 align-top whitespace-nowrap border-l border-[var(--color-border-default)]/20">
                <div className="text-[var(--color-text-primary)]">
                    {new Date(item.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
                    <span className="text-[var(--color-text-muted)] mx-2">→</span>
                    {new Date(item.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
                </div>
                <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {getNights(item.start_date, item.end_date)} days
                </div>
            </td>

            <td className="px-5 py-4 align-top min-w-0 border-l border-[var(--color-border-default)]/20">
                <div
                    className="text-[var(--color-text-muted)] text-sm truncate max-w-[240px]"
                    title={item.reason || 'No reason specified'}
                >
                    {item.reason || 'No reason specified'}
                </div>
            </td>

            <td className="px-5 py-4 align-middle text-center border-l border-[var(--color-border-default)]/20">
                <div className="inline-flex justify-center items-center min-h-[28px]">
                    {item.campsite_code ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] font-mono font-medium text-[var(--color-text-muted)] text-xs h-7">
                            {item.campsite_code}
                        </span>
                    ) : (
                        <span className="text-[var(--color-text-muted)] text-xs italic">All sites</span>
                    )}
                </div>
            </td>

            <td className="px-5 py-4 align-middle text-center border-l border-[var(--color-border-default)]/20">
                <div className="inline-flex justify-center items-center min-h-[28px]">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                        🛠️ Blocked
                    </span>
                </div>
            </td>

            <td className="px-5 py-4 align-middle text-center border-l border-[var(--color-border-default)]/20">
                <div className="inline-flex items-center justify-center gap-2 min-h-[28px]">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(item.id);
                        }}
                        disabled={isSubmitting}
                        className={`p-2 rounded-full text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors ${
                            isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title="Delete Maintenance Block"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </td>
        </tr>
    );
}
