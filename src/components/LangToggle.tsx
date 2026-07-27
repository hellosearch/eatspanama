"use client";

/**
 * EN|ES toggle. Real, crawlable <a href> links (SEO), translating the CURRENT
 * path segment-by-segment via the slug maps so every page links to its true
 * twin (/panama-city/casco-viejo/ <-> /es/ciudad-de-panama/casco-viejo/).
 */
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { translatePath, withLocale } from "@/lib/paths";

export default function LangToggle() {
  const t = useTranslations("Nav");
  const locale = useLocale() as Locale;
  // Locale-stripped pathname (next-intl navigation).
  const pathname = usePathname();

  return (
    <div className="lang-toggle" role="group" aria-label={t("langLabel")}>
      {routing.locales.map((l) => {
        const target = withLocale(l, translatePath(pathname, locale, l));
        const active = l === locale;
        return active ? (
          <span key={l} className="active" aria-current="true">
            {l.toUpperCase()}
          </span>
        ) : (
          <a key={l} href={target} hrefLang={l}>
            {l.toUpperCase()}
          </a>
        );
      })}
    </div>
  );
}
