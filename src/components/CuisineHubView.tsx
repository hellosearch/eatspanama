/**
 * Neighborhood + cuisine hub view. Rendered by the shared 4th-segment route
 * ([locale]/[city]/[hood]/[venue]) when the segment matches a cuisine hub
 * rather than a venue slug - the hub and venue profiles share the same URL
 * position (/{city}/{hood}/{seg}/), so one dynamic segment serves both.
 *
 * A filtered version of the neighborhood listing: same card grid + branded
 * hero, scoped to one cuisine. Honest copy only (built from public sources -
 * no visit/verification claims).
 */
import { setRequestLocale, getTranslations } from "next-intl/server";
import { formatMonth, latestChecked } from "@/lib/format";
import type { City, Neighborhood } from "@/data/mock";
import { cityVenueCount, allNeighborhoods } from "@/lib/data";
import { cuisineHubs, type CuisineHub } from "@/lib/cuisines";
import { cuisineNoun } from "@/lib/hub-copy";
import { absoluteUrl, cityPath, cuisineHubPath, listingPath, venuePath, withLocale } from "@/lib/paths";
import { venueItemListJsonLd } from "@/lib/jsonld";
import Breadcrumb from "@/components/Breadcrumb";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import NeighborhoodHero from "@/components/NeighborhoodHero";
import NewsletterBand from "@/components/NewsletterBand";
import { CountPill, UpdatedStamp, VerifiedStamp } from "@/components/badges";
import { HubSpokeTile, VenueCard } from "@/components/cards";

export default async function CuisineHubView({
  locale,
  cityRec,
  hood,
  hub,
}: {
  locale: string;
  cityRec: City;
  hood: Neighborhood;
  hub: CuisineHub;
}) {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "CuisineHub" });
  const tl = await getTranslations({ locale, namespace: "Listing" });

  const cityName = locale === "es" ? cityRec.name_es : cityRec.name_en;
  const venues = [...hub.venues].sort((a, b) => a.name.localeCompare(b.name));
  const dataMonth = latestChecked(venues);
  const vHref = (slug: string) => withLocale(locale, venuePath(hood.city_slug, slug, locale));
  const selfAbs = absoluteUrl(locale, cuisineHubPath(hood.city_slug, hood.slug, hub.seg, "en"));
  const listingHref = withLocale(locale, listingPath(hood.city_slug, hood.slug, locale));

  // Sibling cuisine hubs in the SAME neighborhood (all pass the gate -> zero
  // 404s), for internal linking. Excludes the current cuisine.
  const siblings = cuisineHubs
    .filter((h) => h.hoodSlug === hood.slug && h.seg !== hub.seg)
    .sort((a, b) => b.count - a.count || a.cuisine.localeCompare(b.cuisine))
    .slice(0, 8);

  // The most natural cuisine-hunter move: SAME cuisine, OTHER neighborhoods.
  // Previously impossible in-body (only the header dropdown got you there).
  const otherHoods = cuisineHubs
    .filter((h) => h.seg === hub.seg && h.hoodSlug !== hood.slug)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const hoodNameOf = (slug: string) => allNeighborhoods.find((n) => n.slug === slug)?.name ?? slug;

  return (
    <>
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
          { name: hub.cuisine, absUrl: selfAbs },
        ]}
      />

      {/* ABOVE THE FOLD: text first in DOM, branded hero (cuisine-keyed) beside */}
      <div className="listing-head">
        <div className="lh-copy">
          <p className="lh-kicker">{t("kicker", { hood: hood.name })}</p>
          <h1>
            {hub.count} <span className="accent">{cuisineNoun(hub.cuisine)}</span> {t("h1RestShort", { hood: hood.name })}
          </h1>
          <p className="lh-intro">{t("intro", { count: hub.count, cuisine: hub.cuisine, hood: hood.name })}</p>
          <div className="trust-row">
            <VerifiedStamp>{tl("noPaidRankings")}</VerifiedStamp>
            <CountPill>{tl("places", { count: hub.count })}</CountPill>
            <UpdatedStamp>{tl("dataUpdated", { month: formatMonth(dataMonth) })}</UpdatedStamp>
          </div>
        </div>
        <NeighborhoodHero
          name={hub.cuisine}
          cityName={`${hood.name}, ${cityName}`}
          countLabel={tl("places", { count: hub.count })}
          topCuisines={[hub.cuisine]}
        />
      </div>

      {/* FULL FILTERED GRID + ItemList/Restaurant JSON-LD */}
      <section className="block block-fog">
        <div className="sec-head">
          <div>
            <p className="eyebrow">{t("listEyebrow")}</p>
            <h2 className="sec-title">{t("listTitle", { count: hub.count, cuisine: hub.cuisine, hood: hood.name })}</h2>
            <p className="sec-sub">{t("listSub", { cuisine: hub.cuisine, hood: hood.name })}</p>
          </div>
          <a className="see-all" href={listingHref}>
            {t("allInHood", { hood: hood.name })}
          </a>
        </div>
        <div className="venues">
          {venues.map((v) => (
            <VenueCard
              key={v.id}
              venue={v}
              locale={locale}
              href={vHref(v.slug)}
              verifiedLabel={tl("verified")}
              waLabel={tl("whatsapp")}
            />
          ))}
        </div>
        <JsonLd
          data={venueItemListJsonLd(
            venues,
            (v) => absoluteUrl(locale, venuePath(hood.city_slug, v.slug, "en")),
            hood.name,
            hub.count
          )}
        />
      </section>

      {/* HUB-SPOKE: other cuisines in this neighborhood (all real routes) */}
      {siblings.length > 0 && (
        <section className="block" style={{ paddingTop: 0 }}>
          <div className="sec-head">
            <div>
              <p className="eyebrow">{tl("cuisineEyebrow")}</p>
              <h2 className="sec-title">{tl("cuisineTitle", { hood: hood.name })}</h2>
              <p className="sec-sub">{tl("cuisineSub")}</p>
            </div>
          </div>
          <div className="linkhub">
            {siblings.map((s) => (
              <HubSpokeTile
                key={s.seg}
                title={s.cuisine}
                count={tl("places", { count: s.count })}
                href={withLocale(locale, cuisineHubPath(hood.city_slug, hood.slug, s.seg, locale))}
              />
            ))}
            <HubSpokeTile
              title={tl("allCity")}
              count={tl("places", { count: cityVenueCount(hood.city_slug) })}
              href={withLocale(locale, cityPath(hood.city_slug, locale))}
            />
          </div>
        </section>
      )}

      {otherHoods.length > 0 && (
        <section className="block" style={{ paddingTop: 0 }}>
          <div className="sec-head">
            <div>
              <p className="eyebrow">{locale === "es" ? "En otras zonas" : "In other areas"}</p>
              <h2 className="sec-title">
                {locale === "es" ? `${hub.cuisine} en otros barrios` : `${hub.cuisine} in other neighborhoods`}
              </h2>
            </div>
          </div>
          <div className="linkhub">
            {otherHoods.map((h) => (
              <HubSpokeTile
                key={h.hoodSlug}
                title={hoodNameOf(h.hoodSlug)}
                count={tl("places", { count: h.count })}
                href={withLocale(locale, cuisineHubPath(hood.city_slug, h.hoodSlug, hub.seg, locale))}
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
