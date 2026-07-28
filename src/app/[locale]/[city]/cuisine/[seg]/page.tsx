import { brandOf } from "@/lib/brands";
import { toClientVenue } from "@/lib/client-photo";
import type { Metadata } from "next";
import { cleanCuisine, formatMonth, latestChecked } from "@/lib/format";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getCity, allNeighborhoods } from "@/lib/data";
import { cityCuisineHubs, getCityCuisineHub, cuisineHubs } from "@/lib/cuisines";
import {
  absoluteUrl,
  cityPath,
  citySlugFor,
  cityCuisinePath,
  cityCuisineIndexPath,
  cuisineHubPath,
  venuePath,
  withLocale,
} from "@/lib/paths";
import { pairedAlternates, indexable } from "@/lib/seo";
import { venueItemListJsonLd } from "@/lib/jsonld";
import { cuisineNoun, cuisineNounEs, ucFirst, hubFacts, hubFaqs } from "@/lib/hub-copy";
import Breadcrumb from "@/components/Breadcrumb";
import HubIntro from "@/components/HubIntro";
import FaqBlock from "@/components/FaqBlock";
import DiscoveryView from "@/components/DiscoveryView";
import { discoveryLabels } from "@/lib/discovery-labels";
import Footer from "@/components/Footer";
import InterlinkModule from "@/components/InterlinkModule";
import { cuisineInterlink } from "@/lib/interlink";
import JsonLd from "@/components/JsonLd";
import NewsletterBand from "@/components/NewsletterBand";
import { UpdatedStamp, VerifiedStamp } from "@/components/badges";
import { CuisineGlyph } from "@/components/icons";

interface Params {
  locale: string;
  city: string;
  seg: string;
}

/** Same glyph mapping used by the hub's cuisine chips. */
function cuisineIcon(seg: string): string {
  if (/seafood|fish|marisc|ceviche/.test(seg)) return "seafood";
  if (/sushi|japan|nikkei|asian/.test(seg)) return "sushi";
  if (/cafe|coffee|brunch|bakery/.test(seg)) return "cafe";
  if (/bar|cocktail|pub|night/.test(seg)) return "bar";
  if (/pizza/.test(seg)) return "pizza";
  if (/burger/.test(seg)) return "burger";
  if (/steak|grill|parrilla|meat/.test(seg)) return "steak";
  if (/panam|latin|crioll/.test(seg)) return "local";
  return "food";
}

export function generateStaticParams({ params }: { params: { locale: string } }) {
  const { locale } = params;
  return cityCuisineHubs.map((h) => ({
    city: citySlugFor(h.citySlug, locale),
    seg: h.seg,
  }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, city, seg } = await params;
  const cityRec = await getCity(city, locale);
  if (!cityRec) return {};
  const hub = getCityCuisineHub(cityRec.slug, seg);
  if (!hub) return {};
  const cityName = locale === "es" ? cityRec.name_es : cityRec.name_en;
  const t = await getTranslations({ locale, namespace: "CityCuisine" });
  // EN targets the real query ("{cuisine} restaurants {city}") with the live
  // count; ES keeps its existing strings until the Spanish editorial pass.
  const noun = cuisineNoun(hub.cuisine);
  const nounEs = cuisineNounEs(hub.cuisine);
  const title =
    locale === "en"
      ? `${noun} in ${cityName} (${hub.count}) | EatsPanama`
      : `${ucFirst(nounEs)} en ${cityName} (${hub.count}) | EatsPanama`;
  const description =
    locale === "en"
      ? `All ${hub.count} ${noun.toLowerCase()} in ${cityName}, on one map and filterable by price, neighborhood and features. No paid rankings - compiled from public sources and checked for hours.`
      : `Los ${hub.count} ${nounEs} que seguimos en ${cityName}, en un mapa y filtrables por precio, zona y características. Sin rankings pagados - recopilado de fuentes públicas y con horarios verificados.`;
  const alternates = pairedAlternates(locale, {
    en: cityCuisinePath(cityRec.slug, seg, "en"),
    es: cityCuisinePath(cityRec.slug, seg, "es"),
  });
  return {
    title,
    description,
    alternates,
    openGraph: { title, description, url: alternates.canonical },
    robots: indexable(),
  };
}

export default async function CityCuisinePage({ params }: { params: Promise<Params> }) {
  const { locale, city, seg } = await params;
  setRequestLocale(locale);
  const cityRec = await getCity(city, locale);
  if (!cityRec) notFound();
  const hub = getCityCuisineHub(cityRec.slug, seg);
  if (!hub) notFound();

  const t = await getTranslations({ locale, namespace: "CityCuisine" });
  const tl = await getTranslations({ locale, namespace: "Listing" });
  const tg = await getTranslations({ locale, namespace: "GoodFor" });
  const cityName = locale === "es" ? cityRec.name_es : cityRec.name_en;
  const selfAbs = absoluteUrl(locale, cityCuisinePath(cityRec.slug, seg, "en"));

  // Sort the strongest picks first (editor rank, then verified recency) so the
  // list opens on the best of the cuisine, then everything else.
  const venues = [...hub.venues].sort(
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

  // Hub facts (count, price range, top neighborhoods) power the "at a glance"
  // panel, the richer intro sentence, and the FAQ. Top neighborhoods link to
  // that neighborhood's page for this cuisine when it exists, else the listing.
  const en = locale === "en";
  const noun = cuisineNoun(hub.cuisine);
  const nounEs = cuisineNounEs(hub.cuisine);
  const hoodNameOf = (slug: string) => allNeighborhoods.find((n) => n.slug === slug)?.name ?? slug;
  const facts = hubFacts(hub.venues, hoodNameOf);
  // "Top areas" keeps the cuisine context: prefer the dedicated {hood}+{cuisine}
  // hub page when one exists ("Italian in Bella Vista"); otherwise filter THIS
  // cuisine page in place by that neighborhood (DiscoveryView reads ?hood= on
  // mount) rather than dumping the visitor on the unfiltered neighborhood list.
  const selfHref = withLocale(locale, cityCuisinePath(cityRec.slug, seg, locale));
  const hoodHref = (slug: string) =>
    cuisineHubs.some((h) => h.hoodSlug === slug && h.seg === seg)
      ? withLocale(locale, cuisineHubPath(cityRec.slug, slug, seg, locale))
      : `${selfHref}?hood=${slug}#disc-top`;
  const hoodLinks = facts.topHoods.map((h) => ({ name: h.name, count: h.count, href: hoodHref(h.slug) }));
  const glanceLabels = en
    ? { glance: "At a glance", places: "places", price: "Price", topAreas: "Top areas", related: "Related cuisines" }
    : { glance: "De un vistazo", places: "lugares", price: "Precio", topAreas: "Zonas principales", related: "Cocinas relacionadas" };
  // Sideways paths in the hero: other cuisines in the city (fills the dead space
  // and gives an immediate next step, no dead ends).
  const relatedCuisines = cityCuisineHubs
    .filter((h) => h.citySlug === cityRec.slug && h.seg !== seg)
    .sort((a, b) => b.count - a.count || a.seg.localeCompare(b.seg))
    .slice(0, 6)
    .map((h) => ({ label: cleanCuisine(h.cuisine), href: withLocale(locale, cityCuisinePath(cityRec.slug, h.seg, locale)) }));
  const topHoodNames = facts.topHoods.map((h) => h.name);
  const clusterSentence =
    topHoodNames.length >= 2
      ? ` The strongest clusters are in ${topHoodNames.slice(0, -1).join(", ")} and ${topHoodNames[topHoodNames.length - 1]}.`
      : topHoodNames.length === 1
        ? ` Most are in ${topHoodNames[0]}.`
        : "";
  const clusterSentenceEs =
    topHoodNames.length >= 2
      ? ` Los grupos más fuertes están en ${topHoodNames.slice(0, -1).join(", ")} y ${topHoodNames[topHoodNames.length - 1]}.`
      : topHoodNames.length === 1
        ? ` La mayoría están en ${topHoodNames[0]}.`
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
            name: locale === "es" ? "Cocinas" : "Cuisines",
            href: withLocale(locale, cityCuisineIndexPath(cityRec.slug, locale)),
            absUrl: absoluteUrl(locale, cityCuisineIndexPath(cityRec.slug, locale)),
          },
          { name: hub.cuisine, absUrl: selfAbs },
        ]}
      />

      {/* ABOVE THE FOLD: keyword H1 + intro on the left, an "at a glance" facts
          panel on the right; the map/list follow immediately. */}
      <HubIntro facts={facts} hoodLinks={hoodLinks} labels={glanceLabels} related={relatedCuisines}>
        <p className="lh-kicker">
          <CuisineGlyph name={cuisineIcon(seg)} />
          {t("kicker", { city: cityName })}
        </p>
        <h1>
          {en ? (
            <>
              {hub.count} {noun} in <span className="accent">{cityName}</span>
            </>
          ) : (
            <>
              {hub.count} {nounEs} en <span className="accent">{cityName}</span>
            </>
          )}
        </h1>
        <p className="lh-intro">
          {en
            ? `All ${hub.count} ${noun} we track in ${cityName}, on one map and filterable by price, occasion and features.${clusterSentence} No restaurant can pay to appear or rank.`
            : `Los ${hub.count} ${nounEs} que seguimos en ${cityName}, en un mapa y filtrables por precio, ocasión y características.${clusterSentenceEs} Ningún restaurante puede pagar para aparecer ni posicionarse.`}
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
          labels={discoveryLabels(tl, t("listTitle", { cuisine: hub.cuisine, city: cityName }))}
          hoodNames={Object.fromEntries(allNeighborhoods.map((n) => [n.slug, n.name]))}
        />
        <JsonLd
          data={venueItemListJsonLd(
            venues,
            (v) => absoluteUrl(locale, venuePath(cityRec.slug, v.slug, locale)),
            `${hub.cuisine} - ${cityName}`,
            hub.count
          )}
        />
      </section>

      {en && (
        <section className="block hub-faq" style={{ paddingTop: 0 }}>
          <div className="sec-head">
            <div>
              <p className="eyebrow">FAQ</p>
              <h2 className="sec-title">
                {noun} in {cityName}
              </h2>
            </div>
          </div>
          <FaqBlock faqs={hubFaqs(noun, cityName, facts, seg)} variant="accordion2" />
        </section>
      )}

      <InterlinkModule
        locale={locale}
        sections={cuisineInterlink(hub.venues, cityRec.slug, locale, (s) => tg(`label_${s}`))}
      />

      <NewsletterBand locale={locale} />
      <Footer locale={locale} />
    </>
  );
}
