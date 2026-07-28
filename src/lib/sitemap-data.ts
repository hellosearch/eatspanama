import type { MetadataRoute } from "next";
import { cities } from "@/data/mock";
import { allNeighborhoods as neighborhoods, allVenues as venues, guides } from "@/lib/data";
import { cuisineHubs, cityCuisineHubs } from "@/lib/cuisines";
import { goodForOccasions } from "@/lib/goodfor";
import { cityPath, cityCuisinePath, cityCuisineIndexPath, goodForPath, goodForIndexPath, cuisineHubPath, listingPath, venuePath } from "@/lib/paths";
import { SITE_URL } from "@/lib/seo";

/**
 * Sitemap URL entries. Consumed by the /sitemap.xml route handler
 * (src/app/sitemap.xml/route.ts), which serializes them to XML WITH an
 * xml-stylesheet directive so a human opening the sitemap sees a styled table
 * (Next's built-in sitemap.ts cannot emit that directive).
 *
 * The sitemap MIRRORS each page's own hreflang/canonical model (src/lib/seo.ts):
 * - Bilingual, self-canonical pages (home, city, neighborhood, city-cuisine
 *   index + segment, good-for index + occasion, venues, guide articles, policy,
 *   newsletter) emit BOTH the EN and ES <loc>, each carrying the full en/es/
 *   x-default <xhtml:link> block - matching the page's <head> hreflang.
 * - EN-only pages (neighborhood+cuisine hub, guides index - both `enOnlyAlternates`)
 *   emit a single EN <loc> and advertise no ES twin.
 * /search + /saved are noindex by design and never listed.
 * TODO(supabase): generated from live tables in the data ticket.
 */
export function sitemapEntries(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  // A bilingual URL: push the EN and ES <loc> as two entries, each carrying the
  // same en/es/x-default alternates (self-canonical per locale, x-default -> EN).
  // enStripped/esStripped are locale-stripped paths; withLocale adds the /es prefix.
  const pair = (
    enStripped: string,
    esStripped: string,
    base: Omit<MetadataRoute.Sitemap[number], "url" | "alternates">,
  ) => {
    const en = `${SITE_URL}${enStripped}`;
    const es = `${SITE_URL}/es${esStripped}`;
    const languages = { en, es, "x-default": en };
    entries.push({ url: en, ...base, alternates: { languages } });
    entries.push({ url: es, ...base, alternates: { languages } });
  };

  // An EN-only URL (page advertises no ES twin): single <loc>, no alternates.
  const enOnly = (
    enStripped: string,
    base: Omit<MetadataRoute.Sitemap[number], "url" | "alternates">,
  ) => {
    entries.push({ url: `${SITE_URL}${enStripped}`, ...base });
  };

  // Homepage (bilingual)
  pair("/", "/", { changeFrequency: "daily", priority: 1 });

  // City hubs / neighborhood indexes (bilingual)
  for (const city of cities) {
    pair(cityPath(city.slug, "en"), cityPath(city.slug, "es"), { changeFrequency: "weekly", priority: 0.9 });
  }

  // Neighborhood listings (bilingual)
  for (const hood of neighborhoods) {
    pair(
      listingPath(hood.city_slug, hood.slug, "en"),
      listingPath(hood.city_slug, hood.slug, "es"),
      { changeFrequency: "weekly", priority: 0.9 },
    );
  }

  // Neighborhood+cuisine hubs (EN-only - enOnlyAlternates in [venue]/page.tsx).
  for (const hub of cuisineHubs) {
    const hood = neighborhoods.find((n) => n.slug === hub.hoodSlug);
    if (!hood) continue;
    enOnly(cuisineHubPath(hood.city_slug, hood.slug, hub.seg, "en"), { changeFrequency: "weekly", priority: 0.6 });
  }

  // Cuisines index per city (bilingual - pairedAlternates in cuisine/page.tsx).
  for (const city of cities) {
    pair(cityCuisineIndexPath(city.slug, "en"), cityCuisineIndexPath(city.slug, "es"), { changeFrequency: "weekly", priority: 0.6 });
  }

  // "Good for" occasion index + facet pages (bilingual - pairedAlternates).
  for (const city of cities) {
    pair(goodForIndexPath(city.slug, "en"), goodForIndexPath(city.slug, "es"), { changeFrequency: "weekly", priority: 0.6 });
  }
  for (const o of goodForOccasions) {
    pair(goodForPath(o.citySlug, o.slug, "en"), goodForPath(o.citySlug, o.slug, "es"), { changeFrequency: "weekly", priority: 0.6 });
  }

  // City-wide cuisine pages (bilingual - pairedAlternates in cuisine/[seg]/page.tsx).
  for (const hub of cityCuisineHubs) {
    pair(cityCuisinePath(hub.citySlug, hub.seg, "en"), cityCuisinePath(hub.citySlug, hub.seg, "es"), { changeFrequency: "weekly", priority: 0.6 });
  }

  // Venue profiles (bilingual - pairedAlternates in VenueProfileView).
  for (const v of venues.filter((v) => v.status === "open")) {
    const hood = neighborhoods.find((n) => n.slug === v.neighborhood_slug);
    if (!hood) continue;
    pair(venuePath(hood.city_slug, v.slug, "en"), venuePath(hood.city_slug, v.slug, "es"), { changeFrequency: "weekly", priority: 0.7 });
  }

  // Guides index (EN-only - enOnlyAlternates in guides/page.tsx).
  enOnly("/guides/", { changeFrequency: "weekly", priority: 0.7 });

  // Guide articles (bilingual - localeAlternates in guides/[slug]/page.tsx).
  for (const g of guides.filter((g) => g.entries.length > 0)) {
    pair(`/guides/${g.slug}/`, `/guides/${g.slug}/`, { changeFrequency: "weekly", priority: 0.8 });
  }

  // Newsletter capture page (bilingual - localeAlternates; indexable, unlinked).
  pair("/newsletter/", "/newsletter/", { changeFrequency: "monthly", priority: 0.5 });

  // Trust / policy pages (bilingual - localeAlternates in each page.tsx).
  for (const path of ["/how-we-review/", "/contact/", "/privacy/", "/terms/"]) {
    pair(path, path, { changeFrequency: "monthly", priority: 0.4 });
  }

  return entries;
}
