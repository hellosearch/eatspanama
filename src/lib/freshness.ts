/**
 * Hours freshness. Stale hours are the #1 trust killer for a restaurant
 * directory, so the age of a `last_checked` stamp has to CHANGE what the page
 * asserts, not just sit there as a date.
 *
 * These pages are statically generated, so freshness can never be computed at
 * build time: a page built in July would claim "checked this month" forever.
 * Every caller is a client component that evaluates this against the visitor's
 * own clock (the same reason OpenNowPill and HoursTable are client-only).
 */

export type FreshnessLevel = "fresh" | "aging" | "stale";

/** Months after which hours get a "confirm before you go" nudge. */
export const AGING_AFTER_MONTHS = 3;
/** Months after which we stop asserting open/closed at all. */
export const STALE_AFTER_MONTHS = 6;

/** Whole months between a "YYYY-MM" stamp and now; null if absent/unparseable. */
export function monthsSince(stamp: string | undefined, now: Date = new Date()): number | null {
  if (!stamp) return null;
  const m = stamp.trim().match(/^(\d{4})-(\d{1,2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  const diff = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
  return Math.max(0, diff);
}

/**
 * Freshness level for a venue's hours. An absent or unreadable stamp is treated
 * as "stale": unknown age is not the same as recent, and guessing in the
 * optimistic direction is exactly the failure mode this guards against.
 */
export function freshnessOf(stamp: string | undefined, now: Date = new Date()): FreshnessLevel {
  const months = monthsSince(stamp, now);
  if (months == null) return "stale";
  if (months >= STALE_AFTER_MONTHS) return "stale";
  if (months >= AGING_AFTER_MONTHS) return "aging";
  return "fresh";
}
