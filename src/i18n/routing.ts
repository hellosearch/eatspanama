import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "es"],
  defaultLocale: "en",
  // EN at root (/panama-city/casco-viejo/), ES prefixed
  // (/es/ciudad-de-panama/casco-viejo/) - matching the IA map URL scheme.
  // The city/neighborhood slugs themselves are localized in the data layer
  // (src/lib/paths.ts), not here.
  localePrefix: "as-needed",
  // MUST stay false: EN and ES use DIFFERENT slugs per segment
  // (/panama-city/... vs /es/ciudad-de-panama/...). next-intl's detection
  // redirect swaps only the PREFIX, so an es-cookied visitor hitting an EN
  // URL would be sent to /es/panama-city/... -> 404. With detection off,
  // every URL deterministically serves its own locale and the EN|ES toggle
  // (slug-aware, src/lib/paths.ts) is the switching mechanism - also the
  // SEO-safer behavior (no cookie/Accept-Language redirects).
  localeDetection: false,
  // hreflang ships in the HTML <head> via each page's `alternates` metadata -
  // never ALSO as HTTP Link headers (redundant double-implementation).
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];
