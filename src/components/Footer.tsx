import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/icons";
import { getNeighborhoods, getGuides } from "@/lib/data";
import { localizeGuide } from "@/lib/localize";
import { cityCuisineHubs } from "@/lib/cuisines";
import { goodForOccasions } from "@/lib/goodfor";
import { listingPath, cityCuisinePath, cityCuisineIndexPath, goodForIndexPath, goodForPath, cityPath } from "@/lib/paths";
import { cleanCuisine } from "@/lib/format";

const CITY = "panama-city";

export default async function Footer({ locale, slim = false }: { locale: string; slim?: boolean }) {
  const t = await getTranslations({ locale, namespace: "Footer" });
  const nav = await getTranslations({ locale, namespace: "Nav" });

  const bottom = (
    <div className="foot-bottom">
      <span>© 2026 EatsPanama</span>
      <span>{t("madeIn")}</span>
      <div className="right">
        <Link href="/privacy/">{t("privacy")}</Link>
        <Link href="/terms/">{t("terms")}</Link>
        <span>{t("langPair")}</span>
      </div>
    </div>
  );

  if (slim) {
    return <footer className="site-footer slim">{bottom}</footer>;
  }

  // Site-wide interlinking (every page footer) - all neighborhoods + all
  // city-cuisine pages, the directory-site pattern. Crawlable links everywhere.
  const hoods = (await getNeighborhoods())
    .filter((n) => n.city_slug === CITY)
    .sort((a, b) => b.venue_count - a.venue_count || a.name.localeCompare(b.name));
  const cuisines = cityCuisineHubs
    .filter((h) => h.citySlug === CITY)
    .sort((a, b) => b.count - a.count || a.seg.localeCompare(b.seg))
    .map((h) => ({ seg: h.seg, name: cleanCuisine(h.cuisine) }));
  const gf = await getTranslations({ locale, namespace: "GoodFor" });
  const occasions = goodForOccasions
    .filter((o) => o.citySlug === CITY)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
    .map((o) => ({ slug: o.slug, name: gf(`label_${o.slug}`) }));
  const guides = (await getGuides()).filter((g) => g.entries.length > 0).map((g) => localizeGuide(g, locale));
  const contact = "/contact/";

  return (
    <footer className="site-footer">
      <div className="foot-grid">
        <div className="foot-brandcol">
          <Link className="logo" href="/" aria-label={nav("homeLabel")}>
            <Logo variant="ink" markSize={30} />
          </Link>
          <p>{t("blurb")}</p>
        </div>
        <div>
          <p className="foot-h">{t("discover")}</p>
          <ul>
            <li><Link href={cityPath(CITY, locale)}>{t("neighborhoods")}</Link></li>
            <li><Link href={cityCuisineIndexPath(CITY, locale)}>{t("byCuisine")}</Link></li>
            <li><Link href={goodForIndexPath(CITY, locale)}>{t("goodFor")}</Link></li>
            <li><Link href="/guides/">{t("guides")}</Link></li>
            <li><Link href="/search/">{t("openNow")}</Link></li>
          </ul>
        </div>
        <div>
          <p className="foot-h">{t("about")}</p>
          <ul>
            {/* One link, one destination: "The Team"/"Method" both pointed at
                the same policy page (a cold skeptic clicking "The Team" for bios
                landed on policy), so the redundant pair is dropped. */}
            <li><Link href="/how-we-review/">{t("howWeReview")}</Link></li>
            <li><Link href={contact}>{t("contact")}</Link></li>
          </ul>
        </div>
        <div>
          <p className="foot-h">{t("forRestaurants")}</p>
          <ul>
            <li><Link href={contact}>{t("claim")}</Link></li>
            <li><Link href={contact}>{t("updateHours")}</Link></li>
            <li><Link href={contact}>{t("reportChange")}</Link></li>
          </ul>
        </div>
      </div>

      {/* Interlink hub: every neighborhood + every cuisine, site-wide */}
      <div className="foot-links">
        <div className="foot-linkcol">
          <p className="foot-h"><Link href={cityPath(CITY, locale)}>{t("byNeighborhood")}</Link></p>
          <div className="foot-chips">
            {hoods.map((h) => (
              <Link key={h.slug} href={listingPath(CITY, h.slug, locale)}>{h.name}</Link>
            ))}
          </div>
        </div>
        <div className="foot-linkcol">
          <p className="foot-h"><Link href={cityCuisineIndexPath(CITY, locale)}>{t("byCuisine")}</Link></p>
          <div className="foot-chips">
            {cuisines.map((c) => (
              <Link key={c.seg} href={cityCuisinePath(CITY, c.seg, locale)}>{c.name}</Link>
            ))}
          </div>
        </div>
        <div className="foot-linkcol">
          <p className="foot-h"><Link href={goodForIndexPath(CITY, locale)}>{t("byOccasion")}</Link></p>
          <div className="foot-chips">
            {occasions.map((o) => (
              <Link key={o.slug} href={goodForPath(CITY, o.slug, locale)}>{o.name}</Link>
            ))}
          </div>
        </div>
        <div className="foot-linkcol">
          <p className="foot-h"><Link href="/guides/">{t("guides")}</Link></p>
          <div className="foot-chips">
            {guides.map((g) => (
              <Link key={g.slug} href={`/guides/${g.slug}/`}>{g.title_en}</Link>
            ))}
          </div>
        </div>
      </div>

      {bottom}
    </footer>
  );
}
