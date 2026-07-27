// Wire the og:image harvest results that PASSED visual QA.
//
// Approval is per-slug and deliberate: 105 harvested images were reviewed on
// contact sheets and ~10% survived. What kills the rest, in order of frequency:
//   - the og:image is the venue's LOGO, not a photograph
//   - it is hosted by a directory (Frommer's, dopanama, wanderboat, ofertasimple)
//     rather than the venue, which fails the venue-owned rule even though the
//     venue's own page served the tag
//   - people are the subject rather than the place or the food
//   - it is a template placeholder (one venue shipped a WordPress theme demo
//     image, watermarked "LAURENT Elegant Restaurant Theme")
//
// Usage: node scripts/wire_approved.mjs [--apply]
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const VENUES = path.join(ROOT, "src", "data", "venues");
const APPLY = process.argv.includes("--apply");

/** slug -> { hood, alt_en, alt_es } for images that passed review. */
const APPROVED = {
  "athanasiou-bella-vista": {
    hood: "bella-vista",
    alt_en: "Pastry counter at Athanasiou, Bella Vista, Panama City",
    alt_es: "Vitrina de pasteles en Athanasiou, Bella Vista, Ciudad de Panamá",
  },
  "hacienda-real-panama": {
    hood: "bella-vista",
    alt_en: "Grilled steak with vegetables at Hacienda Real, Panama City",
    alt_es: "Corte a la parrilla con vegetales en Hacienda Real, Ciudad de Panamá",
  },
  "taqueria-los-tarascos-de-mexico": {
    hood: "bella-vista",
    alt_en: "Tacos and salsas at Los Tarascos, Panama City",
    alt_es: "Tacos y salsas en Los Tarascos, Ciudad de Panamá",
  },
  kosta: {
    hood: "casco-viejo",
    alt_en: "Sushi plated at Kosta Izakaya, Casco Viejo, Panama City",
    alt_es: "Sushi en Kosta Izakaya, Casco Viejo, Ciudad de Panamá",
  },
  "vera-cafe": {
    hood: "casco-viejo",
    alt_en: "Pastry counter and tiled bar at Vera Café, Casco Viejo, Panama City",
    alt_es: "Vitrina y barra de azulejos en Vera Café, Casco Viejo, Ciudad de Panamá",
  },
  "bella-vista-sky-bar-rooftop": {
    hood: "el-cangrejo",
    alt_en: "Planted rooftop bar interior at Bella Vista Sky Bar, Panama City",
    alt_es: "Interior del bar en azotea Bella Vista Sky Bar, Ciudad de Panamá",
  },
  "guerrero-xian-panama": {
    hood: "el-cangrejo",
    alt_en: "Dining room with paper lanterns at Guerrero Xian, Panama City",
    alt_es: "Comedor con farolillos en Guerrero Xian, Ciudad de Panamá",
  },
  "athanasiou-costa-del-este-1": {
    staged: "athanasiou-costa-del-este",
    hood: "costa-del-este",
    alt_en: "Pastry counter at Athanasiou, Costa del Este, Panama City",
    alt_es: "Vitrina de pasteles en Athanasiou, Costa del Este, Ciudad de Panamá",
  },
};

const files = fs.readdirSync(VENUES).filter((f) => f.endsWith(".json"));
const data = new Map(files.map((f) => [f, JSON.parse(fs.readFileSync(path.join(VENUES, f), "utf8"))]));

let wired = 0;
const missing = [];

for (const [slug, meta] of Object.entries(APPROVED)) {
  const manifestPath = path.join(ROOT, ".photostage", meta.hood, "_manifest.json");
  if (!fs.existsSync(manifestPath)) {
    missing.push(`${slug}: no manifest for ${meta.hood}`);
    continue;
  }
  const entry = JSON.parse(fs.readFileSync(manifestPath, "utf8")).find((m) => m.slug === (meta.staged ?? slug));
  const stagedSlug = meta.staged ?? slug;
  const staged = path.join(ROOT, ".photostage", meta.hood, `${stagedSlug}.jpg`);
  if (!entry || !fs.existsSync(staged)) {
    missing.push(`${slug}: not staged`);
    continue;
  }

  let found = false;
  for (const [, arr] of data) {
    for (const v of arr) {
      if (v.slug !== slug || v.status !== "open") continue;
      found = true;
      if (v.photos?.length) break; // never clobber an existing photo
      if (APPLY) {
        fs.copyFileSync(staged, path.join(ROOT, "public", "venues", `${slug}.jpg`));
        v.photos = [
          {
            url: `/venues/${slug}.jpg`,
            alt_en: meta.alt_en,
            alt_es: meta.alt_es,
            credit_en: entry.credit_en,
            credit_url: entry.credit_url,
          },
        ];
      }
      wired++;
    }
  }
  if (!found) missing.push(`${slug}: no open venue with that slug`);
}

if (APPLY) {
  for (const [file, arr] of data) {
    fs.writeFileSync(path.join(VENUES, file), JSON.stringify(arr, null, 1) + "\n");
  }
}

console.log(`${APPLY ? "APPLIED" : "DRY RUN"}: ${wired} photos wired of ${Object.keys(APPROVED).length} approved`);
for (const m of missing) console.log(`  skipped ${m}`);
