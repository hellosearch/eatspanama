// Wire an approved re-source batch: replace each venue's photo with the new
// venue-owned image + credit + cloaked source link. Faithful resize (preserve
// aspect, cap longest side). RailGallery cover-fits.
// Usage: node scripts/wire_batch.mjs scripts/batch1-manifest.json
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const VENUES_PUB = path.join(ROOT, "public", "venues");
const VENUES_DATA = path.join(ROOT, "src", "data", "venues");
const TMP = path.join(ROOT, ".wire-tmp");
const CAP = 1600;

const manifestPath = process.argv[2];
if (!manifestPath) throw new Error("usage: node scripts/wire_batch.mjs <manifest.json>");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, manifestPath), "utf8"));

fs.mkdirSync(TMP, { recursive: true });

// index every venue file once. Some venues are duplicated across neighborhood
// files (same slug) - collect ALL files per slug so every copy gets updated.
const files = fs.readdirSync(VENUES_DATA).filter((f) => f.endsWith(".json"));
const index = {}; // slug -> [files]
for (const f of files) {
  for (const v of JSON.parse(fs.readFileSync(path.join(VENUES_DATA, f), "utf8"))) {
    (index[v.slug] = index[v.slug] || []).push(f);
  }
}

function fetchTo(url, out) {
  const host = new URL(url).host;
  const args = host.endsWith("fbsbx.com")
    ? ["-sSL", "-A", "facebookexternalhit/1.1", "-o", out, url]
    : ["-sSL", "-A",
       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
       "-e", new URL(url).origin + "/", "-o", out, url];
  execFileSync("curl", args, { stdio: ["ignore", "ignore", "inherit"] });
  const b = fs.readFileSync(out);
  if (b.length < 3000) throw new Error(`download too small (${b.length}B) for ${url}`);
}

const report = [];
for (const [slug, m] of Object.entries(manifest)) {
  const targetFiles = index[slug];
  if (!targetFiles) throw new Error(`venue not found: ${slug}`);

  const raw = m.localFile ? path.join(ROOT, m.localFile) : path.join(TMP, `${slug}.raw`);
  if (!m.localFile) fetchTo(m.url, raw);
  if (!fs.existsSync(raw)) throw new Error(`source missing: ${raw}`);

  const outUrl = `/venues/${slug}.jpg`;
  const outPath = path.join(VENUES_PUB, `${slug}.jpg`);
  const meta = await sharp(raw).metadata();
  const resize = meta.width >= meta.height ? { width: Math.min(meta.width, CAP) } : { height: Math.min(meta.height, CAP) };
  await sharp(raw).resize(resize).jpeg({ quality: 86, mozjpeg: true }).toFile(outPath);

  const photo = { url: outUrl, alt_en: m.alt_en, alt_es: m.alt_es, credit_en: m.credit_en };
  if (m.credit_url) photo.credit_url = m.credit_url;
  const oldUrls = new Set();
  for (const file of targetFiles) {
    const vf = path.join(VENUES_DATA, file);
    const arr = JSON.parse(fs.readFileSync(vf, "utf8"));
    const v = arr.find((x) => x.slug === slug);
    if (v.photos && v.photos[0] && v.photos[0].url) oldUrls.add(v.photos[0].url);
    v.photos = [{ ...photo }];
    fs.writeFileSync(vf, JSON.stringify(arr, null, 1) + "\n");
  }
  // only delete an old file if NO copy still points at it (and it isn't the new file)
  for (const oldUrl of oldUrls) {
    if (oldUrl === outUrl) continue;
    const oldPath = path.join(ROOT, "public", oldUrl.replace(/^\//, ""));
    if (fs.existsSync(oldPath)) fs.rmSync(oldPath);
  }
  const m2 = await sharp(outPath).metadata();
  report.push(`${slug.slice(0, 32).padEnd(34)} ${String(m2.width) + "x" + m2.height} <- ${m.credit_en}`);
}

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
console.log(report.join("\n"));
console.log(`\n${Object.keys(manifest).length} venues wired.`);
