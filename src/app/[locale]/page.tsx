import Image from "next/image";
import { guideUpdated } from "@/lib/format";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getNewThisWeek, getGuides, getNeighborhoods, allVenues } from "@/lib/data";
import { localizeGuide, localizeVenue } from "@/lib/localize";
import { cityCuisineHubs } from "@/lib/cuisines";
import { cityPath, cityCuisineIndexPath, cityCuisinePath, goodForIndexPath, goodForPath, guidesIndexPath, listingPath, venuePath, withLocale } from "@/lib/paths";
import { goodForExists, goodForOccasions, goodForImage } from "@/lib/goodfor";
import { getEditorsPicks } from "@/lib/picks";
import { routing } from "@/i18n/routing";
import SearchCard from "@/components/SearchCard";
import BrowseSwitcher, { type BrowseAxis } from "@/components/BrowseSwitcher";
import HeroWall from "@/components/HeroWall";
import EssentialsBand from "@/components/EssentialsBand";
import RestaurantMap, { type MapPin } from "@/components/RestaurantMap";
import Footer from "@/components/Footer";
import NewsletterBand from "@/components/NewsletterBand";
import { CountPill } from "@/components/badges";
import { GuideCard, NewThisWeekCard, OccasionTile } from "@/components/cards";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Home" });

  const [fresh, allGuides, hoods] = await Promise.all([
    getNewThisWeek(),
    getGuides(),
    getNeighborhoods(),
  ]);
  // 9 picks tile the mosaic exactly (1 featured 2x2 + 8 singles = 3 cols x 4 rows).
  const picks = getEditorsPicks(9, locale);

  // Occasion tiles are the real /good-for/ facets (biggest first); the full set
  // of 27 lives on the good-for index, which the "see all" link points at.
  const tg = await getTranslations({ locale, namespace: "GoodFor" });
  const tgAlt = await getTranslations({ locale: locale === "es" ? "en" : "es", namespace: "GoodFor" });
  const occasions = goodForOccasions
    .filter((o) => o.citySlug === "panama-city")
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((o) => ({
      slug: o.slug,
      count: o.count,
      title: tg(`label_${o.slug}`),
      sub: tgAlt(`label_${o.slug}`), // bilingual subtitle motif
      img: goodForImage(o),
    }));

  // guides = only fully-authored guides that actually ship (entries > 0), so
  // the count and the cards never claim more than exist.
  const guides = allGuides.filter((g) => g.entries.length > 0).map((g) => localizeGuide(g, locale));

  const hoodHref = (citySlug: string, hoodSlug: string) =>
    withLocale(locale, listingPath(citySlug, hoodSlug, locale));
  const venueHref = (v: { slug: string; neighborhood_slug: string }) => {
    const hood = hoods.find((h) => h.slug === v.neighborhood_slug);
    return hood ? withLocale(locale, venuePath(hood.city_slug, v.slug, locale)) : "#";
  };
  // Occasion + chip links go to real indexable /good-for/ pages when one
  // exists; anything ungated lands on the hub, never on noindex search.
  const occHref = (slug: string) =>
    goodForExists("panama-city", slug)
      ? withLocale(locale, goodForPath("panama-city", slug, locale))
      : withLocale(locale, cityPath("panama-city", locale));

  // Hero "or start browsing" switcher - only the two axes that do NOT have a
  // visual tile section right here (occasions/dishes/drinks are the "Browse by
  // occasion" tiles below, so repeating them as pills was redundant).
  const allPill = (href: string) => ({ name: t("browseAll"), href, all: true });
  const browseAxes: BrowseAxis[] = [
    {
      key: "hood",
      label: t("browseNeighborhoods"),
      pills: [
        ...[...hoods]
          .sort((a, b) => b.venue_count - a.venue_count)
          .slice(0, 5)
          .map((h) => ({ name: h.name, count: h.venue_count, href: hoodHref(h.city_slug, h.slug) })),
        allPill(withLocale(locale, cityPath("panama-city", locale))),
      ],
    },
    {
      key: "cui",
      label: t("browseCuisines"),
      pills: [
        ...cityCuisineHubs
          .filter((h) => h.citySlug === "panama-city")
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map((h) => ({
            name: h.cuisine,
            count: h.count,
            href: withLocale(locale, cityCuisinePath("panama-city", h.seg, locale)),
          })),
        allPill(withLocale(locale, cityCuisineIndexPath("panama-city", locale))),
      ],
    },
  ];

  // Homepage discovery map - reuses the Leaflet/OSM RestaurantMap (clustered),
  // pinned with every open Panama City venue (all are geocoded).
  const pcHoodSet = new Set(hoods.map((h) => h.slug));
  const mapPins: MapPin[] = allVenues
    .filter((v) => v.status === "open" && pcHoodSet.has(v.neighborhood_slug))
    .map((v) => ({
      slug: v.slug,
      name: v.name,
      cuisine: v.cuisine_en?.[0] ?? "",
      price: v.price_tier ? "$".repeat(Number(v.price_tier)) : "",
      lat: v.lat,
      lng: v.lng,
      href: withLocale(locale, venuePath("panama-city", v.slug, locale)),
      photo: v.photos?.[0]?.url,
    }));

  return (
    <>
      {/* HERO - "The Wall": text-first search rail (dark) + a gap-free mosaic of
          this week's editors' picks. H1 + intro + search render first in the DOM
          and sit in the first viewport, so the text-above-the-fold SEO rule holds
          even though the picks now own most of the space. */}
      <section className="hero-wall">
        <div className="hw-rail">
          <div className="hero-kicker">
            <CountPill href={withLocale(locale, cityPath("panama-city", locale))}>{t("spotsVerified", { count: hoods.length })}</CountPill>
            <CountPill href={withLocale(locale, guidesIndexPath())}>{t("guideCount", { count: guides.length })}</CountPill>
          </div>
          <h1>
            {t("h1Pre")}
            <span className="accent">{t("h1Accent")}</span>
            {t("h1Post")}
          </h1>
          <p className="es-sub">
            <b>{t("subLead")}</b>
            {t("subRest")}
          </p>
          <SearchCard
            locale={locale}
            placeholder={t("searchPlaceholder")}
            buttonLabel={t("searchButton")}
            ariaLabel={t("searchAria")}
          />
          {/* Tabbed browse switcher: neighborhoods / cuisines, text pills that
              swap per tab. Every pill is a real link; the footer carries the
              full set. */}
          <BrowseSwitcher browseLabel={t("browseLabel")} axes={browseAxes} />
          {/* Brand signature - the honesty promise folded into the brand voice
              (not fine print), so a first-time visitor remembers who we are. */}
          <p className="hw-sig">{t("brandLine")}</p>
        </div>

        {/* The mosaic: real, human-chosen venues, each credited and clickable. */}
        <HeroWall picks={picks} locale={locale} pickLabel={t("pickLabel")} />
      </section>

      {/* THE ESSENTIALS - canonical "start here" shortlist; excludes the venues
          already in the carousel so no restaurant/photo repeats on the page. */}
      <EssentialsBand locale={locale} excludeSlugs={picks.map((p) => p.slug)} />

      {/* OCCASIONS (hidden if no occasion has real tagged venues) */}
      {occasions.length > 0 && (
        <section className="block">
          <div className="sec-head">
            <div>
              <p className="eyebrow">{t("occasionsEyebrow")}</p>
              <h2 className="sec-title">{t("occasionsTitle")}</h2>
            </div>
            <a className="see-all" href={withLocale(locale, goodForIndexPath("panama-city", locale))}>
              {t("occasionsAll")}
            </a>
          </div>
          <div className="occasions">
            {occasions.map((o) => (
              <OccasionTile
                key={o.slug}
                title={o.title}
                sub={o.sub}
                img={o.img}
                href={occHref(o.slug)}
                countLabel={t("spots", { count: o.count })}
              />
            ))}
          </div>
        </section>
      )}

      {/* NEW THIS WEEK - only rendered when there IS fresh data. There is no
          added_at / revisited_at on the Basic-tier dataset yet, so this is
          empty and the whole section is hidden (never an empty rail). */}
      {fresh.length > 0 && (
        <section className="block block-fog">
          <div className="sec-head">
            <div>
              <p className="eyebrow">{t("newEyebrow")}</p>
              <h2 className="sec-title">{t("newTitle")}</h2>
              <p className="sec-sub">{t("newSub")}</p>
            </div>
            <a className="see-all" href={withLocale(locale, "/search/")}>
              {t("newAll")}
            </a>
          </div>
          <div className="rail">
            {fresh.map((vRaw) => {
              const v = localizeVenue(vRaw, locale);
              const d = v.revisited_at ?? v.added_at ?? "";
              const day = d.slice(8, 10).replace(/^0/, "");
              const tag = v.revisited_at
                ? locale === "es"
                  ? `Re-visitado ${day} jul`
                  : `Re-visited Jul ${day}`
                : locale === "es"
                  ? `Agregado ${day} jul`
                  : `Added Jul ${day}`;
              return (
                <NewThisWeekCard
                  key={v.id}
                  venue={v}
                  locale={locale}
                  href={venueHref(v)}
                  tag={tag}
                  hoodName={hoods.find((h) => h.slug === v.neighborhood_slug)?.name ?? ""}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* GUIDES - only fully-authored guides that ship (entries > 0). */}
      {guides.length > 0 && (
        <section className="block">
          <div className="sec-head">
            <div>
              <p className="eyebrow">{t("guidesEyebrow")}</p>
              <h2 className="sec-title">{t("guidesTitle")}</h2>
              <p className="sec-sub">{t("guidesSub")}</p>
            </div>
            <a className="see-all" href={withLocale(locale, guidesIndexPath())}>
              {t("guidesAll", { count: guides.length })}
            </a>
          </div>
          <div className="guides">
            {guides.slice(0, 2).map((g) => (
              <GuideCard
                key={g.slug}
                guide={g}
                locale={locale}
                href={withLocale(locale, `/guides/${g.slug}/`)}
                updatedLabel={guideUpdated(g.updated_iso)}
                spotsLabel={t("spots", { count: g.entries.length })}
                readLabel={t("readGuide")}
              />
            ))}
          </div>
        </section>
      )}

      {/* DISCOVERY MAP - the real Leaflet/OSM map, every open PC venue pinned */}
      {mapPins.length > 0 && (
        <section className="block homemap">
          <div className="sec-head">
            <div>
              <p className="eyebrow">{t("mapEyebrow")}</p>
              <h2 className="sec-title">{t("mapTitle")}</h2>
              <p className="sec-sub">{t("mapSub")}</p>
            </div>
            <a className="see-all" href={withLocale(locale, "/search/?view=map")}>
              {t("mapAll")}
            </a>
          </div>
          <div className="homemap-canvas">
            <RestaurantMap pins={mapPins} viewLabel={t("mapView")} className="rmap homemap-map" />
            <a className="homemap-cta" href={withLocale(locale, "/search/?view=map")}>
              {t("mapAll")}
            </a>
          </div>
        </section>
      )}

      {/* NEIGHBORHOODS */}
      <section className="block" style={{ paddingTop: 0 }}>
        <div className="sec-head">
          <div>
            <p className="eyebrow">{t("hoodsEyebrow")}</p>
            <h2 className="sec-title">{t("hoodsTitle")}</h2>
          </div>
          <a className="see-all" href={hoodHref("panama-city", "casco-viejo")}>
            {t("hoodsAll", { count: hoods.length })}
          </a>
        </div>
        <div className="hoods">
          {/* Only hoods with an establishing image show on the grid, so no card
              renders as a blank branded tile. Imageless/thin hoods (e.g. Pueblo
              Nuevo, 2 venues) stay reachable via the neighborhoods index + nav.
              The "all" link count above still reflects every neighborhood. */}
          {hoods
            .filter((h) => h.hero_image ?? h.photo)
            .map((h) => {
            const img = h.hero_image ?? h.photo;
            return (
            <a className="card hood" key={h.slug} href={hoodHref(h.city_slug, h.slug)}>
              <div className="thumb">
                {img ? (
                  <>
                    <Image
                      src={img.url}
                      alt={locale === "es" ? img.alt_es : img.alt_en}
                      fill
                      sizes="(max-width: 768px) 100vw, 25vw"
                      className="img-cover"
                    />
                    {img.credit_en && <span className="occ-credit">{img.credit_en}</span>}
                  </>
                ) : (
                  <span className="thumb-brand" aria-hidden="true">
                    {h.name}
                  </span>
                )}
              </div>
              <div className="body">
                {/* One count, and a live one. `descriptor_en` is a frozen
                    "99 restaurants" string that has already drifted from the
                    recomputed venue_count (98), so the card no longer shows
                    both a stale sentence and a live pill that disagree. */}
                <h3>{h.name}</h3>
                <CountPill>{t("spots", { count: h.venue_count })}</CountPill>
              </div>
            </a>
            );
          })}
        </div>
      </section>

      <NewsletterBand locale={locale} />
      <Footer locale={locale} />
    </>
  );
}
