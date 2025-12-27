import { Wrench, AlertTriangle, Search, MoreHorizontal } from "lucide-react";
import { type OverviewItem, type Reservation, type ReservationStatus } from "@/lib/supabase";
import { getNights } from "@/lib/admin/reservations/listing";
import StatusPill from "@/components/admin/StatusPill";
import RowActions from "@/components/admin/RowActions";
import SkeletonLoader from "@/components/admin/shared/ui/SkeletonLoader";

interface ReservationsTableProps {
    items: OverviewItem[];
    loading?: boolean;
    selectedIds: Set<string>;
    selectAllState: 'none' | 'some' | 'all';
    onToggleSelection: (id: string, type: 'reservation' | 'maintenance' | 'blackout') => void;
    onToggleAll: () => void;
    onSelectReservation: (reservation: Reservation) => void;
    onAssignClick: (reservation: Reservation, e: React.MouseEvent) => void;
    updateStatus: (id: string, status: ReservationStatus) => Promise<void>;
    onClearFilters: () => void;
}

export default function ReservationsTable({
    items,
    loading,
    selectedIds,
    selectAllState,
    onToggleSelection,
    onToggleAll,
    onSelectReservation,
    onAssignClick,
    updateStatus,
    onClearFilters,
}: ReservationsTableProps) {
    if (loading) {
        return <SkeletonLoader rows={6} variant="table-row" />;
    }

    if (items.length === 0) {
        return (
            <div className="bg-[var(--color-surface-card)] rounded-xl border border-[var(--color-border-subtle)] border-dashed p-12 text-center">
                <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Search className="text-gray-400" size={20} />
                </div>
                <h3 className="text-lg font-medium text-[var(--color-text-primary)]">No reservations match these filters</h3>
                <p className="text-[var(--color-text-muted)] mt-1 mb-6">Try adjusting your search or filters.</p>
                <button 
                    onClick={onClearFilters}
                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-[var(--color-border-subtle)] rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                >
                    Clear filters
                </button>
            </div>
        );
    }

    return (
        <div className="bg-[var(--color-surface-card)] dark:bg-white/5 rounded-xl border border-[var(--color-border-subtle)] dark:border-white/10 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
                    <colgroup>
                        {/* Checkbox */}
                        <col className="w-10" />
                        {/* Guest */}
                        <col className="w-[260px]" />
                        {/* Dates */}
                        <col className="w-[180px]" />
                        {/* Details */}
                        <col />
                        {/* Campsite */}
                        <col className="w-[130px]" />
                        {/* Status */}
                        <col className="w-[150px]" />
                        {/* Actions */}
                        <col className="w-[100px]" />
                    </colgroup>
                    <thead className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-default)] text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                        <tr>
                            <th className="px-3 pl-4 py-3 text-left font-medium text-gray-500">
                                <input
                                    type="checkbox"
                                    className="rounded-md border-2 border-[var(--color-border-subtle)] checked:border-[var(--color-accent-gold)] text-[var(--color-accent-gold)] focus:ring-2 focus:ring-[var(--color-accent-gold)] focus:ring-offset-0 cursor-pointer w-5 h-5 transition-all hover:border-[var(--color-accent-gold)]/60"
                                    checked={selectAllState === 'all'}
                                    ref={input => { if (input) input.indeterminate = selectAllState === 'some'; }}
                                    onChange={onToggleAll}
                                />
                            </th>
                            <th className="px-5 py-3">Guest</th>
                            <th className="px-5 py-3 whitespace-nowrap">Dates</th>
                            <th className="px-5 py-3">Details</th>
                            <th className="px-5 py-3 text-center">Campsite</th>
                            <th className="px-5 py-3 text-right">Status</th>
                            <th className="px-5 py-3 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border-subtle)] text-sm">
                        {items.map((item, index) => {
                            // Handle blocking events (maintenance/blackout)
                            if (item.type === 'maintenance' || item.type === 'blackout') {
                                return (
                                    <tr
                                        key={item.id}
                                        className="group transition-colors bg-stripes-gray hover:bg-[var(--color-surface-elevated)]"
                                    >
                                        <td className="px-3 pl-4 py-4 align-middle" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center min-h-[28px]">
                                                <input
                                                    type="checkbox"
                                                    disabled
                                                    className="rounded-md border-gray-300 opacity-20 cursor-not-allowed w-5 h-5"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 align-top" colSpan={2}>
                                            <div className="flex items-center gap-2 text-[var(--color-text-muted)] italic">
                                                <Wrench size={16} />
                                                <span>Maintenance Block</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 align-top text-[var(--color-text-muted)]">
                                             {item.reason}
                                        </td>
                                        <td className="px-5 py-4 align-middle" colSpan={3}>
                                            <div className="flex items-center justify-center">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700">
                                                    Blocked
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }

                            // Regular Reservation
                            if (item.type !== 'reservation') return null;
                            const reservation = item as unknown as Reservation;
                            const isSelected = selectedIds.has(reservation.id!);
                            const isEven = index % 2 === 0;

                            const rowClass = `group transition-colors cursor-pointer border-l-2 ${
                                isSelected
                                    ? 'border-l-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/5'
                                    : `border-l-transparent ${isEven ? 'bg-white dark:bg-transparent' : 'bg-gray-50/50 dark:bg-white/5'} hover:bg-gray-50 dark:hover:bg-white/5`
                            }`;

                            return (
                                <tr
                                    key={reservation.id}
                                    className={rowClass}
                                    onClick={() => onSelectReservation(reservation)}
                                >
                                    <td className="px-3 pl-4 py-4 align-middle" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center min-h-[28px]">
                                            <input
                                                type="checkbox"
                                                className="rounded-md border-2 border-[var(--color-border-subtle)] checked:border-[var(--color-accent-gold)] text-[var(--color-accent-gold)] focus:ring-2 focus:ring-[var(--color-accent-gold)] focus:ring-offset-0 cursor-pointer w-5 h-5 transition-all hover:border-[var(--color-accent-gold)]/60"
                                                checked={isSelected}
                                                onChange={() => onToggleSelection(reservation.id!, 'reservation')}
                                            />
                                        </div>
                                    </td>

                                    <td className="px-5 py-4 align-top">
                                        <div className="font-bold text-[var(--color-text-primary)] text-base truncate max-w-[240px]">
                                            {reservation.first_name} {reservation.last_name}
                                        </div>
                                        <div className="text-[var(--color-text-muted)] text-xs mt-0.5 truncate max-w-[240px] opacity-80">
                                            {[reservation.email, reservation.phone].filter(Boolean).join(" • ")}
                                        </div>
                                    </td>

                                    <td className="px-5 py-4 align-top whitespace-nowrap">
                                        <div className="text-[var(--color-text-primary)] font-medium">
                                            {new Date(reservation.check_in).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
                                            <span className="text-[var(--color-text-muted)] mx-2">→</span>
                                            {new Date(reservation.check_out).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
                                        </div>
                                        <div className="text-xs text-[var(--color-text-muted)] mt-0.5 font-medium opacity-70">
                                            {getNights(reservation.check_in, reservation.check_out)} nights
                                        </div>
                                    </td>

                                    <td className="px-5 py-4 align-top">
                                        <div className="flex flex-col gap-1 opacity-70">
                                             <div className="flex items-center gap-1.5 text-[var(--color-text-primary)] text-sm">
                                                <span className="text-[var(--color-text-muted)]">
                                                     {reservation.camping_unit?.includes('Tent') ? '⛺' : '🚐'}
                                                </span>
                                                <span className="truncate">{reservation.camping_unit}</span>
                                            </div>
                                            <div className="text-xs text-[var(--color-text-muted)] flex gap-2">
                                                <span>👥 {reservation.adults} Adults, {reservation.children} Kids</span>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-5 py-4 align-middle">
                                        <div className="flex items-center justify-center min-h-[28px]">
                                            {reservation.campsites ? (
                                                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 font-mono font-bold text-gray-700 dark:text-gray-200 text-xs h-7 min-w-[60px] shadow-sm">
                                                    {reservation.campsites.code}
                                                </span>
                                            ) : (
                                                <button
                                                    className="flex items-center gap-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 dark:text-amber-400 px-2.5 py-1 rounded font-bold text-xs transition-colors group/unassigned border border-amber-200/50 dark:border-amber-800/50 h-7"
                                                    onClick={(e) => onAssignClick(reservation, e)}
                                                >
                                                    <AlertTriangle size={14} className="stroke-[2.5]" />
                                                    <span className="uppercase tracking-wide translate-y-[0.5px]">Assign</span>
                                                </button>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-5 py-4 align-middle">
                                        <div className="flex items-center justify-end min-h-[28px]">
                                            <StatusPill status={reservation.status} />
                                        </div>
                                    </td>

                                    <td className="px-5 py-4 align-middle text-right">
                                        <div className="flex items-center justify-end min-h-[28px] opacity-0 group-hover:opacity-100 transition-opacity">
                                            <RowActions
                                                reservation={reservation}
                                                updateStatus={updateStatus}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
