import { withLocale, cityPath, cityCuisineIndexPath, goodForIndexPath } from "@/lib/paths";

/**
 * "Also browse by ..." lateral rail for the plain index pages (cuisine index,
 * good-for index, city hub). Those pages funnel one way (down into a single
 * hub) with no in-body path to the OTHER browse axes - a human changing axis
 * had to reopen the header dropdown or scroll to the footer every time. This
 * gives each index a one-line sideways rail to the two axes it is not.
 * Self-contained i18n (4 short strings) so it needs no message plumbing.
 */
export default function BrowseAxes({
  locale,
  city,
  exclude,
}: {
  locale: string;
  city: string;
  /** The axis this page already IS (so we don't link a page to itself). */
  exclude: "neighborhoods" | "cuisines" | "goodfor";
}) {
  const T =
    locale === "es"
      ? { title: "Explora también por", neighborhoods: "Barrio", cuisines: "Cocina", goodfor: "Ideal para" }
      : { title: "Also browse by", neighborhoods: "Neighborhood", cuisines: "Cuisine", goodfor: "Good for" };

  const axes = [
    { key: "neighborhoods", label: T.neighborhoods, href: withLocale(locale, cityPath(city, locale)) },
    { key: "cuisines", label: T.cuisines, href: withLocale(locale, cityCuisineIndexPath(city, locale)) },
    { key: "goodfor", label: T.goodfor, href: withLocale(locale, goodForIndexPath(city, locale)) },
  ].filter((a) => a.key !== exclude);

  return (
    <nav className="browse-axes" aria-label={T.title}>
      <span className="ba-title">{T.title}</span>
      {axes.map((a) => (
        <a key={a.key} className="ba-link" href={a.href}>
          {a.label}
        </a>
      ))}
    </nav>
  );
}
