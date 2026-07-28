import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { allVenues } from "@/lib/data";
import { localeAlternates, indexable, OG_DEFAULT_IMAGE } from "@/lib/seo";
import { routing } from "@/i18n/routing";
import Footer from "@/components/Footer";
import NewsletterForm from "@/components/NewsletterForm";
import { CountPill } from "@/components/badges";
import { CheckIcon } from "@/components/icons";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "NewsletterPage" });
  const title = `${t("h1Pre")} ${t("h1Accent")}${t("h1Post")} | EatsPanama`;
  const alternates = localeAlternates(locale, "/newsletter/");
  return {
    title,
    description: `${t("v1Lead")}${t("v1Rest")} ${t("v2Lead")}${t("v2Rest")}`,
    alternates,
    openGraph: { title, url: alternates.canonical, images: [OG_DEFAULT_IMAGE] },
    robots: indexable(),
  };
}

export default async function NewsletterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "NewsletterPage" });
  const tn = await getTranslations({ locale, namespace: "Newsletter" });
  // The one number on this page we can actually stand behind.
  const tracked = allVenues.filter((v) => v.status === "open").length;

  return (
    <>
      <div className="nl-hero">
        <div>
          <p className="eyebrow" style={{ marginTop: 44 }}>
            {t("eyebrow")}
          </p>
          <h1>
            {t("h1Pre")}
            <br />
            <span className="accent">{t("h1Accent")}</span>
            {t("h1Post")}
          </h1>
          <ul className="nl-value">
            <li>
              <CheckIcon />
              <span>
                <b>{t("v1Lead")}</b>
                {t("v1Rest")}
              </span>
            </li>
            <li>
              <CheckIcon />
              <span>
                <b>{t("v2Lead")}</b>
                {t("v2Rest")}
              </span>
            </li>
            <li>
              <CheckIcon />
              <span>
                <b>{t("v3Lead")}</b>
                {t("v3Rest")}
              </span>
            </li>
          </ul>
          {/* Posts to /api/subscribe (emails each signup to the capture inbox). */}
          <NewsletterForm
            className="nl-form"
            locale={locale}
            placeholder={tn("emailPlaceholder")}
            ariaLabel={tn("emailAria")}
            buttonLabel={t("subscribe")}
          />
          <p className="optin-note">
            <b>{t("optinLead")}</b>
            {t("optinRest")}
            <br />
            {t("optinLine2")}
          </p>
          <div className="proof-row">
            <CountPill>{t("pillVenues", { count: tracked.toLocaleString("en-US") })}</CountPill>
            <CountPill>{t("cadence")}</CountPill>
            <CountPill>{t("editions")}</CountPill>
          </div>
        </div>

        {/* WHAT YOU GET (offset-shadow signature card).
            This replaced a fake "sample issue No. 41" that was signed by an
            invented editor, illustrated with a stock photo, and described
            visits to a restaurant that does not exist. The newsletter has not
            shipped, so the card now says what it WILL contain, in future
            tense, and the page no longer claims a readership. */}
        <div>
          <div className="issue-card" style={{ marginTop: 44 }}>
            <div className="mail-head">
              <p className="mail-from">{t("previewLabel")}</p>
              <p className="mail-subj">{locale === "es" ? "Dónde comer este fin de semana" : "Where to eat this weekend"}</p>
            </div>
            <div className="mail-body">
              <div className="issue-item">
                <span className="k">1</span>
                <p>
                  <b>{t("v1Lead")}</b>
                </p>
              </div>
              <div className="issue-item">
                <span className="k">2</span>
                <p>
                  <b>{t("v2Lead")}</b>
                </p>
              </div>
              <div className="issue-item">
                <span className="k">3</span>
                <p>
                  <b>{t("v3Lead")}</b>
                </p>
              </div>
            </div>
          </div>
          <p className="issue-tag">{t("previewNote")}</p>
        </div>
      </div>

      <Footer locale={locale} slim />
    </>
  );
}
