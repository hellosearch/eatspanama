import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo, SearchIcon } from "@/components/icons";
import LangToggle from "@/components/LangToggle";
import HeaderSearch from "@/components/HeaderSearch";
import SavedCount from "@/components/SavedCount";
import NavMenu from "@/components/NavMenu";
import NavShell from "@/components/NavShell";
import { getNeighborhoods, getGuides } from "@/lib/data";
import { localizeGuide } from "@/lib/localize";
import { cityCuisineHubs } from "@/lib/cuisines";
import { goodForOccasions } from "@/lib/goodfor";
import { listingPath, cityCuisinePath, cityCuisineIndexPath, cityPath, goodForPath, goodForIndexPath, guidesIndexPath } from "@/lib/paths";
import { cleanCuisine } from "@/lib/format";

const CITY = "panama-city";

export default async function Nav({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "Nav" });
  const tg = await getTranslations({ locale, namespace: "GoodFor" });

  const hoodItems = (await getNeighborhoods())
    .filter((n) => n.city_slug === CITY)
    .sort((a, b) => b.venue_count - a.venue_count || a.name.localeCompare(b.name))
    .map((n) => ({ label: n.name, href: listingPath(CITY, n.slug, locale) }));
  const cuisineItems = cityCuisineHubs
    .filter((h) => h.citySlug === CITY)
    .sort((a, b) => b.count - a.count || a.seg.localeCompare(b.seg))
    .slice(0, 14)
    .map((h) => ({ label: cleanCuisine(h.cuisine), href: cityCuisinePath(CITY, h.seg, locale) }));
  // "Good for" is a first-class browse axis (occasions, dishes, drinks, diets)
  // but was only reachable from the footer on inner pages. Surface the most
  // popular facets in the nav, with the full set on the good-for index.
  const goodForItems = goodForOccasions
    .filter((o) => o.citySlug === CITY)
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug))
    .slice(0, 14)
    .map((o) => ({ label: tg(`label_${o.slug}`), href: goodForPath(CITY, o.slug, locale) }));
  const guideItems = (await getGuides())
    .filter((g) => g.entries.length > 0)
    .map((g) => localizeGuide(g, locale))
    .map((g) => ({ label: g.title_en, href: `/guides/${g.slug}/` }));

  return (
    <NavShell menuLabel={t("menuLabel")}>
      <Link className="logo" href="/" aria-label={t("homeLabel")}>
        <Logo variant="accent" markSize={36} />
      </Link>
      <nav className="links" aria-label={t("primaryLabel")}>
        <NavMenu
          label={t("neighborhoods")}
          href={cityPath(CITY, locale)}
          items={hoodItems}
          allHref={cityPath(CITY, locale)}
          allLabel={t("allNeighborhoods")}
        />
        <NavMenu
          label={t("cuisines")}
          href={cityCuisineIndexPath(CITY, locale)}
          items={cuisineItems}
          allHref={cityCuisineIndexPath(CITY, locale)}
          allLabel={t("allCuisines")}
        />
        <NavMenu
          label={t("goodFor")}
          href={goodForIndexPath(CITY, locale)}
          items={goodForItems}
          allHref={goodForIndexPath(CITY, locale)}
          allLabel={t("allGoodFor")}
        />
        <NavMenu
          label={t("guides")}
          href={guidesIndexPath()}
          items={guideItems}
          allHref={guidesIndexPath()}
          allLabel={t("allGuides")}
        />
        <Link href="/newsletter/" className="nav-newsletter">
          {t("newsletter")}
        </Link>
      </nav>
      <div className="right">
        <LangToggle />
        <SavedCount href={locale === "es" ? "/es/saved/" : "/saved/"} label={locale === "es" ? "Guardados" : "Saved"} />
        {/* Desktop: a visible search field (search is the primary task on a
            discovery site). Mobile keeps the icon-link below. */}
        <HeaderSearch locale={locale} />
        <Link href="/search/" className="icon-btn header-search-icon" aria-label={t("searchLabel")}>
          <SearchIcon />
        </Link>
      </div>
    </NavShell>
  );
}
