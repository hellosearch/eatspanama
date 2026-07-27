import { brandOf } from "@/lib/brands";
import { toClientVenue } from "@/lib/client-photo";
import type { Metadata } from "next";
import { formatMonth, latestChecked } from "@/lib/format";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getCity, allNeighborhoods } from "@/lib/data";
import { goodForOccasions, getGoodFor } from "@/lib/goodfor";
import {
  absoluteUrl,
  cityPath,
  citySlugFor,
  goodForPath,
  goodForIndexPath,
  listingPath,
  venuePath,
  withLocale,
} from "@/lib/paths";
import { pairedAlternates, indexable, OG_DEFAULT_IMAGE } from "@/lib/seo";
import { venueItemListJsonLd } from "@/lib/jsonld";
import { goodForHeading, hubFacts, hubFaqs } from "@/lib/hub-copy";
import Breadcrumb from "@/components/Breadcrumb";
import HubIntro from "@/components/HubIntro";
import FaqBlock from "@/components/FaqBlock";
import DiscoveryView from "@/components/DiscoveryView";
import { discoveryLabels } from "@/lib/discovery-labels";
import Footer from "@/components/Footer";
import InterlinkModule from "@/components/InterlinkModule";
import { occasionInterlink } from "@/lib/interlink";
import JsonLd from "@/components/JsonLd";
import NewsletterBand from "@/components/NewsletterBand";
import { UpdatedStamp, VerifiedStamp } from "@/components/badges";
import { SecIcon } from "@/components/icons";

interface Params {
  locale: string;
  city: string;
  occasion: string;
}

export function generateStaticParams({ params }: { params: { locale: string } }) {
  const { locale } = params;
  return goodForOccasions.map((o) => ({ city: citySlugFor(o.citySlug, locale), occasion: o.slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, city, occasion } = await params;
  const cityRec = await getCity(city, locale);
  if (!cityRec) return {};
  const occ = getGoodFor(cityRec.slug, occasion);
  if (!occ) return {};
  const cityName = locale === "es" ? cityRec.name_es : cityRec.name_en;
  const t = await getTranslations({ locale, namespace: "GoodFor" });
  // EN: keyword heading + live count ("12 Cocktail Bars in Panama City",
  // "Where to Eat Ceviche in Panama City"); ES keeps its per-facet strings.
  const heading = goodForHeading(occasion, occ.kind, t(`label_${occasion}`));
  const title =
    locale === "en"
      ? `${heading.phrase} in ${cityName}${heading.useCount ? ` (${occ.count})` : ""} | EatsPanama`
      : t(`meta_${occasion}`, { city: cityName });
  const description =
    locale === "en"
      ? `${heading.useCount ? `All ${occ.count} ` : ""}${heading.phrase.toLowerCase()} in ${cityName}, on one map and filterable by price, neighborhood and features. No paid rankings - compiled from public sources.`
      : t(`intro_${occasion}`, { city: cityName, count: occ.count });
  const alternates = pairedAlternates(locale, {
    en: goodForPath(cityRec.slug, occasion, "en"),
    es: goodForPath(cityRec.slug, occasion, "es"),
  });
  return {
    title,
    description,
    alternates,
    openGraph: { title, description, url: alternates.canonical, images: [OG_DEFAULT_IMAGE] },
    robots: indexable(),
  };
}

export default async function GoodForOccasionPage({ params }: { params: Promise<Params> }) {
  const { locale, city, occasion } = await params;
  setRequestLocale(locale);
  const cityRec = await getCity(city, locale);
  if (!cityRec) notFound();
  const occ = getGoodFor(cityRec.slug, occasion);
  if (!occ) notFound();

  const t = await getTranslations({ locale, namespace: "GoodFor" });
  const tl = await getTranslations({ locale, namespace: "Listing" });
  const cityName = locale === "es" ? cityRec.name_es : cityRec.name_en;
  const label = t(`label_${occasion}`);
  const selfAbs = absoluteUrl(locale, goodForPath(cityRec.slug, occasion, "en"));

  const venues = [...occ.venues].sort(
    (a, b) =>
      (a.editors_pick_rank ?? 99) - (b.editors_pick_rank ?? 99) ||
      (b.verified_at ?? "").localeCompare(a.verified_at ?? "")
  );
  const dataMonth = latestChecked(venues);
  const vHref = (hoodSlug: string, slug: string) =>
    withLocale(locale, venuePath(cityRec.slug, slug, locale));
  const discItems = venues.map((v) => {
    const b = brandOf(v);
    return {
      venue: toClientVenue(v),
      href: vHref(v.neighborhood_slug, v.slug),
      brandSlug: b?.slug,
      brandCount: b?.count,
      brandHref: b ? withLocale(locale, `${cityPath(cityRec.slug, locale)}${b.slug}/`) : undefined,
    };
  });

  // Facts panel + FAQ (EN keyword heading; ES keeps its per-facet strings).
  const en = locale === "en";
  const heading = goodForHeading(occasion, occ.kind, label);
  const faqSubject = heading.useCount ? heading.phrase : `${label} spots`;
  const hoodNameOf = (slug: string) => allNeighborhoods.find((n) => n.slug === slug)?.name ?? slug;
  const facts = hubFacts(occ.venues, hoodNameOf);
  const hoodLinks = facts.topHoods.map((h) => ({
    name: h.name,
    count: h.count,
    href: withLocale(locale, listingPath(cityRec.slug, h.slug, locale)),
  }));
  const glanceLabels = en
    ? { glance: "At a glance", places: "places", price: "Price", topAreas: "Top areas", related: "Also good for" }
    : { glance: "De un vistazo", places: "lugares", price: "Precio", topAreas: "Zonas principales", related: "También ideal para" };
  // Sideways paths in the hero: same-kind facets first (occasion<->occasion,
  // dish<->dish), topped up with other popular facets. Fills the dead space and
  // keeps the visitor moving.
  const relatedFacets = (() => {
    const all = goodForOccasions.filter((o) => o.citySlug === cityRec.slug && o.slug !== occasion);
    const same = all.filter((o) => o.kind === occ.kind).sort((a, b) => b.count - a.count);
    const rest = all.filter((o) => o.kind !== occ.kind).sort((a, b) => b.count - a.count);
    return [...same, ...rest]
      .slice(0, 6)
      .map((o) => ({ label: t(`label_${o.slug}`), href: withLocale(locale, goodForPath(cityRec.slug, o.slug, locale)) }));
  })();
  const topHoodNames = facts.topHoods.map((h) => h.name);
  const clusterSentence =
    topHoodNames.length >= 2
      ? ` The strongest clusters are in ${topHoodNames.slice(0, -1).join(", ")} and ${topHoodNames[topHoodNames.length - 1]}.`
      : topHoodNames.length === 1
        ? ` Most are in ${topHoodNames[0]}.`
        : "";

  return (
    <>
      <Breadcrumb
        crumbs={[
          { name: tl("home"), href: withLocale(locale, "/"), absUrl: absoluteUrl(locale, "/") },
          {
            name: cityName,
            href: withLocale(locale, cityPath(cityRec.slug, locale)),
            absUrl: absoluteUrl(locale, cityPath(cityRec.slug, locale)),
          },
          {
            name: t("crumb"),
            href: withLocale(locale, goodForIndexPath(cityRec.slug, locale)),
            absUrl: absoluteUrl(locale, goodForIndexPath(cityRec.slug, locale)),
          },
          { name: label, absUrl: selfAbs },
        ]}
      />

      <HubIntro facts={facts} hoodLinks={hoodLinks} labels={glanceLabels} related={relatedFacets}>
        <p className="lh-kicker">
          <SecIcon name={occasion === "rooftop" ? "notable" : "good"} />
          {t("kicker", { city: cityName })}
        </p>
        <h1>
          {en ? (
            <>
              {heading.useCount ? `${occ.count} ` : ""}
              {heading.phrase} in <span className="accent">{cityName}</span>
            </>
          ) : (
            <>
              {t(`h1_${occasion}`)}
              <span className="accent">{cityName}</span>
            </>
          )}
        </h1>
        <p className="lh-intro">
          {en
            ? heading.useCount
              ? `All ${occ.count} ${heading.phrase} we track in ${cityName}, on one map and filterable by price, occasion and features.${clusterSentence} No restaurant can pay to appear or rank.`
              : `${heading.phrase} in ${cityName} - ${occ.count} places on one map, filterable by price, occasion and features.${clusterSentence} No restaurant can pay to appear or rank.`
            : t(`intro_${occasion}`, { city: cityName, count: occ.count })}
        </p>
        <div className="trust-row">
          <VerifiedStamp>{tl("noPaidRankings")}</VerifiedStamp>
          <UpdatedStamp>{tl("dataUpdated", { month: formatMonth(dataMonth) })}</UpdatedStamp>
        </div>
      </HubIntro>

      <section className="block block-fog block-discovery">
        <DiscoveryView
          items={discItems}
          locale={locale}
          verifiedLabel={tl("verified")}
          waLabel={tl("whatsapp")}
          labels={discoveryLabels(tl, t("listAll", { label, city: cityName }))}
          hoodNames={Object.fromEntries(allNeighborhoods.map((n) => [n.slug, n.name]))}
        />
        <JsonLd
          data={venueItemListJsonLd(
            venues,
            (v) => absoluteUrl(locale, venuePath(cityRec.slug, v.slug, locale)),
            `${label} - ${cityName}`,
            occ.count
          )}
        />
      </section>

      {en && (
        <section className="block hub-faq" style={{ paddingTop: 0 }}>
          <div className="sec-head">
            <div>
              <p className="eyebrow">FAQ</p>
              <h2 className="sec-title">
                {heading.phrase} in {cityName}
              </h2>
            </div>
          </div>
          <FaqBlock faqs={hubFaqs(faqSubject, cityName, facts, occasion)} variant="accordion2" />
        </section>
      )}

      <InterlinkModule locale={locale} sections={occasionInterlink(occ, locale, (s) => t(`label_${s}`))} />

      <NewsletterBand locale={locale} />
      <Footer locale={locale} />
    </>
  );
}
