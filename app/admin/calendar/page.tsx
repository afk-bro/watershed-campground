
"use client";

import { useState } from "react";
import Container from "@/components/Container";
import CalendarGrid from "@/components/admin/calendar/CalendarGrid";
import { useCalendarData } from "@/hooks/useCalendarData";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
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
