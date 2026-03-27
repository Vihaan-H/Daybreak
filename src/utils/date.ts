/**
 * utils/date.ts
 *
 * Date formatting and hashing utilities used for deterministic quote
 * selection and cache file naming.
 */

/** Returns today's date as a "YYYY-MM-DD" string in the local timezone. */
export function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0]; // YYYY-MM-DD
}

/**
 * Converts a date string into a stable, positive 32-bit integer hash.
 *
 * This is used to deterministically pick a quote for a given day -- the
 * same date always produces the same hash, so every device running the
 * app will show the same quote on the same day.
 *
 * Uses the djb2 variant: hash = hash * 31 + charCode.
 */
export function dateToHash(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
