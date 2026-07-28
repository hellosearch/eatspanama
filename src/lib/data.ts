/**
 * Data-access layer. Every page reads through THIS module, never from
 * src/data/mock.ts directly, so swapping fixtures for live services is a
 * change to one file.
 *
 * Integration seams (later tickets):
 * - TODO(supabase): venues / neighborhoods / change_log move to Supabase
 *   (same shapes - the mock types mirror the planned schema). Replace the
 *   synchronous fixture reads with supabase-js queries; the functions are
 *   already async so callers won't change.
 * - TODO(sanity): guides (editorial documents) move to Sanity with
 *   document-internationalization, mirroring agency-website's setup.
 *
 * Search (searchVenues / searchVenuesRanked) is a self-contained in-memory
 * scored matcher over the 775 static venues - tokenized, accent-folded, EN+ES
 * synonyms, ranked, always returns something. No external service (Typesense
 * not needed at this scale). Fuzzy/edit-distance is the one deferred piece;
 * `expand()` is the extension point.
 */
import {
  cities,
  heroCollage,
  type Venue,
  type Neighborhood,
  type City,
  type Guide,
} from "@/data/mock";
import guidesRaw from "@/data/guides.json";
import neighborhoodsRaw from "@/data/neighborhoods.json";
import { cleanCuisine } from "@/lib/format";
// The 15 real Panama City neighborhood datasets (775 enriched Basic-tier
// venues, clean canonical cuisine taxonomy). These fully replace the mock
// venues + mock neighborhoods. The prototype editorial fixtures (a fabricated
// editor, fictional guides, a fabricated neighborhood change log and invented
// site stats) were deleted in the July 2026 content-integrity pass; guides now
// come from guides.json, built by scripts/build_guides.mjs out of real venues.
import albrook from "@/data/venues/albrook.json";
import amador from "@/data/venues/amador.json";
import bellaVista from "@/data/venues/bella-vista.json";
import calidonia from "@/data/venues/calidonia.json";
import cascoViejo from "@/data/venues/casco-viejo.json";
import clayton from "@/data/venues/clayton.json";
import costaDelEste from "@/data/venues/costa-del-este.json";
import elCangrejo from "@/data/venues/el-cangrejo.json";
import marbella from "@/data/venues/marbella.json";
import obarrio from "@/data/venues/obarrio.json";
import paitilla from "@/data/venues/paitilla.json";
import puebloNuevo from "@/data/venues/pueblo-nuevo.json";
import puntaPacifica from "@/data/venues/punta-pacifica.json";
import sanFrancisco from "@/data/venues/san-francisco.json";
import santaAna from "@/data/venues/santa-ana.json";

/**
 * These arrays are exported synchronously so route `generateStaticParams`
 * and the sitemap (both sync) surface every real venue. The async accessors
 * below read the same source, so swapping in Supabase later is a one-file
 * change.
 */
const venueFiles = [
  albrook, amador, bellaVista, calidonia, cascoViejo, clayton, costaDelEste,
  elCangrejo, marbella, obarrio, paitilla, puebloNuevo, puntaPacifica,
  sanFrancisco, santaAna,
] as unknown as Venue[][];

/** All 775 venues across the 15 Panama City neighborhoods. */
export const allVenues: Venue[] = venueFiles.flat();

/**
 * The 15 real neighborhood records, reconciled to the live dataset.
 *
 * `venue_count` was already recomputed here. The frozen strings were NOT:
 * the H1, descriptor AND the intro paragraph were written when the dataset was
 * smaller ("Casco Viejo ... 99 spots", "99 restaurants", "has 99 restaurants
 * on EatsPanama"), so after the W1/W2 imports every listing page advertised a
 * count roughly half its real inventory - 14 of 15 understated, one by 120.
 *
 * The intro's leading count matters twice over: it is the above-the-fold SEO
 * copy AND the source of the meta description, so a stale number there both
 * contradicts the H1 on the page and ships the wrong count to search results.
 * The intro carries exactly one count (its opening "has N restaurants"), so
 * replacing the FIRST number is safe - the cuisine list after it has none.
 * Anything that states a number is now derived from the same count, one place.
 */
export const allNeighborhoods: Neighborhood[] = (
  neighborhoodsRaw as unknown as Neighborhood[]
).map((n) => {
  const venue_count = allVenues.filter(
    (v) => v.neighborhood_slug === n.slug && v.status === "open"
  ).length;
  const retint = (h: { pre: string; accent: string; post: string }, noun: string) => ({
    ...h,
    accent: h.accent.replace(/\d[\d,]*/, String(venue_count)) || `${venue_count} ${noun}`,
  });
  // Replace the leading count in a frozen sentence with the live one.
  const recount = (s: string | undefined) =>
    s ? s.replace(/\d[\d,]*/, String(venue_count)) : s;
  return {
    ...n,
    venue_count,
    h1_en: retint(n.h1_en, "spots"),
    h1_es: retint(n.h1_es, "lugares"),
    descriptor_en: recount(n.descriptor_en)!,
    descriptor_es: recount(n.descriptor_es) ?? n.descriptor_es,
    intro_en: recount(n.intro_en)!,
    intro_es: recount(n.intro_es) ?? n.intro_es,
  };
});

export async function getCity(slug: string, locale: string): Promise<City | undefined> {
  return cities.find((c) => (locale === "es" ? c.slug_es : c.slug) === slug);
}

export async function getNeighborhood(
  citySlug: string,
  hoodSlug: string,
  locale: string
): Promise<{ city: City; hood: Neighborhood } | undefined> {
  const city = await getCity(citySlug, locale);
  if (!city) return undefined;
  const hood = allNeighborhoods.find(
    (n) => n.city_slug === city.slug && (locale === "es" ? n.slug_es : n.slug) === hoodSlug
  );
  return hood ? { city, hood } : undefined;
}

export async function getNeighborhoods(): Promise<Neighborhood[]> {
  return allNeighborhoods;
}

/**
 * Live venue total for a city = sum of its neighborhoods' reconciled counts.
 * Single source of truth so the city hub, the "All Panama City" hub-spoke
 * tiles and any city-level copy never disagree (the mock City.venue_count is
 * stale). Synchronous - used in render and JSON-LD.
 */
export function cityVenueCount(citySlug: string): number {
  return allNeighborhoods
    .filter((n) => n.city_slug === citySlug)
    .reduce((sum, n) => sum + n.venue_count, 0);
}

export async function getVenuesInNeighborhood(hoodSlug: string): Promise<Venue[]> {
  return allVenues.filter((v) => v.neighborhood_slug === hoodSlug && v.status === "open");
}

/**
 * Look up a venue by slug. Venue slugs are unique WITHIN a neighborhood but a
 * few (e.g. chains like "barrio-pizza", "saint-honore") repeat across
 * neighborhoods, so pass `hoodSlug` to disambiguate - without it the first
 * match wins and a shared-slug profile in another hood would 404.
 */
export async function getVenue(slug: string, hoodSlug?: string): Promise<Venue | undefined> {
  return allVenues.find(
    (v) => v.slug === slug && (hoodSlug ? v.neighborhood_slug === hoodSlug : true)
  );
}

export const guides = guidesRaw as unknown as Guide[];

export async function getGuide(slug: string): Promise<Guide | undefined> {
  return guides.find((g) => g.slug === slug);
}

export async function getGuides(): Promise<Guide[]> {
  return guides;
}

/**
 * Occasion -> matching venue tags (tags_en). Counts on the homepage occasion
 * tiles are REAL (number of open venues carrying a matching tag), never the
 * mock fixture number. Occasions with no real signal in the dataset (e.g.
 * "rooftops", "open late" - no such tag yet) are dropped rather than shown with
 * a fabricated count.
 */
// Occasions are no longer mock-backed: the real facets (with their inventory
// gate) live in lib/goodfor.ts and feed both the homepage and /good-for/.

export async function getNewThisWeek(): Promise<Venue[]> {
  // Newest additions/re-visits first (mirrors the future
  // `order by coalesce(revisited_at, added_at) desc` query).
  return allVenues
    .filter((v) => v.added_at || v.revisited_at)
    .sort((a, b) =>
      (b.revisited_at ?? b.added_at ?? "").localeCompare(a.revisited_at ?? a.added_at ?? "")
    )
    .slice(0, 5);
}

export async function getHeroCollage() {
  return heroCollage;
}

/* ============================================================================
 * SEARCH - in-memory scored matcher (replaces the old substring filter)
 * ========================================================================== */

/** Lowercase + strip diacritics + non-alphanumeric -> spaces. "Café" -> "cafe". */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function tokenize(s: string): string[] {
  const n = normalize(s);
  return n ? n.split(" ") : [];
}

/**
 * Concept clusters (EN <-> ES + synonyms) covering the site's real cuisine/tag
 * vocabulary. A query token is expanded to the union of every cluster it is in,
 * so "mariscos" hits Seafood venues and "cafe" hits Coffee. Stored normalized.
 */
const SYNONYM_CLUSTERS: string[][] = [
  ["seafood", "mariscos", "marisco", "pescado", "fish"],
  ["ceviche", "cebiche"],
  ["coffee", "cafe", "coffeeshop", "espresso", "cafeteria", "latte"],
  ["pastry", "pastries", "bakery", "panaderia", "reposteria", "pan", "croissant"],
  ["steak", "steakhouse", "parrilla", "parrillada", "carne", "grill", "asado"],
  ["pizza", "pizzeria", "pizzas"],
  ["sushi", "japanese", "japonesa", "japones", "nikkei", "ramen", "teppanyaki"],
  ["rooftop", "azotea", "terraza", "terrace", "sky", "skybar"],
  ["brunch", "breakfast", "desayuno", "desayunos"],
  ["vegan", "vegano", "vegana", "vegetarian", "vegetariano", "vegetariana", "plantbased"],
  ["italian", "italiana", "italiano", "pasta", "trattoria"],
  ["mexican", "mexicana", "mexicano", "tacos", "taco", "taqueria", "burrito"],
  ["burger", "burgers", "hamburguesa", "hamburguesas", "smashburger"],
  ["wine", "vino", "wines", "vinos", "enoteca"],
  ["bar", "cocktail", "cocktails", "coctel", "cocteles", "cantina", "pub", "cerveza", "beer", "brewery", "cerveceria"],
  ["panamanian", "panamena", "panameno", "criolla", "typical", "tipica"],
  ["peruvian", "peruana", "peruano"],
  ["spanish", "espanola", "espanol", "tapas"],
  ["chinese", "china", "chino"],
  ["french", "francesa", "frances", "bistro"],
  ["mediterranean", "mediterranea", "lebanese", "libanesa", "arabe", "arabic"],
  ["healthy", "saludable", "bowls", "poke", "salad", "ensalada"],
  ["dessert", "desserts", "postre", "postres", "icecream", "helado", "gelato"],
  ["chicken", "pollo"],
  ["cheap", "budget", "affordable", "barato", "economico", "cheapeats"],
  ["datenight", "date", "romantic", "romantico", "romantica"],
  ["view", "views", "vista", "waterfront", "sunset", "atardecer", "ocean", "mar"],
];
const SYNONYMS: Map<string, Set<string>> = (() => {
  const map = new Map<string, Set<string>>();
  for (const cluster of SYNONYM_CLUSTERS) {
    const norm = cluster.map((w) => normalize(w)).filter(Boolean);
    for (const w of norm) {
      const set = map.get(w) ?? new Set<string>();
      norm.forEach((x) => set.add(x));
      map.set(w, set);
    }
  }
  return map;
})();
/** Expand a query token to its synonyms + a light singular/plural fold. */
function expand(token: string): string[] {
  const out = new Set<string>(SYNONYMS.get(token) ?? [token]);
  if (token.length > 3) {
    if (token.endsWith("s")) out.add(token.slice(0, -1));
    else out.add(token + "s");
  }
  return [...out];
}

/** Field weight tiers: name > cuisine/tags > dishes/hood/dietary > prose. */
const W = { name: 10, cuisine: 7, tag: 7, dish: 4, hood: 4, dietary: 4, prose: 1 } as const;

interface VenueDoc {
  venue: Venue;
  tokens: Map<string, number>; // token -> summed field weight
  blob: string; // normalized concatenation (fallback substring)
  pop: number; // popularity tie-break
}

/** Built once at module load; shared across all requests. */
const venueDocs: VenueDoc[] = (() => {
  const hoodBySlug = new Map(allNeighborhoods.map((n) => [n.slug, n]));
  const add = (map: Map<string, number>, text: string | null | undefined, w: number) => {
    if (!text) return;
    for (const tok of tokenize(text)) map.set(tok, (map.get(tok) ?? 0) + w);
  };
  return allVenues
    .filter((v) => v.status === "open")
    .map((v) => {
      const tokens = new Map<string, number>();
      const parts: string[] = [];
      const push = (text: string | null | undefined, w: number) => {
        if (!text) return;
        add(tokens, text, w);
        parts.push(normalize(text));
      };
      push(v.name, W.name);
      for (const c of v.cuisine_en ?? []) {
        push(c, W.cuisine);
        push(cleanCuisine(c), W.cuisine);
      }
      for (const t of v.tags_en ?? []) push(t, W.tag);
      for (const d of v.dishes ?? []) push(d.name, W.dish);
      const hood = hoodBySlug.get(v.neighborhood_slug);
      if (hood) {
        push(hood.name, W.hood);
        push(hood.descriptor_en, W.prose);
        for (const tc of hood.top_cuisines ?? []) push(tc, W.prose);
      }
      for (const x of v.dietary_en ?? []) push(x, W.dietary);
      push(v.about_en, W.prose);
      for (const x of v.attributes_en ?? []) push(x, W.prose);
      for (const x of v.highlights_en ?? []) push(x, W.prose);
      push(v.dataset_comparison_en, W.prose);
      push(v.best_time_en, W.prose);
      push(v.notable_mention_en, W.prose);
      const pop = (v.editors_pick_rank ? 100 - v.editors_pick_rank : 0) + (hood?.venue_count ?? 0) / 1000;
      return { venue: v, tokens, blob: parts.join(" "), pop };
    });
})();

/** Popularity-ordered venues, for the never-empty fallback. */
const POPULAR: Venue[] = venueDocs
  .slice()
  .sort((a, b) => b.pop - a.pop || a.venue.name.localeCompare(b.venue.name))
  .map((d) => d.venue);

interface Scored {
  doc: VenueDoc;
  matched: number;
  raw: number;
  strong: boolean; // matched an identity field (name/cuisine/tag), not just a dish/hood/prose mention
}
// A "strong" match hit an IDENTITY field - the venue's name, its cuisine, or a
// tag - i.e. the venue genuinely IS the thing searched. A term that merely
// appears in a dish name (a burger with "Thai peanut sauce"), a neighborhood, or
// the blurb is NOT strong: those pollute a cuisine query like "Thai" with random
// burgers/cafes. When any strong match exists we show only those; otherwise we
// still fall back to the looser matches, so dish/hood searches keep working.
const STRONG_MIN = W.tag; // 7 (name=10, cuisine=7, tag=7 qualify; dish/hood/dietary=4 and prose=1 do not)
/** Score every venue against the query. OR semantics; rank by token coverage. */
function scoreQuery(q: string): Scored[] {
  const qTokens = tokenize(q);
  if (!qTokens.length) return [];
  const expanded = qTokens.map(expand);
  const scored: Scored[] = [];
  for (const doc of venueDocs) {
    let raw = 0;
    let matched = 0;
    let bestOverall = 0;
    for (const exps of expanded) {
      let best = 0;
      for (const e of exps) {
        const w = doc.tokens.get(e) ?? 0;
        if (w > best) best = w;
      }
      if (best > 0) {
        raw += best;
        matched += 1;
        if (best > bestOverall) bestOverall = best;
      }
    }
    if (matched > 0) scored.push({ doc, matched, raw, strong: bestOverall >= STRONG_MIN });
  }
  scored.sort(
    (a, b) =>
      b.matched - a.matched ||
      b.raw - a.raw ||
      b.doc.pop - a.doc.pop ||
      a.doc.venue.name.localeCompare(b.doc.venue.name)
  );
  return scored;
}
/** Last-resort substring pass over the normalized blob (odd spacing/partials). */
function fallbackSubstring(q: string): Venue[] {
  const n = normalize(q);
  if (!n) return [];
  const toks = n.split(" ");
  return venueDocs
    .filter((d) => d.blob.includes(n) || toks.some((t) => d.blob.includes(t)))
    .map((d) => d.venue);
}

/* ---- Open-now (America/Panama; venue hours have messy 12h strings) ---- */
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** "11:30 AM"/"10:00 PM"/"5:00"(->5 PM)/"12:00"(->noon) -> minutes since midnight. */
function parseTimeToMin(raw: string): number | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!m) return null; // "Closed", "" and anything unparseable
  let hr = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3]?.toLowerCase();
  if (ap === "am") hr = hr === 12 ? 0 : hr;
  else if (ap === "pm") hr = hr === 12 ? 12 : hr + 12;
  else if (hr !== 12) hr += 12; // bare 1..11 -> PM (this data's evening-open pattern); bare 12 -> noon
  return hr * 60 + min;
}
export function isOpenNow(v: Venue, now: Date = new Date()): boolean {
  const rows = v.hours;
  if (!Array.isArray(rows) || !rows.length) return false;
  const pa = new Date(now.toLocaleString("en-US", { timeZone: "America/Panama" }));
  const row = rows.find((r) => r.day_en === WEEKDAYS[pa.getDay()]);
  if (!row) return false;
  const open = parseTimeToMin(row.open);
  const close = parseTimeToMin(row.close);
  if (open == null || close == null) return false; // closed / unknown -> excluded
  const nowMin = pa.getHours() * 60 + pa.getMinutes();
  return close > open ? nowMin >= open && nowMin < close : nowMin >= open || nowMin < close;
}
/** Today's raw closing-time string (e.g. "10:00 PM"), or null if closed/unknown. */
export function todayClose(v: Venue, now: Date = new Date()): string | null {
  const rows = v.hours;
  if (!Array.isArray(rows) || !rows.length) return null;
  const pa = new Date(now.toLocaleString("en-US", { timeZone: "America/Panama" }));
  const row = rows.find((r) => r.day_en === WEEKDAYS[pa.getDay()]);
  if (!row || parseTimeToMin(row.close) == null) return null;
  return row.close.trim();
}

/**
 * Distinct cleaned cuisines + price tiers, both WITH counts. `noPrice` is the
 * number of venues carrying no price data at all: choosing any price tier
 * necessarily excludes them, so the UI states that rather than silently
 * dropping most of the city.
 */
export interface SearchFacets {
  cuisines: { value: string; count: number }[];
  prices: { tier: number; count: number }[];
  noPrice: number;
}
export function getSearchFacets(): SearchFacets {
  const cMap = new Map<string, number>();
  const pMap = new Map<number, number>();
  let noPrice = 0;
  for (const d of venueDocs) {
    const c = cleanCuisine((d.venue.cuisine_en ?? [])[0] ?? "");
    if (c) cMap.set(c, (cMap.get(c) ?? 0) + 1);
    const tier = d.venue.price_tier;
    if (tier > 0) pMap.set(tier, (pMap.get(tier) ?? 0) + 1);
    else noPrice++;
  }
  return {
    cuisines: [...cMap.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value)),
    prices: [...pMap.entries()]
      .map(([tier, count]) => ({ tier, count }))
      .sort((a, b) => a.tier - b.tier),
    noPrice,
  };
}

// Display cap for the results list. The headline reports the TRUE match total
// (SearchResult.total), so this only bounds how many cards render; a "showing
// first N" note covers the rare query that exceeds it. Sized like the browse
// pages (which render ~150 cards) so realistic queries show in full.
const RESULT_CAP = 150;

/** Back-compat: plain ranked list (used by any caller wanting Venue[]). */
export async function searchVenues(q: string): Promise<Venue[]> {
  const scored = scoreQuery(q);
  if (scored.length) return scored.slice(0, RESULT_CAP).map((s) => s.doc.venue);
  const sub = fallbackSubstring(q);
  if (sub.length) return sub.slice(0, RESULT_CAP);
  return q.trim() ? POPULAR.slice(0, 12) : [];
}

export interface SearchFilters {
  cuisine?: string; // cleaned cuisine label
  price?: number; // 1-4
  openNow?: boolean;
  goodForTags?: string[]; // occasion tags (from a /good-for/ slug)
  sort?: "relevance" | "editors";
}
export interface SearchResult {
  venues: Venue[];
  fallback: boolean; // true = query had no match; showing popular spots
  total: number;
}
/** Page entry point: scored text search + cuisine/price/open-now + sort. */
export async function searchVenuesRanked(q: string, filters: SearchFilters = {}): Promise<SearchResult> {
  const hasQuery = !!q.trim();
  let venues: Venue[];
  let fallback = false;

  if (hasQuery) {
    const scored = scoreQuery(q);
    if (scored.length) {
      // Prefer strong matches; only when there are none do we fall to the
      // loose prose matches (so the headline count means "genuinely serves X").
      const strong = scored.filter((s) => s.strong);
      venues = (strong.length ? strong : scored).map((s) => s.doc.venue);
    } else {
      const sub = fallbackSubstring(q);
      if (sub.length) venues = sub;
      else {
        venues = POPULAR;
        fallback = true;
      }
    }
  } else {
    // Filter-only browse (or bare page): popularity order.
    venues = POPULAR;
  }

  // Filters (AND). Skip when in the popular-fallback state so we still show spots.
  if (!fallback) {
    if (filters.cuisine) {
      const want = filters.cuisine;
      venues = venues.filter((v) => cleanCuisine((v.cuisine_en ?? [])[0] ?? "") === want);
    }
    if (filters.price) venues = venues.filter((v) => v.price_tier === filters.price);
    if (filters.goodForTags?.length) {
      const want = filters.goodForTags;
      venues = venues.filter((v) => (v.tags_en ?? []).some((t) => want.includes(t)));
    }
    if (filters.openNow) venues = venues.filter((v) => isOpenNow(v));
  }

  if (filters.sort === "editors") {
    venues = venues
      .slice()
      .sort(
        (a, b) => (a.editors_pick_rank ?? 99) - (b.editors_pick_rank ?? 99) || a.name.localeCompare(b.name)
      );
  }

  const total = venues.length;
  return { venues: venues.slice(0, fallback ? 12 : RESULT_CAP), fallback, total };
}
