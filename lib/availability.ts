import { supabaseAdmin } from "./supabase-admin";
import type { Campsite } from "./supabase";
import { toLocalMidnight, getLocalToday } from "./date";

// ============================================
// Types
// ============================================

export type AvailabilityRequest = {
  checkIn: string;  // ISO date string (YYYY-MM-DD)
  checkOut: string; // ISO date string (YYYY-MM-DD)
  guestCount: number;
  campsiteId?: string;
  ignorePastCheck?: boolean;
  forceConflict?: boolean;     // Admin override for reservation conflicts
  overrideBlackout?: boolean;  // Admin override for blackout dates
};

export type AvailabilityResult = {
  available: boolean;
  message?: string;
  recommendedSiteId?: string;
  conflicts?: Array<{ id: string; type: 'reservation' | 'blackout'; details?: string }>;
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
  const checkInDate = toLocalMidnight(checkIn);
  const checkOutDate = toLocalMidnight(checkOut);

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

  // Cannot book dates in the past (unless ignored for admin backdating)
  if (!params.ignorePastCheck) {
    const today = getLocalToday();

    // NOTE: checkInDate is now local midnight. today is local midnight.
    // Comparing them works correctly regardless of timezone.

    // Update: Add a 1-day tolerance for timezone differences.
    // If Server is ahead (e.g. UTC Dec 24), User might be behind (e.g. PST Dec 23).
    // "Today" for User (23rd) is "Yesterday" for Server (24th).
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (checkInDate < yesterday) {
      throw new AvailabilityError("Check-in date cannot be in the past");
    }
  }

  // Maximum stay validation (21 nights)
  const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 21) {
    throw new AvailabilityError("Maximum stay is 21 nights");
  }

  if (diffDays < 1) {
    throw new AvailabilityError("Minimum stay is 1 night");
  }

  // Guest count validation
  if (guestCount < 1) {
    throw new AvailabilityError("At least 1 guest is required");
  }

  if (guestCount > 10) { // Assuming global max of 10 for now, though mostly per-site
    // We can relax this or make it site-specific
  }
}

// ============================================
// Availability Check (Core Logic)
// ============================================

export async function checkAvailability(params: AvailabilityRequest): Promise<AvailabilityResult> {
  try {
    validateAvailabilityRequest(params);

    const { checkIn, checkOut, guestCount, campsiteId } = params;

    // Fetch all active campsites (or specific one)
    let query = supabaseAdmin
      .from("campsites")
      .select("id, name, max_guests, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (campsiteId) {
      query = query.eq("id", campsiteId);
    }

    const { data: campsites, error: campsiteError } = await query;

    if (campsiteError) {
      console.error("Error fetching campsites:", campsiteError);
      throw new AvailabilityError("Failed to fetch campsites");
    }

    if (!campsites || campsites.length === 0) {
      if (campsiteId) return { available: false, message: "Campsite not found or not active" };
      throw new AvailabilityError("No active campsites configured");
    }

    // Filter by capacity
    const suitableCampsites = campsites.filter(
      (site) => site.max_guests >= guestCount
    );

    if (suitableCampsites.length === 0) {
      return { available: false, message: "No campsites can accommodate this party size" };
    }

    const suitableSiteIds = suitableCampsites.map((site) => site.id);

    // 1. Check for conflicting reservations
    const { data: conflicts, error: conflictError } = await supabaseAdmin
      .from("reservations")
      .select("campsite_id")
      .in("campsite_id", suitableSiteIds)
      .in("status", ["confirmed", "pending", "checked_in"])
      .lt("check_in", checkOut)
      .gt("check_out", checkIn);

    if (conflictError) {
      console.error("Error checking reservations:", conflictError);
      throw new AvailabilityError("Failed to check existing reservations");
    }

    const conflictedSiteIds = new Set(conflicts?.map((r) => r.campsite_id));

    // 2. Check for blackout dates
    const { data: blackouts, error: blackoutError } = await supabaseAdmin
      .from("blackout_dates")
      .select("campsite_id")
      .lte("start_date", checkOut)
      .gte("end_date", checkIn);

    if (blackoutError) {
      console.error("Error checking blackouts:", blackoutError);
      throw new AvailabilityError("Failed to check blackout dates");
    }

    const blackoutSiteIds = new Set<string>();
    blackouts?.forEach(b => {
      if (b.campsite_id) {
        blackoutSiteIds.add(b.campsite_id);
      } else {
        // Global blackout -> marks ALL suitable sites as blocked
        suitableSiteIds.forEach(id => blackoutSiteIds.add(id));
      }
    });

    // 3. Determine available sites
    const availableSites = suitableCampsites.filter(site => {
      const hasConflict = conflictedSiteIds.has(site.id);
      const hasBlackout = blackoutSiteIds.has(site.id);

      // Apply Admin Overrides
      const isConflictIgnored = params.forceConflict && hasConflict;
      const isBlackoutIgnored = params.overrideBlackout && hasBlackout;

      // Block if conflict exists and not ignored
      if (hasConflict && !isConflictIgnored) return false;

      // Block if blackout exists and not ignored
      if (hasBlackout && !isBlackoutIgnored) return false;

      return true;
    });

    if (availableSites.length > 0) {
      return { available: true, recommendedSiteId: availableSites[0].id };
    } else {
      const conflictDetails: Array<{ id: string; type: 'reservation' | 'blackout'; details?: string }> = [];

      // Populate conflicts to help admin deciding
      if (conflicts && conflicts.length > 0) {
        conflicts.forEach(r => {
          // Only include if it maps to a suitable site we are checking
          if (suitableSiteIds.includes(r.campsite_id)) {
            conflictDetails.push({ id: r.campsite_id, type: 'reservation', details: `Conflict on site ${r.campsite_id}` });
          }
        });
      }

      if (blackouts && blackouts.length > 0) {
        blackouts.forEach(b => {
          // Blockouts might be site-specific or global
          if (!b.campsite_id || suitableSiteIds.includes(b.campsite_id)) {
            conflictDetails.push({ id: b.campsite_id || 'ALL', type: 'blackout', details: `Blackout on site ${b.campsite_id || 'ALL'}` });
          }
        });
      }

      // Detailed failure reasons
      if (suitableCampsites.some(site => conflictedSiteIds.has(site.id) && !params.forceConflict)) {
        return { available: false, message: "Selected dates conflict with existing reservations.", conflicts: conflictDetails };
      }
      if (suitableCampsites.some(site => blackoutSiteIds.has(site.id) && !params.overrideBlackout)) {
        return { available: false, message: "Selected dates coincide with a blackout period.", conflicts: conflictDetails };
      }
      return { available: false, message: "No campsites available for these dates.", conflicts: conflictDetails };
    }

  } catch (error) {
    if (error instanceof AvailabilityError) {
      return { available: false, message: error.message };
    }
    console.error("Unexpected availability check error:", error);
    return { available: false, message: "An unexpected error occurred while checking availability." };
  }
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
