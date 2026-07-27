"use client";

import { Children, useState } from "react";

/**
 * Client-side windowed pager for the listing grid. Every venue card is rendered
 * into the DOM (server-rendered inside this client component), so all profile
 * links stay in the initial HTML for crawlers; only the current page's cards are
 * visible. Cards outside the window are `display:none` (not sliced out), so the
 * grid keeps its exact layout and SEO isn't touched. Page size 24 (8 rows of 3).
 */
export default function VenuePager({
  children,
  pageSize = 24,
  prevLabel,
  nextLabel,
  navLabel,
}: {
  children: React.ReactNode;
  pageSize?: number;
  prevLabel: string;
  nextLabel: string;
  navLabel: string;
}) {
  const items = Children.toArray(children);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const [page, setPage] = useState(1);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  const go = (p: number) => {
    setPage(p);
    if (typeof document !== "undefined") {
      document.getElementById("venue-grid-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      <span id="venue-grid-top" aria-hidden="true" />
      <div className="venues">
        {items.map((child, i) => (
          <div key={i} className="v-slot" style={i >= start && i < end ? undefined : { display: "none" }}>
            {child}
          </div>
        ))}
      </div>
      {pages > 1 && (
        <nav className="pager" aria-label={navLabel}>
          <button className="pg-btn" onClick={() => go(page - 1)} disabled={page === 1}>
            {prevLabel}
          </button>
          <div className="pg-nums">
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`pg-num${p === page ? " active" : ""}`}
                aria-current={p === page ? "page" : undefined}
                onClick={() => go(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <button className="pg-btn" onClick={() => go(page + 1)} disabled={page === pages}>
            {nextLabel}
          </button>
        </nav>
      )}
    </>
  );
}
