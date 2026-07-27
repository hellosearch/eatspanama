import { SearchIcon } from "@/components/icons";

/**
 * Compact header search FIELD (desktop). The header previously exposed search
 * only as an icon-link, so on a discovery site the primary task was semi-hidden
 * - a cold visitor scanning the header saw a magnifier, not a box. This renders
 * a real GET form to /search (works without JS, crawl-safe, one unified ranking
 * via searchVenuesRanked). On narrow widths it is hidden and the icon-link in
 * the header takes over (so mobile keeps its tap-to-search affordance).
 * Self-contained i18n so it needs no message plumbing.
 */
export default function HeaderSearch({ locale }: { locale: string }) {
  const ph = locale === "es" ? "Buscar restaurantes" : "Search restaurants";
  const action = locale === "es" ? "/es/search/" : "/search/";
  return (
    <form className="header-search" action={action} method="get" role="search">
      <button type="submit" className="hs-btn" aria-label={ph}>
        <SearchIcon />
      </button>
      <input type="text" name="q" placeholder={ph} aria-label={ph} />
    </form>
  );
}
