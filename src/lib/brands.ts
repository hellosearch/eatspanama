/**
 * Brands = the same restaurant operating in more than one place.
 *
 * Every branch keeps its own page (its address, hours and phone differ), but a
 * brand with 6 branches must not take 6 consecutive rows in a listing -
 * "Athanasiou, Athanasiou, Athanasiou" is what that looks like today. Listings
 * collapse a brand to one row that links here, and this page fans back out to
 * the branches.
 *
 * A brand only exists once it has 2+ locations IN THE SAME CITY. A single
 * outlet is just a venue; and a brand in Panama City is a different listing
 * from the same brand in Boquete (Phase 2), because that is how people search.
 */
import type { Venue } from "@/data/mock";
import { allVenues, allNeighborhoods } from "@/lib/data";

export interface Brand {
  slug: string; // e.g. "athanasiou"
  name: string; // display name, taken from the branches
  citySlug: string;
  venues: Venue[];
  count: number;
  isChain: boolean;
}

/**
 * International fast-food and coffee chains. They stay in the directory and in
 * search - people do look for them - but they are kept out of the editorial
 * facets (date night, rooftops, editors' picks), where a Subway is noise.
 * Local multi-branch operators (Athanasiou, Pio Pio, La Rana Dorada) are NOT
 * chains for this purpose: they are part of how the city actually eats.
 */
const INTERNATIONAL_CHAINS = new Set([
  "subway", "mcdonald-s", "mcdonalds", "starbucks", "burger-king", "wendy-s", "wendys",
  "popeyes", "kfc", "papa-john-s", "papa-johns", "papa-johns-pizza", "domino-s", "dominos",
  "domino-s-pizza", "taco-bell", "carl-s-jr", "carls-jr", "pizza-hut", "dunkin", "dunkin-donuts",
  "little-caesars", "quiznos", "krispy-kreme", "cinnabon", "baskin-robbins", "hard-rock-cafe",
  "tgi-friday-s", "tgi-fridays", "the-coffee-bean-tea-leaf", "juan-valdez-cafe", "sbarro",
]);

/** Strip the branch qualifier: "Athanasiou | Bella Vista" -> "athanasiou". */
export function brandKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/\s*[|]\s*/)[0]
    .replace(/\b(panama|pty|city)\b/gi, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const HOOD_CITY = new Map(allNeighborhoods.map((n) => [n.slug, n.city_slug]));

export const brands: Brand[] = (() => {
  const groups = new Map<string, Venue[]>();
  for (const v of allVenues) {
    if (v.status !== "open") continue;
    const city = HOOD_CITY.get(v.neighborhood_slug);
    const key = brandKey(v.name);
    if (!city || !key) continue;
    const id = `${city}|${key}`;
    const arr = groups.get(id) ?? [];
    arr.push(v);
    groups.set(id, arr);
  }
  const out: Brand[] = [];
  for (const [id, venues] of groups) {
    if (venues.length < 2) continue;
    const [citySlug, slug] = id.split("|");
    // Display name = the shortest branch name, which is the name without its
    // branch qualifier ("Athanasiou" rather than "Athanasiou | Bella Vista").
    const name = [...venues].sort((a, b) => a.name.length - b.name.length)[0].name.split(/\s*[|]\s*/)[0].trim();
    out.push({
      slug,
      name,
      citySlug,
      venues: [...venues].sort((a, b) => a.name.localeCompare(b.name)),
      count: venues.length,
      isChain: INTERNATIONAL_CHAINS.has(slug),
    });
  }
  return out.sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
})();

const bySlug = new Map(brands.map((b) => [`${b.citySlug}|${b.slug}`, b]));

export function getBrand(citySlug: string, slug: string): Brand | undefined {
  return bySlug.get(`${citySlug}|${slug}`);
}

export function brandExists(citySlug: string, slug: string): boolean {
  return bySlug.has(`${citySlug}|${slug}`);
}

/** The brand a venue belongs to, if it has siblings. */
export function brandOf(venue: Venue): Brand | undefined {
  const city = HOOD_CITY.get(venue.neighborhood_slug);
  return city ? bySlug.get(`${city}|${brandKey(venue.name)}`) : undefined;
}

/** True for an international chain outlet - suppressed from editorial facets. */
export function isChainVenue(venue: Venue): boolean {
  return INTERNATIONAL_CHAINS.has(brandKey(venue.name));
}
