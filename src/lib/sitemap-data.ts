import type { MetadataRoute } from "next";
import { cities } from "@/data/mock";
import { allNeighborhoods as neighborhoods, allVenues as venues, guides } from "@/lib/data";
import { cuisineHubs, cityCuisineHubs } from "@/lib/cuisines";
import { goodForOccasions } from "@/lib/goodfor";
import { cityPath, cityCuisinePath, cityCuisineIndexPath, goodForPath, goodForIndexPath, cuisineHubPath, listingPath, venuePath } from "@/lib/paths";
import { SITE_URL } from "@/lib/seo";

/**
 * Sitemap data for a SITEMAP INDEX with per-content-type child sitemaps, each
 * capped at CHUNK_SIZE URLs so no single file gets big/heavy and every section
 * (venues / discovery / guides / core) is monitorable on its own in Search
 * Console. Chunks auto-paginate ("venues-1", "venues-2", ...) as restaurants or
 * blog posts grow - well under Google's 50k-URL / 50MB hard limit, and a
 * comfortably crawlable ~5k per file.
 *
 * Each URL MIRRORS its page's own hreflang/canonical model (src/lib/seo.ts):
 * bilingual pages emit BOTH the EN and ES <loc> with a full en/es/x-default
 * <xhtml:link> block; EN-only pages (neighborhood+cuisine hub, guides index)
 * emit a single EN <loc>. /search + /saved are noindex and never listed.
 * TODO(supabase): generated from live tables in the data ticket.
 */
export const CHUNK_SIZE = 5000;

type Base = Omit<MetadataRoute.Sitemap[number], "url" | "alternates">;

/** Content-type groups, in the order they appear in the index. */
function buildGroups(): { group: string; entries: MetadataRoute.Sitemap }[] {
  const core: MetadataRoute.Sitemap = [];
  const discovery: MetadataRoute.Sitemap = [];
  const venuesG: MetadataRoute.Sitemap = [];
  const guidesG: MetadataRoute.Sitemap = [];

  // Bilingual URL -> EN + ES <loc>, each with the same en/es/x-default alternates.
  const pair = (arr: MetadataRoute.Sitemap, enStripped: string, esStripped: string, base: Base) => {
    const en = `${SITE_URL}${enStripped}`;
    const es = `${SITE_URL}/es${esStripped}`;
    const languages = { en, es, "x-default": en };
    arr.push({ url: en, ...base, alternates: { languages } });
    arr.push({ url: es, ...base, alternates: { languages } });
  };
  // EN-only URL (page advertises no ES twin): single <loc>, no alternates.
  const enOnly = (arr: MetadataRoute.Sitemap, enStripped: string, base: Base) => {
    arr.push({ url: `${SITE_URL}${enStripped}`, ...base });
  };

  // --- core: home, city hubs, guides index, newsletter, policy ---
  pair(core, "/", "/", { changeFrequency: "daily", priority: 1 });
  for (const city of cities) {
    pair(core, cityPath(city.slug, "en"), cityPath(city.slug, "es"), { changeFrequency: "weekly", priority: 0.9 });
  }
  enOnly(core, "/guides/", { changeFrequency: "weekly", priority: 0.7 });
  pair(core, "/newsletter/", "/newsletter/", { changeFrequency: "monthly", priority: 0.5 });
  for (const path of ["/how-we-review/", "/contact/", "/privacy/", "/terms/"]) {
    pair(core, path, path, { changeFrequency: "monthly", priority: 0.4 });
  }

  // --- discovery: neighborhoods, hood+cuisine hubs, cuisine index/segs, good-for ---
  for (const hood of neighborhoods) {
    pair(discovery, listingPath(hood.city_slug, hood.slug, "en"), listingPath(hood.city_slug, hood.slug, "es"), { changeFrequency: "weekly", priority: 0.9 });
  }
  for (const hub of cuisineHubs) {
    const hood = neighborhoods.find((n) => n.slug === hub.hoodSlug);
    if (!hood) continue;
    enOnly(discovery, cuisineHubPath(hood.city_slug, hood.slug, hub.seg, "en"), { changeFrequency: "weekly", priority: 0.6 });
  }
  for (const city of cities) {
    pair(discovery, cityCuisineIndexPath(city.slug, "en"), cityCuisineIndexPath(city.slug, "es"), { changeFrequency: "weekly", priority: 0.6 });
    pair(discovery, goodForIndexPath(city.slug, "en"), goodForIndexPath(city.slug, "es"), { changeFrequency: "weekly", priority: 0.6 });
  }
  for (const o of goodForOccasions) {
    pair(discovery, goodForPath(o.citySlug, o.slug, "en"), goodForPath(o.citySlug, o.slug, "es"), { changeFrequency: "weekly", priority: 0.6 });
  }
  for (const hub of cityCuisineHubs) {
    pair(discovery, cityCuisinePath(hub.citySlug, hub.seg, "en"), cityCuisinePath(hub.citySlug, hub.seg, "es"), { changeFrequency: "weekly", priority: 0.6 });
  }

  // --- venues: venue profiles (the bulk; grows as restaurants are added) ---
  for (const v of venues.filter((v) => v.status === "open")) {
    const hood = neighborhoods.find((n) => n.slug === v.neighborhood_slug);
    if (!hood) continue;
    pair(venuesG, venuePath(hood.city_slug, v.slug, "en"), venuePath(hood.city_slug, v.slug, "es"), { changeFrequency: "weekly", priority: 0.7 });
  }

  // --- guides: editorial / blog articles (grows with the blog) ---
  for (const g of guides.filter((g) => g.entries.length > 0)) {
    pair(guidesG, `/guides/${g.slug}/`, `/guides/${g.slug}/`, { changeFrequency: "weekly", priority: 0.8 });
  }

  return [
    { group: "core", entries: core },
    { group: "discovery", entries: discovery },
    { group: "venues", entries: venuesG },
    { group: "guides", entries: guidesG },
  ];
}

/** The index manifest: one named chunk per <=CHUNK_SIZE slice of each group. */
export function sitemapManifest(): { name: string; entries: MetadataRoute.Sitemap }[] {
  const out: { name: string; entries: MetadataRoute.Sitemap }[] = [];
  for (const { group, entries } of buildGroups()) {
    if (!entries.length) continue;
    const chunks = Math.ceil(entries.length / CHUNK_SIZE);
    for (let i = 0; i < chunks; i++) {
      out.push({ name: `${group}-${i + 1}`, entries: entries.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE) });
    }
  }
  return out;
}

/** The URLs for one named child sitemap, or null if the name is unknown. */
export function sitemapChunk(name: string): MetadataRoute.Sitemap | null {
  return sitemapManifest().find((c) => c.name === name)?.entries ?? null;
}
