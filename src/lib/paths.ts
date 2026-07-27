/**
 * Localized URL helpers. The IA map localizes SLUGS, not just the /es prefix:
 *   EN /panama-city/casco-viejo/  <->  ES /es/ciudad-de-panama/casco-viejo/
 * next-intl handles the prefix; this module handles the segments.
 */
import { cities, type Neighborhood } from "@/data/mock";
import neighborhoodsRaw from "@/data/neighborhoods.json";

// The real 15 records. This used to read a 4-record prototype array, which
// meant slug translation silently fell through for the other 11 neighborhoods.
// Read straight from the JSON rather than lib/data.ts to keep this module free
// of the venue dataset (paths are imported by nearly everything).
const neighborhoods = neighborhoodsRaw as unknown as Neighborhood[];
import { routing, type Locale } from "@/i18n/routing";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://eatspanama.com";

export function citySlugFor(citySlug: string, locale: string): string {
  const c = cities.find((x) => x.slug === citySlug);
  return locale === "es" ? (c?.slug_es ?? citySlug) : citySlug;
}

export function hoodSlugFor(hoodSlug: string, locale: string): string {
  const n = neighborhoods.find((x) => x.slug === hoodSlug);
  return locale === "es" ? (n?.slug_es ?? hoodSlug) : hoodSlug;
}

/** Locale-stripped path of a city hub / neighborhood index (EN slug in). */
export function cityPath(citySlug: string, locale: string): string {
  return `/${citySlugFor(citySlug, locale)}/`;
}

/** Locale-stripped path of a neighborhood listing (canonical EN slugs in). */
export function listingPath(citySlug: string, hoodSlug: string, locale: string): string {
  return `/${citySlugFor(citySlug, locale)}/${hoodSlugFor(hoodSlug, locale)}/`;
}

/**
 * Locale-stripped path of a neighborhood+cuisine hub. The cuisine segment is a
 * slugified English cuisine label and is NOT localized (same segment EN/ES);
 * only the city + neighborhood segments localize.
 */
export function cuisineHubPath(citySlug: string, hoodSlug: string, cuisineSeg: string, locale: string): string {
  return `${listingPath(citySlug, hoodSlug, locale)}${cuisineSeg}/`;
}

/**
 * Locale-stripped path of a venue profile: /venues/{slug}/.
 *
 * Venues are addressed by slug alone rather than nested under their
 * neighborhood, because a venue's neighborhood is derived from its coordinates
 * and can change (boundary cases, re-assignment) while its identity does not -
 * and because multi-location brands would collide once two branches land in the
 * same hood. `/venues/` is namespaced so venue slugs can never collide with
 * top-level destinations (Boquete, Bocas del Toro et al. in Phase 2).
 *
 * The hierarchy is still expressed in the breadcrumb, not the path. The
 * `venues` segment is shared EN/ES, matching `good-for` and `cuisine`.
 */
export function venuePath(citySlug: string, venueSlug: string, locale: string): string {
  return `${cityPath(citySlug, locale)}${venueSlug}/`;
}

/**
 * Locale-stripped path of a city-wide cuisine page: /{city}/cuisine/{seg}/.
 * "cuisine" is a fixed literal segment (matches ahead of the [hood] dynamic
 * segment) and the cuisine slug is NOT localized - only the city localizes.
 */
export function cityCuisinePath(citySlug: string, cuisineSeg: string, locale: string): string {
  return `/${citySlugFor(citySlug, locale)}/cuisine/${cuisineSeg}/`;
}

/** Locale-stripped path of the cuisines index: /{city}/cuisine/. */
export function cityCuisineIndexPath(citySlug: string, locale: string): string {
  return `/${citySlugFor(citySlug, locale)}/cuisine/`;
}

/** Guides blog index: /guides/ (one source, so nav/footer/see-all agree). */
export function guidesIndexPath(): string {
  return "/guides/";
}

/** "Good for" occasion facet: /{city}/good-for/{slug}/ (slug not localized). */
export function goodForPath(citySlug: string, slug: string, locale: string): string {
  return `/${citySlugFor(citySlug, locale)}/good-for/${slug}/`;
}

/** "Good for" index: /{city}/good-for/. */
export function goodForIndexPath(citySlug: string, locale: string): string {
  return `/${citySlugFor(citySlug, locale)}/good-for/`;
}

/** Prefix a locale-stripped path per the "as-needed" policy (EN at root). */
export function withLocale(locale: string, strippedPath: string): string {
  return locale === routing.defaultLocale ? strippedPath : `/${locale}${strippedPath}`;
}

export function absoluteUrl(locale: string, strippedPath: string): string {
  return `${SITE}${withLocale(locale, strippedPath)}`;
}

/**
 * Translate the CURRENT locale-stripped pathname into the target locale,
 * segment by segment, using the slug maps. Used by the EN|ES toggle so every
 * page links to its true twin. Unknown segments pass through unchanged.
 */
export function translatePath(strippedPath: string, from: Locale, to: Locale): string {
  if (from === to) return strippedPath;
  const segs = strippedPath.split("/").filter(Boolean);
  const out = segs.map((seg) => {
    const city = cities.find((c) => (from === "es" ? c.slug_es : c.slug) === seg);
    if (city) return to === "es" ? city.slug_es : city.slug;
    const hood = neighborhoods.find((n) => (from === "es" ? n.slug_es : n.slug) === seg);
    if (hood) return to === "es" ? hood.slug_es : hood.slug;
    return seg;
  });
  return out.length ? `/${out.join("/")}/` : "/";
}
