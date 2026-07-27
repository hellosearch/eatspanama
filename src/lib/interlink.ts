/**
 * Hub-spoke interlink module data.
 *
 * Every occasion / cuisine page is otherwise an island; this computes the
 * sideways links that turn the directory into something crawlable and
 * browsable (the 2026-07-14 SEO template rule). All links are gated so the
 * module never emits a URL that 404s:
 *  - barrios always resolve (every hood listing page is built)
 *  - cuisines are emitted only when a city cuisine hub exists
 *  - occasion/dish facets come straight from goodForOccasions (all built)
 *  - guides are emitted only when they actually contain one of these venues
 *
 * Counts shown are local co-occurrence counts (how many of THIS facet's venues
 * fall in that barrio / cuisine), not the destination page's own total - the
 * two differ (chains, city-wide scope), so we never borrow the hub's number.
 */
import { allNeighborhoods, guides } from "@/lib/data";
import { localizeGuide } from "@/lib/localize";
import { goodForOccasions, type GoodForOccasion } from "@/lib/goodfor";
import { goodForPath, listingPath, withLocale } from "@/lib/paths";

export interface IlLink {
  name: string;
  href: string;
  count?: number;
}
export type IlKey = "barrio" | "pairs" | "dishes" | "guide";
export interface IlSection {
  key: IlKey;
  links: IlLink[];
}

const hoodName = new Map(allNeighborhoods.map((n) => [n.slug, n.name]));

/**
 * Sections for an occasion / dish facet page (e.g. "ceviche").
 * `occLabel` resolves an occasion slug to its display label (the caller has the
 * GoodFor translations); barrio + cuisine + guide names are self-describing.
 */
export function occasionInterlink(
  occ: GoodForOccasion,
  locale: string,
  occLabel: (slug: string) => string
): IlSection[] {
  const city = occ.citySlug;
  const venueSlugs = new Set(occ.venues.map((v) => v.slug));

  // (a) BY BARRIO - group this facet's venues by neighborhood.
  const hoodCounts = new Map<string, number>();
  for (const v of occ.venues) {
    hoodCounts.set(v.neighborhood_slug, (hoodCounts.get(v.neighborhood_slug) ?? 0) + 1);
  }
  const barrio: IlLink[] = [...hoodCounts.entries()]
    .map(([slug, count]) => ({ slug, count, name: hoodName.get(slug) }))
    .filter((x): x is { slug: string; count: number; name: string } => Boolean(x.name))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((x) => ({ name: x.name, count: x.count, href: withLocale(locale, listingPath(city, x.slug, locale)) }));

  // (b) PAIRS WELL WITH (occasions + drinks) / (c) MORE DISHES (dishes) - other
  // facets sharing these venues, split by kind. We deliberately do NOT emit a
  // "related cuisines" axis here: the occasion page's filter rail already has a
  // cuisine filter, so that row was an exact duplicate.
  const others = goodForOccasions
    .filter((o) => o.citySlug === city && o.slug !== occ.slug)
    .map((o) => ({ o, n: o.venues.reduce((s, v) => s + (venueSlugs.has(v.slug) ? 1 : 0), 0) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const pairs: IlLink[] = others
    .filter((x) => x.o.kind === "occasion" || x.o.kind === "drink")
    .slice(0, 5)
    .map((x) => ({ name: occLabel(x.o.slug), href: withLocale(locale, goodForPath(city, x.o.slug, locale)) }));
  const dishes: IlLink[] = others
    .filter((x) => x.o.kind === "dish")
    .slice(0, 5)
    .map((x) => ({ name: occLabel(x.o.slug), href: withLocale(locale, goodForPath(city, x.o.slug, locale)) }));

  // (d) IN A GUIDE - guides that feature one of these venues.
  const guide: IlLink[] = guides
    .filter((g) => g.entries.length > 0 && g.entries.some((e) => venueSlugs.has(e.venue_slug)))
    .slice(0, 3)
    .map((g) => ({ name: localizeGuide(g, locale).title_en, href: withLocale(locale, `/guides/${g.slug}/`) }));

  return [
    { key: "barrio", links: barrio },
    { key: "pairs", links: pairs },
    { key: "dishes", links: dishes },
    { key: "guide", links: guide },
  ];
}

/**
 * Sections for a cuisine page (e.g. "japanese") - the reciprocal view: which
 * barrios have this cuisine, which occasions its venues suit, and any guide.
 */
export function cuisineInterlink(
  venues: { slug: string; neighborhood_slug: string }[],
  citySlug: string,
  locale: string,
  occLabel: (slug: string) => string
): IlSection[] {
  const venueSlugs = new Set(venues.map((v) => v.slug));

  const hoodCounts = new Map<string, number>();
  for (const v of venues) hoodCounts.set(v.neighborhood_slug, (hoodCounts.get(v.neighborhood_slug) ?? 0) + 1);
  const barrio: IlLink[] = [...hoodCounts.entries()]
    .map(([slug, count]) => ({ slug, count, name: hoodName.get(slug) }))
    .filter((x): x is { slug: string; count: number; name: string } => Boolean(x.name))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((x) => ({ name: x.name, count: x.count, href: withLocale(locale, listingPath(citySlug, x.slug, locale)) }));

  const facets = goodForOccasions
    .filter((o) => o.citySlug === citySlug)
    .map((o) => ({ o, n: o.venues.reduce((s, v) => s + (venueSlugs.has(v.slug) ? 1 : 0), 0) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const pairs: IlLink[] = facets
    .filter((x) => x.o.kind === "occasion" || x.o.kind === "drink")
    .slice(0, 5)
    .map((x) => ({ name: occLabel(x.o.slug), href: withLocale(locale, goodForPath(citySlug, x.o.slug, locale)) }));
  const dishes: IlLink[] = facets
    .filter((x) => x.o.kind === "dish")
    .slice(0, 5)
    .map((x) => ({ name: occLabel(x.o.slug), href: withLocale(locale, goodForPath(citySlug, x.o.slug, locale)) }));

  const guide: IlLink[] = guides
    .filter((g) => g.entries.length > 0 && g.entries.some((e) => venueSlugs.has(e.venue_slug)))
    .slice(0, 3)
    .map((g) => ({ name: localizeGuide(g, locale).title_en, href: withLocale(locale, `/guides/${g.slug}/`) }));

  return [
    { key: "barrio", links: barrio },
    { key: "pairs", links: pairs },
    { key: "dishes", links: dishes },
    { key: "guide", links: guide },
  ];
}
