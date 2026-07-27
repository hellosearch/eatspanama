/**
 * Client-side "save / shortlist" store. localStorage-backed, no account needed
 * (the anonymous MVP; account sync is a later ticket). We store each venue's
 * display fields (not just the slug) so the /saved page renders entirely from
 * localStorage without any server lookup. All functions guard for SSR.
 */
export interface SavedVenue {
  slug: string;
  name: string;
  href: string;
  cuisine?: string;
  hood?: string;
  price?: string;
  photo?: string;
}

const KEY = "eats:saved";
/** Fired on every change so the header count + any open SaveButtons resync. */
export const SAVED_EVENT = "eats:saved-change";

export function getSaved(): SavedVenue[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedVenue[]) : [];
  } catch {
    return [];
  }
}

export function isSaved(slug: string): boolean {
  return getSaved().some((v) => v.slug === slug);
}

/** Toggle a venue; returns the new saved state. Broadcasts SAVED_EVENT. */
export function toggleSaved(v: SavedVenue): boolean {
  const cur = getSaved();
  const exists = cur.some((x) => x.slug === v.slug);
  const next = exists ? cur.filter((x) => x.slug !== v.slug) : [v, ...cur];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(SAVED_EVENT));
  } catch {
    /* private mode / quota - saving is best-effort, never throws to the UI */
  }
  return !exists;
}

export function removeSaved(slug: string): void {
  const next = getSaved().filter((x) => x.slug !== slug);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(SAVED_EVENT));
  } catch {
    /* ignore */
  }
}
