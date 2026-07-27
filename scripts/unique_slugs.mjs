// Make every venue slug globally unique, so a venue can be addressed by slug
// alone (/venues/{slug}/) instead of needing its neighborhood to disambiguate.
//
// 36 slugs are currently shared by 2-6 SEPARATE branches (Athanasiou has 6, all
// with distinct coordinates). Nested URLs hid the collision because each branch
// sat in a different hood; flat URLs would silently drop 5 of the 6.
//
// Disambiguation is deterministic - every branch of a shared name gets its hood
// appended, including the first - so a re-import produces the same slugs rather
// than depending on file order.
//
// Usage: node scripts/unique_slugs.mjs [--apply]
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIR = path.join(ROOT, "src", "data", "venues");
const APPLY = process.argv.includes("--apply");

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json"));
const data = new Map(files.map((f) => [f, JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"))]));

// slug -> [{file, venue}]
const bySlug = new Map();
for (const [file, arr] of data) {
  for (const v of arr) {
    if (!bySlug.has(v.slug)) bySlug.set(v.slug, []);
    bySlug.get(v.slug).push({ file, v });
  }
}

/**
 * A brand page lives at the bare brand slug (/panama-city/wendy-s/) and
 * resolves BEFORE venues, so no branch may keep that slug or its own page
 * becomes unreachable. Group by brand name, not by slug, so the branch that
 * grabbed the clean slug during import gets qualified too.
 */
/** Slugify a fragment of a name (used for the branch label after the "|"). */
const slugPart = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const brandKey = (name) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/\s*\|\s*/)[0]
    .replace(/\b(panama|pty|city)\b/gi, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const byBrand = new Map();
for (const [file, arr] of data) {
  for (const v of arr) {
    if (v.status !== "open") continue;
    const k = brandKey(v.name);
    if (!k) continue;
    if (!byBrand.has(k)) byBrand.set(k, []);
    byBrand.get(k).push({ file, v });
  }
}
for (const [key, entries] of byBrand) {
  if (entries.length < 2) continue;
  // Fold every branch of a multi-location brand into the shared-slug pass.
  if (!bySlug.has(key)) bySlug.set(key, []);
  const bucket = bySlug.get(key);
  for (const e of entries) {
    // Compare the venue itself: the two passes wrap the same venue in
    // different {file, v} objects, so identity checks double-count.
    if (!bucket.some((x) => x.v === e.v)) bucket.push(e);
  }
}

const renames = [];
for (const [slug, entries] of bySlug) {
  if (entries.length < 2) continue;
  // Same slug + same coordinates would be a true duplicate record, not a
  // branch. There are none today, but guard so a future import cannot
  // silently mint two pages for one venue.
  const coords = new Set(entries.map(({ v }) => `${v.lat},${v.lng}`));
  if (coords.size !== entries.length) {
    console.log(`! ${slug}: ${entries.length} records but ${coords.size} distinct locations - inspect manually`);
  }
  const hoodCount = new Map();
  for (const { v } of entries) hoodCount.set(v.neighborhood_slug, (hoodCount.get(v.neighborhood_slug) ?? 0) + 1);
  const seen = new Map();
  const taken = new Set();
  for (const { file, v } of entries) {
    const hood = v.neighborhood_slug;
    // Prefer the operator's OWN branch label: Google lists these as
    // "Beirut | Obarrio", "Don Lee | Via Veneto". Falling back to the
    // coordinate-derived hood produced URLs that contradicted the venue's name
    // (Beirut | Obarrio living at beirut-bella-vista) and meaningless numeric
    // suffixes when several branches shared a hood.
    const branch = v.name.includes("|") ? slugPart(v.name.split("|").slice(1).join(" ")) : "";
    let next = branch ? `${slug}-${branch}` : `${slug}-${hood}`;
    if (taken.has(next)) next = `${slug}-${hood}`;
    // Two branches of one brand inside ONE hood, with no distinguishing label.
    if (taken.has(next) || (!branch && hoodCount.get(hood) > 1)) {
      const n = (seen.get(hood) ?? 0) + 1;
      seen.set(hood, n);
      next = `${slug}-${hood}-${n}`;
    }
    taken.add(next);
    renames.push({ file, from: v.slug, to: next, name: v.name, hood });
    if (APPLY) {
      v.slug = next;
      v.id = `${hood}-${next}`;
    }
  }
}

console.log(`${APPLY ? "APPLIED" : "DRY RUN"}: ${bySlug.size} distinct slugs, ${renames.length} renamed across ${new Set(renames.map((r) => r.from)).size} shared names\n`);
const grouped = {};
for (const r of renames) (grouped[r.from] ??= []).push(r);
for (const [from, list] of Object.entries(grouped).slice(0, 8)) {
  console.log(`  ${from} (${list.length} branches)`);
  for (const r of list) console.log(`     -> ${r.to}`);
}

if (APPLY) {
  // Final global sweep. The per-brand pass cannot see collisions it creates
  // ACROSS groups: "McDonald's" in Costa del Este gets its hood appended and
  // lands on the same slug as a venue already named "McDonald's Costa del Este".
  const used = new Set();
  for (const [, arr] of data) {
    for (const v of arr) {
      if (v.status !== "open") continue;
      if (!used.has(v.slug)) {
        used.add(v.slug);
        continue;
      }
      let n = 2;
      while (used.has(`${v.slug}-${n}`)) n++;
      const next = `${v.slug}-${n}`;
      console.log(`  global de-dupe: ${v.slug} -> ${next} (${v.name})`);
      v.slug = next;
      v.id = `${v.neighborhood_slug}-${next}`;
      used.add(next);
    }
  }

  for (const [file, arr] of data) {
    fs.writeFileSync(path.join(DIR, file), JSON.stringify(arr, null, 1) + "\n");
  }
  // Verify the invariant actually holds now.
  const after = new Set();
  let dupes = 0;
  for (const [, arr] of data) for (const v of arr) {
    if (after.has(v.slug)) dupes++;
    after.add(v.slug);
  }
  console.log(`\nverified: ${after.size} unique slugs, ${dupes} collisions remaining`);
  if (dupes) process.exit(1);
}
