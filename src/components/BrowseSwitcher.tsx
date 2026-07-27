"use client";

/**
 * Hero "or start browsing" switcher: one row of tabs (cravings / neighborhoods
 * / cuisines / dishes), the pill set below swaps to the active axis. Text pills
 * only - the facet art is venue-owned and must carry a photo credit, which does
 * not fit a chip-sized thumbnail, so photography stays in the credited carousel
 * on the right. Pills are real <a href> links (crawlable); the footer carries
 * the full set for anything not in the active tab.
 */
import { useState } from "react";

export interface BrowsePill {
  name: string;
  href: string;
  count?: number;
  all?: boolean;
}
export interface BrowseAxis {
  key: string;
  label: string;
  pills: BrowsePill[];
}

export default function BrowseSwitcher({
  browseLabel,
  axes,
}: {
  browseLabel: string;
  axes: BrowseAxis[];
}) {
  const [active, setActive] = useState(axes[0]?.key ?? "");
  const current = axes.find((a) => a.key === active) ?? axes[0];
  if (!current) return null;

  return (
    <div className="hbrowse">
      <p className="hbrowse-lbl">{browseLabel}</p>
      <div className="hbtabs" role="tablist" aria-label={browseLabel}>
        {axes.map((a) => (
          <button
            key={a.key}
            type="button"
            role="tab"
            aria-selected={a.key === active}
            className={"hbtab" + (a.key === active ? " on" : "")}
            onClick={() => setActive(a.key)}
          >
            {a.label}
          </button>
        ))}
      </div>
      <div className="hbpanel" role="tabpanel">
        {current.pills.map((p) => (
          <a key={p.href} href={p.href} className={"hbpill" + (p.all ? " all" : "")}>
            {p.name}
            {p.count != null && <span className="c">{p.count}</span>}
          </a>
        ))}
      </div>
    </div>
  );
}
