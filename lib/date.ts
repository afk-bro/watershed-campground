/**
 * Parses a YYYY-MM-DD string into a local Date object at midnight (00:00:00).
 * This avoids UTC parsing issues where "Today" might be considered "Yesterday"
 * depending on the timezone relative to UTC.
 */
export function toLocalMidnight(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}

/**
 * Returns a new Date object representing "Today" at local midnight (00:00:00).
 */
export function getLocalToday(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}
