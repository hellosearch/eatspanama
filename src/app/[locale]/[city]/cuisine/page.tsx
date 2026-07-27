import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { cities } from "@/data/mock";
import { getCity } from "@/lib/data";
import { cityCuisineHubs, cuisineImg } from "@/lib/cuisines";
import {
  absoluteUrl,
  cityPath,
  citySlugFor,
  cityCuisinePath,
  cityCuisineIndexPath,
  withLocale,
} from "@/lib/paths";
import { cleanCuisine } from "@/lib/format";
import { pairedAlternates, indexable, SITE_URL, SITE_NAME, OG_DEFAULT_IMAGE } from "@/lib/seo";
import Breadcrumb from "@/components/Breadcrumb";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import NewsletterBand from "@/components/NewsletterBand";
import BrowseAxes from "@/components/BrowseAxes";
import { CuisineGlyph, SecIcon } from "@/components/icons";

interface Params {
  locale: string;
  city: string;
}

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
  return cities.map((c) => ({ city: citySlugFor(c.slug, locale) }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, city } = await params;
  const cityRec = await getCity(city, locale);
  if (!cityRec) return {};
  const cityName = locale === "es" ? cityRec.name_es : cityRec.name_en;
  const t = await getTranslations({ locale, namespace: "CuisineIndex" });
  const count = cityCuisineHubs.filter((h) => h.citySlug === cityRec.slug).length;
  const title = t("metaTitle", { city: cityName });
  const description = t("intro", { city: cityName, count });
  const alternates = pairedAlternates(locale, {
    en: cityCuisineIndexPath(cityRec.slug, "en"),
    es: cityCuisineIndexPath(cityRec.slug, "es"),
  });
  return {
    title,
    description,
    alternates,
    openGraph: { title, description, url: alternates.canonical, images: [OG_DEFAULT_IMAGE] },
    robots: indexable(),
  };
}

export default async function CuisineIndexPage({ params }: { params: Promise<Params> }) {
  const { locale, city } = await params;
  setRequestLocale(locale);
  const cityRec = await getCity(city, locale);
  if (!cityRec) notFound();

  const t = await getTranslations({ locale, namespace: "CuisineIndex" });
  const tl = await getTranslations({ locale, namespace: "Listing" });
  const cityName = locale === "es" ? cityRec.name_es : cityRec.name_en;
  const selfAbs = absoluteUrl(locale, cityCuisineIndexPath(cityRec.slug, "en"));

  const cuisines = cityCuisineHubs
    .filter((h) => h.citySlug === cityRec.slug)
    .sort((a, b) => b.count - a.count || a.seg.localeCompare(b.seg))
    .map((h) => ({ seg: h.seg, name: cleanCuisine(h.cuisine), count: h.count }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${t("h1Pre")}${cityName}`,
    url: selfAbs,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: cuisines.length,
      itemListElement: cuisines.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        item: absoluteUrl(locale, cityCuisinePath(cityRec.slug, c.seg, "en")),
      })),
    },
  };

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
          { name: t("crumb"), absUrl: selfAbs },
        ]}
      />

      <div className="cuisine-head">
        <p className="lh-kicker">
          <CuisineGlyph name="food" />
          {t("kicker", { city: cityName })}
        </p>
        <h1>
          {t("h1Pre")}
          <span className="accent">{cityName}</span>
        </h1>
        <p className="lh-intro">{t("intro", { city: cityName, count: cuisines.length })}</p>
      </div>

      <section className="block block-fog">
        <div className="sec-head iconed">
          <SecIcon name="food" />
          <div>
            <p className="eyebrow">{t("kicker", { city: cityName })}</p>
            <h2 className="sec-title">{t("countLabel", { count: cuisines.length })}</h2>
          </div>
        </div>
        <div className="ccards">
          {cuisines.map((c) => {
            const cimg = cuisineImg(c.seg);
            return (
              <a className="ccard" key={c.seg} href={withLocale(locale, cityCuisinePath(cityRec.slug, c.seg, locale))}>
                <span className={`cc-ic${cimg ? " cc-ic-photo" : ""}`}>
                  {cimg ? (
                    <span className="cc-photo" style={{ backgroundImage: `url('${cimg.url}')` }} title={cimg.credit}>
                      <span className="sr-only">{cimg.credit}</span>
                    </span>
                  ) : (
                    <CuisineGlyph name={cuisineIcon(c.seg)} />
                  )}
                </span>
                <span className="cc-body">
                  <span className="cc-name">{c.name}</span>
                  <span className="cc-count">{tl("places", { count: c.count })}</span>
                </span>
                <span className="cc-arrow" aria-hidden="true">→</span>
              </a>
            );
          })}
        </div>
        <JsonLd data={jsonLd} />
        <BrowseAxes locale={locale} city={cityRec.slug} exclude="cuisines" />
      </section>

      <NewsletterBand locale={locale} />
      <Footer locale={locale} />
    </>
  );
}
