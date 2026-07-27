// Replace the 5 people/event venue photos with venue-owned PLACE/food shots.
// Faithful resize (preserve aspect, cap longest side) - RailGallery cover-fits.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const VENUES_PUB = path.join(ROOT, "public", "venues");
const VENUES_DATA = path.join(ROOT, "src", "data", "venues");
const TMP = path.join(ROOT, ".replace-tmp");
const SCRATCH = "C:/Users/chris/AppData/Local/Temp/claude/c--AI-search-leads/4704bced-17e6-40b4-9b1e-97e23feac242/scratchpad";

const CAP = 1400; // cap longest side; keep aspect (no crop = faithful)

const jobs = [
  { file: "casco-viejo", slug: "al-alma-cafe-restaurante-casa-lefevre-plaza-catedral",
    localFile: path.join(SCRATCH, "r2.jpg"),
    credit_en: "Photo: al·alma", credit_url: "https://www.instagram.com/alalma_panama/",
    alt_en: "Brunch dishes plated on al·alma's signature pink plates in Casco Viejo, Panama City",
    alt_es: "Platos de brunch en la vajilla rosada característica de al·alma en Casco Viejo, Ciudad de Panamá" },
  { file: "casco-viejo", slug: "en-la-fonda-panama",
    url: "https://enlafonda.com/wp-content/uploads/2024/01/Filete-de-Pescado-al-Escabeche.jpg",
    credit_en: "Photo: En La Fonda", credit_url: "https://enlafonda.com/",
    alt_en: "Fried fish in escabeche with patacones, salad and rice on the signature fish-shaped platter at En La Fonda, Casco Viejo, Panama City",
    alt_es: "Pescado frito al escabeche con patacones, ensalada y arroz en la bandeja con forma de pez de En La Fonda, Casco Viejo, Ciudad de Panamá" },
  { file: "casco-viejo", slug: "kobore-panama",
    url: "https://www.casacasco.com/wp-content/uploads/0K4A4310-scaled.jpg",
    credit_en: "Photo: Casa Casco (Köbore)", credit_url: "https://www.casacasco.com/en/menu-kobore/",
    alt_en: "Plated shrimp risotto in a blue ceramic bowl at Köbore, Casco Viejo, Panama City",
    alt_es: "Risotto de camarones en un tazón de cerámica azul en Köbore, Casco Viejo, Ciudad de Panamá" },
  { file: "casco-viejo", slug: "terraplen-rooftop",
    url: "https://terraplenpanama.com/wp-content/uploads/2026/07/PAL6840.jpg",
    credit_en: "Photo: Terraplén Rooftop", credit_url: "https://terraplenpanama.com/",
    alt_en: "Interior dining and bar setting with checkerboard floor, set tables and red curtains at Terraplén Rooftop, Casco Viejo, Panama City",
    alt_es: "Salón interior con piso ajedrezado, mesas dispuestas y cortinas rojas en Terraplén Rooftop, Casco Viejo, Ciudad de Panamá" },
  { file: "casco-viejo", slug: "element",
    url: "https://static.wixstatic.com/media/62387e_121d043a3e1948d4ae35ba906886a591~mv2.jpg",
    credit_en: "Photo: Element", credit_url: "https://www.elementbarpty.com/",
    alt_en: "Backlit branded carafes of signature drinks on the bar at Element, Casco Viejo, Panama City",
    alt_es: "Jarras de la marca con tragos de autor iluminadas en la barra de Element, Casco Viejo, Ciudad de Panamá" },
];

fs.mkdirSync(TMP, { recursive: true });

function fetchTo(url, out) {
  const args = ["-sSL", "-A",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
    "-e", new URL(url).origin + "/", "-o", out, url];
  execFileSync("curl", args, { stdio: ["ignore", "ignore", "inherit"] });
  const b = fs.readFileSync(out);
  if (b.length < 3000) throw new Error(`download too small (${b.length}B) for ${url}`);
}

const report = [];
for (const j of jobs) {
  const raw = j.localFile || path.join(TMP, `${j.slug}.raw`);
  if (!j.localFile) fetchTo(j.url, raw);
  if (!fs.existsSync(raw)) throw new Error(`source missing: ${raw}`);

  const outUrl = `/venues/${j.slug}.jpg`;
  const outPath = path.join(VENUES_PUB, `${j.slug}.jpg`);
  const meta = await sharp(raw).metadata();
  const resize = meta.width >= meta.height
    ? { width: Math.min(meta.width, CAP) }
    : { height: Math.min(meta.height, CAP) };
  await sharp(raw).resize(resize).jpeg({ quality: 86, mozjpeg: true }).toFile(outPath);

  // update the venue's photo (these venues each have exactly one photo - the bad one)
  const vf = path.join(VENUES_DATA, `${j.file}.json`);
  const arr = JSON.parse(fs.readFileSync(vf, "utf8"));
  const v = arr.find((x) => x.slug === j.slug);
  if (!v) throw new Error(`venue ${j.slug} not found in ${j.file}.json`);
  const oldUrl = v.photos && v.photos[0] && v.photos[0].url;
  v.photos = [{ url: outUrl, alt_en: j.alt_en, alt_es: j.alt_es, credit_en: j.credit_en, credit_url: j.credit_url }];
  fs.writeFileSync(vf, JSON.stringify(arr, null, 1) + "\n");

  // remove the old people-photo file if it was a different path
  if (oldUrl && oldUrl !== outUrl) {
    const oldPath = path.join(ROOT, "public", oldUrl.replace(/^\//, ""));
    if (fs.existsSync(oldPath)) { fs.rmSync(oldPath); }
  }
  const m2 = await sharp(outPath).metadata();
  report.push(`${j.slug.slice(0, 30).padEnd(32)} -> ${outUrl}  ${m2.width}x${m2.height}  ${j.credit_en}`);
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(report.join("\n"));
console.log(`\n${jobs.length} people-photos replaced.`);
