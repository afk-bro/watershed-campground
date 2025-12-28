import type { CampsiteType } from "@/lib/supabase";

interface CampsitesToolbarProps {
  filter: CampsiteType | 'all' | 'active' | 'inactive';
  onFilterChange: (filter: CampsiteType | 'all' | 'active' | 'inactive') => void;
  totalCount: number;
  activeCampsites: number;
  inactiveCampsites: number;
  typeCounts: Record<CampsiteType, number>;
}

export default function CampsitesToolbar({
  filter,
  onFilterChange,
  totalCount,
  activeCampsites,
  inactiveCampsites,
  typeCounts,
}: CampsitesToolbarProps) {
  const filterButtonClass = (isActive: boolean) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-surface ${
      isActive
        ? 'bg-brand-forest text-accent-beige'
        : 'bg-[var(--color-surface-card)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)]'
    }`;

  return (
    <div className="mb-6 flex flex-wrap gap-2 items-center">
      <button
        onClick={() => onFilterChange('all')}
        className={filterButtonClass(filter === 'all')}
      >
        All ({totalCount})
      </button>
      <button
        onClick={() => onFilterChange('active')}
        className={filterButtonClass(filter === 'active')}
      >
        Active ({activeCampsites})
      </button>
      <button
        onClick={() => onFilterChange('inactive')}
        className={filterButtonClass(filter === 'inactive')}
      >
        Inactive ({inactiveCampsites})
      </button>
      <div className="h-6 w-px bg-[var(--color-border-strong)] mx-2"></div>
      {(['rv', 'tent', 'cabin'] as CampsiteType[]).map((type) => (
        <button
          key={type}
          onClick={() => onFilterChange(type)}
          className={filterButtonClass(filter === type)}
        >
          {type} ({typeCounts[type] || 0})
        </button>
      ))}
      <div className="h-6 w-px bg-[var(--color-border-strong)] mx-2"></div>
      <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)] opacity-60">
        <span className="font-medium">Admin View:</span> All status visible
      </label>
    </div>
  );
}
