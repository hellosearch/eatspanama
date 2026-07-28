import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale, getTranslations } from "next-intl/server";
import "@/styles/globals.css";
import { inter, spaceGrotesk } from "@/app/fonts";
import { routing } from "@/i18n/routing";
import { localeAlternates, indexable, SITE_URL, SITE_NAME } from "@/lib/seo";
import { organizationJsonLd } from "@/lib/jsonld";
import JsonLd from "@/components/JsonLd";
import Nav from "@/components/Nav";
import CreditClicks from "@/components/CreditClicks";
import Analytics from "@/components/Analytics";
import GaEvents from "@/components/GaEvents";

const OG_LOCALES: Record<string, string> = {
  en: "en_US",
  es: "es_PA",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  const alternates = localeAlternates(locale, "");
  const ogLocale = OG_LOCALES[locale] ?? OG_LOCALES.en;
  return {
    metadataBase: new URL(SITE_URL),
    title: t("homeTitle"),
    description: t("homeDescription"),
    alternates,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: t("homeTitle"),
      description: t("homeDescription"),
      url: alternates.canonical,
      locale: ogLocale,
      alternateLocale: Object.entries(OG_LOCALES)
        .filter(([l]) => l !== locale)
        .map(([, code]) => code),
      // Homepage og:image comes from the generated card (./opengraph-image); no
      // default here so the file-based card wins for the home route.
    },
    // Twitter/X card. `card` is the ONLY field set at the layout level - Next
    // fills twitter:title / twitter:description / twitter:image from each page's
    // own `openGraph` when those twitter fields are absent. Previously this block
    // also hard-set title/description/images to the HOMEPAGE values, which then
    // inherited onto every deep page (venues, guides, hubs) and overrode their
    // unique OG - so X showed "Where Panama Actually Eats" + the default image on
    // every page. Leaving only `card` lets each page's OG flow through to Twitter.
    twitter: {
      card: "summary_large_image",
    },
    // Staging guard (scope R10): SITE_NOINDEX=1 -> noindex,follow on every
    // page (meta) + X-Robots-Tag header from next.config.ts.
    robots: indexable(),
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Nav" });

  return (
    <html lang={locale} className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <head>
        <JsonLd data={organizationJsonLd()} />
      </head>
      <body>
        <Analytics />
        <NextIntlClientProvider>
          <a className="skip-link" href="#main">
            {t("skip")}
          </a>
          <div className="shell">
            <Nav locale={locale} />
            <main id="main">{children}</main>
          </div>
          {/* One delegated listener for every photo credit on the page. The
              credits are <button>s, not links, so crawlers find nothing to
              follow; this is what makes them work for people. */}
          <CreditClicks />
          {/* One delegated listener that sends GA4 events for data-ga-event clicks. */}
          <GaEvents />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
