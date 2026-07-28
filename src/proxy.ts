import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

// Next 16 renamed the "middleware" file convention to "proxy" - same handler.
// alternateLinks is disabled in i18n/routing.ts: hreflang ships once, in the
// HTML <head> via each page's `alternates` metadata (agency-website pattern -
// emitting both HTTP Link headers AND head tags gets flagged as
// "Hreflang: Multiple Entries").
const intlMiddleware = createMiddleware(routing);

// Spanish-speaking countries (Vercel `x-vercel-ip-country`). Used only as a
// tiebreaker when the browser gives no clear en/es signal.
const ES_COUNTRIES = new Set([
  "PA", "ES", "MX", "CO", "AR", "PE", "VE", "CL", "EC", "GT",
  "CU", "BO", "DO", "HN", "PY", "SV", "NI", "CR", "UY", "PR",
]);

/**
 * Which language to auto-select for a first-time homepage visitor.
 * BROWSER language wins (it is the person's real reading preference); GEO is only
 * a fallback when Accept-Language expresses no clear en/es preference.
 */
function prefersSpanish(request: NextRequest): boolean {
  const al = (request.headers.get("accept-language") || "").toLowerCase();
  const first = al.split(",")[0]?.trim() || "";
  if (first.startsWith("es")) return true; // browser Spanish -> ES
  if (first.startsWith("en")) return false; // browser English -> respect EN
  // No clear browser signal: fall back to the visitor's country.
  return ES_COUNTRIES.has((request.headers.get("x-vercel-ip-country") || "").toUpperCase());
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Language auto-select on the HOMEPAGE ONLY. `/` -> `/es/` is a clean prefix
  // swap. We deliberately do NOT auto-redirect deep pages: their slugs are
  // localized (/panama-city/... vs /es/ciudad-de-panama/...), which next-intl's
  // prefix-only detection would send to a 404 - so deep pages stay deterministic
  // and use the on-page EN|ES toggle instead (see i18n/routing.ts).
  if (pathname === "/") {
    const cookie = request.cookies.get("NEXT_LOCALE")?.value;
    // Stored choice wins; otherwise detect from browser (then geo).
    const wantEs = cookie === "es" || (!cookie && prefersSpanish(request));
    if (wantEs) {
      const url = request.nextUrl.clone();
      url.pathname = "/es";
      const res = NextResponse.redirect(url);
      // Remember the choice so we do not re-redirect and so the manual toggle
      // (which sets NEXT_LOCALE) is always respected.
      if (!cookie) res.cookies.set("NEXT_LOCALE", "es", { path: "/", maxAge: 60 * 60 * 24 * 365 });
      return res;
    }
  }

  return intlMiddleware(request);
}

export const config = {
  // Everything EXCEPT API routes, Next internals, and files with an extension.
  //
  // `go` is excluded too: it is the photo-credit redirect gateway, not a page.
  // It has no locale variants, and letting the i18n middleware near it made the
  // route unreachable - /go/<key>/ 404'd while /en/go/<key>/ 307'd in a loop.
  matcher: ["/((?!api|go|_next|_vercel|.*\\..*).*)"],
};
