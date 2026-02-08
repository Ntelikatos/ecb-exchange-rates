/**
 * Subtracts a number of calendar days from a date string.
 * Handles month boundaries, year boundaries, and leap years.
 *
 * @param dateStr - Date in YYYY-MM-DD format
 * @param days - Number of calendar days to subtract
 * @returns Date string in YYYY-MM-DD format
 */
export function subtractCalendarDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
