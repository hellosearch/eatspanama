"use client";

import { Children, useState, type ReactNode } from "react";

/**
 * Shows the first `initial` children and reveals more in `initial`-sized steps.
 * Used on /search (which is noindex, so there is no crawlability cost to not
 * mounting every row) to turn a 150-row dump into a scannable, load-more list.
 * Self-i18n label.
 */
export default function ProgressiveList({
  children,
  initial = 30,
  locale,
}: {
  children: ReactNode;
  initial?: number;
  locale: string;
}) {
  const items = Children.toArray(children);
  const [shown, setShown] = useState(initial);
  const remaining = items.length - shown;
  return (
    <>
      {items.slice(0, shown)}
      {remaining > 0 && (
        <button type="button" className="load-more" onClick={() => setShown((s) => s + initial)}>
          {locale === "es" ? `Ver más (${remaining})` : `Show more (${remaining})`}
        </button>
      )}
    </>
  );
}
