/**
 * Derive a price tier for venues that have no stated tier but DO carry real
 * menu prices in `dishes[].price` (venue-owned data, not a directory's guess).
 *
 * Thresholds are calibrated against the venues where both signals exist:
 *   tier 1 median dish price ~6-12   tier 2 ~10-14   tier 3 ~15-38
 * Every derived venue is stamped `price_source: "menu"` so the estimate is
 * always distinguishable from a stated tier, and the venue page labels it.
 *
 * Two guards, because expensive mains are the ones most often left unpriced
 * (Los Años Locos, a steakhouse, prices only its $4 empanadas and $9 chorizo
 * while all three steaks are null - a naive median would stamp it "$"):
 *   1. at least MIN_PRICED_DISHES prices, and
 *   2. at least MIN_COVERAGE of the venue's listed dishes carry a price, so the
 *      median describes the menu rather than whichever items happened to be
 *      captured.
 * A wide spread is NOT disqualifying (a burger joint at $5-12 is still "$");
 * a partial sample is. Refusing to guess is the point: an unknown price is
 * honest, a wrong one is a trust break.
 *
 * Usage: node scripts/derive_price_tier.mjs [--apply]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIR = path.join(ROOT, "src", "data", "venues");
const APPLY = process.argv.includes("--apply");
const MIN_PRICED_DISHES = 3;
const MIN_COVERAGE = 0.6;

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const tierFor = (m) => (m < 10 ? 1 : m < 20 ? 2 : m < 35 ? 3 : 4);
const pricesOf = (v) => (v.dishes ?? []).map((d) => d.price).filter((p) => typeof p === "number" && p > 0);

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json"));
const derived = [];
const skipped = [];
const byTier = { 1: 0, 2: 0, 3: 0, 4: 0 };

for (const f of files) {
  const fp = path.join(DIR, f);
  const arr = JSON.parse(fs.readFileSync(fp, "utf8"));
  let touched = false;
  for (const v of arr) {
    if (v.status !== "open" || v.price_tier > 0) continue;
    const p = pricesOf(v);
    if (p.length < MIN_PRICED_DISHES) continue;
    const coverage = p.length / (v.dishes ?? []).length;
    if (coverage < MIN_COVERAGE) {
      skipped.push({
        slug: v.slug,
        name: v.name,
        prices: [...p].sort((a, b) => a - b),
        coverage: `${p.length}/${(v.dishes ?? []).length}`,
      });
      continue;
    }
    const m = median(p);
    const tier = tierFor(m);
    // Duplicate slugs live in several hood files; record once, patch each copy.
    if (!derived.some((d) => d.slug === v.slug)) {
      derived.push({ slug: v.slug, name: v.name, n: p.length, median: m, tier });
      byTier[tier]++;
    }
    if (APPLY) {
      v.price_tier = tier;
      v.price_source = "menu";
      touched = true;
    }
  }
  if (touched) fs.writeFileSync(fp, JSON.stringify(arr, null, 1) + "\n");
}

derived.sort((a, b) => a.median - b.median);
console.log(`${APPLY ? "APPLIED" : "DRY RUN"}: ${derived.length} venues derived`, byTier);
for (const d of derived) {
  console.log(`  ${"$".repeat(d.tier)}  median $${d.median.toFixed(2)} (${d.n} dishes)  ${d.name}`);
}
const uniqSkipped = skipped.filter((s, i) => skipped.findIndex((x) => x.slug === s.slug) === i);
console.log(`\nleft unclassified (too few dishes priced): ${uniqSkipped.length}`);
for (const s of uniqSkipped) console.log(`  ${s.coverage} priced  ${s.name} [${s.prices.join(", ")}]`);
