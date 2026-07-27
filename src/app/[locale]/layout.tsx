import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale, getTranslations } from "next-intl/server";
import "@/styles/globals.css";
import { inter, spaceGrotesk } from "@/app/fonts";
import { routing } from "@/i18n/routing";
import { localeAlternates, indexable, SITE_URL, SITE_NAME, OG_DEFAULT_IMAGE } from "@/lib/seo";
import { organizationJsonLd } from "@/lib/jsonld";
import JsonLd from "@/components/JsonLd";
import Nav from "@/components/Nav";
import CreditClicks from "@/components/CreditClicks";

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
      images: [OG_DEFAULT_IMAGE],
    },
    // Default social card. og:image is supplied site-wide by the file-based
    // metadata route (src/app/opengraph-image.png) so it survives on pages that
    // set their own openGraph without an image; twitter is set here (no page
    // overrides `twitter`, so it inherits everywhere) and metadataBase makes the
    // relative image URL absolute. Real designed asset is a launch nicety.
    twitter: {
      card: "summary_large_image",
      title: t("homeTitle"),
      description: t("homeDescription"),
      images: ["/og-default.png"],
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
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
