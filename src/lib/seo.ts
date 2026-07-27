/**
 * hreflang / canonical helpers (agency-website pattern, adapted for
 * per-locale SLUGS, not just prefixes).
 *
 * Rules (locked SEO template rules):
 * - hreflang ships ONCE, in the HTML <head> via `alternates` metadata
 *   (next-intl's HTTP Link emission is disabled in i18n/routing.ts).
 * - x-default -> EN.
 * - EN-only pages (guides until their native-ES twins are written) canonical
 *   to the EN URL and advertise NO es hreflang, so /es/... duplicates never
 *   get indexed as separate English pages.
 */
import { routing } from "@/i18n/routing";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://eatspanama.com";

/** Paired page: pass the locale-stripped path PER locale. */
export function pairedAlternates(locale: string, paths: Record<string, string>) {
  const href = (l: string) => {
    const p = paths[l] ?? paths[routing.defaultLocale];
    return l === routing.defaultLocale ? `${SITE}${p}` : `${SITE}/${l}${p}`;
  };
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = href(l);
  languages["x-default"] = href(routing.defaultLocale);
  return { canonical: href(locale), languages };
}

/** Same path in every locale (homepage, /search, /newsletter). */
export function localeAlternates(locale: string, path: string = "") {
  const paths: Record<string, string> = {};
  for (const l of routing.locales) paths[l] = path;
  return pairedAlternates(locale, paths);
}

/** EN-only content: canonical + hreflang point ONLY at the EN URL. */
export function enOnlyAlternates(path: string = "") {
  const enHref = `${SITE}${path}`;
  return { canonical: enHref, languages: { en: enHref, "x-default": enHref } };
}

export const SITE_URL = SITE;
export const SITE_NAME = "EatsPanama";
/**
 * Default social-share image (branded 1200x630, public/og-default.png).
 * Root-relative - metadataBase (set in the root layout) resolves it to an
 * absolute URL. Pages set their own openGraph, and Next REPLACES (not merges)
 * openGraph per segment, so each page must include this explicitly to have an
 * og:image. Pages with a real image (guide hero, claimed-venue photos) pass
 * their own instead. Final designed asset is a launch nicety.
 */
export const OG_DEFAULT_IMAGE = "/og-default.png";
export const NOINDEX = process.env.SITE_NOINDEX === "1";

/** metadata.robots for an indexable page (respects the staging guard). */
export function indexable() {
  return NOINDEX ? { index: false, follow: true } : { index: true, follow: true };
}

/** metadata.robots for pages that are never indexable (/search). */
export function neverIndex() {
  return { index: false, follow: true };
}
