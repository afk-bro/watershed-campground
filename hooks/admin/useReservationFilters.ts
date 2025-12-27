"use client";

import { useState, useMemo } from "react";
import type { OverviewItem } from "@/lib/supabase";
import {
  sortItems,
  type SortMode,
  type FilterType,
} from "@/lib/admin/reservations/listing";

interface UseReservationFiltersReturn {
  // Filter state
  filter: FilterType;
  setFilter: (filter: FilterType) => void;

  // Sort state
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;

  // Search state
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Computed data
  filteredItems: OverviewItem[];
  sortedItems: OverviewItem[];
}

/**
 * useReservationFilters - Custom hook for filtering and sorting reservations
 *
 * Manages filter state (status filter, search query, sort mode) and provides
 * computed filtered/sorted data. Optimized with useMemo to prevent unnecessary
 * recalculations.
 *
 * @param items - Raw reservation items to filter and sort
 *
 * @returns Filter state, setters, and computed filtered/sorted data
 *
 * @example
 * ```tsx
 * const {
 *   filter,
 *   setFilter,
 *   searchQuery,
 *   setSearchQuery,
 *   sortedItems
 * } = useReservationFilters(items);
 * ```
 */
export function useReservationFilters(
  items: OverviewItem[]
): UseReservationFiltersReturn {
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortMode, setSortMode] = useState<SortMode>("start_date");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter by status (all, pending, confirmed, etc.)
  const statusFilteredItems = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "maintenance")
      return items.filter(
        (item) => item.type === "maintenance" || item.type === "blackout"
      );
    return items.filter(
      (item) => item.type === "reservation" && item.status === filter
    );
  }, [items, filter]);

  // Filter by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return statusFilteredItems;

    const q = searchQuery.toLowerCase();

    return statusFilteredItems.filter((item) => {
      if (item.type === "reservation") {
        const res = item as any;
        const fullName = `${res.first_name || ""} ${res.last_name || ""}`.toLowerCase();
        const email = (res.email || "").toLowerCase();
        const phone = (res.phone || "").toLowerCase();
        const id = (res.id || "").toLowerCase();
        const campsiteCode = (res.campsites?.code || "").toLowerCase();

        return (
          fullName.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          id.includes(q) ||
          campsiteCode.includes(q)
        );
      } else {
        // Maintenance / Blackout items
        const mt = item as any;
        const reason = (mt.reason || "").toLowerCase();
        const campsiteCode = (mt.campsite_code || "").toLowerCase();
        return reason.includes(q) || campsiteCode.includes(q);
      }
    });
  }, [statusFilteredItems, searchQuery]);

  // Sort filtered items
  const sortedItems = useMemo(
    () => sortItems(filteredItems, sortMode),
    [filteredItems, sortMode]
  );

  return {
    filter,
    setFilter,
    sortMode,
    setSortMode,
    searchQuery,
    setSearchQuery,
    filteredItems,
    sortedItems,
  };
}
