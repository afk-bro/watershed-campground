
"use client";

import { useEffect, useState } from "react";
import Container from "@/components/Container";
import CalendarGrid from "@/components/admin/calendar/CalendarGrid";
import { Campsite, Reservation, BlackoutDate } from "@/lib/supabase";
import { format } from "date-fns";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [campsites, setCampsites] = useState<Campsite[]>([]);
  const [blackoutDates, setBlackoutDates] = useState<BlackoutDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData(currentDate);
  }, [currentDate]);

  async function fetchData(date: Date) {
    try {
      setLoading(true);
      const monthStr = format(date, "yyyy-MM");
      const response = await fetch(`/api/admin/calendar?month=${monthStr}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch calendar data");
      }

      const { reservations, campsites, blackoutDates } = await response.json();
      setReservations(reservations);
      setCampsites(campsites);
      setBlackoutDates(blackoutDates || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load calendar data");
    } finally {
      setLoading(false);
    }
  }

  if (loading && campsites.length === 0) {
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
            {error}
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-[var(--color-surface-elevated)]">
      <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-hidden flex flex-col">
        <div className="mb-6">
          <h1 className="text-3xl font-heading font-bold text-brand-forest">
            Availability Calendar
          </h1>
          <p className="text-[var(--color-text-muted)]">
            Manage your campsite bookings at a glance
          </p>
        </div>

        <div className="flex-1 min-h-0">
          <CalendarGrid
            campsites={campsites}
            reservations={reservations}
            date={currentDate}
            onDateChange={setCurrentDate}
            blackoutDates={blackoutDates}
          />
        </div>
      </div>
    </div>
  );
}
