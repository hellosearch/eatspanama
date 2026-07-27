/**
 * "Good for" occasion facets -> city-wide landing pages (/{city}/good-for/{slug}/).
 * Each occasion is a high-intent search query ("date night restaurants panama",
 * "outdoor dining", "dog friendly"). Every page is inventory-gated at
 * GOODFOR_MIN, so an occasion only becomes a URL when there are enough real
 * venues - never a thin/doorway page. Occasion tags live on venue.tags_en
 * (some hand-tagged, some derived from the structured attributes layer).
 */
import type { Venue } from "@/data/mock";
import { allVenues, allNeighborhoods } from "@/lib/data";
import { isChainVenue } from "@/lib/brands";

export interface GoodForOccasion {
  slug: string; // URL segment, e.g. "rooftop"
  citySlug: string;
  tagsEn: string[]; // matching venue tags
  venues: Venue[];
  count: number;
  kind: FacetKind; // occasion / dish / drink / dietary (for grouped display)
}

/**
 * Facet kind - so the /good-for/ index can group tiles into real sections
 * (Occasions / Dishes / Drinks / Dietary) instead of one "what are you in the
 * mood for" bucket that mixed a dish (ceviche) next to a mood (date night) next
 * to a diet (gluten-free). Kind is presentational grouping only; the URLs and
 * inventory gate are unchanged.
 */
export type FacetKind = "occasion" | "dish" | "drink" | "dietary";

/** Occasions we build as pages. Order = priority within each kind. */
const OCC_DEFS: { slug: string; tags: string[]; kind: FacetKind }[] = [
  { slug: "rooftop", tags: ["Rooftop"], kind: "occasion" },
  { slug: "brunch", tags: ["Brunch"], kind: "occasion" },
  { slug: "date-night", tags: ["Date-night"], kind: "occasion" },
  { slug: "with-a-view", tags: ["View", "Sunset"], kind: "occasion" },
  { slug: "outdoor", tags: ["Outdoor"], kind: "occasion" },
  { slug: "family-friendly", tags: ["Family", "Family-friendly"], kind: "occasion" },
  { slug: "cheap-eats", tags: ["Cheap-eats"], kind: "occasion" },
  { slug: "groups", tags: ["Groups", "Group-friendly"], kind: "occasion" },
  { slug: "live-music", tags: ["Live-music"], kind: "occasion" },
  { slug: "dog-friendly", tags: ["Dog-friendly"], kind: "occasion" },
  { slug: "work-friendly", tags: ["Work-friendly"], kind: "occasion" },
  { slug: "vegetarian", tags: ["Vegetarian options", "Vegan options", "Vegan"], kind: "dietary" },
  { slug: "gluten-free", tags: ["Gluten-free options"], kind: "dietary" },
  // Dish facets (not already a cuisine page). Same inventory gate.
  { slug: "ceviche", tags: ["Ceviche"], kind: "dish" },
  { slug: "wings", tags: ["Wings"], kind: "dish" },
  { slug: "empanadas", tags: ["Empanadas"], kind: "dish" },
  { slug: "bbq", tags: ["BBQ"], kind: "dish" },
  { slug: "patacones", tags: ["Patacones"], kind: "dish" },
  { slug: "tacos", tags: ["Tacos"], kind: "dish" },
  { slug: "tapas", tags: ["Tapas"], kind: "dish" },
  { slug: "sancocho", tags: ["Sancocho"], kind: "dish" },
  { slug: "ramen", tags: ["Ramen"], kind: "dish" },
  { slug: "arepas", tags: ["Arepas"], kind: "dish" },
  // Drink facets.
  { slug: "cocktails", tags: ["Cocktails"], kind: "drink" },
  { slug: "specialty-coffee", tags: ["Specialty-coffee"], kind: "drink" },
  { slug: "craft-beer", tags: ["Craft-beer"], kind: "drink" },
  { slug: "wine-bar", tags: ["Wine-bar"], kind: "drink" },
];

/** Minimum venues for a good-for page to be built (never a thin page). */
export const GOODFOR_MIN = 8;

const HOOD_TO_CITY = new Map(allNeighborhoods.map((n) => [n.slug, n.city_slug]));

export const goodForOccasions: GoodForOccasion[] = (() => {
  const out: GoodForOccasion[] = [];
  for (const def of OCC_DEFS) {
    const byCity = new Map<string, Venue[]>();
    for (const v of allVenues) {
      if (v.status !== "open") continue;
      // These are the "where should we go" pages. An international fast-food
      // outlet is a legitimate directory entry and stays in search and in the
      // neighborhood listings - it just is not an answer to "date night" or
      // "rooftops". Local multi-branch operators are unaffected.
      if (isChainVenue(v)) continue;
      if (!(v.tags_en ?? []).some((t) => def.tags.includes(t))) continue;
      const city = HOOD_TO_CITY.get(v.neighborhood_slug);
      if (!city) continue;
      const arr = byCity.get(city) ?? [];
      arr.push(v);
      byCity.set(city, arr);
    }
    for (const [citySlug, venues] of byCity) {
      if (venues.length >= GOODFOR_MIN) {
        out.push({ slug: def.slug, citySlug, tagsEn: def.tags, venues, count: venues.length, kind: def.kind });
      }
    }
  }
  // Deterministic order: city, then OCC_DEFS order.
  out.sort(
    (a, b) =>
      a.citySlug.localeCompare(b.citySlug) ||
      OCC_DEFS.findIndex((d) => d.slug === a.slug) - OCC_DEFS.findIndex((d) => d.slug === b.slug)
  );
  return out;
})();

const keys = new Set(goodForOccasions.map((o) => `${o.citySlug}|${o.slug}`));

export function goodForExists(citySlug: string, slug: string): boolean {
  return keys.has(`${citySlug}|${slug}`);
}

export function getGoodFor(citySlug: string, slug: string): GoodForOccasion | undefined {
  return goodForOccasions.find((o) => o.citySlug === citySlug && o.slug === slug);
}

/** "date-night" -> "Date night", "wine-bar" -> "Wine bar". */
function facetLabel(slug: string): string {
  const s = slug.replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * "Perfect For" facets for a venue's profile: the good-for pages this venue
 * genuinely belongs to (occasion / dish / drink / dietary), each linking to its
 * hub. Only facets that actually exist as a page in this city are returned, so a
 * chip never dead-ends. Cuisine tags are naturally excluded (they are not in
 * OCC_DEFS). Data already lives on venue.tags_en - this is surfacing, not new.
 */
export function perfectForFacets(venue: Venue, citySlug: string): { slug: string; label: string; kind: FacetKind }[] {
  const tags = venue.tags_en ?? [];
  const out: { slug: string; label: string; kind: FacetKind }[] = [];
  for (const def of OCC_DEFS) {
    if (!goodForExists(citySlug, def.slug)) continue;
    if (!tags.some((t) => def.tags.includes(t))) continue;
    out.push({ slug: def.slug, label: facetLabel(def.slug), kind: def.kind });
  }
  return out;
}

export interface FacetImage {
  url: string;
  /** Attribution for the source venue's photo (static text, no outbound link). */
  credit?: string;
}

/**
 * Curated facet art - ONE deliberately-chosen, genuinely-depicting venue-owned
 * photo per facet, hand-picked on a contact sheet (2026-07-23), not auto-picked.
 *
 * Auto-grabbing the first photo of any venue with the tag looked fine in the
 * aggregate and was wrong in the particulars - it put a meat burger on
 * "Vegetarian", a salmon plate on "Dog-friendly", the same ceviche bowl on both
 * "Ceviche" and "Outdoor". So each entry below was chosen by eye to actually
 * show the facet, and carries a static credit to its source venue.
 * `rooftops.jpg` stays UNMAPPED (it is a mislabeled lobster plate); facets with
 * no curated art render the branded flat tile, which is honest.
 */
const OCC_IMG: Record<string, FacetImage> = {
  brunch: { url: "/occasions/brunch.jpg" },
  ceviche: { url: "/occasions/ceviche.jpg", credit: "Photo: Capitán Bahía" },
  cocktails: { url: "/occasions/cocktails.jpg", credit: "Photo: Finca del Mar" },
  "specialty-coffee": { url: "/occasions/specialty-coffee.jpg", credit: "Photo: @durancoffeestore" },
  outdoor: { url: "/occasions/outdoor.jpg", credit: "Photo: @lesmecspty" },
  "family-friendly": { url: "/occasions/family-friendly.jpg", credit: "Photo: @athenspanama" },
  vegetarian: { url: "/occasions/vegetarian.jpg", credit: "Photo: @salva_rest" },
  "dog-friendly": { url: "/occasions/dog-friendly.jpg", credit: "Photo: @paloemangogardenspot" },
};

/** Card art for a facet: only the curated shot (url + attribution). */
export function goodForImage(o: GoodForOccasion): FacetImage | undefined {
  return OCC_IMG[o.slug];
}
