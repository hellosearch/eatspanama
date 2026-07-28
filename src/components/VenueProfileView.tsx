import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { allVenues, allNeighborhoods, getGuides, getNeighborhood, getVenue, getVenuesInNeighborhood } from "@/lib/data";
import { cuisineHubExists } from "@/lib/cuisines";
import { perfectForFacets } from "@/lib/goodfor";
import SaveButton from "@/components/SaveButton";
import { absoluteUrl, cityPath, cuisineHubPath, goodForPath, listingPath, venuePath, withLocale } from "@/lib/paths";
import { pairedAlternates, indexable, clampDescription } from "@/lib/seo";
import { venueFaqs } from "@/lib/faq";
import { localizeVenue, localizeGuide } from "@/lib/localize";
import { cuisineLabelEs } from "@/lib/hub-copy";
import { restaurantJsonLd } from "@/lib/jsonld";
import {
  cleanCuisine,
  cuisineGlyphName,
  formatDishPrice,
  formatMonth,
  mapsDirectionsUrl,
  primaryCuisine,
  priceGlyphs,
  slugify,
  telUrl,
  whatsappUrl,
} from "@/lib/format";
import Breadcrumb from "@/components/Breadcrumb";
import OpenNowPill from "@/components/OpenNowPill";
import HoursTable from "@/components/HoursTable";
import HoursNote from "@/components/HoursNote";
import FaqBlock from "@/components/FaqBlock";
import FilterChip from "@/components/FilterChip";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { MapEmbed } from "@/components/MapEmbed";
import RailGallery from "@/components/RailGallery";
import { toClientPhoto } from "@/lib/client-photo";
import { isBoilerplateAbout } from "@/lib/prose";
import SectionNav from "@/components/SectionNav";
import PremiumHero, { type HeroPhoto } from "@/components/PremiumHero";
import VenueLinks, { type VenueLink } from "@/components/VenueLinks";
import { VerifiedStamp } from "@/components/badges";
import { ButtonLink } from "@/components/Buttons";
import { ArrowUpRight, CheckIcon, CuisineGlyph, GlobeGlyph, GoogleMapsMark, InstagramGlyph, PhoneIcon, SecIcon, SendIcon, WhatsAppIcon } from "@/components/icons";
import ShareButton from "@/components/ShareButton";
import WatchFilm from "@/components/WatchFilm";
import { NearbyCard } from "@/components/cards";

import type { City, Neighborhood, Venue } from '@/data/mock';

/**
 * A short, human locator that tells two same-brand branches in the same
 * neighborhood apart (e.g. two Starbucks in Bella Vista). Prefers the street /
 * mall from the address, stripping the leading Google Plus Code and the generic
 * city/province tail; falls back to "Location N" off the slug when the address
 * is only a plus code.
 */
function venueLocator(address: string | undefined, slug: string): string | null {
  const GENERIC = /\b(Panama City|Panamá|Provincia de Panamá|Panamá Province|Panama|Corregimiento De Bella Vista)\b/gi;
  if (address) {
    const cleaned = address.replace(/^[A-Z0-9]{4,6}\+[A-Z0-9]{2,4}\b[,\s]*/i, ""); // drop leading Plus Code
    // Walk the comma segments and take the first that survives the generic strip
    // (so "Corregimiento De Bella Vista, Urb Obarrio, ..." yields "Urb Obarrio").
    for (const raw of cleaned.split(",")) {
      let seg = raw.replace(GENERIC, "").replace(/^[\s,]+|[\s,]+$/g, "").trim();
      if (seg.length >= 3) {
        if (seg.length > 34) seg = seg.slice(0, 34).replace(/\s+\S*$/, "").trim();
        return seg;
      }
    }
  }
  const m = slug.match(/-(\d+)$/);
  return m ? `Location ${m[1]}` : null;
}

/** Metadata for a venue served at /{city}/{slug}/. Returns {} when the segment
 *  is not a venue, so the route can fall through to a 404. */
export async function venueMetadata(locale: string, venueSlug: string): Promise<Metadata> {
  const venueRaw = await getVenue(venueSlug);
  const hoodRec = venueRaw ? allNeighborhoods.find((n) => n.slug === venueRaw.neighborhood_slug) : undefined;
  // Look up in EN (the record's canonical slugs) - neighborhood `name` is a
  // proper noun, identical in both locales. localizeVenue swaps the _es editorial
  // twins so about/whats_good/spend feed the ES snippet.
  const found = hoodRec ? await getNeighborhood(hoodRec.city_slug, hoodRec.slug, "en") : undefined;
  if (!venueRaw || !found) return {};
  const venue = localizeVenue(venueRaw, locale);
  const es = locale === "es";
  const hood = found.hood;
  const primary = primaryCuisine(venue.cuisine_en);
  const primaryLabel = primary ? (es ? cuisineLabelEs(primary) : primary) : "";
  // Disambiguate same-brand, same-neighborhood branches so their <title> and
  // <meta description> are not identical (the one true duplicate-content case).
  const key = venue.name.trim().toLowerCase();
  const ambiguous =
    allVenues.filter((v) => v.neighborhood_slug === venue.neighborhood_slug && v.name.trim().toLowerCase() === key).length > 1;
  const loc = ambiguous ? venueLocator(venue.address, venue.slug) : null;
  const nameLoc = loc ? `${venue.name} (${loc})` : venue.name;
  // Title: drop the filler " Restaurant" and ", Panama City" (the neighborhood +
  // "EatsPanama" carry the geo) so most titles clear Google's ~60-char cutoff.
  const inWord = es ? "en" : "in";
  const title = primaryLabel
    ? `${nameLoc} - ${primaryLabel} ${inWord} ${hood.name} | EatsPanama`
    : `${nameLoc} ${inWord} ${hood.name} | EatsPanama`;
  // Meta: keep a real editorial About; otherwise synthesize a full, unique line
  // from structured fields (covers the thin/boilerplate Abouts and chain
  // branches, which would otherwise collide or under-fill the SERP snippet).
  const cui = venue.cuisine_en.map((c) => (es ? cuisineLabelEs(cleanCuisine(c)) : cleanCuisine(c))).filter(Boolean);
  const cuiLabel = cui.slice(0, 2).join(", ") || (es ? "Restaurante" : "Restaurant");
  const price = venue.price_tier ? ` ${priceGlyphs(venue.price_tier)}` : "";
  const cityLabel = es ? "Ciudad de Panamá" : "Panama City";
  const where = loc ? `${hood.name} (${loc}), ${cityLabel}` : `${hood.name}, ${cityLabel}`;
  const verified = venue.verified_at
    ? es
      ? ` - verificado ${formatMonth(venue.verified_at, locale)}`
      : ` - verified ${formatMonth(venue.verified_at)}`
    : "";
  const highlight =
    venue.whats_good_en && venue.whats_good_en[0]
      ? `${venue.whats_good_en[0].replace(/\.$/, "")}. `
      : venue.typical_spend_en
        ? `${es ? "Gasto típico" : "Typical spend"} ${venue.typical_spend_en}. `
        : "";
  // Lead with the (unique) venue name so venues sharing cuisine+hood+price don't
  // collide into an identical description; chains carry the locator in `where`.
  const tail = es ? "Horarios, menú y detalles" : "Hours, menu and details";
  const synth = (withHighlight: boolean) =>
    `${venue.name} - ${cuiLabel}${price} ${inWord} ${where}. ${withHighlight ? highlight : ""}${tail}${verified}.`;
  const description =
    venue.about_en && !isBoilerplateAbout(venue.about_en)
      ? clampDescription(venue.about_en)
      : synth(true).length <= 160
        ? synth(true)
        : clampDescription(synth(false));
  // ES venue editorial is now native (localizeVenue), so the ES URL is a real
  // indexable twin with self-canonical + es<->en hreflang, not an EN fallback.
  const alternates = pairedAlternates(locale, {
    en: venuePath(hood.city_slug, venue.slug, "en"),
    es: venuePath(hood.city_slug, venue.slug, "es"),
  });
  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: alternates.canonical,
      // og:image comes from the generated card at ./opengraph-image (branded
      // photo-forward card) - no explicit images here so the file-based one wins.
    },
    robots: indexable(),
  };
}

/**
 * The venue profile, rendered by the /{city}/{slug}/ route. It is a component
 * rather than a page because that route also serves neighborhoods - the second
 * URL segment is a neighborhood OR a venue, resolved in that order.
 */
export default async function VenueProfileView({
  locale,
  venue: venueRaw,
  cityRec,
  hood,
}: {
  locale: string;
  venue: Venue;
  cityRec: City;
  hood: Neighborhood;
}) {
  // On ES, read the native-Spanish editorial twins (about, what's-good,
  // highlights, best-time, story, etc.) without changing any field reads below.
  const venue = localizeVenue(venueRaw, locale);

  const t = await getTranslations({ locale, namespace: "Profile" });
  const tl = await getTranslations({ locale, namespace: "Listing" });
  const tg = await getTranslations({ locale, namespace: "GoodFor" });
  const siblings = (await getVenuesInNeighborhood(hood.slug)).filter((v) => v.slug !== venue.slug);
  // "Nearby" should mean nearest, not just the first 3 in the hood. Squared
  // lat/lng distance is monotonic with real distance at city scale (no trig).
  const d2 = (v: { lat: number; lng: number }) => (v.lat - venue.lat) ** 2 + (v.lng - venue.lng) ** 2;
  const nearby = siblings.slice().sort((a, b) => d2(a) - d2(b)).slice(0, 3);
  // FAQs: the generator now emits native ES templates, and the localized venue
  // feeds the _es editorial twins (whats_good, address_note) into the answers.
  const faqs = venueFaqs(venue, hood.name, locale);
  const cityName = locale === "es" ? cityRec.name_es : cityRec.name_en;
  const selfAbs = absoluteUrl(locale, venuePath(hood.city_slug, venue.slug, locale));
  const listingHref = withLocale(locale, listingPath(hood.city_slug, hood.slug, locale));
  const vHref = (slug: string) => withLocale(locale, venuePath(hood.city_slug, slug, locale));

  // Presentation
  // "Perfect For" facets - the good-for hubs this venue genuinely belongs to
  // (occasion/dish/drink/dietary), surfaced as the top decision cue. Capped so
  // the chip row stays scannable.
  const perfectFor = perfectForFacets(venue, hood.city_slug).slice(0, 5);
  // Pre-fill the WhatsApp chat with a neutral, contextual opener (not a
  // reservation assumption - "reserve" is wrong for a bakery/counter). Only
  // applies to bare numbers; short wa.link URLs carry their own message.
  const waText = t("waPrefill", { name: venue.name });
  const cuisineList = venue.cuisine_en.map((c) => cleanCuisine(c)).filter(Boolean);
  const cuisineLabel = cuisineList.join(" · ");
  const primary = primaryCuisine(venue.cuisine_en);
  // Cuisine chip/link resolves to the cuisine hub ONLY when that hub exists
  // (>= 3 venues); otherwise it stays plain text / falls back to the listing,
  // so there are never any 404s from "More {cuisine}" links.
  const cuisineSeg = primary ? slugify(primary) : "";
  const cuisineHubHere = cuisineSeg ? cuisineHubExists(hood.slug, cuisineSeg) : false;
  const cuisineHref = cuisineHubHere
    ? withLocale(locale, cuisineHubPath(hood.city_slug, hood.slug, cuisineSeg, locale))
    : listingHref;
  const priceStr = priceGlyphs(venue.price_tier);
  const hoodCity = `${hood.name}, ${cityName}`;
  // Shortlist payload: the /saved page renders from localStorage, so the
  // SaveButton carries the venue's display fields, not just its slug.
  const savedVenue = {
    slug: venue.slug,
    name: venue.name,
    href: withLocale(locale, venuePath(hood.city_slug, venue.slug, locale)),
    cuisine: cuisineList[0],
    hood: hood.name,
    price: priceStr || undefined,
    photo: venue.photos[0]?.url,
  };

  // The hours table (with its date-dependent "today" row highlight) and the
  // live "open now" pill are BOTH client components (HoursTable, OpenNowPill),
  // so no date-dependent markup is baked into the SSG HTML - the server and
  // first client render are identical (no React #418 hydration mismatch).

  // Highlights: drop any bullet that duplicates the dataset-comparison line
  // (it is rendered once, as the ink-bulleted .ds stat row).
  const dsLine = venue.dataset_comparison_en?.trim();
  const highlights = (venue.highlights_en ?? []).filter((h) => h.trim() !== dsLine);
  const hasHighlights = highlights.length > 0 || !!venue.typical_spend_en || !!dsLine;

  const dietary = venue.dietary_en ?? [];
  const attributes = venue.attributes_en ?? [];
  const hasGoodToKnow = dietary.length > 0 || attributes.length > 0;

  // ---- Premium tier (claimed / showcase venues) ----
  const isPremium = venue.tier === "premium";
  const heroPhotos: HeroPhoto[] = isPremium
    ? venue.photos.map((p) => {
        const cp = toClientPhoto(p);
        return {
          url: cp.url,
          alt: locale === "es" ? cp.alt_es : cp.alt_en,
          creditText: cp.credit_en,
          creditHref: cp.credit_href,
        };
      })
    : [];
  const heroMetaText = [cuisineLabel, hood.name].filter(Boolean).join(" · ");
  const story = venue.story_en ? venue.story_en.split(/\n\n+/).map((p) => p.trim()).filter(Boolean) : [];

  // "Order & find online" module - real, verifiable external presence (delivery
  // apps, own site, Instagram). Distinct from the sticky contact rail: the rail
  // is how you reach/visit them, this is where you order or follow them online.
  // "Order & find online" module - delivery + own site + Instagram live here in
  // the body (a premium brand feature, not a delivery storefront). The sticky
  // rail stays about the venue itself: Directions + Share.
  const venueLinks: VenueLink[] = [
    venue.delivery?.ubereats && { kind: "ubereats" as const, label: t("orderUberEats"), href: venue.delivery.ubereats },
    venue.delivery?.pedidosya && { kind: "pedidosya" as const, label: t("orderPedidosYa"), href: venue.delivery.pedidosya },
    venue.website && { kind: "website" as const, label: t("visitWebsite"), href: venue.website },
    venue.social?.instagram && { kind: "instagram" as const, label: t("followInstagram"), href: venue.social.instagram },
  ].filter(Boolean) as VenueLink[];

  // Every venue must offer at least one action beyond Directions. When there is
  // no WhatsApp and no phone, fall back to the best online presence (own site >
  // Instagram > delivery), and if there is truly nothing, a "suggest an edit"
  // link - so a Basic page is never a Directions-only dead end.
  const contactFallback: { href: string; label: string; Icon: typeof GlobeGlyph; external: boolean } =
    venue.website
      ? { href: venue.website, label: t("visitWebsite"), Icon: GlobeGlyph, external: true }
      : venue.social?.instagram
        ? { href: venue.social.instagram, label: t("followInstagram"), Icon: InstagramGlyph, external: true }
        : venue.delivery?.ubereats
          ? { href: venue.delivery.ubereats, label: t("orderUberEats"), Icon: GlobeGlyph, external: true }
          : venue.delivery?.pedidosya
            ? { href: venue.delivery.pedidosya, label: t("orderPedidosYa"), Icon: GlobeGlyph, external: true }
            : { href: `${locale === "es" ? "/es" : ""}/contact/`, label: t("suggestEdit"), Icon: ArrowUpRight, external: false };

  // "Appears in {guide}" - the editorial loop (and internal linking). Premium
  // pages surface the real guide(s) this venue was curated into.
  const appearsInGuideRaw = isPremium
    ? (await getGuides()).find((g) => g.entries.some((e) => e.venue_slug === venue.slug))
    : undefined;
  const appearsInGuide = appearsInGuideRaw ? localizeGuide(appearsInGuideRaw, locale) : undefined;

  // Food menu: a "most ordered" signature featured above grouped category lists,
  // plus a rough "for two" estimate derived from the real menu prices. Premium
  // pages show ONLY dishes with a real photo (no text-only rows); Basic pages
  // keep their full text menu.
  const menuDishes = isPremium ? (venue.dishes ?? []).filter((d) => d.photo) : (venue.dishes ?? []);
  const signatureDish = menuDishes.find((d) => d.signature);
  const foodCats = [...new Set(menuDishes.filter((d) => !d.signature && d.category).map((d) => d.category as string))];
  const grouped = foodCats.length > 0;
  const avg = (ns: number[]) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0);
  const mainAvg = avg(menuDishes.filter((d) => (d.category === "Bagels & toasts" || d.category === "Breakfast plates") && d.price).map((d) => d.price as number));
  const drinkAvg = avg(menuDishes.filter((d) => d.category === "Coffee & drinks" && d.price).map((d) => d.price as number));
  const forTwo = mainAvg && drinkAvg ? Math.round(mainAvg * 2 + drinkAvg * 2) : null;

  return (
    <>
      {/* The path is flat (/venues/{slug}/), so this breadcrumb is now the only
          place the city > neighborhood hierarchy is expressed - for readers and
          for the BreadcrumbList schema. The city crumb is not optional here. */}
      <Breadcrumb
        crumbs={[
          { name: tl("home"), href: withLocale(locale, "/"), absUrl: absoluteUrl(locale, "/") },
          {
            name: cityName,
            href: withLocale(locale, cityPath(hood.city_slug, locale)),
            absUrl: absoluteUrl(locale, cityPath(hood.city_slug, locale)),
          },
          {
            name: hood.name,
            href: listingHref,
            absUrl: absoluteUrl(locale, listingPath(hood.city_slug, hood.slug, locale)),
          },
          { name: venue.name, absUrl: selfAbs },
        ]}
      />

      {/* PREMIUM tier: lead-photo hero with the name, badge + booking launchpad.
          Basic tier keeps the compact title row inside the profile column. */}
      {isPremium && (
        <PremiumHero
          name={venue.name}
          metaText={heroMetaText}
          priceBand={priceStr || undefined}
          photos={heroPhotos}
          video={venue.video}
          videoCredit={venue.video ? t("filmBy") : undefined}
          hours={venue.hours}
          lastChecked={venue.last_checked}
          locale={locale}
          lightboxLabels={{ seeAll: t("seeAllPhotos"), close: t("close"), prev: t("prev"), next: t("next") }}
          unmuteLabel={t("unmute")}
          muteLabel={t("mute")}
        />
      )}

      <div className="profile-grid">
        {/* Desktop rail TOC (grid column). The MOBILE tab bar renders below, after
            the venue name + cover, so the phone shows the restaurant first. */}
        <SectionNav title={t("onThisPage")} part="desktop" />
        {/* LEFT: assembled editorial content */}
        <div className="profile">
          {!isPremium && (
            <div className="title-row">
              <h1>{venue.name}</h1>
              <OpenNowPill hours={venue.hours} lastChecked={venue.last_checked} locale={locale} />
            </div>
          )}

          {/* Taxonomy chips = LINKS (status pills are not) */}
          <div className="fact-chips">
            {cuisineLabel &&
              (cuisineHubHere ? (
                <FilterChip href={cuisineHref}>{cuisineLabel}</FilterChip>
              ) : (
                <FilterChip>{cuisineLabel}</FilterChip>
              ))}
            {priceStr && (
              <FilterChip
                price
                href={listingHref}
                /* Derived tiers are estimates off the venue's own menu, so they
                   say so rather than passing as a verified price. */
                title={venue.price_source === "menu" ? t("priceEstimated") : undefined}
              >
                {priceStr}
                {venue.price_source === "menu" && <span className="price-est">~</span>}
              </FilterChip>
            )}
            <FilterChip href={listingHref}>{hood.name}</FilterChip>
          </div>

          {/* "Perfect For" - the strongest decision cue that needs no ratings,
              from the venue's own occasion tags, each linked to its good-for hub. */}
          {perfectFor.length > 0 && (
            <div className="perfect-for">
              <span className="pf-label">{t("perfectFor")}</span>
              {perfectFor.map((f) => (
                <a key={f.slug} className="pf-chip" href={withLocale(locale, goodForPath(hood.city_slug, f.slug, locale))}>
                  {tg(`label_${f.slug}`)}
                </a>
              ))}
            </div>
          )}

          {/* Trust at the decision point: which method produced this page + the
              typical spend, without burying either in the body. */}
          <div className="prof-meta-row">
            {venue.typical_spend_en && <span className="spend-line">{venue.typical_spend_en}</span>}
            <a className="trust-note" href={`${locale === "es" ? "/es" : ""}/how-we-review/`}>
              {t("howWeList")}
            </a>
          </div>

          {/* Mobile-only visual so a Basic profile is not text-first on a phone
              (the rail photo/cover sits at the bottom on mobile). Photoless
              venues get a cuisine-typed branded cover, never a fake food photo. */}
          {!isPremium && (
            <div className="venue-cover-m">
              {venue.photos.length > 0 ? (
                <Image
                  src={toClientPhoto(venue.photos[0]).url}
                  alt={locale === "es" ? toClientPhoto(venue.photos[0]).alt_es : toClientPhoto(venue.photos[0]).alt_en}
                  fill
                  sizes="100vw"
                  className="img-cover"
                />
              ) : (
                <div className="cover-ph" aria-hidden="true">
                  <CuisineGlyph name={cuisineGlyphName(primary)} />
                  <span>{[cuisineLabel, hood.name].filter(Boolean).join(" · ")}</span>
                </div>
              )}
            </div>
          )}

          {/* Mobile jump-nav: sticky tab bar placed AFTER the name + cover (Chris:
              the anchor links were sitting above the venue). Desktop uses the rail. */}
          <SectionNav title={t("onThisPage")} part="mobile" />

          {/* Premium intro line (the film hero carries no tagline, so the hook
              leads the text here - above the fold, first in the reading column). */}
          {isPremium && venue.tagline_en && <p className="prem-intro">{venue.tagline_en}</p>}

          {/* HIGHLIGHTS + typical spend + dataset-comparison stat */}
          {hasHighlights && (
            <div className="verdict">
              <div className="v-head">
                <span className="v-label">{t("highlightsLabel")}</span>
                {venue.last_checked && (
                  <VerifiedStamp>{t("updated", { month: formatMonth(venue.last_checked) })}</VerifiedStamp>
                )}
              </div>
              <ul className="quick">
                {highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
                {venue.typical_spend_en && (
                  <li>
                    <b>{t("typicalSpend")}</b> {venue.typical_spend_en}
                  </li>
                )}
                {dsLine && <li className="ds">{dsLine}</li>}
              </ul>
            </div>
          )}

          {/* ABOUT / STORY - premium venues get the long-form story + a signature
              spotlight; Basic tier shows the short About, hidden when it is the
              auto-generated "X is a <type> in <place>" template. */}
          {isPremium && story.length > 0 ? (
            <>
              <h2 className="p-sec"><SecIcon name="about" />{t("aboutTitle", { name: venue.name })}</h2>
              {story.map((p, i) => (
                <p className="prose" key={i}>
                  {p}
                </p>
              ))}
              {venue.signature_en && (
                <div className="prem-signature">
                  <span className="ps-label">{t("signatureLabel")}</span>
                  <p className="ps-name">{venue.signature_en.name}</p>
                  <p className="ps-note">{venue.signature_en.note}</p>
                </div>
              )}
            </>
          ) : venue.about_en && !isBoilerplateAbout(venue.about_en) ? (
            <>
              <h2 className="p-sec"><SecIcon name="about" />{t("aboutTitle", { name: venue.name })}</h2>
              <p className="prose">{venue.about_en}</p>
            </>
          ) : null}

          {/* WHAT'S GOOD (synthesized sentiment, no ratings) */}
          {venue.whats_good_en && venue.whats_good_en.length > 0 && (
            <>
              <h2 className="p-sec"><SecIcon name="good" />{t("whatsGoodTitle")}</h2>
              <p className="wg-label">{t("whatsGoodLabel")}</p>
              <ul className="wg-list">
                {venue.whats_good_en.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </>
          )}

          {/* THE FOOD - featured "most ordered" signature above grouped category
              lists (falls back to a flat grid for venues without categories). */}
          {menuDishes.length > 0 && (
            <>
              <h2 className="p-sec"><SecIcon name="food" />{t("foodTitle")}</h2>

              {signatureDish && (
                <div className="dish-feature">
                  {signatureDish.photo && (
                    <div className="df-photo">
                      <Image src={signatureDish.photo} alt={signatureDish.name} fill sizes="(max-width: 700px) 100vw, 240px" className="img-cover" />
                    </div>
                  )}
                  <div className="df-body">
                    <span className="df-eyebrow">{t("mostOrdered")}</span>
                    <h3>{signatureDish.name}</h3>
                    {signatureDish.description_en && <p>{signatureDish.description_en}</p>}
                    {signatureDish.price != null && <div className="df-price">{formatDishPrice(signatureDish.price)}</div>}
                  </div>
                </div>
              )}

              {grouped
                ? foodCats.map((cat) => (
                    <div key={cat}>
                      <h4 className="menu-cat">{cat}</h4>
                      <div className="dish-grid">
                        {menuDishes.filter((d) => !d.signature && d.category === cat).map((d) => (
                          <div className={`dish${d.photo ? " has-thumb" : ""}`} key={d.name}>
                            {d.photo && (
                              <div className="dish-thumb">
                                <Image src={d.photo} alt={d.name} fill sizes="88px" className="img-cover" />
                              </div>
                            )}
                            <div className="dish-body">
                              <div className="d-top">
                                <span className="d-name">{d.name}</span>
                                {d.price != null && <span className="d-price">{formatDishPrice(d.price)}</span>}
                              </div>
                              {d.description_en && <p className="d-desc">{d.description_en}</p>}
                              {d.popular && <span className="d-pop">{t("popular")}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                : (
                    <div className="dish-grid">
                      {menuDishes.map((d) => (
                        <div className={`dish${d.photo ? " has-thumb" : ""}`} key={d.name}>
                          {d.photo && (
                            <div className="dish-thumb">
                              <Image src={d.photo} alt={d.name} fill sizes="88px" className="img-cover" />
                            </div>
                          )}
                          <div className="dish-body">
                            <div className="d-top">
                              <span className="d-name">{d.name}</span>
                              {d.price != null && <span className="d-price">{formatDishPrice(d.price)}</span>}
                            </div>
                            {d.description_en && <p className="d-desc">{d.description_en}</p>}
                            {d.popular && <span className="d-pop">{t("popular")}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

              {forTwo && <p className="menu-foot2">{t("forTwo", { price: `$${forTwo}` })}</p>}
            </>
          )}

          {/* THE ROOM (premium: real venue photos + informative captions; the
              owner pull-quote renders only when a real one has been collected). */}
          {venue.room_en && venue.room_en.length > 0 && (
            <>
              <h2 className="p-sec"><SecIcon name="about" />{t("roomTitle")}</h2>
              <div className="room-grid">
                {venue.room_en.map((r, i) => (
                  <figure className="room-fig" key={i}>
                    <div className="room-ph">
                      <Image src={r.photo} alt={r.caption_en} fill sizes="(max-width: 700px) 100vw, 340px" className="img-cover" />
                    </div>
                    <figcaption>{r.caption_en}</figcaption>
                  </figure>
                ))}
              </div>
              {venue.owner_quote_en && (
                <blockquote className="owner-quote">
                  <p>{venue.owner_quote_en.quote}</p>
                  <cite>{venue.owner_quote_en.attribution}</cite>
                </blockquote>
              )}
            </>
          )}

          {/* WATCH LUNA - the full titled commercial (sound on), click-to-play */}
          {venue.film && (
            <>
              <h2 className="p-sec"><SecIcon name="about" />{t("watchTitle", { name: venue.name })}</h2>
              <WatchFilm
                src={venue.film.src}
                poster={venue.film.poster}
                title={t("watchTitle", { name: venue.name })}
                playLabel={t("watchPlay")}
                blurb={t("watchBlurb")}
              />
            </>
          )}

          {/* ORDER & FIND ONLINE (real delivery / own-site / social links) */}
          {venueLinks.length > 0 && (
            <VenueLinks title={t("findOnlineTitle", { name: venue.name })} note={t("findOnlineNote")} links={venueLinks} />
          )}

          {/* APPEARS IN {guide} - editorial loop + internal link (premium only) */}
          {appearsInGuide && (
            <a className="guide-xlink" href={withLocale(locale, `/guides/${appearsInGuide.slug}/`)}>
              {appearsInGuide.hero?.url && (
                <span className="gx-cover">
                  <Image src={appearsInGuide.hero.url} alt="" fill sizes="120px" className="img-cover" />
                </span>
              )}
              <span className="gx-body">
                <span className="gx-label">{t("appearsIn")}</span>
                <span className="gx-title">{appearsInGuide.title_en}</span>
                <span className="gx-meta">{t("guideMeta", { count: appearsInGuide.entries.length, month: formatMonth(appearsInGuide.updated_iso.slice(0, 7)) })}</span>
              </span>
              <span className="gx-arrow" aria-hidden="true">→</span>
            </a>
          )}

          {/* WHERE IT IS (real keyless Google Maps embed) */}
          <h2 className="p-sec"><SecIcon name="where" />{t("whereTitle")}</h2>
          {/* zoom 14 (not the 16 default): street-level was too tight to read
              where the venue sits - 14 shows the surrounding neighbourhood. */}
          <MapEmbed lat={venue.lat} lng={venue.lng} title={t("mapAria", { name: venue.name, hood: hood.name })} loadLabel={t("loadMap")} eager={isPremium} zoom={14} />
          <p className="addr-block">
            <b>{venue.address}</b>
            <br />
            {hoodCity}
            <br />
            <a
              className="dir-link"
              href={venue.google_maps_url ?? mapsDirectionsUrl(venue.lat, venue.lng)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("getDirections")}
            </a>
          </p>

          {/* GOOD TO KNOW (attributes + dietary chips) */}
          {hasGoodToKnow && (
            <>
              <h2 className="p-sec"><SecIcon name="know" />{t("goodToKnowTitle")}</h2>
              <div className="gtk-chips">
                {dietary.map((d) => (
                  <span className="gtk" key={d}>
                    <CheckIcon />
                    {d}
                  </span>
                ))}
                {attributes.map((a) => (
                  <span className="gtk" key={a}>
                    <CheckIcon />
                    {a}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* BEST TIME TO GO - Option A labeled rows (falls back to prose) */}
          {venue.best_time && (venue.best_time.busiest || venue.best_time.easy || venue.best_time.sweet) ? (
            <>
              <h2 className="p-sec"><SecIcon name="time" />{t("bestTimeTitle")}</h2>
              <div className="besttime">
                {venue.best_time.busiest && (
                  <div className="bt-row">
                    <span className="bt-key"><span className="bt-dot busy" />{t("btBusiest")}</span>
                    <span className="bt-val">
                      {venue.best_time.busiest}
                      {venue.best_time.busiest_note_en && <small>{venue.best_time.busiest_note_en}</small>}
                    </span>
                  </div>
                )}
                {venue.best_time.easy && (
                  <div className="bt-row">
                    <span className="bt-key"><span className="bt-dot easy" />{t("btEasy")}</span>
                    <span className="bt-val">
                      {venue.best_time.easy}
                      {venue.best_time.easy_note_en && <small>{venue.best_time.easy_note_en}</small>}
                    </span>
                  </div>
                )}
                {venue.best_time.sweet && (
                  <div className="bt-row">
                    <span className="bt-key"><span className="bt-dot pick" />{t("btSweet")}</span>
                    <span className="bt-val">
                      {venue.best_time.sweet}
                      {venue.best_time.sweet_note_en && <small>{venue.best_time.sweet_note_en}</small>}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : venue.best_time_en ? (
            <>
              <h2 className="p-sec"><SecIcon name="time" />{t("bestTimeTitle")}</h2>
              <p className="prose">{venue.best_time_en}</p>
            </>
          ) : null}

          {/* NOTABLE MENTIONS */}
          {venue.notable_mention_en && (
            <>
              <h2 className="p-sec"><SecIcon name="notable" />{t("notableTitle")}</h2>
              <p className="prose">{venue.notable_mention_en}</p>
            </>
          )}

          {/* FAQ (computed from this venue's data) + FAQPage JSON-LD */}
          {faqs.length > 0 && (
            <>
              <h2 className="p-sec" style={{ marginTop: 40 }}>
                <SecIcon name="faq" />
                {t("faqHeading")}
              </h2>
              <FaqBlock faqs={faqs} variant="accordion" />
            </>
          )}

          {/* NEARBY (Basic-tier branded cards) */}
          {nearby.length > 0 && (
            <>
              <h2 className="p-sec"><SecIcon name="nearby" />{t("nearbyTitle")}</h2>
              <div className="nearby-grid">
                {nearby.map((v) => (
                  <NearbyCard key={v.id} venue={v} locale={locale} hoodName={hood.name} href={vHref(v.slug)} />
                ))}
              </div>
            </>
          )}

          {/* AROUND {hood} (neighborhood context, computed - not duplicative) */}
          <h2 className="p-sec">{t("aroundTitle", { hood: hood.name })}</h2>
          <p className="prose">
            {t("aroundLine", { name: venue.name, count: hood.venue_count, hood: hood.name })}
            {hood.top_cuisines && hood.top_cuisines.length > 0 && (
              <> {t("aroundCuisines", { cuisines: hood.top_cuisines.slice(0, 3).join(", "), hood: hood.name })}</>
            )}
          </p>
          <div className="explore-row">
            <a href={listingHref}>{t("aroundSeeAll", { count: hood.venue_count, hood: hood.name })}</a>
          </div>

          {/* EXPLORE MORE (internal-link chip row - real routes only) */}
          <h2 className="p-sec">{t("exploreTitle")}</h2>
          <div className="explore-row">
            {primary && cuisineHubHere && (
              <a href={cuisineHref}>{t("exploreMoreCuisine", { cuisine: primary, hood: hood.name })}</a>
            )}
            <a href={listingHref}>{t("exploreAllHood", { hood: hood.name })}</a>
            <a href={`${listingHref}?open=1`}>{t("exploreOpenNow", { hood: hood.name })}</a>
          </div>
        </div>

        {/* RIGHT: practical rail (sticky) */}
        <aside>
          {/* toClientPhoto strips credit_url before it crosses into the client
              component - otherwise the source URL ships as plain text in the
              RSC payload, which is the crawlable HTML we are keeping it out of. */}
          {/* Basic tier leads with the rail photo; premium leads with the hero
              gallery (cover + strip), so its rail is pure hours/contact - no
              duplicate gallery. */}
          {/* Rail visual (desktop): the gallery when photos exist, otherwise a
              branded cuisine cover so no Basic page is visually blank. Hidden on
              mobile, where the top cover above carries the visual. */}
          {!isPremium && (
            <div className="rail-visual">
              {venue.photos.length > 0 ? (
                <RailGallery photos={venue.photos.map(toClientPhoto)} locale={locale} />
              ) : (
                <div className="cover-ph" aria-hidden="true">
                  <CuisineGlyph name={cuisineGlyphName(primary)} />
                  <span>{[cuisineLabel, hood.name].filter(Boolean).join(" · ")}</span>
                </div>
              )}
            </div>
          )}
          <div className="practical">
            <div className="p-head">
              <h2>{t("hoursTitle")}</h2>
              <VerifiedStamp>{t("verified", { month: venue.verified_at })}</VerifiedStamp>
            </div>
            {venue.hours?.length ? (
              <HoursTable hours={venue.hours} locale={locale} />
            ) : (
              /* Saying so beats an empty table that reads as "closed". */
              <p className="hours-missing">{t("hoursNotListed")}</p>
            )}
            {venue.last_checked && (
              <HoursNote month={formatMonth(venue.last_checked)} lastChecked={venue.last_checked} />
            )}
            {/* Holiday / special-hours override - render-ready; shows only when
                the data is present (e.g. "Closed for Semana Santa"). */}
            {venue.special_hours_note_en && <p className="special-hours">{venue.special_hours_note_en}</p>}
            <p className="addr">
              <b>{venue.address}</b>
              <br />
              {hoodCity}
            </p>
            {venue.address_note_en && <p className="addr-note">{venue.address_note_en}</p>}

            {isPremium ? (
              <div className="prem-acts">
                {venue.phones.whatsapp && (
                  <a className="act act-wa full" href={whatsappUrl(venue.phones.whatsapp, waText)} target="_blank" rel="noopener noreferrer">
                    <WhatsAppIcon size={18} />{t("whatsapp")}
                  </a>
                )}
                <div className="act-row2">
                  <a className="act act-gh" href={venue.google_maps_url ?? mapsDirectionsUrl(venue.lat, venue.lng)} target="_blank" rel="noopener noreferrer">
                    <GoogleMapsMark />{t("directions")}
                  </a>
                  <ShareButton title={venue.name} label={t("share")} copiedLabel={t("copied")} />
                </div>
              </div>
            ) : (
              <div className="action-bar">
                {venue.phones.whatsapp ? (
                  <>
                    <ButtonLink variant="wa" className="full" href={whatsappUrl(venue.phones.whatsapp, waText)} target="_blank" rel="noopener noreferrer">
                      <WhatsAppIcon size={18} />
                      {t("whatsapp")}
                    </ButtonLink>
                    <ButtonLink variant="ghost" className="full" href={mapsDirectionsUrl(venue.lat, venue.lng)} target="_blank" rel="noopener noreferrer">
                      <SendIcon />
                      {t("directions")}
                    </ButtonLink>
                  </>
                ) : (
                  <div className="action-row">
                    {venue.phones.call ? (
                      <ButtonLink variant="ghost" href={telUrl(venue.phones.call)}>
                        <PhoneIcon />
                        {t("call")}
                      </ButtonLink>
                    ) : (
                      /* No phone: never leave Directions as the only action. */
                      <ButtonLink
                        variant="ghost"
                        href={contactFallback.href}
                        {...(contactFallback.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      >
                        <contactFallback.Icon />
                        {contactFallback.label}
                      </ButtonLink>
                    )}
                    <ButtonLink variant="ghost" href={mapsDirectionsUrl(venue.lat, venue.lng)} target="_blank" rel="noopener noreferrer">
                      <SendIcon />
                      {t("directions")}
                    </ButtonLink>
                  </div>
                )}
              </div>
            )}
            {/* Shortlist toggle - save to a localStorage list, no account. */}
            <SaveButton venue={savedVenue} locale={locale} />
          </div>
        </aside>
      </div>

      {/* Mobile sticky action bar - the hours/contact card sits at the bottom of
          the profile on phones, so the key actions get their own always-reachable
          bar pinned to the viewport. */}
      <div className="prof-mobilebar">
        {venue.phones.whatsapp ? (
          <ButtonLink
            variant="wa"
            className="full"
            href={whatsappUrl(venue.phones.whatsapp, waText)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon size={18} />
            {t("whatsapp")}
          </ButtonLink>
        ) : venue.phones.call ? (
          <ButtonLink variant="ghost" className="full" href={telUrl(venue.phones.call)}>
            <PhoneIcon />
            {t("call")}
          </ButtonLink>
        ) : (
          /* No phone: the fallback action keeps the bar from being Directions-only. */
          <ButtonLink
            variant="ghost"
            className="full"
            href={contactFallback.href}
            {...(contactFallback.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            <contactFallback.Icon />
            {contactFallback.label}
          </ButtonLink>
        )}
        <ButtonLink
          variant="ghost"
          className="full"
          href={mapsDirectionsUrl(venue.lat, venue.lng)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <SendIcon />
          {t("directions")}
        </ButtonLink>
        {/* Save is always reachable on mobile too (was previously only in the
            desktop rail / buried at the page bottom). */}
        <SaveButton venue={savedVenue} locale={locale} variant="chip" />
      </div>

      {/* CLAIM STRIP */}
      <div className="claim">
        <svg width="22" height="22" viewBox="0 0 36 44" aria-hidden="true">
          <path
            d="M18 1.5C9.2 1.5 2.8 7.9 2.8 16.4 2.8 24.7 10.6 30.5 18 43 25.4 30.5 33.2 24.7 33.2 16.4 33.2 7.9 26.8 1.5 18 1.5z"
            fill="var(--color-line)"
          />
          <circle cx="18" cy="16" r="6" fill="#FFFFFF" />
        </svg>
        <p>
          <b>{t("claimLead")}</b> {t("claimText")}
        </p>
        <a href={listingHref}>{t("claimCta")}</a>
      </div>

      {/* FAQPage JSON-LD is emitted by <FaqBlock> above (single source) - do
          not also emit it here or the profile ships duplicate FAQPage markup. */}
      <JsonLd data={restaurantJsonLd(venue, selfAbs, hood.name)} />
      <Footer locale={locale} />
    </>
  );
}
