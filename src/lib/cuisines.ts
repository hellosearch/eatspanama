/**
 * Cuisine-hub inventory + existence gate. ONE canonical source for:
 *  - the [locale]/[city]/[hood]/[cuisine] route's generateStaticParams,
 *  - the sitemap's cuisine-hub URLs, and
 *  - the link guards on the listing ("Browse by cuisine in {hood}") and
 *    profile ("More {cuisine} in {hood}") pages.
 *
 * A hub exists only when a (neighborhood, primary-cuisine) pair has >= MIN
 * open venues (inventory gate) so we never ship a thin page. Grouping keys on
 * the PRIMARY cuisine (cuisine_en[0], cleaned) exactly like the listing's
 * hub-spoke counts, so the chip count === the hub page count === the ItemList
 * JSON-LD count, always.
 */
import type { Venue } from "@/data/mock";
import { allVenues, allNeighborhoods } from "@/lib/data";
import { cleanCuisine, slugify } from "@/lib/format";

/** Minimum open venues for a (hood, cuisine) hub to be built. */
export const CUISINE_HUB_MIN = 3;

/**
 * Curated cuisine-card art - ONE hand-picked photo per cuisine, chosen on a
 * contact sheet like good-for's OCC_IMG, NOT auto-grabbed (auto-picking the
 * first venue photo put a burger on "Vegetarian" - the exact failure the
 * good-for curation exists to avoid). Add a file to /public/cuisines/{seg}.jpg
 * and an entry here to turn that card into a photo card; every unmapped cuisine
 * keeps the honest branded glyph. Empty until the contact-sheet pick is done.
 */
export interface CuisineImg {
  url: string;
  credit: string; // "Photo: {venue}" - venue-owned photo, credited like good-for's OCC_IMG
}
export const CUISINE_IMG: Record<string, CuisineImg> = {
  japanese: { url: "/venues/casacasco.jpg", credit: "Photo: CasaCasco" },
  greek: { url: "/venues/nisos-aegean-grill.jpg", credit: "Photo: NISOS Aegean Grill" },
  cafe: { url: "/venues/luna-cafe-salmon-bagel.jpg", credit: "Photo: Luna Café" },
  seafood: { url: "/venues/restaurante-bucaneros.jpg", credit: "Photo: Restaurante Bucaneros" },
  pizza: { url: "/venues/pizza-verace-san-francisco.jpg", credit: "Photo: Pizza Verace" },
  deli: { url: "/venues/grand-deli-gourmet-albrook.jpg", credit: "Photo: Grand Deli Gourmet" },
  steakhouse: { url: "/venues/restaurante-el-enemigo-casco-antiguo.jpg", credit: "Photo: El Enemigo" },
  panamanian: { url: "/venues/fonda-mama-gallina-obarrio.jpg", credit: "Photo: Fonda Mamá Gallina" },
  healthy: { url: "/venues/mamba-by-diana.jpg", credit: "Photo: Mamba by Diana" },
  bar: { url: "/venues/la-rana-dorada-food.jpg", credit: "Photo: La Rana Dorada" },
  chinese: { url: "/venues/lung-fung-food.jpg", credit: "Photo: Lung Fung" },
  international: { url: "/venues/the-wallace-food.jpg", credit: "Photo: The Wallace" },
  burgers: { url: "/venues/el-container-food-city.jpg", credit: "Photo: El Container Food City" },
  italian: { url: "/venues/afrodisiaco-italian-modern-kitchen.jpg", credit: "Photo: Afrodisíaco" },
  peruvian: { url: "/venues/restaurante-nazca-21-costa-del-este.jpg", credit: "Photo: Nazca 21" },
  colombian: { url: "/venues/hacienda-colombiana.jpg", credit: "Photo: Hacienda Colombiana" },
  nikkei: { url: "/venues/enkai-peruvian-japanese-cuisine.jpg", credit: "Photo: Enkai" },
  spanish: { url: "/venues/restaurante-almeria.jpg", credit: "Photo: Restaurante Almería" },
  american: { url: "/venues/lula-casco.jpg", credit: "Photo: Lula Casco" },
  mexican: { url: "/venues/wahaka-restaurante.jpg", credit: "Photo: Wahaka" },
  french: { url: "/venues/petit-paris-cde.jpg", credit: "Photo: Petit Paris" },
  caribbean: { url: "/venues/saril-kitchen-lounge.jpg", credit: "Photo: Saril Kitchen & Lounge" },
  bakery: { url: "/venues/panaderia-tia-mamy.jpg", credit: "Photo: Panadería Tia Mamy" },
  vegan: { url: "/venues/planticeria.jpg", credit: "Photo: Planticeria" },
  thai: { url: "/venues/restaurante-one-wok-chinese-thai-food.jpg", credit: "Photo: One Wok" },
  venezuelan: { url: "/venues/la-tasquita-urbana-by-carne-en-vara.jpg", credit: "Photo: La Tasquita Urbana" },
  mediterranean: { url: "/venues/carpe-diem-international-cuisine-drinks.jpg", credit: "Photo: Carpe Diem" },
};
export function cuisineImg(seg: string): CuisineImg | undefined {
  return CUISINE_IMG[seg];
}

export interface CuisineHub {
  hoodSlug: string;
  cuisine: string; // clean EN label, e.g. "Italian"
  seg: string; // URL segment, e.g. "italian"
  venues: Venue[];
  count: number;
}

function primaryLabel(v: Venue): string {
  return cleanCuisine(v.cuisine_en[0] ?? "");
}

/** All (hood, cuisine) hubs meeting the inventory gate. Built once at module load. */
export const cuisineHubs: CuisineHub[] = (() => {
  const map = new Map<string, CuisineHub>();
  for (const v of allVenues) {
    if (v.status !== "open") continue;
    const label = primaryLabel(v);
    if (!label) continue;
    const seg = slugify(label);
    if (!seg) continue;
    const key = `${v.neighborhood_slug}|${seg}`;
    let hub = map.get(key);
    if (!hub) {
      hub = { hoodSlug: v.neighborhood_slug, cuisine: label, seg, venues: [], count: 0 };
      map.set(key, hub);
    }
    hub.venues.push(v);
  }
  // The cuisine hub shares the 4th URL segment with venue profiles
  // (/{city}/{hood}/{seg}/). If a cuisine segment collides with a real venue
  // slug in the same hood, the venue owns that URL - drop the hub so its chip
  // renders as plain text instead of resolving to the wrong page. (One real
  // case: a venue literally slugged "burgers" in Bella Vista.)
  const venueSlugKeys = new Set(
    allVenues.filter((v) => v.status === "open").map((v) => `${v.neighborhood_slug}|${v.slug}`)
  );
  const hubs = [...map.values()].filter(
    (h) => h.venues.length >= CUISINE_HUB_MIN && !venueSlugKeys.has(`${h.hoodSlug}|${h.seg}`)
  );
  for (const h of hubs) h.count = h.venues.length;
  // Deterministic order (hood, then cuisine) so builds are reproducible.
  hubs.sort((a, b) => a.hoodSlug.localeCompare(b.hoodSlug) || a.seg.localeCompare(b.seg));
  return hubs;
})();

const hubKeys = new Set(cuisineHubs.map((h) => `${h.hoodSlug}|${h.seg}`));

/** True when a (hood, cuisine-segment) hub page exists (>= MIN venues). */
export function cuisineHubExists(hoodSlug: string, seg: string): boolean {
  return hubKeys.has(`${hoodSlug}|${seg}`);
}

/** Look up a single hub (undefined when it does not meet the gate). */
export function getCuisineHub(hoodSlug: string, seg: string): CuisineHub | undefined {
  return cuisineHubs.find((h) => h.hoodSlug === hoodSlug && h.seg === seg);
}

/* -------------------------------------------------------------------------- */
/* City-wide cuisine hubs (/{city}/cuisine/{seg}/)                             */
/* -------------------------------------------------------------------------- */
/**
 * A city-level "all {cuisine} in {city}" page. Distinct from the per-hood hub:
 * it aggregates a primary cuisine across EVERY neighborhood in the city, so
 * "Cafes" means every cafe in Panama City, not cafes in one neighborhood
 * (fixes the confusing hub link Chris flagged). Higher inventory gate than the
 * hood hub - a city page should be a real, substantial list.
 */
export const CITY_CUISINE_HUB_MIN = 6;

export interface CityCuisineHub {
  citySlug: string;
  cuisine: string; // clean EN label, e.g. "Cafe"
  seg: string; // URL segment, e.g. "cafe"
  venues: Venue[];
  count: number;
}

/** neighborhood_slug -> city_slug (every PC hood -> "panama-city"). */
const HOOD_TO_CITY = new Map(allNeighborhoods.map((n) => [n.slug, n.city_slug]));

export const cityCuisineHubs: CityCuisineHub[] = (() => {
  const map = new Map<string, CityCuisineHub>();
  for (const v of allVenues) {
    if (v.status !== "open") continue;
    const label = primaryLabel(v);
    if (!label) continue;
    const seg = slugify(label);
    if (!seg) continue;
    const citySlug = HOOD_TO_CITY.get(v.neighborhood_slug);
    if (!citySlug) continue;
    const key = `${citySlug}|${seg}`;
    let hub = map.get(key);
    if (!hub) {
      hub = { citySlug, cuisine: label, seg, venues: [], count: 0 };
      map.set(key, hub);
    }
    hub.venues.push(v);
  }
  const hubs = [...map.values()].filter((h) => h.venues.length >= CITY_CUISINE_HUB_MIN);
  for (const h of hubs) h.count = h.venues.length;
  hubs.sort((a, b) => a.citySlug.localeCompare(b.citySlug) || a.seg.localeCompare(b.seg));
  return hubs;
})();

const cityHubKeys = new Set(cityCuisineHubs.map((h) => `${h.citySlug}|${h.seg}`));

/** True when a city-wide cuisine page exists (>= MIN venues in the city). */
export function cityCuisineHubExists(citySlug: string, seg: string): boolean {
  return cityHubKeys.has(`${citySlug}|${seg}`);
}

/** Look up a single city-cuisine hub (undefined when it does not meet the gate). */
export function getCityCuisineHub(citySlug: string, seg: string): CityCuisineHub | undefined {
  return cityCuisineHubs.find((h) => h.citySlug === citySlug && h.seg === seg);
}
