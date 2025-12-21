export default function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-6 p-4 border-t border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-xs text-[var(--color-text-muted)]">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded bg-[var(--color-status-active)] border border-[var(--color-status-active-border)]"></span>
        <span>Confirmed Reservation</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded bg-[var(--color-status-pending)] border border-[var(--color-status-pending-border)]"></span>
        <span>Pending Payment</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-text-muted)] pattern-diagonal-lines opacity-50"></span>
        <span>Blackout / Maintenance</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded bg-[var(--color-status-active)]/15 border border-[var(--color-status-active)]"></span>
        <span>Today</span>
      </div>
    </div>
  );
}
