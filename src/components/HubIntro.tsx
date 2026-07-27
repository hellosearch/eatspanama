import type { ReactNode } from "react";
import type { HubFacts } from "@/lib/hub-copy";

/**
 * Above-the-fold hero for the discovery-tool hubs (city-cuisine, good-for). The
 * left column holds the page's own kicker / H1 / intro / trust row (passed as
 * children) plus a "Related" pill row that fills what used to be dead space and
 * gives the visitor immediate sideways paths (no dead ends); the right column is
 * the compact "at a glance" facts panel.
 */
export default function HubIntro({
  facts,
  hoodLinks,
  labels,
  related,
  children,
}: {
  facts: HubFacts;
  hoodLinks: { name: string; count: number; href: string }[];
  labels: { glance: string; places: string; price: string; topAreas: string; related: string };
  related?: { label: string; href: string }[];
  children: ReactNode;
}) {
  return (
    <div className="cuisine-head hub-head">
      <div className="hub-head-main">
        {children}
        {related && related.length > 0 && (
          <div className="hub-related">
            <span className="hr-label">{labels.related}</span>
            <ul>
              {related.map((r) => (
                <li key={r.href}>
                  <a href={r.href}>{r.label}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <aside className="hub-glance" aria-label={labels.glance}>
        <p className="hg-title">{labels.glance}</p>
        <p className="hg-count">
          <b>{facts.count}</b> <span>{labels.places}</span>
        </p>
        {facts.priceRange && (
          <p className="hg-row">
            <span className="hg-k">{labels.price}</span>
            <span className="hg-v">{facts.priceRange}</span>
          </p>
        )}
        {hoodLinks.length > 0 && (
          <div className="hg-areas">
            <span className="hg-k">{labels.topAreas}</span>
            <ul>
              {hoodLinks.map((h) => (
                <li key={h.href}>
                  <a href={h.href}>
                    {h.name} <i>{h.count}</i>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
