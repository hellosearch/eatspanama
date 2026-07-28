import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Security / best-practice response headers, applied to all routes.
// Pattern lifted from internal/agency-website/next.config.ts (proven on
// searchleads.agency), trimmed to what this site actually loads: no Sanity
// Studio, no ad pixels yet. Every image is self-hosted under /public: the
// venue DB runs on mock fixtures (swap for Supabase storage / CDN later).
const csp = [
  "default-src 'self'",
  // Next 16 RSC bootstrap injects inline scripts without a per-request nonce.
  // 'unsafe-eval' is added in DEV ONLY: `next dev` (Fast Refresh + eval source
  // maps) evaluates code via eval(), which a CSP without 'unsafe-eval' blocks -
  // that is the "eval() is not supported" console error. A production build
  // never calls eval(), so the prod header stays hardened as
  // `script-src 'self' 'unsafe-inline'`.
  // googletagmanager.com hosts GA4's gtag.js (loaded only when NEXT_PUBLIC_GA_ID
  // is set - see src/components/Analytics.tsx).
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // OpenStreetMap raster tiles power the interactive Leaflet discovery map
  // (leaflet renders tiles as <img>). No API key / billing (non-commercial).
  // GA4 also sends some hits as image beacons.
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://www.googletagmanager.com https://*.google-analytics.com",
  "font-src 'self' data:",
  // GA4 collect beacons (google-analytics.com / region1 / analytics.google.com).
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
  // Keyless Google Maps embed on venue profiles (maps.google.com/...&output=embed).
  "frame-src https://www.openstreetmap.org https://maps.google.com https://www.google.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self' https://wa.me",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

// Staging guard (scope R10): SITE_NOINDEX=1 emits X-Robots-Tag noindex on
// EVERY response (belt) in addition to the metadata robots noindex emitted by
// src/app/[locale]/layout.tsx (suspenders). Staging must never be indexable.
const NOINDEX = process.env.SITE_NOINDEX === "1";
const noindexHeader = NOINDEX
  ? [{ key: "X-Robots-Tag", value: "noindex, follow" }]
  : [];

const nextConfig: NextConfig = {
  // The IA map's URL scheme uses trailing slashes (/panama-city/casco-viejo/).
  trailingSlash: true,
  // This app is nested inside the agency monorepo checkout; pin the tracing
  // root so Next doesn't adopt the outer package-lock as workspace root.
  outputFileTracingRoot: __dirname,
  images: {
    // No remote image hosts. Venue photos are downloaded and re-hosted (CDN
    // URLs expire and hotlinking breaks the venue-owned-photo rule), and stock
    // imagery is not used at all.
    remotePatterns: [],
    // Serve AVIF first (≈20-30% smaller than WebP at equal quality), WebP as
    // the fallback for older clients. The optimizer negotiates per-request via
    // Accept; source JPEGs on disk are only the origin for these transcodes.
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: [...securityHeaders, ...noindexHeader] },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
