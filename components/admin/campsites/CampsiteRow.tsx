import Link from "next/link";
import { Edit2, Power, PowerOff, Trash2, Camera, X, CheckSquare, Square } from "lucide-react";
import type { Campsite } from "@/lib/supabase";

interface CampsiteRowProps {
  campsite: Campsite;
  isSelected: boolean;
  isDeleting: boolean;
  showBulkSelect: boolean;
  onToggleSelection: (id: string) => void;
  onToggleActive: (id: string, code: string, currentStatus: boolean) => void;
  onDelete: (id: string, code: string) => void;
  onUploadImage: (id: string) => void;
  onRemoveImage: (id: string) => void;
}

export default function CampsiteRow({
  campsite,
  isSelected,
  isDeleting,
  showBulkSelect,
  onToggleSelection,
  onToggleActive,
  onDelete,
  onUploadImage,
  onRemoveImage,
}: CampsiteRowProps) {
  return (
    <tr
      className={`hover:bg-[var(--color-surface-elevated)] hover:shadow-sm transition-all duration-150 group cursor-pointer border-l-2 hover:border-l-[var(--color-accent-gold)] ${
        isSelected
          ? 'bg-[var(--color-surface-elevated)] border-l-[var(--color-accent-gold)]'
          : 'border-transparent'
      }`}
    >
      {showBulkSelect && (
        <td
          className="px-4 py-3"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelection(campsite.id);
          }}
        >
          <button
            className={`${
              isSelected
                ? 'text-[var(--color-accent-gold)]'
                : 'text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100'
            } transition-all`}
          >
            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
          </button>
        </td>
      )}
      <td
        className="px-4 py-3"
        onClick={() =>
          (window.location.href = `/admin/campsites/${campsite.id}/edit`)
        }
      >
        <div className="relative w-12 h-12 group/thumb">
          {campsite.image_url ? (
            <>
              <img
                src={campsite.image_url}
                alt={campsite.name}
                className="w-full h-full object-cover rounded-lg ring-2 ring-transparent group-hover/thumb:ring-[var(--color-accent-gold)] transition-all cursor-pointer shadow-sm shadow-black/20"
                onClick={() => onUploadImage(campsite.id)}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveImage(campsite.id);
                }}
                className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover/thumb:opacity-100 transition-opacity hover:bg-red-600 shadow-md z-10"
                title="Remove image"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          ) : (
            <div
              className="w-full h-full bg-[var(--color-surface-elevated)] rounded-lg flex items-center justify-center ring-2 ring-transparent group-hover/thumb:ring-[var(--color-accent-gold)] transition-all cursor-pointer hover:bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)]"
              onClick={() => onUploadImage(campsite.id)}
              title="Upload image"
            >
              <div className="flex flex-col items-center gap-0.5 opacity-60 group-hover/thumb:opacity-100">
                <Camera className="w-4 h-4 text-[var(--color-text-muted)]" />
                <span className="text-[8px] font-bold uppercase tracking-tighter text-[var(--color-text-muted)]">
                  Add
                </span>
              </div>
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-[var(--color-text-primary)]">
          {campsite.code}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
        {campsite.name}
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] border border-[var(--color-border-strong)] shadow-sm">
          {campsite.type}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
        {campsite.max_guests}
      </td>
      <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
        ${campsite.base_rate.toFixed(2)}
      </td>
      <td className="px-4 py-3">
        {campsite.is_active ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white shadow-sm shadow-emerald-900/20">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M5 13l4 4L19 7"
              />
            </svg>
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-[var(--color-border-strong)] text-[var(--color-text-muted)]">
            <PowerOff className="w-3 h-3" />
            Inactive
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-1.5">
          <Link
            href={`/admin/campsites/${campsite.id}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-brand-forest)] bg-[var(--color-accent-gold)] hover:bg-[var(--color-accent-gold-dark)] rounded-lg transition-all duration-150 shadow-sm"
            title="Edit campsite"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Edit</span>
          </Link>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive(campsite.id, campsite.code, campsite.is_active);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border rounded-lg transition-all duration-150 shadow-sm ${
              campsite.is_active
                ? 'text-orange-600 border-orange-200 bg-orange-50/50 hover:bg-orange-100'
                : 'text-emerald-600 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100'
            }`}
            title={campsite.is_active ? 'Pause campsite' : 'Start campsite'}
          >
            {campsite.is_active ? (
              <>
                <PowerOff className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Pause</span>
              </>
            ) : (
              <>
                <Power className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Start</span>
              </>
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(campsite.id, campsite.code);
            }}
            disabled={isDeleting}
            className="group/delete p-2 text-red-500/60 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all duration-150 disabled:opacity-50"
            title="Delete campsite permanently"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
