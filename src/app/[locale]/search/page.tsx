import type { Metadata } from "next";
import { guideUpdated } from "@/lib/format";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  allNeighborhoods as neighborhoods,
  allVenues,
  getGuides,
  searchVenuesRanked,
  getSearchFacets,
  isOpenNow,
  todayClose,
} from "@/lib/data";
import { goodForOccasions } from "@/lib/goodfor";
import { localizeGuide } from "@/lib/localize";
import { freshnessOf } from "@/lib/freshness";
import { listingPath, venuePath, withLocale } from "@/lib/paths";
import { neverIndex, localeAlternates } from "@/lib/seo";
import Footer from "@/components/Footer";
import FilterChip from "@/components/FilterChip";
import SearchCard from "@/components/SearchCard";
import SearchFilters from "@/components/SearchFilters";
import SearchViewToggle from "@/components/SearchViewToggle";
import type { MapPin } from "@/components/RestaurantMap";
import { ResultRowCard } from "@/components/cards";
import ProgressiveList from "@/components/ProgressiveList";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; cuisine?: string; price?: string; open?: string; good?: string; sort?: string; view?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Search" });
  return {
    title: `${t("title")} | EatsPanama`,
    description: t("sub"),
    alternates: localeAlternates(locale, "/search/"),
    // /search NEVER indexes (approved rule) - noindex,follow so equity flows
    // to the indexable guides/listings it links.
    robots: neverIndex(),
  };
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q = "", cuisine = "", price = "", open = "", good = "", sort = "", view = "" } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Search" });
  const tl = await getTranslations({ locale, namespace: "Listing" });
  const tg = await getTranslations({ locale, namespace: "GoodFor" });

  // "Good for" occasions available for Panama City (deduped), labelled from i18n.
  const goodForList = goodForOccasions
    .filter((o) => o.citySlug === "panama-city")
    .map((o) => ({ slug: o.slug, label: tg(`label_${o.slug}`), tagsEn: o.tagsEn }));
  const selectedGood = good ? goodForList.find((g) => g.slug === good) : undefined;

  const hasFilters = !!(cuisine || price || open || good || sort);
  const { venues: results, fallback, total } = await searchVenuesRanked(q, {
    cuisine: cuisine || undefined,
    price: price ? Number(price) : undefined,
    openNow: open === "1",
    goodForTags: selectedGood?.tagsEn,
    sort: sort === "editors" ? "editors" : "relevance",
  });
  const facets = getSearchFacets();
  const guides = (await getGuides()).map((g) => localizeGuide(g, locale));

  // Honest open-status label per result (real America/Panama hours), not a stub.
  // This route is server-rendered per request, so the freshness check can run
  // here (the statically generated venue pages must do it client-side).
  const openLabelFor = (v: (typeof results)[number]) => {
    // Hours too old to stand behind: report their age instead of open/closed.
    if (freshnessOf(v.last_checked) === "stale") return t("hoursUnverified");
    if (isOpenNow(v)) {
      const close = todayClose(v);
      return close ? t("openUntil", { time: close }) : t("openNow");
    }
    return t("closedNow");
  };
  const openStateFor = (v: (typeof results)[number]) =>
    freshnessOf(v.last_checked) === "stale" ? "unknown" : isOpenNow(v) ? "open" : "closed";

  const vHref = (v: { slug: string; neighborhood_slug: string }) => {
    const hood = neighborhoods.find((n) => n.slug === v.neighborhood_slug);
    return hood ? withLocale(locale, venuePath(hood.city_slug, v.slug, locale)) : "#";
  };

  // Map pins: the current results when there is a query/filter, otherwise every
  // open city venue - so /search/?view=map is a full-city map to explore.
  const hoodCity = new Map(neighborhoods.map((n) => [n.slug, n.city_slug]));
  const mapSource = q || hasFilters ? results : allVenues.filter((v) => v.status === "open");
  const pins: MapPin[] = mapSource.map((v) => ({
    slug: v.slug,
    name: v.name,
    cuisine: v.cuisine_en?.[0] ?? "",
    price: v.price_tier ? "$".repeat(Number(v.price_tier)) : "",
    lat: v.lat,
    lng: v.lng,
    href: withLocale(locale, venuePath(hoodCity.get(v.neighborhood_slug) ?? "panama-city", v.slug, locale)),
    photo: v.photos?.[0]?.url,
  }));

  return (
    <>
      {/* SEARCH HEAD */}
      <div className="search-head">
        <SearchCard
          locale={locale}
          placeholder={t("placeholder")}
          buttonLabel={t("searchButton")}
          ariaLabel={t("placeholder")}
          defaultValue={q}
        />
        <h1 className="res-count">
          {q && fallback ? (
            // No exact matches: the rows below are the never-empty popular
            // fallback, so the headline must NOT claim "N places serve <q>"
            // (that read as "12 places serve zzzz" on a typo).
            <>
              {t("noneFor")} <span className="q">{q}</span>
            </>
          ) : q ? (
            <>
              {t("resultsFor", { count: total })} <span className="q">{q}</span>
            </>
          ) : hasFilters ? (
            t("resultsFor", { count: total })
          ) : (
            t("noQuery")
          )}
        </h1>
        <p className="res-sub">
          {!fallback && total > results.length ? t("showingFirst", { count: results.length }) : t("sub")}
        </p>
        {/* Utility-page hidden H2 keeps the hierarchy unbroken (approved rule). */}
        <h2 className="sr-only">{t("resultsHeading")}</h2>
        <SearchFilters
          cuisines={facets.cuisines}
          prices={facets.prices}
          noPrice={facets.noPrice}
          goodFor={goodForList.map(({ slug, label }) => ({ slug, label }))}
          labels={{
            openNow: tl("openNow"),
            anyCuisine: t("anyCuisine"),
            anyPrice: t("anyPrice"),
            anyGoodFor: t("anyGoodFor"),
            sortBy: t("sortBy"),
            relevance: t("relevance"),
            editors: t("sortEditors"),
            cuisineAria: tl("cuisine"),
            priceAria: tl("price"),
            goodForAria: tg("crumb"),
            noPriceNote: t("noPriceNote", { count: facets.noPrice }),
          }}
        />
      </div>

      <SearchViewToggle
        pins={pins}
        initialView={view === "map" ? "map" : "list"}
        listLabel={tl("viewList")}
        mapLabel={tl("viewMap")}
        viewLabel={t("mapView")}
      >
        {(q || hasFilters) && results.length > 0 ? (
        <div className="results-grid">
          <div className="res-list">
            {fallback && <p className="search-fallback">{t("fallback")}</p>}
            <ProgressiveList locale={locale} initial={30}>
              {results.map((v) => (
                <ResultRowCard
                  key={v.id}
                  venue={v}
                  locale={locale}
                  href={vHref(v)}
                  openLabel={openLabelFor(v)}
                  openState={openStateFor(v)}
                  waLabel={tl("whatsapp")}
                />
              ))}
            </ProgressiveList>
          </div>

          {/* SIDE: cross-links push equity to indexable guides */}
          <aside className="side-guides">
            <p className="t-label">{t("fromEditors")}</p>
            <h2>{t("sideTitle")}</h2>
            {guides.map((g) => (
              <a className="sg" key={g.slug} href={withLocale(locale, `/guides/${g.slug}/`)}>
                <h3>{g.title_en}</h3>
                <p className="sg-meta">
                  {guideUpdated(g.updated_iso)} · {g.entries.length} places
                </p>
              </a>
            ))}
          </aside>
        </div>
      ) : (
        /* EMPTY STATE - a fresh landing (no query) gets a neutral browse prompt;
           only a query/filter that actually returned nothing says "no luck". */
        <div className="zero-state" style={{ marginTop: 34 }}>
          <p className="z-big">{q || hasFilters ? t("zeroBig") : t("browseBig")}</p>
          <p className="z-sub">{q || hasFilters ? t("zeroSub") : t("browseSub")}</p>
          <div className="z-chips">
            {neighborhoods.map((n) => (
              <FilterChip key={n.slug} href={withLocale(locale, listingPath(n.city_slug, n.slug, locale))}>
                {n.name}
              </FilterChip>
            ))}
          </div>
        </div>
      )}
      </SearchViewToggle>

      <Footer locale={locale} slim />
    </>
  );
}
