// Wire the og:image HARVEST results that PASSED my contact-sheet review.
// (Distinct from the older per-hood scripts/wire_og.mjs.)
//
// These come from the venue's OWN website, not Instagram, so the credit points
// at the site (through the /go/ gateway like every other credit), and approval
// is an explicit allow-list rather than an IG-keyed reject map. That matters
// because four approved slugs (chilli-republic, chillin-plaza, fud-lab-via-israel,
// haffner) have their IG image in the reject map - their WEBSITE og:image is a
// clean, different shot, and this path is how the good one still ships.
//
// Usage: node scripts/wire_og_harvest.mjs [--apply]
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const VENUES = path.join(ROOT, "src", "data", "venues");
const STAGE = path.join(ROOT, ".photostage", "og");
const MANIFEST = path.resolve(ROOT, "..", "research", "data", "og-harvest.json");
const APPLY = process.argv.includes("--apply");

/** Approved on my review of public/_audit/og-sheet-*.jpg (2026-07-23). */
const APPROVED = {
  "breakbox-panama": "spread of burgers, nachos and salads",
  "chilli-republic": "spread of tacos, loaded hot dog and sides",
  "chillin-plaza": "table spread of pizzas, pasta and sandwiches",
  "el-burger-bar": "spread of burgers, fries and salads",
  "el-green-room": "warm dining room interior",
  "fud-lab-via-israel": "lettuce-wrapped burger with plantain chips",
  "haffner-terminal-albrook": "loaded hot dogs",
  "sisu-coffee-studio-mallol-design-house": "filter coffee poured into two cups",
  wingstasty: "spread of salmon, burger and salads",
};

const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : [];
const siteOf = new Map(manifest.map((m) => [m.slug, m.site]));

const files = fs.readdirSync(VENUES).filter((f) => f.endsWith(".json"));
const data = new Map(files.map((f) => [f, JSON.parse(fs.readFileSync(path.join(VENUES, f), "utf8"))]));

let wired = 0;
const missing = [];

for (const [file, arr] of data) {
  let touched = false;
  for (const v of arr) {
    const what = APPROVED[v.slug];
    if (!what || v.status !== "open" || v.photos?.length) continue;
    const staged = path.join(STAGE, `${v.slug}.jpg`);
    if (!fs.existsSync(staged)) {
      missing.push(`${v.slug}: not staged`);
      continue;
    }
    const site =
      siteOf.get(v.slug) ??
      (v.sources ?? []).find((s) => /^https?:/.test(s) && !/google|instagram|facebook/.test(s));
    let domain = v.name;
    try {
      if (site) domain = new URL(site).host.replace(/^www\./, "");
    } catch {
      /* keep name */
    }
    if (APPLY) {
      fs.copyFileSync(staged, path.join(ROOT, "public", "venues", `${v.slug}.jpg`));
      v.photos = [
        {
          url: `/venues/${v.slug}.jpg`,
          alt_en: `${what} at ${v.name}, Panama City`,
          alt_es: `${v.name}, Ciudad de Panamá`,
          credit_en: `Photo: ${domain}`,
          ...(site ? { credit_url: site } : {}),
        },
      ];
      touched = true;
    }
    wired++;
  }
  if (touched && APPLY) fs.writeFileSync(path.join(VENUES, file), JSON.stringify(arr, null, 1) + "\n");
}

console.log(`${APPLY ? "APPLIED" : "DRY RUN"}: ${wired} og:image photos wired of ${Object.keys(APPROVED).length} approved`);
for (const m of missing) console.log(`  ${m}`);
