"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

/**
 * Functional search filter bar. Each control writes to the URL query string
 * (preserving the text query `q`) and lets the server component re-render the
 * filtered results. /search is noindex, so client-side param nav is fine.
 */
export default function SearchFilters({
  cuisines,
  prices,
  noPrice,
  goodFor,
  labels,
}: {
  cuisines: { value: string; count: number }[];
  prices: { tier: number; count: number }[];
  /** How many venues carry no price data (excluded by any price choice). */
  noPrice: number;
  goodFor: { slug: string; label: string }[];
  labels: {
    openNow: string;
    anyCuisine: string;
    anyPrice: string;
    anyGoodFor: string;
    sortBy: string;
    relevance: string;
    editors: string;
    cuisineAria: string;
    priceAria: string;
    goodForAria: string;
    /** Already formatted server-side (carries the hidden-venue count). */
    noPriceNote: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const nav = (mutate: (p: URLSearchParams) => void) => {
    const params = new URLSearchParams(sp.toString());
    mutate(params);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const set = (key: string, value: string) =>
    nav((p) => (value ? p.set(key, value) : p.delete(key)));

  const cur = (k: string) => sp.get(k) ?? "";
  const openActive = sp.get("open") === "1";

  return (
    <div className="filter-row">
      <button
        type="button"
        className={`chip${openActive ? " active" : ""}`}
        aria-pressed={openActive}
        onClick={() => nav((p) => (openActive ? p.delete("open") : p.set("open", "1")))}
      >
        {labels.openNow}
      </button>

      <select
        className="chip chip-select"
        aria-label={labels.cuisineAria}
        value={cur("cuisine")}
        onChange={(e) => set("cuisine", e.target.value)}
      >
        <option value="">{labels.anyCuisine}</option>
        {cuisines.map((c) => (
          <option key={c.value} value={c.value}>
            {c.value} ({c.count})
          </option>
        ))}
      </select>

      <select
        className="chip chip-select price"
        aria-label={labels.priceAria}
        value={cur("price")}
        onChange={(e) => set("price", e.target.value)}
      >
        <option value="">{labels.anyPrice}</option>
        {prices.map((p) => (
          <option key={p.tier} value={String(p.tier)}>
            {"$".repeat(p.tier)} ({p.count})
          </option>
        ))}
      </select>

      <select
        className="chip chip-select"
        aria-label={labels.goodForAria}
        value={cur("good")}
        onChange={(e) => set("good", e.target.value)}
      >
        <option value="">{labels.anyGoodFor}</option>
        {goodFor.map((g) => (
          <option key={g.slug} value={g.slug}>
            {g.label}
          </option>
        ))}
      </select>

      <select
        className="chip chip-select"
        aria-label={labels.sortBy}
        value={cur("sort")}
        onChange={(e) => set("sort", e.target.value)}
      >
        <option value="">{labels.relevance}</option>
        <option value="editors">{labels.editors}</option>
      </select>

      {/* Most venues still have no price data, so a price filter quietly hides
          them. Say so instead of letting the result count look authoritative. */}
      {cur("price") && noPrice > 0 && <p className="filter-note">{labels.noPriceNote}</p>}
    </div>
  );
}
