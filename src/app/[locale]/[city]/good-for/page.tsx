import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { cities } from "@/data/mock";
import { getCity } from "@/lib/data";
import { goodForOccasions, goodForImage, type FacetKind } from "@/lib/goodfor";
import { absoluteUrl, cityPath, citySlugFor, goodForPath, goodForIndexPath, withLocale } from "@/lib/paths";
import { pairedAlternates, indexable, SITE_URL, SITE_NAME, OG_DEFAULT_IMAGE } from "@/lib/seo";
import Breadcrumb from "@/components/Breadcrumb";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import NewsletterBand from "@/components/NewsletterBand";
import BrowseAxes from "@/components/BrowseAxes";
import { SecIcon, FacetGlyph } from "@/components/icons";

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
  const t = await getTranslations({ locale, namespace: "GoodForIndex" });
  const title = t("metaTitle", { city: cityName });
  const description = t("intro", { city: cityName });
  const alternates = pairedAlternates(locale, {
    en: goodForIndexPath(cityRec.slug, "en"),
    es: goodForIndexPath(cityRec.slug, "es"),
  });
  return {
    title,
    description,
    alternates,
    openGraph: { title, description, url: alternates.canonical, images: [OG_DEFAULT_IMAGE] },
    robots: indexable(),
  };
}

export default async function GoodForIndexPage({ params }: { params: Promise<Params> }) {
  const { locale, city } = await params;
  setRequestLocale(locale);
  const cityRec = await getCity(city, locale);
  if (!cityRec) notFound();

  const t = await getTranslations({ locale, namespace: "GoodForIndex" });
  const tf = await getTranslations({ locale, namespace: "GoodFor" });
  const tl = await getTranslations({ locale, namespace: "Listing" });
  const cityName = locale === "es" ? cityRec.name_es : cityRec.name_en;
  const selfAbs = absoluteUrl(locale, goodForIndexPath(cityRec.slug, "en"));

  const occs = goodForOccasions.filter((o) => o.citySlug === cityRec.slug);
  // Group the facets into real sections instead of one "mood" bucket that mixed
  // a dish next to a mood next to a diet.
  const KIND_ORDER: FacetKind[] = ["occasion", "dish", "drink", "dietary"];
  const byKind = KIND_ORDER.map((kind) => ({ kind, items: occs.filter((o) => o.kind === kind) })).filter(
    (g) => g.items.length > 0
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${t("h1Pre")}${cityName}`,
    url: selfAbs,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: occs.length,
      itemListElement: occs.map((o, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: tf(`label_${o.slug}`),
        item: absoluteUrl(locale, goodForPath(cityRec.slug, o.slug, "en")),
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
          <SecIcon name="good" />
          {t("kicker", { city: cityName })}
        </p>
        <h1>
          {t("h1Pre")}
          <span className="accent">{cityName}</span>
        </h1>
        <p className="lh-intro">{t("intro", { city: cityName })}</p>
      </div>

      <section className="block block-fog">
        {byKind.map((group) => (
          <div className="gf-group" key={group.kind}>
            <h2 className="gf-group-title">{t(`section_${group.kind}`)}</h2>
            <div className="gfcards">
              {group.items.map((o) => {
              const img = goodForImage(o);
              return (
                <a
                  className="gfcard"
                  key={o.slug}
                  href={withLocale(locale, goodForPath(cityRec.slug, o.slug, locale))}
                >
                  <span className={`gfcard-img${img ? "" : " gfcard-flat"}`}>
                    {img ? (
                      <Image src={img.url} alt="" fill sizes="(max-width: 720px) 100vw, 360px" className="img-cover" />
                    ) : (
                      <FacetGlyph slug={o.slug} />
                    )}
                    {img?.credit && <span className="occ-credit">{img.credit}</span>}
                    <span className="grad" aria-hidden="true" />
                    <span className="gfcard-name">{tf(`label_${o.slug}`)}</span>
                  </span>
                  <span className="gfcard-meta">{tl("places", { count: o.count })}</span>
                </a>
              );
              })}
            </div>
          </div>
        ))}
        <JsonLd data={jsonLd} />
        <BrowseAxes locale={locale} city={cityRec.slug} exclude="goodfor" />
      </section>

      <NewsletterBand locale={locale} />
      <Footer locale={locale} />
    </>
  );
}
