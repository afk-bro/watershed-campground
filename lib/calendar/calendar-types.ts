/**
 * Unified calendar types for reservations and blackout dates
 * This file defines the core abstractions that allow both reservations
 * and blackouts to be treated as "blocks" on the calendar grid.
 */

import { Reservation, BlackoutDate, Campsite } from "@/lib/supabase";

// ============================================================================
// Block Types - Unified representation
// ============================================================================

/**
 * Base properties shared by all calendar blocks (reservations & blackouts)
 */
export interface CalendarBlockBase {
  id: string;
  type: 'reservation' | 'blackout';

  /** Resource identifier - campsite ID or 'UNASSIGNED' */
  resourceId: string;

  /** ISO date string (yyyy-MM-dd) */
  startDate: string;

  /** ISO date string (yyyy-MM-dd) */
  endDate: string;

  /** Status determines visual styling and interaction permissions */
  status: ReservationStatus | BlackoutStatus;

  /** Type-specific data */
  meta: ReservationMeta | BlackoutMeta;
}

/**
 * Reservation-specific block
 */
export interface ReservationBlock extends CalendarBlockBase {
  type: 'reservation';
  status: ReservationStatus;
  meta: ReservationMeta;
}

/**
 * Blackout-specific block
 */
export interface BlackoutBlock extends CalendarBlockBase {
  type: 'blackout';
  status: BlackoutStatus;
  meta: BlackoutMeta;
}

/**
 * Union type for all calendar blocks
 */
export type CalendarBlock = ReservationBlock | BlackoutBlock;

// ============================================================================
// Status Types
// ============================================================================

export type ReservationStatus =
  | 'confirmed'
  | 'pending'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'
  | 'no_show';

export type BlackoutStatus = 'active';

// ============================================================================
// Metadata Types
// ============================================================================

export interface ReservationMeta {
  firstName: string;
  lastName: string;
  email: string;
  campingUnit?: string;
}

export interface BlackoutMeta {
  reason: string;
}

// ============================================================================
// Interaction Types - Drag & Resize
// ============================================================================

/**
 * Current drag/resize mode
 */
export type DragMode = 'move' | 'resize-start' | 'resize-end' | 'create';

/**
 * Ghost preview state - single source of truth for all ghost rendering
 */
export interface GhostState {
  mode: DragMode;

  /** Resource (campsite) being targeted */
  resourceId: string;

  /** Proposed start date */
  startDate: string;

  /** Proposed end date */
  endDate: string;

  /** Block being moved/resized (null for 'create' mode) */
  sourceBlock?: CalendarBlock;

  /** Validation result */
  isValid: boolean;

  /** Error message if invalid */
  errorMessage?: string;
}

// ============================================================================
// Positioning Types
// ============================================================================

/**
 * Calculated position for rendering a block on the grid
 */
export interface BlockPosition {
  /** Left offset as percentage (0-100) */
  leftPercent: number;

  /** Width as percentage (0-100) */
  widthPercent: number;

  /** Visual clipping if block extends beyond visible month */
  isClippedStart: boolean;
  isClippedEnd: boolean;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  conflicts?: CalendarBlock[];
}

// ============================================================================
// Adapter Functions - Convert domain models to unified blocks
// ============================================================================

/**
 * Convert Supabase reservation to calendar block
 */
export function reservationToBlock(reservation: Reservation): ReservationBlock {
  return {
    id: reservation.id || '', // Handle optional id (shouldn't happen for loaded reservations)
    type: 'reservation',
    resourceId: reservation.campsite_id || 'UNASSIGNED',
    startDate: reservation.check_in,
    endDate: reservation.check_out,
    status: reservation.status,
    meta: {
      firstName: reservation.first_name,
      lastName: reservation.last_name,
      email: reservation.email,
      campingUnit: reservation.camping_unit,
    },
  };
}

/**
 * Convert array of reservations to blocks
 */
export function reservationsToBlocks(reservations: Reservation[]): ReservationBlock[] {
  return reservations.map(reservationToBlock);
}

/**
 * Convert Supabase blackout date to calendar block
 */
export function blackoutToBlock(blackout: BlackoutDate): BlackoutBlock {
  return {
    id: blackout.id,
    type: 'blackout',
    resourceId: blackout.campsite_id || 'UNASSIGNED',
    startDate: blackout.start_date,
    endDate: blackout.end_date,
    status: 'active',
    meta: {
      reason: blackout.reason || 'Maintenance',
    },
  };
}

/**
 * Convert array of blackouts to blocks
 */
export function blackoutsToBlocks(blackouts: BlackoutDate[]): BlackoutBlock[] {
  return blackouts.map(blackoutToBlock);
}

/**
 * Type guard: Check if block is a reservation
 */
export function isReservationBlock(block: CalendarBlock): block is ReservationBlock {
  return block.type === 'reservation';
}

/**
 * Type guard: Check if block is a blackout
 */
export function isBlackoutBlock(block: CalendarBlock): block is BlackoutBlock {
  return block.type === 'blackout';
}

// ============================================================================
// Calendar Data Types
// ============================================================================

/**
 * Calendar data returned from API and used by SWR
 */
export interface CalendarData {
  reservations: Reservation[];
  campsites: Campsite[];
  blackoutDates: BlackoutDate[];
}
