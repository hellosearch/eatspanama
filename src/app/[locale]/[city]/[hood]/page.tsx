import type { Metadata } from "next";
import { toClientVenue } from "@/lib/client-photo";
import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  allNeighborhoods,
  cityVenueCount,
  getCity,
  getGuides,
  getNeighborhood,
  getVenue,
  getVenuesInNeighborhood,
  allVenues,
} from "@/lib/data";
import { absoluteUrl, cityPath, citySlugFor, cuisineHubPath, guidesIndexPath, listingPath, venuePath, withLocale } from "@/lib/paths";
import { cuisineHubExists } from "@/lib/cuisines";
import VenueProfileView, { venueMetadata } from "@/components/VenueProfileView";
import BrandView, { brandMetadata } from "@/components/BrandView";
import { assertNoVenueHoodCollision } from "@/lib/collisions";
import { brands, getBrand } from "@/lib/brands";
import { brandOf } from "@/lib/brands";
import { cleanCuisine, formatMonth, guideUpdated, slugify } from "@/lib/format";
import { pairedAlternates, indexable, clampDescription } from "@/lib/seo";
import { neighborhoodFaqs } from "@/lib/faq";
import { venueItemListJsonLd } from "@/lib/jsonld";
import Breadcrumb from "@/components/Breadcrumb";
import PhotoCredit from "@/components/PhotoCredit";
import { toClientPhoto } from "@/lib/client-photo";
import FaqBlock from "@/components/FaqBlock";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import NeighborhoodHero from "@/components/NeighborhoodHero";
import NewsletterBand from "@/components/NewsletterBand";
import { MapTeaser } from "@/components/MapTeaser";
import DiscoveryView from "@/components/DiscoveryView";
import { discoveryLabels } from "@/lib/discovery-labels";
import { SecIcon } from "@/components/icons";
import { UpdatedStamp, VerifiedStamp } from "@/components/badges";
import { GuideCard, HubSpokeTile } from "@/components/cards";
import { localizeGuide } from "@/lib/localize";

interface Params {
  locale: string;
  city: string;
  hood: string;
}

/**
 * The second segment is EITHER a neighborhood or a venue:
 *   /panama-city/casco-viejo/   -> neighborhood listing
 *   /panama-city/luna-cafe/     -> venue profile
 * Resolved neighborhood-first. assertNoVenueHoodCollision() fails the build if
 * a venue slug ever equals a neighborhood slug, so the two can never clash.
 */
export function generateStaticParams({ params }: { params: { locale: string } }) {
  const { locale } = params;
  assertNoVenueHoodCollision();
  const hoods = allNeighborhoods.map((n) => ({
    city: citySlugFor(n.city_slug, locale),
    hood: locale === "es" ? n.slug_es : n.slug,
  }));
  const venues = allVenues
    .filter((v) => v.status === "open")
    .map((v) => {
      const hood = allNeighborhoods.find((n) => n.slug === v.neighborhood_slug)!;
      return { city: citySlugFor(hood.city_slug, locale), hood: v.slug };
    });
  const brandPages = brands.map((b) => ({ city: citySlugFor(b.citySlug, locale), hood: b.slug }));
  return [...hoods, ...brandPages, ...venues];
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, city, hood } = await params;
  const found = await getNeighborhood(city, hood, locale);
  // Segment order: neighborhood, then brand, then venue.
  if (!found) {
    const cityRec = await getCity(city, locale);
    if (cityRec && getBrand(cityRec.slug, hood)) return brandMetadata(locale, cityRec.slug, hood);
    return venueMetadata(locale, hood);
  }
  const h = found.hood;
  const h1 = locale === "es" ? h.h1_es : h.h1_en;
  const title = `${h1.pre}${h1.accent}${h1.post} | EatsPanama`;
  const description = clampDescription(locale === "es" ? h.intro_es : h.intro_en);
  const alternates = pairedAlternates(locale, {
    en: listingPath(h.city_slug, h.slug, "en"),
    es: listingPath(h.city_slug, h.slug, "es"),
  });
  return {
    title,
    description,
    alternates,
    openGraph: { title, description, url: alternates.canonical },
    robots: indexable(),
  };
}

export default async function ListingPage({ params }: { params: Promise<Params> }) {
  const { locale, city, hood: hoodSlug } = await params;
  setRequestLocale(locale);
  const found = await getNeighborhood(city, hoodSlug, locale);
  if (!found) {
    // Not a neighborhood - try a brand, then a venue, before giving up.
    const cityRec = await getCity(city, locale);
    const brand = cityRec ? getBrand(cityRec.slug, hoodSlug) : undefined;
    if (cityRec && brand) {
      return <BrandView locale={locale} citySlug={cityRec.slug} brand={brand} />;
    }
    const venue = await getVenue(hoodSlug);
    const vHood = venue ? allNeighborhoods.find((n) => n.slug === venue.neighborhood_slug) : undefined;
    const vFound = vHood ? await getNeighborhood(vHood.city_slug, vHood.slug, "en") : undefined;
    if (!venue || !vFound) notFound();
    return <VenueProfileView locale={locale} venue={venue} cityRec={vFound.city} hood={vFound.hood} />;
  }
  const { city: cityRec, hood } = found;

  const t = await getTranslations({ locale, namespace: "Listing" });
  const th = await getTranslations({ locale, namespace: "Home" });
  const [venues, guidesRaw] = await Promise.all([
    getVenuesInNeighborhood(hood.slug),
    getGuides(),
  ]);
  const guides = guidesRaw.map((g) => localizeGuide(g, locale));

  // The freshness stamp is derived from the records on THIS page - previously
  // it was a hardcoded "Updated Jul 2026" string in the message catalog, which
  // would have kept saying July 2026 forever.
  const dataMonth =
    venues
      .map((v) => v.verified_at)
      .filter(Boolean)
      .sort()
      .at(-1) ?? "";

  const faqs = neighborhoodFaqs(hood, venues, locale);
  const h1 = locale === "es" ? hood.h1_es : hood.h1_en;
  const cityName = locale === "es" ? cityRec.name_es : cityRec.name_en;

  const vHref = (slug: string) => withLocale(locale, venuePath(hood.city_slug, slug, locale));
  const selfAbs = absoluteUrl(locale, listingPath(hood.city_slug, hood.slug, locale));

  // Hub-spoke cuisine links (approved module). Counts are REAL - computed from
  // the neighborhood's venues by primary cuisine. Cuisine child pages are a
  // later IA ticket (the links point at their future URLs).
  const cuisineCounts = new Map<string, number>();
  for (const v of venues) {
    const c = cleanCuisine(v.cuisine_en[0] ?? "");
    if (!c) continue;
    cuisineCounts.set(c, (cuisineCounts.get(c) ?? 0) + 1);
  }
  // Generic buckets (International, Bar, Cafe...) are usually the top raw counts
  // but the least useful thing to tap - a diner wants specific cuisines. So rank
  // specific cuisines first (by count), then the generic ones, and show more of
  // them (Chris: "update to the popular", scrollable on mobile).
  const GENERIC_CUISINE = new Set(["international", "bar", "cafe", "café", "fast food", "food", "takeaway", "restaurant"]);
  const cuisineHub = [...cuisineCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([title, count]) => ({ title, count, seg: slugify(title), generic: GENERIC_CUISINE.has(title.toLowerCase()) }))
    .sort((a, b) => Number(a.generic) - Number(b.generic)) // stable: specific first, generic last
    .slice(0, 10);

  // Hero quick-nav chips: the top (specific-first) cuisines, linked to their hub
  // page when it exists. Horizontally scrollable on mobile.
  const heroCuisines = cuisineHub.slice(0, 8).map((c) => ({
    ...c,
    href: cuisineHubExists(hood.slug, c.seg)
      ? withLocale(locale, cuisineHubPath(hood.city_slug, hood.slug, c.seg, locale))
      : undefined,
  }));

  // Split discovery view (filter rail + list + interactive Leaflet map). Cards
  // keep the real Venue objects (server-rendered inside the client view -> links
  // stay in HTML for SEO); the client view derives pins + filter facets.
  const discItems = venues.map((v) => {
    const b = brandOf(v);
    return {
      venue: toClientVenue(v),
      href: vHref(v.slug),
      brandSlug: b?.slug,
      brandCount: b?.count,
      brandHref: b ? withLocale(locale, `${cityPath(hood.city_slug, locale)}${b.slug}/`) : undefined,
    };
  });

  return (
    <>
      <Breadcrumb
        crumbs={[
          { name: t("home"), href: withLocale(locale, "/"), absUrl: absoluteUrl(locale, "/") },
          {
            name: cityName,
            href: withLocale(locale, cityPath(hood.city_slug, locale)),
            absUrl: absoluteUrl(locale, cityPath(hood.city_slug, locale)),
          },
          { name: hood.name, absUrl: selfAbs },
        ]}
      />

      {/* ABOVE THE FOLD: text block first in DOM, images beside it */}
      <div className="listing-head">
        <div className="lh-copy">
          <p className="lh-kicker">{locale === "es" ? hood.kicker_es : hood.kicker_en}</p>
          <h1>
            {h1.pre}
            <span className="accent">{h1.accent}</span>
            {h1.post}
          </h1>
          <p className="lh-intro">{locale === "es" ? hood.intro_es : hood.intro_en}</p>
          <div className="trust-row">
            <VerifiedStamp>{t("noPaidRankings")}</VerifiedStamp>
            <UpdatedStamp>{t("dataUpdated", { month: formatMonth(dataMonth) })}</UpdatedStamp>
          </div>
          {heroCuisines.length > 0 && (
            <div className="lh-chips">
              {heroCuisines.map((c) =>
                c.href ? (
                  <a className="lh-chip" href={c.href} key={c.seg}>
                    {c.title}
                  </a>
                ) : (
                  <span className="lh-chip" key={c.seg}>
                    {c.title}
                  </span>
                )
              )}
            </div>
          )}
        </div>
        {hood.hero_image ? (
          <div className="lh-hero-photo">
            <Image
              src={hood.hero_image.url}
              alt={locale === "es" ? hood.hero_image.alt_es : hood.hero_image.alt_en}
              fill
              sizes="(max-width: 900px) 100vw, 440px"
              className="img-cover"
              priority
            />
            {hood.hero_image.credit_en && (
              <PhotoCredit
                text={hood.hero_image.credit_en}
                href={toClientPhoto(hood.hero_image).credit_href}
                className="lh-hero-credit"
              />
            )}
          </div>
        ) : hood.media && hood.media.length > 0 ? (
          <div className="lh-media" aria-hidden="true">
            {hood.media.map((m, i) => (
              <div className="ph" key={i}>
                <Image src={m.url} alt="" fill sizes="200px" className="img-cover" />
              </div>
            ))}
            <MapTeaser label={t("seeMap")} />
          </div>
        ) : (
          <NeighborhoodHero
            name={hood.name}
            cityName={cityName}
            countLabel={t("places", { count: hood.venue_count })}
            topCuisines={hood.top_cuisines}
          />
        )}
      </div>

      {/* Editors' Picks section removed for now (Chris: unnecessary, pushed the
          valuable list + map content down). The full list below is the lead. */}

      {/* H2: FULL LISTING GRID + ItemList/Restaurant JSON-LD */}
      <section className="block block-fog block-discovery">
        <div className="sec-head iconed">
          <SecIcon name="explore" />
          <div>
            <p className="eyebrow">{t("fullListEyebrow")}</p>
            <h2 className="sec-title">{t("fullListTitle", { count: hood.venue_count, hood: hood.name })}</h2>
            <p className="sec-sub">{t("fullListSub", { hood: hood.name })}</p>
          </div>
        </div>
        <DiscoveryView
          items={discItems}
          locale={locale}
          verifiedLabel={t("verified")}
          waLabel={t("whatsapp")}
          labels={discoveryLabels(t, t("fullListTitle", { count: hood.venue_count, hood: hood.name }))}
        />
        <JsonLd
          data={venueItemListJsonLd(
            venues,
            (v) => absoluteUrl(locale, venuePath(hood.city_slug, v.slug, locale)),
            hood.name,
            hood.venue_count
          )}
        />
      </section>

      {/* The "What's changed this month" module was removed in the July 2026
          content-integrity pass: its entries were fabricated (including a
          closure for a restaurant that never existed), and there is no dated
          add/remove history in the dataset yet to rebuild it from honestly. */}

      {/* H2: HUB-SPOKE CUISINE INTERLINKS */}
      <section className="block" style={{ paddingTop: 0 }}>
        <div className="sec-head iconed">
          <SecIcon name="food" />
          <div>
            <p className="eyebrow">{t("cuisineEyebrow")}</p>
            <h2 className="sec-title">{t("cuisineTitle", { hood: hood.name })}</h2>
            <p className="sec-sub">{t("cuisineSub")}</p>
          </div>
        </div>
        <div className="linkhub">
          {cuisineHub.map((c) => {
            // Only render a link when the (hood, cuisine) hub page actually
            // exists (>= 3 venues). Thin cuisines render as plain text -> zero 404s.
            const href = cuisineHubExists(hood.slug, c.seg)
              ? withLocale(locale, cuisineHubPath(hood.city_slug, hood.slug, c.seg, locale))
              : undefined;
            return (
              <HubSpokeTile key={c.seg} title={c.title} count={t("places", { count: c.count })} href={href} />
            );
          })}
          <HubSpokeTile
            title={t("allCity")}
            count={t("places", { count: cityVenueCount(cityRec.slug) })}
            href={withLocale(locale, cityPath(cityRec.slug, locale))}
          />
        </div>
      </section>

      {/* H2: FAQ (data-generated) + FAQPage JSON-LD */}
      <section className="block faq-sec" style={{ paddingTop: 0 }}>
        <div className="sec-head iconed">
          <SecIcon name="faq" />
          <div>
            <p className="eyebrow">{t("faqEyebrow")}</p>
            <h2 className="sec-title">{t("faqTitle", { hood: hood.name })}</h2>
          </div>
        </div>
        <FaqBlock faqs={faqs} variant="accordion2" />
      </section>

      {/* H2: RELATED GUIDE CROSS-LINK */}
      <section className="block" style={{ paddingTop: 0 }}>
        <div className="sec-head">
          <div>
            <p className="eyebrow">{t("exploreEyebrow")}</p>
            <h2 className="sec-title">{t("exploreTitle")}</h2>
          </div>
          <a className="see-all" href={withLocale(locale, guidesIndexPath())}>
            {t("allGuides", { count: guides.length })}
          </a>
        </div>
        <div className="guides single">
          {guides
            // Only cross-link to guides that actually ship (entries > 0) - same
            // filter the guides route + sitemap use - so this never 404s.
            .filter((g) => g.entries.length > 0)
            .slice(0, 1)
            .map((g) => (
              <GuideCard
                key={g.slug}
                guide={g}
                locale={locale}
                href={withLocale(locale, `/guides/${g.slug}/`)}
                updatedLabel={guideUpdated(g.updated_iso)}
                spotsLabel={th("spots", { count: g.entries.length })}
                readLabel={th("readGuide")}
              />
            ))}
        </div>
      </section>

      <NewsletterBand locale={locale} />
      <Footer locale={locale} />
    </>
  );
}
