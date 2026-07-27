import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getGuides } from "@/lib/data";
import { localizeGuide } from "@/lib/localize";
import { absoluteUrl, withLocale } from "@/lib/paths";
import { enOnlyAlternates, indexable, OG_DEFAULT_IMAGE } from "@/lib/seo";
import { guideUpdated } from "@/lib/format";
import Breadcrumb from "@/components/Breadcrumb";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import NewsletterBand from "@/components/NewsletterBand";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { GuideCard } from "@/components/cards";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Guides are EN-only until native-ES twins are written, so - like the guide
// detail pages, trust pages and venue profiles - the ES route serves the EN
// copy and canonicalizes to EN (no es hreflang), keeping untranslated content
// out of the index.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "GuidesIndex" });
  const title = `${t("title")} | EatsPanama`;
  const alternates = enOnlyAlternates("/guides/");
  return {
    title,
    description: t("intro"),
    alternates,
    openGraph: { title, description: t("intro"), url: alternates.canonical, images: [OG_DEFAULT_IMAGE] },
    robots: indexable(),
  };
}

export default async function GuidesIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "GuidesIndex" });

  // Newest first. Only fully-authored guides ship (entries > 0).
  const guides = (await getGuides())
    .filter((g) => g.entries.length > 0)
    .sort((a, b) => b.updated_iso.localeCompare(a.updated_iso))
    .map((g) => localizeGuide(g, locale));

  const selfAbs = absoluteUrl("en", "/guides/");

  return (
    <>
      <div className="article-col">
        <Breadcrumb
          variant="article"
          crumbs={[
            { name: locale === "es" ? "Inicio" : "Home", href: withLocale(locale, "/"), absUrl: absoluteUrl(locale, "/") },
            { name: t("title"), absUrl: selfAbs },
          ]}
        />
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="g-title">{t("title")}</h1>
        <p className="g-intro">{t("intro")}</p>
      </div>

      <div className="article-col">
        <div className="guides guides-index">
          {guides.map((g) => (
            <GuideCard
              key={g.slug}
              guide={g}
              locale={locale}
              href={withLocale(locale, `/guides/${g.slug}/`)}
              updatedLabel={guideUpdated(g.updated_iso)}
              spotsLabel={t("places", { count: g.entries.length })}
              readLabel={t("readGuide")}
            />
          ))}
        </div>
      </div>

      <JsonLd
        data={breadcrumbJsonLd([
          { name: locale === "es" ? "Inicio" : "Home", url: absoluteUrl("en", "/") },
          { name: t("title"), url: selfAbs },
        ])}
      />
      <NewsletterBand locale={locale} />
      <Footer locale={locale} />
    </>
  );
}
