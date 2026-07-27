import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

// Next 16 renamed the "middleware" file convention to "proxy" - same handler.
// alternateLinks is disabled in i18n/routing.ts: hreflang ships once, in the
// HTML <head> via each page's `alternates` metadata (agency-website pattern -
// emitting both HTTP Link headers AND head tags gets flagged as
// "Hreflang: Multiple Entries").
const intlMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
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
