import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { neverIndex, localeAlternates } from "@/lib/seo";
import { cityPath, withLocale } from "@/lib/paths";
import Footer from "@/components/Footer";
import SavedList from "@/components/SavedList";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Saved" });
  return {
    title: `${t("title")} | EatsPanama`,
    description: t("lead"),
    alternates: localeAlternates(locale, "/saved/"),
    // Per-visitor localStorage list - nothing to index.
    robots: neverIndex(),
  };
}

export default async function SavedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Saved" });

  return (
    <>
      <main className="wrap saved-page">
        <h1 className="saved-title">{t("title")}</h1>
        <p className="saved-lead">{t("lead")}</p>
        <SavedList
          labels={{
            empty: t("empty"),
            emptyCta: t("emptyCta"),
            emptyHref: withLocale(locale, cityPath("panama-city", locale)),
            remove: t("remove"),
            // raw ICU string ({count} is substituted client-side once known).
            count: String(t.raw("count")),
          }}
        />
      </main>
      <Footer locale={locale} slim />
    </>
  );
}
