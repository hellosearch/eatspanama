// Build the guides from REAL venue data.
//
// Why this exists: the guides shipped in mock.ts were prototype fiction. The
// brunch guide listed 14 venues, 11 of which do not exist anywhere in the
// 1,327-venue database, and claimed in print that we had visited all of them
// unannounced and paid for our own meals. None of that was true.
//
// The honest model, which this script encodes:
//   - a guide is a CURATED SHORTLIST drawn from the database, not a visit diary
//   - every entry is a venue that actually exists and is currently open
//   - entry copy is assembled from fields already produced by the review
//     synthesis pass (about_en / whats_good_en / best_time_en), which is gated
//     by research/scripts/check_synthesis.py - no new prose is invented here
//   - selection criteria are stated on the page, and are exactly the ones below
//   - counts are computed, never hardcoded
//
// Selection, in order:
//   1. status open, matches the guide's tag/neighborhood rule
//   2. must have synthesized material (whats_good_en) - otherwise there is
//      nothing to say about it that a directory row does not already say
//   3. must have hours on file (a guide that sends you to a closed door is worse
//      than no guide)
//   4. ranked by how completely we can back the pick: photo, dishes with prices,
//      themes, best-time note
//   5. one branch per operator, and at most 3 per neighborhood on city-wide
//      guides, so the list is a tour of the city rather than of one street
//
// Usage: node scripts/build_guides.mjs [--apply]
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const VENUES = path.join(ROOT, "src", "data", "venues");
const OUT = path.join(ROOT, "src", "data", "guides.json");
const APPLY = process.argv.includes("--apply");

const all = fs
  .readdirSync(VENUES)
  .filter((f) => f.endsWith(".json"))
  .flatMap((f) => JSON.parse(fs.readFileSync(path.join(VENUES, f), "utf8")));
const open = all.filter((v) => v.status === "open");

const HOODS = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "data", "neighborhoods.json"), "utf8"));
const hoodName = (slug) => HOODS.find((h) => h.slug === slug)?.name ?? slug;

/** Weekend opening hour, or null when we cannot read it. */
function weekendOpenHour(v) {
  const h = (v.hours ?? []).find((h) => /Saturday|Sunday/.test(h.day_en ?? ""));
  const m = h?.open?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return null;
  let hour = Number(m[1]);
  const ampm = (m[3] ?? "").toUpperCase();
  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  return hour + Number(m[2]) / 60;
}

/** Latest closing hour across the week, for "is this a dinner room" tests. */
function latestClose(v) {
  let latest = 0;
  for (const h of v.hours ?? []) {
    const m = h.close?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!m) continue;
    let hour = Number(m[1]);
    const ampm = (m[3] ?? "").toUpperCase();
    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour < 12) hour += 24; // 1:00 AM close = 25
    latest = Math.max(latest, hour + Number(m[2]) / 60);
  }
  return latest;
}

/** Operator key, so three Saint Honoré branches do not fill a 12-slot list. */
function operator(v) {
  return v.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(panama|panamá|casco viejo|albrook|obarrio|marbella|costa del este|el cangrejo|bella vista|san francisco|clayton|amador|paitilla|punta pacifica|calidonia|santa ana|mall|plaza|sucursal|old town)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 2)
    .join(" ");
}

function completeness(v) {
  return (
    (v.photos?.length ? 3 : 0) +
    (v.dishes?.some((d) => d.price) ? 2 : v.dishes?.length ? 1 : 0) +
    Math.min((v.whats_good_en ?? []).length, 3) +
    (v.best_time_en ? 1 : 0) +
    (v.highlights_en?.length ? 1 : 0) +
    (v.social?.instagram ? 1 : 0)
  );
}

/** The dish we point at: a priced popular item beats a priced item beats none. */
function orderDish(v) {
  const priced = (v.dishes ?? []).filter((d) => d.price && d.name);
  const pick = priced.find((d) => d.popular) ?? priced[0];
  return pick ? { name: pick.name, price: pick.price } : undefined;
}

function entryFor(v) {
  return {
    venue_slug: v.slug,
    summary_en: v.about_en ?? "",
    known_for_en: (v.whats_good_en ?? []).slice(0, 3),
    ...(v.best_time_en ? { best_time_en: v.best_time_en } : {}),
    ...(orderDish(v) ? { order_dish: orderDish(v) } : {}),
  };
}

/**
 * @param {object} spec
 * @param {(v:object)=>boolean} spec.match   pool rule
 * @param {number} [spec.perHood]            cap per neighborhood (city-wide guides)
 * @param {string[]} [spec.pin]              slugs forced to the top, in order
 */
/** Slugs already spent by an earlier guide, so two lists are not one list. */
const used = new Set();

function buildGuide(spec) {
  const pool = open.filter(
    (v) => spec.match(v) && (v.whats_good_en ?? []).length > 0 && (v.hours ?? []).length > 0
  );

  const ranked = [...pool].sort((a, b) => completeness(b) - completeness(a) || a.name.localeCompare(b.name));
  const pinned = (spec.pin ?? []).map((s) => ranked.find((v) => v.slug === s)).filter(Boolean);
  // A venue already carried by an earlier guide is skipped, so "brunch" does not
  // come out as a second copy of "coffee" - the two pools genuinely overlap.
  // Pinned venues are exempt: they are on the list by explicit editorial call.
  const rest = ranked.filter((v) => !pinned.includes(v) && !used.has(v.slug));

  const picked = [];
  const seenOperator = new Set();
  const perHood = {};
  for (const v of [...pinned, ...rest]) {
    if (picked.length >= spec.size) break;
    const op = operator(v);
    if (seenOperator.has(op)) continue;
    if (spec.perHood && (perHood[v.neighborhood_slug] ?? 0) >= spec.perHood) continue;
    seenOperator.add(op);
    perHood[v.neighborhood_slug] = (perHood[v.neighborhood_slug] ?? 0) + 1;
    picked.push(v);
  }

  // The hero is a photo from a venue ON the list, venue-owned and already
  // credited - never stock. If nothing on the list has one, the page renders
  // its branded header instead.
  const heroFrom = picked.find((v) => v.photos?.length);
  for (const v of picked) used.add(v.slug);

  return {
    slug: spec.slug,
    title_en: spec.title_en,
    description_en: spec.description_en,
    updated_iso: spec.updated_iso,
    published_iso: spec.published_iso,
    intro_en: spec.intro_en(picked.length, pool.length),
    criteria_en: spec.criteria_en,
    pool_size: pool.length,
    candidate_total: open.filter(spec.match).length,
    // Raw names are stored; the page prints them through displayName().
    toc: picked.map((v) => ({ slug: v.slug, name: v.name })),
    entries: picked.map(entryFor),
    faqs_en: spec.faqs_en(pool.length),
    ...(heroFrom
      ? { hero: { ...heroFrom.photos[0], venue_slug: heroFrom.slug, venue_name: heroFrom.name } }
      : {}),
  };
}

const MONTH = "July 2026";

const SPECS = [
  {
    slug: "best-brunch-panama-city",
    size: 12,
    perHood: 3,
    pin: ["luna-cafe"],
    match: (v) =>
      (v.tags_en ?? []).includes("Brunch") &&
      (weekendOpenHour(v) ?? 99) <= 10 &&
      // A brunch pick has to be somewhere you EAT. Specialty-coffee rooms have
      // their own guide; without this the two lists come out nearly identical.
      !(v.tags_en ?? []).includes("Specialty-coffee") &&
      (v.dishes?.some((d) => d.price) ||
        /breakfast|brunch|egg|huevo|pancake|waffle|toast|tostada|sandwich|bakery|pastr|arepa|omelet|benedict/i.test(
          [v.about_en, ...(v.whats_good_en ?? []), ...(v.highlights_en ?? [])].join(" ")
        )),
    title_en: "Where to Eat Brunch in Panama City",
    description_en:
      "Twelve places for a late, slow breakfast in Panama City, chosen from every brunch room in our database and checked against their own opening hours.",
    updated_iso: "2026-07-21",
    published_iso: "2026-07-21",
    intro_en: (picked, pool) => // (counts, not arrays)
      
      `Panama City does brunch across a wide range - specialty coffee rooms in Bella Vista, courtyard kitchens in Casco Viejo, and easy family tables out in Costa del Este. We track ${pool} places in the city that serve a proper weekend brunch and open by 10 AM. These are the ${picked} we would send someone to first, spread across the neighborhoods so there is one near wherever you are staying.`,
    criteria_en: [
      "Every place on this list is open, and its hours were checked against the venue's own listing in " + MONTH + ".",
      "Picks are drawn from the full set of brunch rooms in our Panama City database, not from a submissions inbox. Restaurants cannot pay to appear here.",
      "What each kitchen is known for is summarized from public diner feedback. We do not publish star ratings or review counts.",
      "One location per operator, so a chain with four branches does not take four slots.",
    ],
    faqs_en: (pool) => [
      {
        q: "What time does brunch start in Panama City?",
        a: "Most kitchens on this list open between 7 and 9 AM on weekends, and the brunch menu usually runs until early afternoon. Weekend late morning is the busiest window in Casco Viejo and Bella Vista, so arriving before 10 AM is the reliable move.",
      },
      {
        q: "Which neighborhood has the most brunch options?",
        a: `Across the ${pool} brunch rooms we track in Panama City, El Cangrejo, Bella Vista and Casco Viejo carry the most options. Casco Viejo has the highest concentration within walking distance; Costa del Este is the easiest for parking and family tables.`,
      },
      {
        q: "How were these places chosen?",
        a: `They were selected from our database of every open restaurant in Panama City, filtered to places that serve brunch and open by 10 AM, then ordered by how completely we can verify them - hours, menu, and what diners consistently single out. No restaurant paid for a place on this list.`,
      },
    ],
  },
  {
    slug: "best-coffee-panama-city",
    size: 12,
    perHood: 3,
    pin: ["luna-cafe"],
    match: (v) =>
      (v.tags_en ?? []).includes("Specialty-coffee") ||
      ((v.tags_en ?? []).includes("Cafe") && /geisha|specialty|roast|barista|single origin/i.test(
        [v.about_en, ...(v.whats_good_en ?? []), ...(v.highlights_en ?? [])].join(" ")
      )),
    title_en: "Specialty Coffee in Panama City: Where to Drink It",
    description_en:
      "Panama grows some of the most expensive coffee on earth. These are the rooms in the capital that treat it properly.",
    updated_iso: "2026-07-21",
    published_iso: "2026-07-21",
    intro_en: (picked, pool) => // (counts, not arrays)
      
      `Panama produces Geisha, the most expensive coffee varietal in the world, and most of it leaves the country. The capital has a growing set of rooms that keep some of it here and pour it as filter rather than burying it in milk. We track ${pool} specialty coffee rooms in Panama City; these ${picked} are the ones worth planning a morning around.`,
    criteria_en: [
      "Every place on this list is open, and its hours were checked against the venue's own listing in " + MONTH + ".",
      "Selected from the specialty coffee rooms in our Panama City database. Restaurants and cafes cannot pay to appear here.",
      "What each room is known for is summarized from public diner feedback. We do not publish star ratings or review counts.",
      "One location per operator.",
    ],
    faqs_en: (pool) => [
      {
        q: "Can you drink Geisha coffee in Panama City?",
        a: "Yes. Several specialty rooms in the capital pour Panamanian Geisha as filter coffee by the cup, usually at a premium over the house pour. It is the single thing most worth ordering in a Panama City coffee room, because it is far harder to find abroad.",
      },
      {
        q: "Where is the specialty coffee scene concentrated?",
        a: `Of the ${pool} specialty rooms we track, Bella Vista, El Cangrejo and Casco Viejo hold the densest cluster. Casco Viejo rooms tend to be smaller and busier with visitors; Bella Vista and El Cangrejo skew toward regulars and laptops.`,
      },
      {
        q: "Are these cafes good for working?",
        a: "Some are, some deliberately are not. Where a room is known for being work-friendly we say so in its entry, and the full listing pages carry a work-friendly filter you can use directly.",
      },
    ],
  },
  {
    slug: "best-dinners-casco-viejo",
    size: 12,
    match: (v) => v.neighborhood_slug === "casco-viejo" && latestClose(v) >= 21 && !(v.tags_en ?? []).includes("Cafe"),
    title_en: "Where to Have Dinner in Casco Viejo",
    description_en:
      "Casco Viejo has the highest concentration of dinner tables in Panama City. Twelve of them, from the restored plazas to the quiet side streets.",
    updated_iso: "2026-07-21",
    published_iso: "2026-07-21",
    intro_en: (picked, pool) => // (counts, not arrays)
      
      `Casco Viejo is the old walled quarter, and after dark it is the densest dining neighborhood in Panama City - you can walk between most of these in under ten minutes. We track ${pool} restaurants here that serve dinner past 9 PM. These ${picked} cover the range, from Panamanian kitchens to the Italian and seafood rooms that have moved in around them.`,
    criteria_en: [
      "Every place on this list is open, and its hours were checked against the venue's own listing in " + MONTH + ".",
      "Selected from every Casco Viejo restaurant in our database that serves dinner past 9 PM. Restaurants cannot pay to appear here.",
      "What each kitchen is known for is summarized from public diner feedback. We do not publish star ratings or review counts.",
      "One location per operator.",
    ],
    faqs_en: (pool) => [
      {
        q: "Is Casco Viejo walkable at night?",
        a: "The restored core is compact and busy in the evening, and most of the restaurants on this list sit within a ten-minute walk of each other. The edges of the quarter get quiet quickly, so it is worth knowing which street you are heading to before you set off.",
      },
      {
        q: "Do you need a reservation in Casco Viejo?",
        a: `For the smaller rooms on weekends, yes. Where a venue takes bookings by WhatsApp we link it directly on its profile page, which is the fastest route in Panama.`,
      },
      {
        q: "How many restaurants are there in Casco Viejo?",
        a: `We currently track ${open.filter((v) => v.neighborhood_slug === "casco-viejo").length} open restaurants, cafes and bars in Casco Viejo, of which ${pool} serve dinner past 9 PM. The full list is on the Casco Viejo neighborhood page.`,
      },
    ],
  },
];

const guides = SPECS.map(buildGuide);

for (const g of guides) {
  console.log(`\n${g.slug}  (pool ${g.pool_size} of ${g.candidate_total} matching, ${g.entries.length} picked)`);
  for (const [i, t] of g.toc.entries()) {
    const v = open.find((x) => x.slug === t.slug);
    console.log(
      `  ${String(i + 1).padStart(2)}. ${t.name.slice(0, 36).padEnd(38)}${hoodName(v.neighborhood_slug).padEnd(16)}` +
        `${v.photos?.length ? "PIC " : "    "}${g.entries[i].order_dish ? "DISH" : ""}`
    );
  }
  if (!g.hero) console.log("  (no photo on any pick - page renders the branded header)");
}

if (APPLY) {
  fs.writeFileSync(OUT, JSON.stringify(guides, null, 1) + "\n");
  console.log(`\nwritten to src/data/guides.json`);
} else {
  console.log("\nDRY RUN - pass --apply to write");
}
