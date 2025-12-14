import { differenceInCalendarDays } from 'date-fns';

/**
 * Calculates the total cost of a reservation.
 * Currently uses a simple (Base Rate * Nights) logic.
 * 
 * @param baseRate - The nightly rate of the campsite
 * @param checkIn - Check-in date
 * @param checkOut - Check-out date
 * @returns Total cost in dollars (number)
 */
export function calculateTotal(baseRate: number, checkIn: Date | string, checkOut: Date | string): number {
    const start = new Date(checkIn);
    const end = new Date(checkOut);

    // differenceInCalendarDays returns the number of ful days
    const nights = differenceInCalendarDays(end, start);

    if (nights < 1) return 0;

    // Ensure strict floating point math if needed, but for simple mult it's usually fine
    // We round to 2 decimals just in case
    return Math.round((baseRate * nights) * 100) / 100;
}

export type SelectedAddon = {
    id: string;
    price: number;
    quantity: number;
};

export function calculateAddonTotal(addons: SelectedAddon[]): number {
    const total = addons.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0);
    return Math.round(total * 100) / 100;
}
