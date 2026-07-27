// Wire approved og:image photos for a hood into the venue data.
// Usage: node scripts/wire_og.mjs <hood> [rejectSlugCsv]
// Wires every "ok" manifest entry EXCEPT the rejected slugs.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const hood = process.argv[2];
// keep-by-index: indices into the ok-filtered manifest (same order as the QA sheet)
const keep = new Set((process.argv[3] ?? "").split(",").map((s) => s.trim()).filter(Boolean).map(Number));
if (!hood) throw new Error("usage: node scripts/wire_og.mjs <hood> <keepIndicesCsv>");

const stage = path.join(ROOT, ".photostage", hood);
const okAll = JSON.parse(fs.readFileSync(path.join(stage, "_manifest.json"), "utf8")).filter((m) => m.status === "ok");
const man = okAll.filter((_, i) => keep.has(i));
const VENUES = path.join(ROOT, "src", "data", "venues");
const files = fs.readdirSync(VENUES).filter((f) => f.endsWith(".json"));
const index = {}; // slug -> [files]
for (const f of files)
  for (const v of JSON.parse(fs.readFileSync(path.join(VENUES, f), "utf8")))
    (index[v.slug] = index[v.slug] || []).push(f);

// hood display name for alt text
const hoods = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "data", "neighborhoods.json"), "utf8"));
const hoodName = (hoods.find((n) => n.slug === hood) || {}).name || hood;

let wired = 0;
for (const m of man) {
  const targetFiles = index[m.slug];
  if (!targetFiles) {
    console.log("skip (no venue):", m.slug);
    continue;
  }
  const src = path.join(stage, `${m.slug}.jpg`);
  if (!fs.existsSync(src)) continue;
  const outUrl = `/venues/${m.slug}.jpg`;
  fs.copyFileSync(src, path.join(ROOT, "public", "venues", `${m.slug}.jpg`));
  const photo = {
    url: outUrl,
    alt_en: `${m.name} in ${hoodName}, Panama City`,
    alt_es: `${m.name} en ${hoodName}, Ciudad de Panamá`,
    credit_en: m.credit_en,
    credit_url: m.credit_url,
  };
  for (const f of targetFiles) {
    const fp = path.join(VENUES, f);
    const arr = JSON.parse(fs.readFileSync(fp, "utf8"));
    const v = arr.find((x) => x.slug === m.slug);
    if (v.photos && v.photos.length) continue; // never clobber an existing photo
    v.photos = [{ ...photo }];
    fs.writeFileSync(fp, JSON.stringify(arr, null, 1) + "\n");
  }
  wired++;
}
console.log(`${hood}: wired ${wired} of ${okAll.length} ok (kept indices: ${[...keep].join(",")})`);
