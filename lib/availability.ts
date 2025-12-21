import { supabaseAdmin } from "./supabase-admin";
import type { Campsite } from "./supabase";

// ============================================
// Types
// ============================================

export type AvailabilityRequest = {
  checkIn: string;  // ISO date string (YYYY-MM-DD)
  checkOut: string; // ISO date string (YYYY-MM-DD)
  guestCount: number;
  campsiteId?: string;
};

export type AvailabilityResult = {
  available: boolean;
  availableSites: Campsite[];
  recommendedSiteId: string | null;
  message?: string; // Optional message for errors or info
};

// ============================================
// Validation
// ============================================

export class AvailabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AvailabilityError";
  }
}

export function validateAvailabilityRequest(params: AvailabilityRequest): void {
  const { checkIn, checkOut, guestCount } = params;

  // Parse dates
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  // Check for invalid dates
  if (isNaN(checkInDate.getTime())) {
    throw new AvailabilityError("Invalid check-in date");
  }
  if (isNaN(checkOutDate.getTime())) {
    throw new AvailabilityError("Invalid check-out date");
  }

  // Check-out must be after check-in
  if (checkOutDate <= checkInDate) {
    throw new AvailabilityError("Check-out date must be after check-in date");
  }

  // Cannot book dates in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  checkInDate.setHours(0, 0, 0, 0);

  if (checkInDate < today) {
    throw new AvailabilityError("Check-in date cannot be in the past");
  }

  // Maximum stay validation (21 nights)
  const nights = Math.ceil(
    (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (nights > 21) {
    throw new AvailabilityError("Maximum stay is 21 nights");
  }

  // Guest count validation
  if (guestCount < 1) {
    throw new AvailabilityError("At least 1 guest is required");
  }

  if (guestCount > 50) {
    throw new AvailabilityError("Guest count exceeds reasonable maximum");
  }
}

// ============================================
// Availability Check (Core Logic)
// ============================================

export async function checkAvailability(
  params: AvailabilityRequest
): Promise<AvailabilityResult> {
  // Step 1: Validate inputs
  try {
    validateAvailabilityRequest(params);
  } catch (error) {
    if (error instanceof AvailabilityError) {
      return {
        available: false,
        availableSites: [],
        recommendedSiteId: null,
        message: error.message,
      };
    }
    throw error;
  }

  const { checkIn, checkOut, guestCount } = params;

  // Step 2: Find all reservations that conflict with the requested dates
  // A reservation conflicts if it overlaps with the requested date range
  // Overlap occurs when: NOT (existing.check_out <= new.check_in OR existing.check_in >= new.check_out)

  const { data: conflictingReservations, error: reservationsError } =
    await supabaseAdmin
      .from("reservations")
      .select("campsite_id")
      .in("status", ["pending", "confirmed", "checked_in"])
      .not("campsite_id", "is", null) // Only consider reservations with assigned campsites
      .or(
        `and(check_out.gt.${checkIn},check_in.lt.${checkOut})`
      );

  if (reservationsError) {
    console.error("Error fetching conflicting reservations:", reservationsError);
    throw new Error("Failed to check availability");
  }

  // Get the IDs of campsites that are booked
  const bookedCampsiteIds = new Set(
    conflictingReservations
      .map((r) => r.campsite_id)
      .filter((id): id is string => id !== null)
  );

  // Step 2.5: Check for Blackout Dates
  // Logic: Block sites if they overlap with a blackout period
  // If blackout.campsite_id is NULL, it blocks ALL sites.
  // If blackout.campsite_id is set, it blocks ONLY that site.
  // Uses same overlap logic as reservations: end_date > checkIn AND start_date < checkOut

  const { data: blackoutDates, error: blackoutError} = await supabaseAdmin
    .from('blackout_dates')
    .select('campsite_id')
    .or(`and(end_date.gt.${checkIn},start_date.lt.${checkOut})`);

  if (blackoutError) {
    console.error("Error fetching blackout dates:", blackoutError);
    throw new Error("Failed to check availability (Blackout check failed)");
  }

  const globalBlackout = blackoutDates?.some(b => b.campsite_id === null);

  // If there is a global blackout, return immediately
  if (globalBlackout) {
    return {
      available: false,
      availableSites: [],
      recommendedSiteId: null,
      message: "Dates are unavailable due to a campground closure.",
    };
  }

  const blackedOutSiteIds = new Set(
    blackoutDates
      ?.map(b => b.campsite_id)
      .filter((id): id is string => id !== null)
  );

  // Step 2.6: If checking a specific campsite, verify it's not blacked out
  if (params.campsiteId && blackedOutSiteIds.has(params.campsiteId)) {
    return {
      available: false,
      availableSites: [],
      recommendedSiteId: null,
      message: "Selected site is unavailable due to a blackout.",
    };
  }

  // Step 3: Get all active campsites that can accommodate the guest count
  let query = supabaseAdmin
    .from("campsites")
    .select("*")
    .eq("is_active", true)
    .gte("max_guests", guestCount)
    .order("sort_order", { ascending: true });

  if (params.campsiteId) {
    query = query.eq("id", params.campsiteId);
  }

  const { data: allCampsites, error: campsitesError } = await query;

  if (campsitesError) {
    console.error("Error fetching campsites:", campsitesError);
    throw new Error("Failed to fetch campsites");
  }

  // Step 4: Filter out booked AND blacked-out campsites
  const availableSites = allCampsites.filter(
    (site) => !bookedCampsiteIds.has(site.id) && !blackedOutSiteIds.has(site.id)
  );

  // Step 5: Determine if any sites are available
  const available = availableSites.length > 0;

  // Step 6: Recommend the "best" site
  // Strategy: smallest site that fits (by max_guests), or lowest sort_order
  let recommendedSiteId: string | null = null;
  let message: string | undefined;

  if (available) {
    // Sort by max_guests ascending, then by sort_order
    const sortedSites = [...availableSites].sort((a, b) => {
      if (a.max_guests !== b.max_guests) {
        return a.max_guests - b.max_guests;
      }
      return a.sort_order - b.sort_order;
    });

    recommendedSiteId = sortedSites[0].id;
    message = `${availableSites.length} site(s) available`;
  } else {
    // Check if the issue is capacity vs. availability
    if (allCampsites.length === 0) {
      message = `No campsites can accommodate ${guestCount} guest(s). Our largest site accommodates ${await getMaxCampsiteCapacity()} guests.`;
    } else {
      message = "No campsites available for the selected dates";
    }
  }

  return {
    available,
    availableSites,
    recommendedSiteId,
    message,
  };
}

// ============================================
// Helper Functions
// ============================================

async function getMaxCampsiteCapacity(): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("campsites")
    .select("max_guests")
    .eq("is_active", true)
    .order("max_guests", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return 0;
  }

  return data.max_guests;
}
