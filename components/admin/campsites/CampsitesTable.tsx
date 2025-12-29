import Link from "next/link";
import { Info, Plus, CheckSquare, Square } from "lucide-react";
import type { Campsite } from "@/lib/supabase";
import CampsiteRow from "./CampsiteRow";

interface CampsitesTableProps {
  campsites: Campsite[];
  selectedIds: Set<string>;
  isDeleting: string | null;
  showBulkSelect: boolean;
  onToggleSelection: (id: string) => void;
  onToggleAllSelection: () => void;
  onToggleActive: (id: string, code: string, currentStatus: boolean) => void;
  onDelete: (id: string, code: string) => void;
  onUploadImage: (id: string) => void;
  onRemoveImage: (id: string) => void;
}

export default function CampsitesTable({
  campsites,
  selectedIds,
  isDeleting,
  showBulkSelect,
  onToggleSelection,
  onToggleAllSelection,
  onToggleActive,
  onDelete,
  onUploadImage,
  onRemoveImage,
}: CampsitesTableProps) {
  return (
    <div className="admin-table">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-default)]">
            <tr>
              {showBulkSelect && (
                <th className="px-4 py-3 text-left w-10">
                  <button
                    onClick={onToggleAllSelection}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-gold)]"
                  >
                    {selectedIds.size === campsites.length ? (
                      <CheckSquare size={16} />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
              )}
              <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider opacity-70 w-16">
                Image
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider opacity-70 w-24">
                Code
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider opacity-70">
                Name
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider opacity-70 w-28">
                Type
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider opacity-70 w-28">
                Max Guests
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider opacity-70 w-28">
                Base Rate
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider opacity-70 w-32">
                Status
              </th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider opacity-70">
                Controls
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-subtle)]">
            {campsites.length === 0 ? (
              <tr>
                <td
                  colSpan={showBulkSelect ? 9 : 8}
                  className="px-4 py-20 text-center"
                >
                  <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
                    <div className="w-16 h-16 bg-[var(--color-surface-elevated)] rounded-full flex items-center justify-center border-2 border-dashed border-[var(--color-border-strong)]">
                      <Info
                        className="text-[var(--color-text-muted)]"
                        size={32}
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-heading font-bold text-[var(--color-text-primary)] mb-1">
                        No campsites yet
                      </h3>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        Start by adding your first site to the system. You can
                        always pause or edit details later.
                      </p>
                    </div>
                    <Link
                      href="/admin/campsites/new"
                      className="mt-2 flex items-center gap-2 bg-[var(--color-accent-gold)] text-[var(--color-brand-forest)] px-6 py-2.5 rounded-lg font-bold uppercase tracking-wider text-xs hover:bg-opacity-90 transition-all shadow-md group"
                    >
                      <Plus
                        size={16}
                        className="group-hover:rotate-90 transition-transform"
                      />
                      Add First Campsite
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              campsites.map((campsite) => (
                <CampsiteRow
                  key={campsite.id}
                  campsite={campsite}
                  isSelected={selectedIds.has(campsite.id)}
                  isDeleting={isDeleting === campsite.id}
                  showBulkSelect={showBulkSelect}
                  onToggleSelection={onToggleSelection}
                  onToggleActive={onToggleActive}
                  onDelete={onDelete}
                  onUploadImage={onUploadImage}
                  onRemoveImage={onRemoveImage}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
