// Process neighborhood SETTING shots + relocate displaced food photos to venue pages.
// Faithful crop/resize only (sharp) - NO generative enhancement on real-world settings.
// Usage: node scripts/process_setting_shots.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const HOODS_DIR = path.join(ROOT, "public", "hoods");
const VENUES_PUB = path.join(ROOT, "public", "venues");
const VENUES_DATA = path.join(ROOT, "src", "data", "venues");
const NJSON = path.join(ROOT, "src", "data", "neighborhoods.json");
const TMP = path.join(ROOT, ".setting-tmp");

const TARGET_W = 1392, TARGET_H = 752; // ~1.85:1, matches existing hood images

// manifest: one entry per hood being re-imaged.
// hero  = the new venue-owned SETTING shot (replaces the food card image)
// food  = where the CURRENT (displaced) food /hoods/<slug>.jpg goes: a venue page
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "setting-manifest.json"), "utf8"));

fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync(VENUES_PUB, { recursive: true });

function dl(url, out) {
  const host = new URL(url).host;
  // Facebook's lookaside CDN only serves its crawler UA; a browser UA gets a 386B stub.
  const args = host.endsWith("fbsbx.com")
    ? ["-sSL", "-A", "facebookexternalhit/1.1", "-o", out, url]
    // browser UA + referer beat most WAF/hotlink blocks (Makoto, wix, marriott, WP).
    : ["-sSL", "-A",
       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
       "-e", new URL(url).origin + "/", "-o", out, url];
  execFileSync("curl", args, { stdio: ["ignore", "ignore", "inherit"] });
  const b = fs.readFileSync(out);
  if (b.length < 3000) throw new Error(`download too small (${b.length}B) for ${url}`);
  return b;
}

const njson = JSON.parse(fs.readFileSync(NJSON, "utf8"));
const list = Array.isArray(njson) ? njson : (njson.neighborhoods || null);
if (!list) throw new Error("unexpected neighborhoods.json shape");

const report = [];
for (const [slug, m] of Object.entries(manifest)) {
  const hood = list.find((h) => h.slug === slug);
  if (!hood) throw new Error(`hood not found: ${slug}`);

  // 1) Relocate the CURRENT food photo (if present) to the venue page.
  const curFood = path.join(HOODS_DIR, `${slug}.jpg`);
  if (m.food && fs.existsSync(curFood)) {
    const vf = path.join(VENUES_DATA, `${m.food.venueFile}.json`);
    const arr = JSON.parse(fs.readFileSync(vf, "utf8"));
    const v = arr.find((x) => x.slug === m.food.venueSlug);
    if (!v) throw new Error(`venue ${m.food.venueSlug} not in ${m.food.venueFile}.json`);
    v.photos = Array.isArray(v.photos) ? v.photos : [];
    const url = `/venues/${m.food.venueSlug}-food.jpg`;
    // Idempotent: only copy + wire if this venue hasn't already received its food
    // photo. Guards against a second run copying the NEW setting image (which by
    // then occupies curFood) over the venue's food shot.
    if (!v.photos.some((p) => p.url === url)) {
      fs.copyFileSync(curFood, path.join(VENUES_PUB, `${m.food.venueSlug}-food.jpg`));
      const photo = { url, alt_en: m.food.alt_en, alt_es: m.food.alt_es };
      if (m.food.credit_en) photo.credit_en = m.food.credit_en;
      v.photos.unshift(photo);
      fs.writeFileSync(vf, JSON.stringify(arr, null, 1) + "\n");
      report.push(`  food -> ${url}  (${v.name})`);
    } else {
      report.push(`  food -> ${url}  (already wired, skipped)`);
    }
  }

  // 2) Download + crop/resize the new SETTING shot into the hood card slot.
  const raw = path.join(TMP, `${slug}.raw`);
  dl(m.hero.url, raw);
  await sharp(raw)
    .resize(TARGET_W, TARGET_H, { fit: "cover", position: m.hero.position || "centre" })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(path.join(HOODS_DIR, `${slug}.jpg`));

  // 3) Update hero_image metadata in neighborhoods.json
  hood.hero_image = {
    url: `/hoods/${slug}.jpg`,
    alt_en: m.hero.alt_en,
    alt_es: m.hero.alt_es,
    credit_en: m.hero.credit_en,
  };
  report.push(`${slug.padEnd(15)} hero <- ${m.hero.credit_en}`);
}

fs.writeFileSync(NJSON, JSON.stringify(njson, null, 2) + "\n");
fs.rmSync(TMP, { recursive: true, force: true });
console.log(report.join("\n"));
console.log(`\nDone: ${Object.keys(manifest).length} hoods re-imaged.`);
