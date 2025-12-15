"use client";

import { useEffect, useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { DayStatus } from "@/lib/availability/engine";

interface DateStepProps {
    checkIn: string | null;
    checkOut: string | null;
    onSelectRange: (start: string, end: string) => void;
}

export default function DateStep({ checkIn, checkOut, onSelectRange }: DateStepProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [availability, setAvailability] = useState<DayStatus[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Internal selection state for the drag/click interaction
    const [selectionStart, setSelectionStart] = useState<string | null>(checkIn);
    const [selectionEnd, setSelectionEnd] = useState<string | null>(checkOut);

    useEffect(() => {
        fetchAvailability();
    }, [currentMonth]);

    const fetchAvailability = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/availability/calendar?month=${format(currentMonth, 'yyyy-MM')}`);
            if (res.ok) {
                const data = await res.json();
                setAvailability(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDayClick = (dateStr: string, status: string) => {
        if (status === 'sold-out' || status === 'blackout') return;

        // Reset if we already have a range or if clicking before start
        if (!selectionStart || (selectionStart && selectionEnd) || (selectionStart && dateStr < selectionStart)) {
            setSelectionStart(dateStr);
            setSelectionEnd(null);
        } else {
            // Completing the range
            setSelectionEnd(dateStr);
            onSelectRange(selectionStart, dateStr);
        }
    };

    // Render Logic
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Pad empty days at start
    const startPadding = Array(monthStart.getDay()).fill(null);

    const getDayStatus = (dateStr: string) => {
        return availability.find(a => a.date === dateStr)?.status || 'loading';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-[var(--color-accent-gold)]">When would you like to stay?</h2>
                <p className="text-[var(--color-text-beige)]/70">Select your check-in and check-out dates.</p>
            </div>

            {/* Helper Legend */}
            <div className="flex justify-center gap-4 text-xs text-[var(--color-text-muted)] mb-4">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-[var(--color-brand-forest-light)]/20 border border-[var(--color-brand-forest-light)]"></div>
                    <span>Available</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500/10 border border-red-500/30 diagonal-stripes"></div>
                    <span>Sold Out</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-[var(--color-accent-gold)]"></div>
                    <span>Selected</span>
                </div>
            </div>

            <div className="bg-[var(--color-surface-elevated)] rounded-xl border border-[var(--color-border-subtle)] p-6 max-w-md mx-auto shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-[var(--color-surface-hover)] rounded-full">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="font-bold text-lg text-[var(--color-text-primary)]">
                        {format(currentMonth, 'MMMM yyyy')}
                    </span>
                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-[var(--color-surface-hover)] rounded-full">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                    <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {startPadding.map((_, i) => <div key={`pad-${i}`} />)}
                    {days.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const status = loading ? 'loading' : getDayStatus(dateStr);
                        const isBlocked = status === 'sold-out' || status === 'blackout';
                        const isSelected = (selectionStart === dateStr) || (selectionEnd === dateStr) || 
                                           (selectionStart && selectionEnd && dateStr > selectionStart && dateStr < selectionEnd);

                        return (
                            <button
                                key={dateStr}
                                onClick={() => handleDayClick(dateStr, status)}
                                disabled={isBlocked || loading}
                                className={`
                                    h-10 w-full rounded-md flex items-center justify-center text-sm font-medium transition-all relative
                                    ${isBlocked ? 'text-[var(--color-text-muted)] opacity-50 cursor-not-allowed bg-[var(--color-surface-primary)]/50' : 'hover:bg-[var(--color-brand-forest-light)]/20 text-[var(--color-text-primary)]'}
                                    ${status === 'blackout' ? 'diagonal-stripes' : ''}
                                    ${isSelected ? '!bg-[var(--color-accent-gold)] !text-[var(--color-brand-forest)] shadow-md z-10' : ''}
                                    ${isBlocked && !isSelected ? 'line-through decoration-red-500/50' : ''}
                                `}
                            >
                                {format(day, 'd')}
                                {status === 'limited' && !isBlocked && !isSelected && (
                                    <div className="absolute bottom-1 w-1 h-1 rounded-full bg-orange-500"></div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
            
            {selectionStart && selectionEnd && (
                <div className="text-center pt-4">
                     <p className="text-[var(--color-accent-gold)] font-medium mb-4">
                        {format(parseISO(selectionStart), 'MMM d')} — {format(parseISO(selectionEnd), 'MMM d, yyyy')}
                     </p>
                </div>
            )}
        </div>
    );
}
