/**
 * Editors' picks for the homepage carousel.
 *
 * There is no broad "editor's pick" flag in the data yet - `editors_pick_rank`
 * is set on exactly one venue (Luna Cafe). So the carousel is drawn from the
 * venues our editors already chose for the guides (`guide.entries`), which is a
 * real, human-curated selection. The one-line descriptor is the venue's own
 * `whats_good_en[0]` - a genuine written sentence, not the boilerplate
 * `about_en`/`summary_en` template. Nothing here is fabricated.
 *
 * Credit safety: this object is consumed by a "use client" carousel, so it
 * carries only `creditText` + `creditHref` (the /go/ gateway path) and NEVER
 * `credit_url` - keeping the source URL out of the RSC flight payload, exactly
 * like `toClientPhoto` does elsewhere.
 */
import { allVenues, allNeighborhoods, guides } from "@/lib/data";
import { creditHref } from "@/lib/credit-link";
import { cleanCuisine } from "@/lib/format";
import { cuisineLabelEs } from "@/lib/hub-copy";

export interface EditorPick {
  name: string;
  slug: string;
  citySlug: string;
  hood: string;
  cuisine: string;
  photo: string;
  alt_en: string;
  alt_es: string;
  creditText?: string;
  creditHref?: string;
  blurb: string;
}

const bySlug = new Map(allVenues.map((v) => [v.slug, v]));
const hoodName = new Map(allNeighborhoods.map((n) => [n.slug, n.name]));
const hoodCity = new Map(allNeighborhoods.map((n) => [n.slug, n.city_slug]));

/** Map a venue to a credit-safe pick card, or null if it lacks a photo/line. */
function toPick(slug: string, locale: string): EditorPick | null {
  const v = bySlug.get(slug) as (typeof allVenues)[number] & { whats_good_es?: string[] };
  if (!v || v.status !== "open") return null;
  const photo = v.photos?.[0];
  const es = locale === "es";
  // Blurb + cuisine label read from the ES twins on the ES homepage.
  const blurb = (es ? v.whats_good_es?.[0] : undefined) ?? v.whats_good_en?.[0];
  if (!photo?.url || !blurb) return null; // never ship a card without a real photo + real line
  const rawCuisine = v.cuisine_en?.[0] ?? v.tags_en?.[0] ?? "";
  const cuisine = es && rawCuisine ? cuisineLabelEs(cleanCuisine(rawCuisine)) : rawCuisine;
  return {
    name: v.name,
    slug: v.slug,
    citySlug: hoodCity.get(v.neighborhood_slug) ?? "panama-city",
    hood: hoodName.get(v.neighborhood_slug) ?? "",
    cuisine,
    photo: photo.url,
    alt_en: photo.alt_en,
    alt_es: photo.alt_es,
    creditText: photo.credit_en,
    creditHref: creditHref(photo.credit_url),
    blurb,
  };
}

/** Venue slugs across all live guides, round-robin so cuisines/hoods interleave. */
function guideRoundRobin(): string[] {
  const live = guides.filter((g) => g.entries.length > 0);
  const order: string[] = [];
  const maxLen = live.reduce((m, g) => Math.max(m, g.entries.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const g of live) {
      const e = g.entries[i];
      if (e) order.push(e.venue_slug);
    }
  }
  return order;
}

export function getEditorsPicks(limit = 8, locale = "en"): EditorPick[] {
  // Seed with any real editors_pick_rank venue, then the round-robin guide set.
  const order = [
    ...allVenues.filter((v) => v.editors_pick_rank && v.status === "open").map((v) => v.slug),
    ...guideRoundRobin(),
  ];
  const out: EditorPick[] = [];
  const seen = new Set<string>();
  for (const slug of order) {
    if (out.length >= limit) break;
    if (seen.has(slug)) continue;
    seen.add(slug);
    const p = toPick(slug, locale);
    if (p) out.push(p);
  }
  return out;
}

/**
 * "The Essentials" - a canonical, cuisine-diverse starter shortlist (the
 * Eater-38 move). Draws from the guide selections but keeps one per cuisine so
 * the row reads as a spread across the city, not five cafes in a row.
 */
export function getEssentials(limit = 5, exclude: Set<string> = new Set(), locale = "en"): EditorPick[] {
  const out: EditorPick[] = [];
  const seen = new Set<string>();
  const cuisines = new Set<string>();
  for (const slug of guideRoundRobin()) {
    if (out.length >= limit) break;
    if (seen.has(slug) || exclude.has(slug)) continue; // never repeat a carousel venue
    seen.add(slug);
    const p = toPick(slug, locale);
    if (!p) continue;
    if (cuisines.has(p.cuisine)) continue; // one per cuisine for a visible spread
    cuisines.add(p.cuisine);
    out.push(p);
  }
  return out;
}
