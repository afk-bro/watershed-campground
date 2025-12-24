
"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { format, parse } from "date-fns";
import Container from "@/components/Container";
import CalendarGrid from "@/components/admin/calendar/CalendarGrid";
import { useCalendarData } from "@/hooks/useCalendarData";

export default function CalendarPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize from URL or today
  const [currentDate, setCurrentDate] = useState(() => {
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    if (month && year) {
        try {
            return parse(`${year}-${month}`, 'yyyy-MM', new Date());
        } catch {
            return new Date();
        }
    }
    return new Date();
  });

  // Keep URL in sync
  useEffect(() => {
     const params = new URLSearchParams(searchParams.toString());
     const m = format(currentDate, 'MM');
     const y = format(currentDate, 'yyyy');
     
     if (params.get('month') !== m || params.get('year') !== y) {
       params.set('month', m);
       params.set('year', y);
       router.replace(`${pathname}?${params.toString()}`, { scroll: false });
     }
  }, [currentDate, pathname, router, searchParams]);

  const { data, isLoading, error, mutate } = useCalendarData(currentDate);

  if (isLoading && !data) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-elevated)] pt-8 pb-12">
        <Container>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-forest"></div>
          </div>
        </Container>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-elevated)] pt-8 pb-12">
        <Container>
          <div className="error-message">
            {error.message || 'Failed to load calendar data'}
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface-elevated)]">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-heading font-bold text-accent-gold">
            Availability Calendar
          </h1>
          <p className="text-[var(--color-text-muted)]">
            Manage your campsite bookings at a glance
          </p>
        </div>

        <CalendarGrid
          campsites={data?.campsites || []}
          reservations={data?.reservations || []}
          date={currentDate}
          onDateChange={setCurrentDate}
          blackoutDates={data?.blackoutDates || []}
          onDataMutate={mutate}
        />
      </div>
    </div>
  );
}
