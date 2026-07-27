import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { cities } from "@/data/mock";
import { allVenues, cityVenueCount, getCity, getGuides, getNeighborhoods } from "@/lib/data";
import { absoluteUrl, cityPath, citySlugFor, cityCuisinePath, listingPath, withLocale } from "@/lib/paths";
import { cityCuisineHubs, cityCuisineHubExists } from "@/lib/cuisines";
import { cleanCuisine, guideUpdated } from "@/lib/format";
import type { Faq } from "@/lib/faq";
import { pairedAlternates, indexable, SITE_URL, SITE_NAME, OG_DEFAULT_IMAGE } from "@/lib/seo";
import Breadcrumb from "@/components/Breadcrumb";
import FaqBlock from "@/components/FaqBlock";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import NewsletterBand from "@/components/NewsletterBand";
import NeighborhoodBrowser, { type HoodItem } from "@/components/NeighborhoodBrowser";
import SearchCard from "@/components/SearchCard";
import { GuideCard } from "@/components/cards";
import { localizeGuide } from "@/lib/localize";
import { CuisineGlyph, DishGlyph, SecIcon } from "@/components/icons";

interface Params {
  locale: string;
  city: string;
}

export function generateStaticParams({ params }: { params: { locale: string } }) {
  const { locale } = params;
  return cities.map((c) => ({ city: citySlugFor(c.slug, locale) }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, city } = await params;
  const cityRec = await getCity(city, locale);
  if (!cityRec) return {};
  const cityName = locale === "es" ? cityRec.name_es : cityRec.name_en;
  const total = cityVenueCount(cityRec.slug);
  const t = await getTranslations({ locale, namespace: "CityHub" });
  const title = t("metaTitle", { city: cityName });
  const description = t("intro", { count: total, city: cityName });
  const alternates = pairedAlternates(locale, {
    en: cityPath(cityRec.slug, "en"),
    es: cityPath(cityRec.slug, "es"),
  });
  return {
    title,
    description,
    alternates,
    openGraph: { title, description, url: alternates.canonical, images: [OG_DEFAULT_IMAGE] },
    robots: indexable(),
  };
}

export default async function CityHubPage({ params }: { params: Promise<Params> }) {
  const { locale, city } = await params;
  setRequestLocale(locale);
  const cityRec = await getCity(city, locale);
  if (!cityRec) notFound();

  const t = await getTranslations({ locale, namespace: "CityHub" });
  const tl = await getTranslations({ locale, namespace: "Listing" });
  const th = await getTranslations({ locale, namespace: "Home" });
  const hoods = (await getNeighborhoods()).filter((n) => n.city_slug === cityRec.slug);
  const cityName = locale === "es" ? cityRec.name_es : cityRec.name_en;
  const total = cityVenueCount(cityRec.slug);
  const selfAbs = absoluteUrl(locale, cityPath(cityRec.slug, "en"));
  const hoodHref = (hoodSlug: string) => withLocale(locale, listingPath(cityRec.slug, hoodSlug, locale));

  // Per-neighborhood centroid (avg of its open venues) for the map pins.
  const centroid = (slug: string) => {
    const vs = allVenues.filter((v) => v.neighborhood_slug === slug && v.status === "open");
    if (!vs.length) return null;
    return {
      lat: vs.reduce((s, v) => s + v.lat, 0) / vs.length,
      lng: vs.reduce((s, v) => s + v.lng, 0) / vs.length,
    };
  };

  // Data-derived "good for" tags per neighborhood (from its venues' real tags),
  // so the filter facets are honest, never fabricated. A tag applies when >= 3
  // of the area's venues carry it.
  const OCC = [
    { key: "date", label: t("tagDate"), match: ["date-night"] },
    { key: "brunch", label: t("tagBrunch"), match: ["brunch"] },
    { key: "nightlife", label: t("tagNightlife"), match: ["bar", "nightlife", "late-night", "cocktail"] },
    { key: "seafood", label: t("tagSeafood"), match: ["seafood", "ceviche"] },
    { key: "cheap", label: t("tagCheap"), match: ["cheap-eats"] },
    { key: "family", label: t("tagFamily"), match: ["family"] },
    { key: "view", label: t("tagView"), match: ["view", "rooftop", "waterfront", "sunset"] },
  ];
  const hoodTags = (slug: string) => {
    const vs = allVenues.filter((v) => v.neighborhood_slug === slug && v.status === "open");
    return OCC.map((o) => ({
      o,
      n: vs.filter((v) => (v.tags_en ?? []).some((tg) => o.match.includes(tg.toLowerCase()))).length,
    }))
      .filter((x) => x.n >= 3)
      .sort((a, b) => b.n - a.n)
      .map((x) => ({ key: x.o.key, label: x.o.label }));
  };

  // Browse-by-cuisine: real city-wide cuisine pages ("all cafes in Panama
  // City", etc.) - each links to /{city}/cuisine/{seg}/, NOT a single
  // neighborhood, so "Cafes" means every cafe across the city.
  // Every city-cuisine page is linked here (not just the top few) so none is an
  // orphan - each is a crawlable internal link, ordered by size.
  const cityCuisines = cityCuisineHubs
    .filter((h) => h.citySlug === cityRec.slug)
    .sort((a, b) => b.count - a.count || a.seg.localeCompare(b.seg))
    .map((h) => ({ seg: h.seg, cuisine: cleanCuisine(h.cuisine), count: h.count }));

  // Flagship "Where Panama City eats": every neighborhood as a numbered card
  // (photo or branded tile) synced to a numbered pin on ONE real map, filterable
  // by "good for". Sorted by size so the number is a stable pin key (a locator,
  // never a ranking - stays inside the no-pay-to-rank rule). All text is
  // server-rendered (crawlable) + ItemList schema.
  const TILES = ["ora", "ink", "warm", "deep"] as const;
  const hoodItems: HoodItem[] = hoods
    .map((h) => {
      const c = centroid(h.slug);
      return c ? { h, c } : null;
    })
    .filter((x): x is { h: (typeof hoods)[number]; c: { lat: number; lng: number } } => x !== null)
    .sort((a, b) => b.h.venue_count - a.h.venue_count || a.h.name.localeCompare(b.h.name))
    .map(({ h, c }, i) => ({
      slug: h.slug,
      name: h.name,
      count: h.venue_count,
      hook: t(`hook_${h.slug.replace(/-/g, "_")}`),
      cuisines: h.top_cuisines ?? [],
      tags: hoodTags(h.slug),
      href: hoodHref(h.slug),
      lat: c.lat,
      lng: c.lng,
      num: i + 1,
      photo: h.hero_image ? { url: h.hero_image.url } : undefined,
      tile: TILES[i % TILES.length],
    }));
  const hoodFilterKeys = new Set(hoodItems.flatMap((i) => i.tags.map((tg) => tg.key)));
  const hoodFilters = OCC.filter((o) => hoodFilterKeys.has(o.key)).map((o) => ({ key: o.key, label: o.label }));

  // "What to eat": signature dishes, each linked to the city-cuisine page it
  // belongs to (real internal links; only when that cuisine page exists).
  const dishCuisine = (seg: string) =>
    cityCuisineHubExists(cityRec.slug, seg)
      ? { seg, cuisine: cleanCuisine(seg === "seafood" ? "Seafood" : "Panamanian"), href: withLocale(locale, cityCuisinePath(cityRec.slug, seg, locale)) }
      : { seg, cuisine: "", href: undefined as string | undefined };
  const dishes = [
    { key: "dish1", glyph: "ceviche", ...dishCuisine("seafood") },
    { key: "dish2", glyph: "fish", ...dishCuisine("seafood") },
    { key: "dish3", glyph: "soup", ...dishCuisine("panamanian") },
    { key: "dish4", glyph: "plate", ...dishCuisine("panamanian") },
    { key: "dish5", glyph: "stack", ...dishCuisine("panamanian") },
    { key: "dish6", glyph: "rice", ...dishCuisine("panamanian") },
  ];

  // "How dining works": practical insider notes (static editorial, honest).
  const practical = [
    { key: "prac1", icon: "coin" },
    { key: "prac2", icon: "calendar" },
    { key: "prac3", icon: "time" },
    { key: "prac4", icon: "coin" },
  ];

  // Neighborhood centroids also gave us hoodSlugs; reuse for cuisine gating.
  const faqs: Faq[] = [1, 2, 3, 4, 5, 6].map((i) => ({
    q: t(`faqQ${i}`),
    a: t(`faqA${i}`),
    bullets: t.raw(`faqA${i}Bullets`) as string[],
    aEnd: t(`faqA${i}End`) || undefined,
  }));
  const guides = (await getGuides()).filter((g) => g.entries.length > 0).slice(0, 1).map((g) => localizeGuide(g, locale));
  // Browsable cuisines = the city cuisine HUBS you can actually click through
  // to (>= CITY_CUISINE_HUB_MIN), so this stat matches the cuisine index's
  // "N cuisines" instead of the larger ungated count of distinct primaries.
  const cuisineCount = cityCuisineHubs.filter((h) => h.citySlug === cityRec.slug).length;
  // Cuisine-icon slug for the chip glyphs (falls back to a generic mark).
  const cuisineIcon = (seg: string) => {
    if (/seafood|fish|marisc|ceviche/.test(seg)) return "seafood";
    if (/sushi|japan|nikkei|asian/.test(seg)) return "sushi";
    if (/cafe|coffee|brunch|bakery/.test(seg)) return "cafe";
    if (/bar|cocktail|pub|night/.test(seg)) return "bar";
    if (/pizza/.test(seg)) return "pizza";
    if (/burger/.test(seg)) return "burger";
    if (/steak|grill|parrilla|meat/.test(seg)) return "steak";
    if (/panam|latin|crioll/.test(seg)) return "local";
    return "food";
  };

  // CollectionPage + ItemList of the neighborhood index (each item -> its
  // listing URL). No ratings, honest counts only.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${t("h1Pre")}${cityName}`,
    url: selfAbs,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: hoods.length,
      itemListElement: hoods.map((h, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: h.name,
        item: absoluteUrl(locale, listingPath(cityRec.slug, h.slug, "en")),
      })),
    },
  };

  return (
    <>
      <Breadcrumb
        crumbs={[
          { name: tl("home"), href: withLocale(locale, "/"), absUrl: absoluteUrl(locale, "/") },
          { name: cityName, absUrl: selfAbs },
        ]}
      />

      {/* FLAGSHIP: the one real map rides up to the top-right (sticky) beside the
          H1; the intro + filters + neighborhood cards fill the left column, so
          nothing above the fold is blank. Cards are server-rendered (crawlable). */}
      <section className="block block-fog hub-flagship">
        <NeighborhoodBrowser
          items={hoodItems}
          filters={hoodFilters}
          viewLabel={locale === "es" ? "Ver zona" : "View area"}
          labels={{
            areas: String(t.raw("areasTmpl")),
            goodFor: t("goodForLabel"),
            reset: t("resetLabel"),
            spots: String(t.raw("spotsTmpl")),
          }}
          header={
            <div className="hf-head">
              <p className="lh-kicker">{t("kicker")}</p>
        <h1>
          {t("h1Pre")}
          <span className="accent">{cityName}</span>
        </h1>
        <p className="hh-lead">{t("heroLead")}</p>
        <div className="hh-stats" aria-label="At a glance">
          <span className="hstat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v7a2 2 0 0 0 2 2v9M6 3v4M9 3v4M17 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4v8" /></svg>
            <b>{total}</b>{tl("places", { count: total }).replace(String(total), "").trim() || "restaurants"}
          </span>
          <span className="hstat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
            <b>{hoods.length}</b>{t("hoodsEyebrow").toLowerCase().includes("barrio") ? "barrios" : "neighborhoods"}
          </span>
          <span className="hstat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>
            <b>{cuisineCount}</b>{locale === "es" ? "cocinas" : "cuisines"}
          </span>
          <span className="hstat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4-3 6.5-7 9-4-2.5-7-5-7-9V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>
            <b className="ok">$0</b>{locale === "es" ? "pago por posición" : "pay-to-rank"}
          </span>
              </div>
              {/* Hub search - the SAME /search engine (searchVenuesRanked) as the
                  site search, so ranking is one collective scoring, not a separate one. */}
              <div className="hh-search">
                <SearchCard
                  locale={locale}
                  placeholder={t("searchPlaceholder")}
                  buttonLabel={t("searchButton")}
                  ariaLabel={t("searchAria")}
                />
              </div>
              <div className="sec-head iconed hf-modhead">
                <SecIcon name="where" />
                <div>
                  <p className="eyebrow">{t("browseEyebrow")}</p>
                  <h2 className="sec-title">{t("browseTitle")}</h2>
                  <p className="sec-sub">{t("browseSub")}</p>
                </div>
              </div>
            </div>
          }
        />
        <JsonLd data={jsonLd} />
      </section>

      {/* BROWSE PANAMA CITY BY CUISINE (city-wide internal links) */}
      {cityCuisines.length > 0 && (
        <section className="block">
          <div className="sec-head iconed">
            <SecIcon name="food" />
            <div>
              <p className="eyebrow">{t("cuisineEyebrow")}</p>
              <h2 className="sec-title">{t("cuisineTitle")}</h2>
              <p className="sec-sub">{t("cuisineSub")}</p>
            </div>
          </div>
          <div className="ccards">
            {cityCuisines.map((c) => (
              <a className="ccard" key={c.seg} href={withLocale(locale, cityCuisinePath(cityRec.slug, c.seg, locale))}>
                <span className="cc-ic"><CuisineGlyph name={cuisineIcon(c.seg)} /></span>
                <span className="cc-body">
                  <span className="cc-name">{c.cuisine}</span>
                  <span className="cc-count">{tl("places", { count: c.count })}</span>
                </span>
                <span className="cc-arrow" aria-hidden="true">→</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* WHAT TO EAT: the dishes that define the city (links to cuisine pages) */}
      <section className="block block-fog dish-sec">
        <div className="sec-head iconed">
          <SecIcon name="food" />
          <div>
            <p className="eyebrow">{t("eatEyebrow")}</p>
            <h2 className="sec-title">{t("eatTitle")}</h2>
            <p className="sec-sub">{t("eatSub")}</p>
          </div>
        </div>
        <div className="dishrows">
          {dishes.map((d, i) => {
            const inner = (
              <>
                <span className="dgw"><DishGlyph name={d.glyph} /></span>
                <span className="dn">{String(i + 1).padStart(2, "0")}</span>
                <span className="dname">{t(`${d.key}Name`)}</span>
                <span className="dd">{t(`${d.key}Desc`)}</span>
                {d.href && (
                  <span className="dmore">
                    {t("dishMore")} <i aria-hidden="true">→</i>
                  </span>
                )}
              </>
            );
            return d.href ? (
              <a className="drow" key={d.key} href={d.href}>{inner}</a>
            ) : (
              <div className="drow" key={d.key}>{inner}</div>
            );
          })}
        </div>
      </section>

      {/* HOW DINING WORKS HERE: the practical, insider "good to know" */}
      <section className="block">
        <div className="sec-head iconed">
          <SecIcon name="know" />
          <div>
            <p className="eyebrow">{t("knowEyebrow")}</p>
            <h2 className="sec-title">{t("knowTitle")}</h2>
            <p className="sec-sub">{t("knowSub")}</p>
          </div>
        </div>
        <div className="pracgrid">
          {practical.map((p) => (
            <div className="pracitem" key={p.key}>
              <h3><SecIcon name={p.icon} />{t(`${p.key}Label`)}</h3>
              <p>{t(`${p.key}Desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CITY FAQ (unique Q&A) + FAQPage JSON-LD */}
      <section className="block faq-sec" style={{ paddingTop: 0 }}>
        <div className="sec-head iconed">
          <SecIcon name="faq" />
          <div>
            <p className="eyebrow">{t("faqEyebrow")}</p>
            <h2 className="sec-title">{t("faqTitle")}</h2>
          </div>
        </div>
        <FaqBlock faqs={faqs} variant="accordion2" />
      </section>

      {/* FROM THE GUIDES (editorial cross-link) */}
      {guides.length > 0 && (
        <section className="block" style={{ paddingTop: 0 }}>
          <div className="sec-head">
            <div>
              <p className="eyebrow">{t("guidesEyebrow")}</p>
              <h2 className="sec-title">{t("guidesTitle")}</h2>
            </div>
          </div>
          <div className="guides single">
            {guides.map((g) => (
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
      )}

      <NewsletterBand locale={locale} />
      <Footer locale={locale} />
    </>
  );
}
