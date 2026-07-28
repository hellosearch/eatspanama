/**
 * JSON-LD builders (approved SEO layer). No aggregateRating / star data
 * anywhere - EatsPanama does not do star ratings, and schema must not invent
 * them.
 */
import type { Guide, Neighborhood, Venue } from "@/data/mock";
import { priceGlyphs } from "@/lib/format";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

type JsonLd = Record<string, unknown>;

export function organizationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/icon.svg`,
        description:
          "Independent restaurant coverage for Panama, in English y en español. Built from public sources, no paid rankings, ever.",
      },
      {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        // Enables the Google sitelinks search box (search the site from the SERP).
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/search/?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

export function breadcrumbJsonLd(items: { name: string; url?: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      ...(it.url ? { item: it.url } : {}),
    })),
  };
}

/** "10:00 PM" / "5:00" / "12:00" / "Closed" -> "HH:MM" (24h) or null. */
function to24h(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const mer = m[3]?.toUpperCase();
  if (mer === "PM") h = h === 12 ? 12 : h + 12;
  else if (mer === "AM") h = h === 12 ? 0 : h;
  else {
    // No meridiem in the source: infer from typical service hours.
    // 1-6 -> afternoon/evening (PM); 12 -> noon; 7-11 -> morning (AM).
    if (h >= 1 && h <= 6) h += 12;
  }
  return `${String(h).padStart(2, "0")}:${min}`;
}

const SCHEMA_DAY: Record<string, string> = {
  Monday: "Monday",
  Tuesday: "Tuesday",
  Wednesday: "Wednesday",
  Thursday: "Thursday",
  Friday: "Friday",
  Saturday: "Saturday",
  Sunday: "Sunday",
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

function openingHoursSpec(venue: Venue) {
  const specs = venue.hours
    .map((h) => {
      if (!h.open || h.open === "Closed") return null;
      const opens = to24h(h.open);
      const closes = to24h(h.close);
      const day = SCHEMA_DAY[h.day_en];
      if (!opens || !closes || !day) return null;
      return { "@type": "OpeningHoursSpecification", dayOfWeek: [day], opens, closes };
    })
    .filter((s): s is NonNullable<typeof s> => s != null);
  return specs.length ? specs : undefined;
}

export function restaurantJsonLd(venue: Venue, url: string, hoodName: string): JsonLd {
  const hasDishes = (venue.dishes?.length ?? 0) > 0;
  const spec = openingHoursSpec(venue);
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: venue.name,
    url,
    servesCuisine: venue.cuisine_en,
    // priceRange only when a real tier is known (0 = unknown -> omit).
    ...(venue.price_tier > 0 ? { priceRange: priceGlyphs(venue.price_tier) } : {}),
    // image only when the listing actually has photos (Basic tier has none).
    ...(venue.photos.length ? { image: venue.photos.map((p) => p.url) } : {}),
    ...(venue.phones.call || venue.phones.whatsapp
      ? { telephone: venue.phones.call ?? venue.phones.whatsapp }
      : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: venue.address,
      addressLocality: `${hoodName}, Panama City`,
      addressCountry: "PA",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: venue.lat,
      longitude: venue.lng,
    },
    ...(hasDishes ? { hasMenu: `${url}#menu` } : {}),
    ...(spec ? { openingHoursSpecification: spec } : {}),
    // No aggregateRating / star data - EatsPanama does not do ratings, ever.
  };
}

/**
 * Lightweight ItemList for listing pages (neighborhood / cuisine / good-for).
 * Each ListItem is just position + url + name - the "summary page" pattern:
 * Google follows the url to each venue's own page, which carries the full
 * Restaurant + address + geo + hours schema (restaurantJsonLd). Inlining the
 * full entity for all ~230 venues here added ~1.9MB of HTML per big listing
 * (crawl-budget + LCP cost) with no rich-result benefit over the detail pages.
 * `_hoodName` is retained for call-site compatibility.
 */
export function venueItemListJsonLd(
  venuesOnPage: Venue[],
  urlFor: (v: Venue) => string,
  _hoodName: string,
  totalCount: number
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: totalCount,
    itemListElement: venuesOnPage.map((v, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: urlFor(v),
      name: v.name,
    })),
  };
}

/** WebPage node (used on the trust / policy pages). */
export function webPageJsonLd(name: string, url: string, description: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    url,
    description,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
}

export function faqJsonLd(faqs: { q: string; a: string; bullets?: string[]; aEnd?: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        // Flatten intro + bullets + closing into the plain-text answer so the
        // scannable UI and the schema stay in sync.
        text: [f.a, ...(f.bullets ?? []), f.aEnd].filter(Boolean).join(" "),
      },
    })),
  };
}

export function articleJsonLd(guide: Guide, url: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title_en,
    description: guide.description_en,
    ...(guide.hero ? { image: [guide.hero.url] } : {}),
    datePublished: guide.published_iso,
    dateModified: guide.updated_iso,
    // The guides are compiled by the publication, not signed by a person.
    // Naming a Person here previously asserted a byline that did not exist.
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.svg` },
    },
    mainEntityOfPage: url,
  };
}

export function neighborhoodListingJsonLd(
  hood: Neighborhood,
  _url: string,
  venuesOnPage: Venue[],
  urlFor: (v: Venue) => string
): JsonLd[] {
  return [venueItemListJsonLd(venuesOnPage, urlFor, hood.name, hood.venue_count)];
}
