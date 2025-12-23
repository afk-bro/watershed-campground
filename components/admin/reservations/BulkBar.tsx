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
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-full px-6 py-3 flex items-center gap-6 z-40 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="flex items-center gap-3">
                <span className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                    {selectedCount}
                </span>
                <span className="font-medium text-gray-700 dark:text-gray-200">Selected</span>
            </div>
            
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
            
            <div className="flex items-center gap-2">
                <button 
                     onClick={onCheckIn}
                     className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors text-gray-700 dark:text-gray-200"
                >
                    Check In
                </button>
                <button 
                     onClick={onCheckOut}
                     className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors text-gray-700 dark:text-gray-200"
                >
                    Check Out
                </button>
            </div>

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
            
            {!showArchived ? (
                 <>
                    <button 
                        onClick={onAssign}
                        className="px-3 py-1.5 hover:bg-amber-50 text-amber-600 rounded-lg text-sm font-medium transition-colors"
                    >
                        Auto-Assign
                    </button>
                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
                    <button 
                        onClick={onArchive}
                        className="px-3 py-1.5 hover:bg-gray-100 text-gray-600 rounded-lg text-sm font-medium transition-colors"
                    >
                        Archive
                    </button>
                </>
            ) : (
                <button 
                    onClick={onRestore}
                    className="px-3 py-1.5 hover:bg-green-50 text-green-600 rounded-lg text-sm font-medium transition-colors"
                >
                    Restore
                </button>
            )}

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

            <button 
                onClick={onCancel}
                 className="px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium transition-colors"
            >
                Cancel
            </button>

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

            <button 
                onClick={onClearSelection}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
                ×
            </button>
        </div>
    );
}
