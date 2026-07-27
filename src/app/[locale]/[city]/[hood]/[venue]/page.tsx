import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { allNeighborhoods, getNeighborhood } from "@/lib/data";
import { cuisineHubs, getCuisineHub } from "@/lib/cuisines";
import { cuisineNoun } from "@/lib/hub-copy";
import { citySlugFor, cuisineHubPath } from "@/lib/paths";
import { enOnlyAlternates, indexable, OG_DEFAULT_IMAGE } from "@/lib/seo";
import CuisineHubView from "@/components/CuisineHubView";

/**
 * Neighborhood + cuisine hub: /{city}/{hood}/{seg}/ (e.g. /panama-city/casco-viejo/italian/).
 *
 * This segment used to be shared with venue profiles, which is why venue slugs
 * and hub segments needed a build-time collision guard. Venues now live at
 * /venues/{slug}/, so this route serves hubs only and the two namespaces can no
 * longer clash.
 */
interface Params {
  locale: string;
  city: string;
  hood: string;
  venue: string; // the hub segment; the folder name is historical
}

export function generateStaticParams({ params }: { params: { locale: string } }) {
  const { locale } = params;
  return cuisineHubs.map((hub) => {
    const hood = allNeighborhoods.find((n) => n.slug === hub.hoodSlug)!;
    return {
      city: citySlugFor(hood.city_slug, locale),
      hood: locale === "es" ? hood.slug_es : hood.slug,
      venue: hub.seg,
    };
  });
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, city, hood, venue: seg } = await params;
  const found = await getNeighborhood(city, hood, locale);
  if (!found) return {};
  const hub = getCuisineHub(found.hood.slug, seg);
  if (!hub) return {};
  const th = await getTranslations({ locale, namespace: "CuisineHub" });
  const title = `${cuisineNoun(hub.cuisine)} in ${found.hood.name}, Panama City | EatsPanama`;
  const description = th("intro", { count: hub.count, cuisine: hub.cuisine, hood: found.hood.name });
  const alternates = enOnlyAlternates(cuisineHubPath(found.hood.city_slug, found.hood.slug, hub.seg, "en"));
  return {
    title,
    description,
    alternates,
    openGraph: { title, description, url: alternates.canonical, images: [OG_DEFAULT_IMAGE] },
    robots: indexable(),
  };
}

export default async function CuisineHubPage({ params }: { params: Promise<Params> }) {
  const { locale, city, hood, venue: seg } = await params;
  setRequestLocale(locale);
  const found = await getNeighborhood(city, hood, locale);
  if (!found) notFound();
  const hub = getCuisineHub(found.hood.slug, seg);
  if (!hub) notFound();
  return <CuisineHubView locale={locale} cityRec={found.city} hood={found.hood} hub={hub} />;
}
