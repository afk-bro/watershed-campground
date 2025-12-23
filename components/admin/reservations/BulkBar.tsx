import { LogIn, LogOut, Ban, Archive, RotateCcw, UserPlus } from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";

type BulkBarProps = {
    selectedCount: number;
    showArchived: boolean;
    onCheckIn: () => void;
    onCheckOut: () => void;
    onCancel: () => void;
    onAssign: () => void;
    onArchive: () => void;
    onRestore: () => void;
    onClearSelection: () => void;
};

export default function BulkBar({
    selectedCount,
    showArchived,
    onCheckIn,
    onCheckOut,
    onCancel,
    onAssign,
    onArchive,
    onRestore,
    onClearSelection,
}: BulkBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="w-fit mx-auto bg-[var(--color-surface-elevated)] dark:bg-gray-800/90 backdrop-blur-md border border-[var(--color-accent-gold)]/30 shadow-2xl rounded-full pl-6 pr-4 py-3 flex items-center gap-4 animate-in slide-in-from-top-2 fade-in duration-300 ring-1 ring-black/5">
            <div className="flex items-center gap-3">
                <span className="bg-[var(--color-accent-gold)] text-[var(--color-background)] w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                    {selectedCount}
                </span>
                <span className="font-medium text-[var(--color-text-primary)] text-sm hidden sm:inline">Selected</span>
            </div>
            
            <div className="h-5 w-px bg-[var(--color-border-default)]" />
            
            <div className="flex items-center gap-1">
                <Tooltip content="Check In" side="bottom">
                    <button 
                        onClick={onCheckIn}
                        className="p-2 hover:bg-[var(--color-surface-card)] rounded-lg text-[var(--color-text-primary)] transition-colors"
                    >
                        <LogIn size={18} />
                    </button>
                </Tooltip>
                <Tooltip content="Check Out" side="bottom">
                    <button 
                        onClick={onCheckOut}
                        className="p-2 hover:bg-[var(--color-surface-card)] rounded-lg text-[var(--color-text-primary)] transition-colors"
                    >
                        <LogOut size={18} />
                    </button>
                </Tooltip>
            </div>

            <div className="h-5 w-px bg-[var(--color-border-default)]" />
            
            {!showArchived ? (
                 <div className="flex items-center gap-1">
                    <Tooltip content="Auto-Assign" side="bottom">
                        <button 
                            onClick={onAssign}
                            className="p-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg transition-colors"
                        >
                            <UserPlus size={18} />
                        </button>
                    </Tooltip>
                    <Tooltip content="Archive" side="bottom">
                        <button 
                            onClick={onArchive}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg transition-colors"
                        >
                            <Archive size={18} />
                        </button>
                    </Tooltip>
                </div>
            ) : (
                <Tooltip content="Restore" side="bottom">
                    <button 
                        onClick={onRestore}
                        className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg transition-colors"
                    >
                        <RotateCcw size={18} />
                    </button>
                </Tooltip>
            )}

            <div className="h-5 w-px bg-[var(--color-border-default)]" />

            <Tooltip content="Cancel Reservation" side="bottom">
                <button 
                    onClick={onCancel}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                >
                    <Ban size={18} />
                </button>
            </Tooltip>

            <div className="h-5 w-px bg-[var(--color-border-default)]" />

            <button 
                onClick={onClearSelection}
                className="ml-2 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors uppercase tracking-wide"
            >
                Clear
            </button>
        </div>
    );
}
