import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Brand } from "@/lib/brands";
import { getBrand } from "@/lib/brands";
import { getCity } from "@/lib/data";
import { allNeighborhoods } from "@/lib/data";
import { absoluteUrl, cityPath, venuePath, withLocale } from "@/lib/paths";
import { enOnlyAlternates, indexable } from "@/lib/seo";
import { cleanCuisine } from "@/lib/format";
import Breadcrumb from "@/components/Breadcrumb";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { SecIcon } from "@/components/icons";

/** Metadata for a brand served at /{city}/{brand}/. */
export async function brandMetadata(locale: string, citySlug: string, slug: string): Promise<Metadata> {
  const brand = getBrand(citySlug, slug);
  const city = await getCity(citySlug, "en");
  if (!brand || !city) return {};
  const t = await getTranslations({ locale, namespace: "Brand" });
  const cityName = locale === "es" ? city.name_es : city.name_en;
  const title = t("metaTitle", { brand: brand.name, city: cityName, count: brand.count });
  const description = t("metaDesc", { brand: brand.name, city: cityName, count: brand.count });
  const alternates = enOnlyAlternates(`${cityPath(citySlug, "en")}${slug}/`);
  return {
    title,
    description,
    alternates,
    openGraph: { title, description, url: alternates.canonical },
    robots: indexable(),
  };
}

/**
 * A brand's branches on one page. Reached from listings, which collapse a
 * multi-location brand to a single row rather than repeating it once per
 * branch.
 */
export default async function BrandView({
  locale,
  citySlug,
  brand,
}: {
  locale: string;
  citySlug: string;
  brand: Brand;
}) {
  const city = await getCity(citySlug, "en");
  if (!city) notFound();
  const tl = await getTranslations({ locale, namespace: "Listing" });
  const t = await getTranslations({ locale, namespace: "Brand" });
  const cityName = locale === "es" ? city.name_es : city.name_en;
  const selfPath = `${cityPath(citySlug, "en")}${brand.slug}/`;
  const selfAbs = absoluteUrl(locale, selfPath);

  const hoodName = (slug: string) => allNeighborhoods.find((n) => n.slug === slug)?.name ?? slug;
  // One canonical cuisine (the most common primary across branches), not a
  // union that reads as inconsistent ("Greek · Cafe").
  const cuisineFreq = new Map<string, number>();
  for (const v of brand.venues) {
    const c = cleanCuisine(v.cuisine_en[0] ?? "");
    if (c) cuisineFreq.set(c, (cuisineFreq.get(c) ?? 0) + 1);
  }
  const primaryCuisine = [...cuisineFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${brand.name} locations in ${cityName}`,
    url: selfAbs,
    numberOfItems: brand.count,
    itemListElement: brand.venues.map((v, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${brand.name} - ${hoodName(v.neighborhood_slug)}`,
      item: absoluteUrl(locale, venuePath(citySlug, v.slug, "en")),
    })),
  };

  return (
    <>
      <Breadcrumb
        crumbs={[
          { name: tl("home"), href: withLocale(locale, "/"), absUrl: absoluteUrl(locale, "/") },
          {
            name: cityName,
            href: withLocale(locale, cityPath(citySlug, locale)),
            absUrl: absoluteUrl(locale, cityPath(citySlug, locale)),
          },
          { name: brand.name, absUrl: selfAbs },
        ]}
      />

      <div className="cuisine-head">
        <p className="lh-kicker">
          <SecIcon name="where" />
          {t("kicker", { city: cityName })}
        </p>
        <h1>
          {brand.name} <span className="accent">{t("locations", { count: brand.count })}</span>
        </h1>
        <p className="lh-intro">
          {t("intro", { brand: brand.name, city: cityName })}
          {primaryCuisine && ` ${primaryCuisine}.`}
        </p>
      </div>

      <section className="block block-fog">
        {/* One row per branch, distinguished by neighborhood, delivering the
            address the intro promises. Full hours live on each branch's page. */}
        <div className="brand-branches">
          {brand.venues.map((v) => (
            <a
              key={v.slug}
              className="brand-branch"
              href={withLocale(locale, venuePath(citySlug, v.slug, locale))}
            >
              <span className="bb-main">
                <span className="bb-hood">{hoodName(v.neighborhood_slug)}</span>
                {v.address && <span className="bb-addr">{v.address}</span>}
              </span>
              <span className="bb-side">
                {v.price_tier > 0 && <span className="bb-price">{"$".repeat(v.price_tier)}</span>}
                <span className="bb-go" aria-hidden="true">→</span>
              </span>
            </a>
          ))}
        </div>
        <p className="brand-back">
          <a href={withLocale(locale, cityPath(citySlug, locale))}>{t("backTo", { city: cityName })} →</a>
        </p>
        <JsonLd data={jsonLd} />
      </section>

      <Footer locale={locale} />
    </>
  );
}
