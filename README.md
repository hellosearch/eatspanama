# EatsPanama - Production Site

Next.js 16 app implementing the **locked** D2 "The Modern Guide" (Tangerine) design
for eatspanama.com. Bilingual EN/ES restaurant discovery for Panama.

M15 repo scaffold + first slice of the M14 component library. Runs entirely on
typed mock fixtures today; Supabase / Sanity / Typesense / Resend are later
tickets with clean seams (see below).

## Stack

- **Next.js 16.2.7** (App Router, Turbopack, SSG) + **TypeScript** (strict) + **React 19**
- **Tailwind 4** (`@tailwindcss/postcss`, CSS-first `@theme`)
- **next-intl 4** - `en` default at root, `es` under `/es/` (proxy.ts middleware)
- **next/font** - Space Grotesk (display) + Inter (body), self-hosted, `latin-ext`
- Patterns lifted from `internal/agency-website/` (routing, hreflang alternates,
  fonts, security headers, staging noindex guard).

## Commands

```bash
npm run dev      # local dev (http://localhost:3000)
npm run build    # production build - must pass with zero type errors
npm run start    # serve the production build
npm run lint     # eslint (eslint-config-next core-web-vitals)
npm run tokens   # regenerate src/styles/tokens.generated.css from brand-tokens.json
```

## Design tokens (single source of truth)

`../design/tokens/brand-tokens.json` (locked 2026-07-14) is the ONLY place
brand values live. `scripts/generate-tokens.mjs` compiles it into
`src/styles/tokens.generated.css` (a Tailwind `@theme` block -> CSS variables).
Components never hardcode hex. Non-brand utility values derived from the
approved comps are documented in one place at the top of `src/styles/globals.css`.

Hard rules baked into the components:

- WhatsApp CTAs are ALWAYS WhatsApp green (`--color-whatsapp`), never brand accent.
- The 10px/12px tangerine offset shadow (`--shadow-offset`) is THE signature -
  once per viewport, never stacked (hero search card, newsletter issue card).
- No star ratings, no deal/coupon styling, ever.
- Trust grammar ships WITH components: named editor + visited date on verdicts,
  ADDED / RE-VISITED tags on cards, verified stamps on every venue card.

## Routes (mock data)

| Route | Notes |
|---|---|
| `/` and `/es/` | Homepage (EN + native-ES twin) |
| `/panama-city/casco-viejo/` | Neighborhood listing (all 4 hoods prerendered) |
| `/es/ciudad-de-panama/casco-viejo/` | ES twin - localized SLUGS, not just prefix |
| `/panama-city/casco-viejo/fonda-lo-que-hay/` | Venue profile (all 16 venues) |
| `/guides/best-brunch-panama-city/` | Editorial guide (EN-canonical) |
| `/search/?q=...` | Search - `noindex,follow` ALWAYS |
| `/newsletter/` | Capture page |
| `/sitemap.xml`, `/robots.txt`, `/icon.svg` | Indexable URLs only in the sitemap |

## SEO layer (approved template rules)

- Text-first above the fold: breadcrumb -> keyword H1 -> intro -> trust row, in DOM order.
- One H1 per page, no heading-level skips (hidden H2 on /search).
- BreadcrumbList on every templated page (component emits trail + schema together).
- ItemList + Restaurant JSON-LD on listings; Restaurant on profiles; Article +
  FAQPage on guides; FAQPage on listings. **No aggregateRating anywhere.**
- FAQs are data-generated from the page's own venues (`src/lib/faq.ts`) - never
  hand-written per page.
- "What's changed this month" freshness module on listings (`ChangedThisMonth`).
- hreflang: EN/ES pairs reciprocal + x-default -> EN, shipped ONCE in `<head>`
  (next-intl Link-header emission disabled). EN-only content (guides, profiles)
  canonicalizes to EN and advertises no `es` hreflang until native-ES twins land.
- `localeDetection` is OFF and must stay off: EN/ES use different slugs, so
  next-intl's prefix-swap redirect would 404 (documented in `src/i18n/routing.ts`).

## Staging guard (scope R10)

`SITE_NOINDEX=1` **at build time** emits `X-Robots-Tag: noindex, follow` on every
response AND `<meta name="robots" content="noindex, follow">` on every page.
Set it on every non-production environment (Vercel env var); remove only at the
launch gate. Verified working (header + meta) in QA.

## Integration seams (later tickets)

All data flows through `src/lib/data.ts` - pages never import fixtures directly.

- **TODO(supabase)**: venues / neighborhoods / change_log / hours. The types in
  `src/data/mock.ts` mirror the planned schema (venue: slug, name, cuisine[],
  price_tier, neighborhood, verified_at, lat/lng, phones, hours, photos...).
- **TODO(sanity)**: guides move to Sanity documents (agency-website pattern).
- **TODO(typesense)**: `searchVenues()` swaps to Typesense; the in-memory filter
  stays as fallback. Filter chips then rewrite `?q=` params live.
- **TODO(resend)**: newsletter forms POST to a Resend double-opt-in endpoint
  (currently non-capturing).
- **TODO(maps)**: `MapTeaser` / `MapPanel` are static placeholders per the comps.
- **TODO(ia)**: cuisine child pages (`/panama-city/casco-viejo/panamanian/`),
  city hubs (`/panama-city/`), guides index, legal pages. Hub-spoke tiles
  already emit the canonical future URLs.
- **TODO(es-editorial)**: `es_reviewed` flags gate native-ES copy sign-off;
  guide/profile ES twins (e.g. `/es/guias/...`) once written natively.

## Known flags for the design QA gate

- **axe color-contrast (serious)**: the locked palette's own contrast spec
  (accent on paper 3.1:1 bold-UI, accentDeep 4.0:1) sits below WCAG AA's 4.5:1
  for normal text, so axe flags accent kickers / verified stamps / white-on-accent
  button labels sitewide. This is a locked-design decision to revisit at the
  design gate, not a build bug. Everything else scans clean (heading order,
  landmarks, labels, keyboard focus styles).
- Lighthouse / Core Web Vitals gate runs at the deploy ticket via
  `/release-checklist` + `/lighthouse-check` (staging never launched from here).
