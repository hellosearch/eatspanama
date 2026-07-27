import type { MetadataRoute } from "next";
import { cities } from "@/data/mock";
import { allNeighborhoods as neighborhoods, allVenues as venues, guides } from "@/lib/data";
import { cuisineHubs, cityCuisineHubs } from "@/lib/cuisines";
import { goodForOccasions } from "@/lib/goodfor";
import { cityPath, cityCuisinePath, cityCuisineIndexPath, goodForPath, goodForIndexPath, cuisineHubPath, listingPath, venuePath, withLocale } from "@/lib/paths";
import { SITE_URL } from "@/lib/seo";

/**
 * Sitemap lists only INDEXABLE URLs: home + neighborhood listings (EN + ES
 * pairs with hreflang alternates), venue profiles + guides (EN-canonical for
 * now), /newsletter. /search is noindex by design and never listed.
 * TODO(supabase): generated from live tables in the data ticket.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const abs = (locale: string, path: string) => `${SITE_URL}${withLocale(locale, path)}`;
  const entries: MetadataRoute.Sitemap = [];

  // Homepage (EN + ES pair)
  entries.push({
    url: abs("en", "/"),
    changeFrequency: "daily",
    priority: 1,
    alternates: {
      languages: { en: abs("en", "/"), es: abs("es", "/"), "x-default": abs("en", "/") },
    },
  });

  // City hubs / neighborhood indexes (EN + ES pairs)
  for (const city of cities) {
    const en = abs("en", cityPath(city.slug, "en"));
    const es = abs("es", cityPath(city.slug, "es"));
    entries.push({
      url: en,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: { languages: { en, es, "x-default": en } },
    });
  }

  // Neighborhood listings (EN + ES pairs)
  for (const hood of neighborhoods) {
    const en = abs("en", listingPath(hood.city_slug, hood.slug, "en"));
    const es = abs("es", listingPath(hood.city_slug, hood.slug, "es"));
    entries.push({
      url: en,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: { languages: { en, es, "x-default": en } },
    });
  }

  // Neighborhood+cuisine hubs (EN-canonical; ES canonicalizes to EN, so only
  // the EN URL is listed - same treatment as venue profiles).
  for (const hub of cuisineHubs) {
    const hood = neighborhoods.find((n) => n.slug === hub.hoodSlug);
    if (!hood) continue;
    entries.push({
      url: abs("en", cuisineHubPath(hood.city_slug, hood.slug, hub.seg, "en")),
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  // Cuisines index per city (EN-canonical).
  for (const city of cities) {
    entries.push({
      url: abs("en", cityCuisineIndexPath(city.slug, "en")),
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  // "Good for" occasion index + facet pages (EN-canonical).
  for (const city of cities) {
    entries.push({ url: abs("en", goodForIndexPath(city.slug, "en")), changeFrequency: "weekly", priority: 0.6 });
  }
  for (const o of goodForOccasions) {
    entries.push({ url: abs("en", goodForPath(o.citySlug, o.slug, "en")), changeFrequency: "weekly", priority: 0.6 });
  }

  // City-wide cuisine pages (EN-canonical; ES canonicalizes to EN).
  for (const hub of cityCuisineHubs) {
    entries.push({
      url: abs("en", cityCuisinePath(hub.citySlug, hub.seg, "en")),
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  // Venue profiles (EN-canonical while ES twins await native copy)
  for (const v of venues.filter((v) => v.status === "open")) {
    const hood = neighborhoods.find((n) => n.slug === v.neighborhood_slug);
    if (!hood) continue;
    entries.push({
      url: abs("en", venuePath(hood.city_slug, v.slug, "en")),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // Guides index (EN-canonical blog landing)
  entries.push({ url: abs("en", "/guides/"), changeFrequency: "weekly", priority: 0.7 });

  // Guides (EN-canonical) - only fully-built guides ship
  for (const g of guides.filter((g) => g.entries.length > 0)) {
    entries.push({
      url: abs("en", `/guides/${g.slug}/`),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // Newsletter capture page (indexable, lightweight)
  entries.push({ url: abs("en", "/newsletter/"), changeFrequency: "monthly", priority: 0.5 });

  // Trust / policy pages (EN-canonical; ES serves EN copy and canonicalizes to
  // the EN URL, so only the EN URL is listed - same treatment as guides).
  for (const path of ["/how-we-review/", "/contact/", "/privacy/", "/terms/"]) {
    entries.push({ url: abs("en", path), changeFrequency: "monthly", priority: 0.4 });
  }

  return entries;
}
