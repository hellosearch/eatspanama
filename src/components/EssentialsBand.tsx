/**
 * "The Essentials" band under the hero - a canonical, cuisine-diverse starter
 * shortlist of real venues (see getEssentials). Each card credits its photo via
 * the non-crawlable <PhotoCredit> button, rendered as a sibling of the card's
 * <a> (never nested inside it).
 */
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import PhotoCredit from "@/components/PhotoCredit";
import { venuePath, withLocale, guidesIndexPath } from "@/lib/paths";
import { getEssentials } from "@/lib/picks";

export default async function EssentialsBand({
  locale,
  excludeSlugs = [],
}: {
  locale: string;
  /** Venue slugs already shown on the page (e.g. the carousel) - never repeat them here. */
  excludeSlugs?: string[];
}) {
  const items = getEssentials(5, new Set(excludeSlugs), locale);
  if (items.length < 3) return null; // never a thin row
  const t = await getTranslations({ locale, namespace: "Essentials" });

  return (
    <section className="block essentials">
      <div className="sec-head">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h2 className="sec-title">{t("title")}</h2>
          <p className="sec-sub">{t("sub")}</p>
        </div>
        <a className="see-all" href={withLocale(locale, guidesIndexPath())}>
          {t("all")}
        </a>
      </div>
      <div className="essrow">
        {items.map((p) => (
          <div key={p.slug} className="ecard">
            <a className="ecard-link" href={withLocale(locale, venuePath(p.citySlug, p.slug, locale))}>
              <span className="ph">
                <Image
                  src={p.photo}
                  alt={locale === "es" ? p.alt_es : p.alt_en}
                  fill
                  sizes="(max-width: 900px) 50vw, 20vw"
                  className="img-cover"
                />
              </span>
              <span className="b">
                <span className="nm">{p.name}</span>
                <span className="mt">
                  {p.cuisine}
                  {p.hood ? ` · ${p.hood}` : ""}
                </span>
                <span className="q">{p.blurb}</span>
              </span>
            </a>
            {p.creditText && <PhotoCredit text={p.creditText} href={p.creditHref} className="ecard-credit photo-credit" />}
          </div>
        ))}
      </div>
    </section>
  );
}
