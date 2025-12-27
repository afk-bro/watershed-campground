"use client";

import { CalendarView } from './hooks/useCalendarMode';
import { Calendar, List, Columns3 } from 'lucide-react';

interface CalendarViewToggleProps {
  currentView: CalendarView;
  onViewChange: (view: CalendarView) => void;
  className?: string;
}

const viewConfig = {
  agenda: {
    icon: List,
    label: 'Agenda',
    description: 'List view',
  },
  weekGrid: {
    icon: Columns3,
    label: 'Week',
    description: 'Week grid',
  },
  fullGrid: {
    icon: Calendar,
    label: 'Month',
    description: 'Full grid',
  },
} as const;

export default function CalendarViewToggle({
  currentView,
  onViewChange,
  className = '',
}: CalendarViewToggleProps) {
  return (
    <div className={`flex items-center gap-1 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-lg p-1 ${className}`}>
      {(Object.keys(viewConfig) as CalendarView[]).map((view) => {
        const config = viewConfig[view];
        const Icon = config.icon;
        const isActive = currentView === view;

        return (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded transition-all
              ${isActive
                ? 'bg-[var(--color-accent-gold)] text-[var(--color-brand-forest)] font-medium'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
              }
            `}
            title={config.description}
            aria-label={`Switch to ${config.label} view`}
            aria-pressed={isActive}
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}
