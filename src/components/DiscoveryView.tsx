"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DayHours } from "@/data/mock";
import type { ClientVenue } from "@/lib/client-photo";
import { VenueCard } from "@/components/cards";
import RestaurantMap, { type MapPin, type MapBounds } from "@/components/RestaurantMap";
import { cleanCuisine, priceGlyphs } from "@/lib/format";
import { MapPin as MapPinIcon, SearchIcon } from "@/components/icons";

export interface DiscoveryLabels {
  list: string;
  map: string;
  prev: string;
  next: string;
  nav: string;
  filters: string;
  searchPlaceholder: string;
  cuisine: string;
  neighborhood: string;
  price: string;
  goodFor: string;
  dietary: string;
  features: string;
  sortBy: string;
  sortFeatured: string;
  sortAz: string;
  sortPriceUp: string;
  sortPriceDown: string;
  results: string; // "{count} places"
  clearAll: string;
  close: string; // mobile drawer close (X + scrim aria-label)
  apply: string; // mobile drawer apply, "Show {count} places"
  noResults: string;
  view: string; // popup CTA "View restaurant"
  occ: Record<string, string>; // dateNight/brunch/family/view/nightlife/casual
  diet: Record<string, string>; // veg/vegan/gf
  feat: Record<string, string>; // openNow/reservations/groups/liveMusic
}

const OCCASIONS = [
  { key: "dateNight", tag: "date-night" },
  { key: "brunch", tag: "brunch" },
  { key: "family", tag: "family" },
  { key: "view", tag: "view" },
  { key: "nightlife", tag: "nightlife" },
  { key: "casual", tag: "casual" },
];
const DIETS = [
  { key: "veg", match: "vegetarian" },
  { key: "vegan", match: "vegan" },
  { key: "gf", match: "gluten" },
];
const FEATS = [
  { key: "openNow" },
  { key: "reservations" },
  { key: "groups" },
  { key: "liveMusic" },
];

/** "8:00 AM" / "10:00 PM" -> minutes since midnight (mirrors OpenNowPill). */
function toMinutes(raw: string): number | null {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const mer = m[3]?.toUpperCase();
  if (mer === "PM") h = h === 12 ? 12 : h + 12;
  else if (mer === "AM") h = h === 12 ? 0 : h;
  else if (h >= 1 && h <= 6) h += 12;
  return h * 60 + min;
}
function isOpenNow(hours: DayHours[]): boolean {
  if (!hours?.length) return false;
  const now = new Date();
  const today = hours[(now.getDay() + 6) % 7];
  if (!today || !today.open || today.open === "Closed") return false;
  if (/24\s*hours/i.test(today.open)) return true;
  const o = toMinutes(today.open);
  const c = toMinutes(today.close);
  if (o == null || c == null) return false;
  const t = now.getHours() * 60 + now.getMinutes();
  return c < o ? t >= o || t <= c : t >= o && t <= c;
}

function facetsOf(v: ClientVenue) {
  const tags = (v.tags_en ?? []).map((t) => t.toLowerCase());
  const diet = [...(v.dietary_en ?? []), ...(v.tags_en ?? [])].join(" ").toLowerCase();
  const attrs = (v.attributes_en ?? []).join(" ").toLowerCase();
  return {
    cuisine: cleanCuisine(v.cuisine_en[0] ?? "") || "Other",
    tier: v.price_tier ?? 0,
    occasions: new Set(OCCASIONS.filter((o) => tags.some((t) => t.includes(o.tag))).map((o) => o.key)),
    diets: new Set(DIETS.filter((d) => diet.includes(d.match)).map((d) => d.key)),
    open: isOpenNow(v.hours),
    reservations: /reservation/.test(attrs),
    groups: /group/.test(attrs),
    liveMusic: /live music/.test(attrs),
  };
}

/** Great-circle distance in km between two lat/lng points (haversine). */
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
/** "300 m" / "1.2 km" + a rough walk time (~5 km/h). */
function fmtDistance(km: number, locale: string): string {
  const dist = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  const mins = Math.max(1, Math.round((km / 5) * 60));
  const walk = locale === "es" ? `${mins} min a pie` : `${mins} min walk`;
  return `${dist} · ${walk}`;
}

/**
 * Map-style discovery with the recommended filter set: name search, price,
 * "Good for" (occasion), dietary, features, cuisine - all live-linked to the
 * list AND the map pins, with removable active-filter pills and a result count.
 * All (filtered) cards render into the DOM (windowed) so links stay crawlable.
 * Desktop = 3-zone (rail | list | map); mobile = Filters drawer + List/Map toggle.
 */
export default function DiscoveryView({
  items,
  locale,
  verifiedLabel,
  waLabel,
  labels,
  pageSize = 20,
  hoodNames,
}: {
  /**
   * `brand*` is supplied by the server for venues belonging to a multi-location
   * brand. The brand lookup needs the whole venue set, so it is not something
   * this client component can derive itself.
   */
  items: { venue: ClientVenue; href: string; brandSlug?: string; brandCount?: number; brandHref?: string }[];
  locale: string;
  verifiedLabel: string;
  waLabel: string;
  labels: DiscoveryLabels;
  pageSize?: number;
  /** slug -> neighborhood name. Passed on multi-hood hubs (cuisine/occasion) so
   *  cards show the barrio instead of a meaningless street snippet; omitted on a
   *  single-neighborhood listing where the barrio would repeat on every card. */
  hoodNames?: Record<string, string>;
}) {
  const rows = useMemo(() => items.map((it) => ({ ...it, f: facetsOf(it.venue) })), [items]);

  const cuisineOpts = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(r.f.cuisine, (m.get(r.f.cuisine) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [rows]);
  // Neighborhood facet - only on multi-hood hubs (cuisine/occasion), where
  // hoodNames is supplied. A visitor with no area knowledge narrows on area.
  const hoodOpts = useMemo(() => {
    if (!hoodNames) return [] as [string, number][];
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const s = r.venue.neighborhood_slug;
      if (hoodNames[s]) m.set(s, (m.get(s) ?? 0) + 1);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1] || (hoodNames[a[0]] ?? "").localeCompare(hoodNames[b[0]] ?? ""));
  }, [rows, hoodNames]);
  const priceOpts = useMemo(() => [...new Set(rows.map((r) => r.f.tier).filter((t) => t > 0))].sort(), [rows]);
  const occOpts = useMemo(() => OCCASIONS.filter((o) => rows.some((r) => r.f.occasions.has(o.key))), [rows]);
  const dietOpts = useMemo(() => DIETS.filter((d) => rows.some((r) => r.f.diets.has(d.key))), [rows]);
  const featOpts = useMemo(
    () => FEATS.filter((ft) => rows.some((r) => (r.f as unknown as Record<string, boolean>)[ft.key === "openNow" ? "open" : ft.key])),
    [rows]
  );

  const [query, setQuery] = useState("");
  const [cuisines, setCuisines] = useState<Set<string>>(new Set());
  const [hoods, setHoods] = useState<Set<string>>(new Set());
  const [prices, setPrices] = useState<Set<number>>(new Set());
  const [occ, setOcc] = useState<Set<string>>(new Set());
  const [diet, setDiet] = useState<Set<string>>(new Set());
  const [feat, setFeat] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<"featured" | "az" | "pup" | "pdown" | "near" | "new">("featured");
  // Near-me: user coords (once granted) + a "locating" flag. Sorting by distance
  // and per-card distance labels light up only after the visitor opts in.
  const [areaBounds, setAreaBounds] = useState<MapBounds | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoDenied, setGeoDenied] = useState(false);
  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setGeoDenied(true);
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSort("near");
        setGeoBusy(false);
      },
      () => {
        setGeoDenied(true);
        setGeoBusy(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  };
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [railOpen, setRailOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [active, setActive] = useState<string | null>(null);

  // Deep-link IN: on mount, hydrate filter state from the URL query so a shared
  // or bookmarked link reopens the same filtered view. Post-mount only (no
  // hydration mismatch). ?open=1 stays supported as an alias for feat=openNow.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("q")) setQuery(p.get("q") as string);
    const csv = (k: string) => (p.get(k) ? (p.get(k) as string).split(",").filter(Boolean) : []);
    if (csv("cuisine").length) setCuisines(new Set(csv("cuisine")));
    if (csv("hood").length) setHoods(new Set(csv("hood")));
    if (csv("price").length) setPrices(new Set(csv("price").map(Number).filter((n) => n > 0)));
    if (csv("occ").length) setOcc(new Set(csv("occ")));
    if (csv("diet").length) setDiet(new Set(csv("diet")));
    const featIn = new Set(csv("feat"));
    if (p.get("open") === "1") featIn.add("openNow");
    if (featIn.size) setFeat(featIn);
    const s = p.get("sort");
    if (s && ["featured", "az", "pup", "pdown", "new"].includes(s)) setSort(s as typeof sort);
  }, []);

  // Deep-link OUT: reflect filter state into the URL (shareable/bookmarkable,
  // survives refresh). Skip the first run so we don't clobber the incoming URL
  // before the reader above has applied it.
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    const p = new URLSearchParams();
    if (query.trim()) p.set("q", query.trim());
    if (cuisines.size) p.set("cuisine", [...cuisines].join(","));
    if (hoods.size) p.set("hood", [...hoods].join(","));
    if (prices.size) p.set("price", [...prices].join(","));
    if (occ.size) p.set("occ", [...occ].join(","));
    if (diet.size) p.set("diet", [...diet].join(","));
    if (feat.size) p.set("feat", [...feat].join(","));
    if (sort !== "featured") p.set("sort", sort);
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [query, cuisines, hoods, prices, occ, diet, feat, sort]);

  const reset = () => {
    setQuery("");
    setAreaBounds(null);
    setCuisines(new Set());
    setHoods(new Set());
    setPrices(new Set());
    setOcc(new Set());
    setDiet(new Set());
    setFeat(new Set());
    setPage(1);
  };
  function toggle<T>(s: Set<T>, v: T, set: (x: Set<T>) => void) {
    const n = new Set(s);
    n.has(v) ? n.delete(v) : n.add(v);
    set(n);
    setPage(1);
  }
  const activeCount = (query ? 1 : 0) + (areaBounds ? 1 : 0) + cuisines.size + hoods.size + prices.size + occ.size + diet.size + feat.size;

  // Facet-filtered branches (every physical location). This is the COUNT and
  // the map: one place = one branch, matching the page hero/index (which also
  // count branches). Editors' picks lead; the chosen sort orders the rest.
  const facetFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (q && !r.venue.name.toLowerCase().includes(q)) return false;
      if (
        areaBounds &&
        !(
          r.venue.lat <= areaBounds.north &&
          r.venue.lat >= areaBounds.south &&
          r.venue.lng <= areaBounds.east &&
          r.venue.lng >= areaBounds.west
        )
      )
        return false;
      if (cuisines.size && !cuisines.has(r.f.cuisine)) return false;
      if (hoods.size && !hoods.has(r.venue.neighborhood_slug)) return false;
      if (prices.size && !prices.has(r.f.tier)) return false;
      if (occ.size && ![...occ].some((k) => r.f.occasions.has(k))) return false;
      if (diet.size && ![...diet].some((k) => r.f.diets.has(k))) return false;
      for (const k of feat) {
        const has = k === "openNow" ? r.f.open : (r.f as unknown as Record<string, boolean>)[k];
        if (!has) return false;
      }
      return true;
    });
    // "Featured" is the honest popularity proxy: no star ratings exist, so rank
    // by prominence - press/awards, synthesized coverage, real photos, data
    // richness - after the curated editors' picks. A-Z / price stay as options.
    const prominence = (v: (typeof out)[number]["venue"]) =>
      (v.notable_mention_en ? 8 : 0) +
      (v.whats_good_en && v.whats_good_en.length ? 4 : 0) +
      (v.photos && v.photos.length ? 3 : 0) +
      (v.typical_spend_en ? 1 : 0) +
      (v.best_time || v.best_time_en ? 1 : 0);
    if (sort === "near" && userLoc) {
      // Pure proximity - editors' picks do not jump the queue here (the visitor
      // explicitly asked "what is closest to me").
      out.sort(
        (a, b) =>
          distanceKm(userLoc.lat, userLoc.lng, a.venue.lat, a.venue.lng) -
            distanceKm(userLoc.lat, userLoc.lng, b.venue.lat, b.venue.lng) ||
          a.venue.name.localeCompare(b.venue.name)
      );
    } else {
      out.sort(
        (a, b) =>
          (a.venue.editors_pick_rank ?? 99) - (b.venue.editors_pick_rank ?? 99) ||
          (sort === "new"
            ? (b.venue.added_at ?? "").localeCompare(a.venue.added_at ?? "")
            : sort === "featured"
            ? prominence(b.venue) - prominence(a.venue) ||
              (b.venue.verified_at ?? "").localeCompare(a.venue.verified_at ?? "")
            : sort === "az"
              ? a.venue.name.localeCompare(b.venue.name)
              : sort === "pup"
                ? a.f.tier - b.f.tier
                : b.f.tier - a.f.tier) ||
          a.venue.name.localeCompare(b.venue.name)
      );
    }
    return out;
  }, [rows, query, cuisines, hoods, prices, occ, diet, feat, sort, userLoc, areaBounds]);

  // The LIST collapses multi-location brands to their first branch (Athanasiou's
  // 6 branches become one row carrying a "N locations" link), so the rows stay
  // tidy. The count above is still branch-level, bridged by that "N locations".
  const filtered = useMemo(() => {
    const seenBrand = new Set<string>();
    return facetFiltered.filter((r) => {
      const key = r.brandSlug;
      if (!key) return true;
      if (seenBrand.has(key)) return false;
      seenBrand.add(key);
      return true;
    });
  }, [facetFiltered]);

  // Memoize on `filtered` ONLY - so hovering/clicking (which changes `active`)
  // does NOT create a new pins array and tear down the map markers. Without this
  // the map rebuilt on every hover (popups closed, flicker) - the "buggy" feel.
  const pins: MapPin[] = useMemo(
    () =>
      filtered.map((r) => ({
        slug: r.venue.slug,
        name: r.venue.name,
        cuisine: r.f.cuisine,
        price: priceGlyphs(r.venue.price_tier),
        lat: r.venue.lat,
        lng: r.venue.lng,
        href: r.href,
        photo: r.venue.photos[0]?.url,
      })),
    [filtered]
  );

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pg = Math.min(page, pages);
  const start = (pg - 1) * pageSize;
  const end = start + pageSize;
  const go = (p: number) => {
    setPage(p);
    document.getElementById("disc-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Active-filter pills (each removable).
  const pills: { label: string; onRemove: () => void }[] = [];
  if (query) pills.push({ label: `"${query}"`, onRemove: () => setQuery("") });
  [...prices].forEach((t) => pills.push({ label: "$".repeat(t), onRemove: () => toggle(prices, t, setPrices) }));
  [...occ].forEach((k) => pills.push({ label: labels.occ[k] ?? k, onRemove: () => toggle(occ, k, setOcc) }));
  [...diet].forEach((k) => pills.push({ label: labels.diet[k] ?? k, onRemove: () => toggle(diet, k, setDiet) }));
  [...feat].forEach((k) => pills.push({ label: labels.feat[k] ?? k, onRemove: () => toggle(feat, k, setFeat) }));
  [...cuisines].forEach((c) => pills.push({ label: c, onRemove: () => toggle(cuisines, c, setCuisines) }));

  const chk = (on: boolean) => <span className={`fchk${on ? " on" : ""}`} aria-hidden="true" />;

  return (
    <div className={`discovery mobile-${mobileView}${railOpen ? " rail-open" : ""}`}>
      <span id="disc-top" aria-hidden="true" />

      {/* Mobile-only search, always visible and FIRST (the full search lives in
          the Filters drawer, which is hidden until opened - Chris: surface search
          on mobile, seen more). */}
      <div className="disc-msearch">
        <SearchIcon />
        <input
          type="search"
          value={query}
          placeholder={labels.searchPlaceholder}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          aria-label={labels.searchPlaceholder}
        />
      </div>

      <div className="disc-bar">
        <button className="disc-filters-btn" onClick={() => setRailOpen((v) => !v)}>
          {labels.filters}{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
        <div className="disc-toggle" role="tablist" aria-label={labels.nav}>
          <button role="tab" aria-selected={mobileView === "list"} className={mobileView === "list" ? "active" : ""} onClick={() => setMobileView("list")}>{labels.list}</button>
          <button role="tab" aria-selected={mobileView === "map"} className={mobileView === "map" ? "active" : ""} onClick={() => setMobileView("map")}>{labels.map}</button>
        </div>
      </div>

      <div className="disc-split">
        {/* Mobile drawer scrim: tap outside to close (drawer is CSS-only on
            desktop, so the scrim is hidden there). */}
        {railOpen && <button type="button" className="rail-scrim" aria-label={labels.close} onClick={() => setRailOpen(false)} />}
        <aside className="disc-rail" aria-label={labels.filters}>
          <div className="rail-head">
            <span className="rail-count">{labels.results.replace("{count}", String(facetFiltered.length))}</span>
            {activeCount > 0 && <button className="rail-clear" onClick={reset}>{labels.clearAll}</button>}
            {/* Explicit close for the mobile drawer (hidden on desktop). */}
            <button type="button" className="rail-close" aria-label={labels.close} onClick={() => setRailOpen(false)}>
              &times;
            </button>
          </div>

          <div className="fsearch">
            <input type="search" value={query} placeholder={labels.searchPlaceholder} onChange={(e) => { setQuery(e.target.value); setPage(1); }} aria-label={labels.searchPlaceholder} />
          </div>

          {areaBounds && (
            <button type="button" className="area-clear" onClick={() => { setAreaBounds(null); setPage(1); }}>
              {locale === "es" ? "Filtrado por zona del mapa" : "Filtered to map area"}
              <span aria-hidden="true"> &times;</span>
            </button>
          )}

          {/* Near-me: opt-in geolocation -> sort by distance + per-card walk
              time. Nothing happens (and no permission is asked) until clicked. */}
          {!userLoc ? (
            <button type="button" className="near-me-btn" onClick={useMyLocation} disabled={geoBusy}>
              <MapPinIcon />
              {geoBusy
                ? locale === "es" ? "Localizando..." : "Locating..."
                : locale === "es" ? "Usar mi ubicación" : "Use my location"}
            </button>
          ) : (
            <p className="near-me-on">{locale === "es" ? "Ordenado por cercanía" : "Sorted by distance from you"}</p>
          )}
          {geoDenied && !userLoc && (
            <p className="near-me-denied">{locale === "es" ? "No pudimos obtener tu ubicación." : "Couldn't get your location."}</p>
          )}

          <div className="fgroup">
            <label className="flabel">{labels.sortBy}</label>
            <select className="fselect" aria-label={labels.sortBy} value={sort} onChange={(e) => setSort(e.target.value as "featured" | "az" | "pup" | "pdown" | "near" | "new")}>
              {userLoc && <option value="near">{locale === "es" ? "Más cercano" : "Nearest"}</option>}
              <option value="featured">{labels.sortFeatured}</option>
              <option value="new">{locale === "es" ? "Recién agregados" : "Recently added"}</option>
              <option value="az">{labels.sortAz}</option>
              <option value="pup">{labels.sortPriceUp}</option>
              <option value="pdown">{labels.sortPriceDown}</option>
            </select>
          </div>

          {/* "Open now" is the highest-intent filter, so it sits up top as its
              own toggle (matching /search/), not buried in the Features group. */}
          {featOpts.some((ft) => ft.key === "openNow") && (
            <div className="fgroup fgroup-open">
              <button
                className={`fcheck fcheck-open${feat.has("openNow") ? " on" : ""}`}
                aria-pressed={feat.has("openNow")}
                onClick={() => toggle(feat, "openNow", setFeat)}
              >
                {chk(feat.has("openNow"))}
                {labels.feat.openNow}
              </button>
            </div>
          )}

          {priceOpts.length > 1 && (
            <div className="fgroup">
              <span className="flabel">{labels.price}</span>
              <div className="fprice">
                {priceOpts.map((t) => (
                  <button key={t} className={`fprice-btn${prices.has(t) ? " on" : ""}`} aria-pressed={prices.has(t)} aria-label={"$".repeat(t)} onClick={() => toggle(prices, t, setPrices)}>{"$".repeat(t)}</button>
                ))}
              </div>
            </div>
          )}

          {occOpts.length > 0 && (
            <div className="fgroup">
              <span className="flabel">{labels.goodFor}</span>
              {occOpts.map((o) => (
                <button key={o.key} className="fcheck" aria-pressed={occ.has(o.key)} onClick={() => toggle(occ, o.key, setOcc)}>{chk(occ.has(o.key))}{labels.occ[o.key]}</button>
              ))}
            </div>
          )}

          {dietOpts.length > 0 && (
            <div className="fgroup">
              <span className="flabel">{labels.dietary}</span>
              {dietOpts.map((d) => (
                <button key={d.key} className="fcheck" aria-pressed={diet.has(d.key)} onClick={() => toggle(diet, d.key, setDiet)}>{chk(diet.has(d.key))}{labels.diet[d.key]}</button>
              ))}
            </div>
          )}

          {featOpts.filter((ft) => ft.key !== "openNow").length > 0 && (
            <div className="fgroup">
              <span className="flabel">{labels.features}</span>
              {featOpts
                .filter((ft) => ft.key !== "openNow")
                .map((ft) => (
                  <button key={ft.key} className="fcheck" aria-pressed={feat.has(ft.key)} onClick={() => toggle(feat, ft.key, setFeat)}>{chk(feat.has(ft.key))}{labels.feat[ft.key]}</button>
                ))}
            </div>
          )}

          {hoodOpts.length > 1 && (
            <div className="fgroup">
              <span className="flabel">{labels.neighborhood}</span>
              <div className="fcuisines">
                {hoodOpts.map(([slug, n]) => (
                  <button key={slug} className="fcheck" aria-pressed={hoods.has(slug)} onClick={() => toggle(hoods, slug, setHoods)}>
                    {chk(hoods.has(slug))}<span className="fc-name">{hoodNames![slug]}</span><span className="fc-n">{n}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {cuisineOpts.length > 1 && (
            <div className="fgroup">
              <span className="flabel">{labels.cuisine}</span>
              <div className="fcuisines">
                {cuisineOpts.map(([c, n]) => (
                  <button key={c} className="fcheck" aria-pressed={cuisines.has(c)} onClick={() => toggle(cuisines, c, setCuisines)}>
                    {chk(cuisines.has(c))}<span className="fc-name">{c}</span><span className="fc-n">{n}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sticky apply for the mobile drawer: commit + close, showing the live
              count so the visitor knows what they are about to see. Hidden on
              desktop (the rail filters live). */}
          <div className="rail-apply">
            <button type="button" onClick={() => setRailOpen(false)}>
              {labels.apply.replace("{count}", String(facetFiltered.length))}
            </button>
          </div>
        </aside>

        <div className="disc-list">
          {pills.length > 0 && (
            <div className="fpills">
              {pills.map((p, i) => (
                <button key={i} className="fpill" onClick={p.onRemove}>{p.label}<span aria-hidden="true"> ✕</span></button>
              ))}
              <button className="fpill-clear" onClick={reset}>{labels.clearAll}</button>
            </div>
          )}
          <div className="venues disc-rows">
            {filtered.map((r, i) => (
              <div
                key={r.venue.slug}
                className="v-slot"
                style={i >= start && i < end ? undefined : { display: "none" }}
                data-active={active === r.venue.slug ? "true" : undefined}
                onMouseEnter={() => setActive(r.venue.slug)}
                onMouseLeave={() => setActive(null)}
              >
                <VenueCard
                  venue={r.venue}
                  href={r.href}
                  locale={locale}
                  verifiedLabel={verifiedLabel}
                  waLabel={waLabel}
                  brandCount={r.brandCount}
                  brandHref={r.brandHref}
                  hoodName={hoodNames?.[r.venue.neighborhood_slug]}
                  distanceLabel={userLoc ? fmtDistance(distanceKm(userLoc.lat, userLoc.lng, r.venue.lat, r.venue.lng), locale) : undefined}
                />
              </div>
            ))}
            {filtered.length === 0 && <p className="disc-empty">{labels.noResults}</p>}
          </div>
          {pages > 1 && (
            <nav className="pager" aria-label={labels.nav}>
              <button className="pg-btn" onClick={() => go(pg - 1)} disabled={pg === 1}>{labels.prev}</button>
              <div className="pg-nums">
                {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                  <button key={p} className={`pg-num${p === pg ? " active" : ""}`} aria-current={p === pg ? "page" : undefined} onClick={() => go(p)}>{p}</button>
                ))}
              </div>
              <button className="pg-btn" onClick={() => go(pg + 1)} disabled={pg === pages}>{labels.next}</button>
            </nav>
          )}
        </div>

        <div className="disc-map">
          <RestaurantMap
            pins={pins}
            activeSlug={active}
            onHover={setActive}
            viewLabel={labels.view}
            searchAreaLabel={locale === "es" ? "Buscar en esta zona" : "Search this area"}
            suppressAutoFit={!!areaBounds}
            onSearchArea={(b) => {
              setAreaBounds(b);
              setPage(1);
            }}
          />
        </div>
      </div>
    </div>
  );
}
