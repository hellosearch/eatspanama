/**
 * One source for the DiscoveryView label bundle. Both the neighborhood listing
 * and the city-wide cuisine page render the same split discovery UI, so they
 * build their labels the same way from the "Listing" namespace. `nav` (the
 * section's own H2 text) varies per page, so it is passed in.
 */
import type { DiscoveryLabels } from "@/components/DiscoveryView";

/** next-intl translator: callable for formatted strings, `.raw` for the ICU source. */
type T = ((key: string) => string) & { raw: (key: string) => unknown };

export function discoveryLabels(t: T, nav: string): DiscoveryLabels {
  return {
    list: t("viewList"),
    map: t("viewMap"),
    prev: t("pagerPrev"),
    next: t("pagerNext"),
    nav,
    filters: t("filters"),
    searchPlaceholder: t("searchPlaceholder"),
    cuisine: t("cuisine"),
    neighborhood: t("neighborhood"),
    price: t("price"),
    goodFor: t("goodFor"),
    dietary: t("dietaryLabel"),
    features: t("features"),
    sortBy: t("sort"),
    sortFeatured: t("sortFeatured"),
    sortAz: t("sortAz"),
    sortPriceUp: t("sortPriceUp"),
    sortPriceDown: t("sortPriceDown"),
    results: String(t.raw("resultsCount")), // raw ICU: DiscoveryView substitutes {count} client-side
    clearAll: t("clearAll"),
    close: t("close"),
    apply: String(t.raw("showResults")), // raw ICU: DiscoveryView substitutes {count}
    noResults: t("noResults"),
    view: t("viewRestaurant"),
    occ: {
      dateNight: t("occDateNight"),
      brunch: t("occBrunch"),
      family: t("occFamily"),
      view: t("occView"),
      nightlife: t("occNightlife"),
      casual: t("occCasual"),
    },
    diet: { veg: t("dietVeg"), vegan: t("dietVegan"), gf: t("dietGf") },
    feat: {
      openNow: t("openNow"),
      reservations: t("featReservations"),
      groups: t("featGroups"),
      liveMusic: t("featLiveMusic"),
    },
  };
}
