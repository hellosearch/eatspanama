// Harvest og:image from a venue's OWN website, for venues with no photo yet.
//
// This is the cleanup pass after the 9 Instagram rounds: ~300 imageless venues
// have their own site, and many put a hero/food shot in the og:image meta tag.
// It is a source the IG rounds never touched, and it is fully deterministic -
// no agents, just fetch + parse + stage for my review.
//
// What it will NOT do: wire anything. og:images are frequently a LOGO, a
// directory's image (the venue's page on a booking site sets its own og), a
// stock template, or a person. So this only downloads and stages; the contact
// sheet + my review + the same REJECT gate decide what actually ships. The
// venue-owned rule still holds: an og:image is only kept if it comes from the
// venue's own domain (not a directory), which the caller verifies on the sheet.
//
// Usage: node scripts/og_harvest.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const VENUES = path.join(ROOT, "src", "data", "venues");
const STAGE = path.join(ROOT, ".photostage", "og");
const OUT = path.resolve(ROOT, "..", "research", "data", "og-harvest.json");
fs.mkdirSync(STAGE, { recursive: true });

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

// Hosts we never accept an image from - the venue-owned rule. If the og:image
// is served by one of these, it is not the venue's own photo even when the
// venue's own page carries the tag.
const BANNED = /degusta|tripadvisor|yelp|foursquare|ubereats|opentable|rappi|pedidosya|zomato|google|gstatic|fbcdn|cdninstagram|booking\.com|wanderlog|restaurantji|dopanama|frommers|wixstatic\.com\/media\/[^/]*logo|placeholder|logo|favicon|sprite|icon/i;

function ownSite(v) {
  for (const s of v.sources ?? []) {
    if (!/^https?:/.test(s)) continue;
    if (/google\.com|instagram\.com|facebook\.com|wa\.me|whatsapp/.test(s)) continue;
    return s;
  }
  return null;
}

function curl(url, timeout = 20) {
  try {
    return execFileSync("curl", ["-sSL", "--max-time", String(timeout), "-A", UA, url], {
      maxBuffer: 8 * 1024 * 1024,
    }).toString("utf8");
  } catch {
    return "";
  }
}

function ogImage(html, base) {
  // Prefer og:image, then twitter:image. Take the first that is not obviously a
  // logo/icon by URL.
  const metas = [
    ...html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)(?::src)?["'][^>]*>/gi),
  ].map((m) => m[0]);
  for (const tag of metas) {
    const c = tag.match(/content=["']([^"']+)["']/i);
    if (!c) continue;
    let url = c[1].trim();
    if (url.startsWith("//")) url = "https:" + url;
    else if (url.startsWith("/")) {
      try {
        url = new URL(url, base).href;
      } catch {
        continue;
      }
    }
    if (!/^https?:\/\//i.test(url)) continue;
    if (BANNED.test(url)) continue;
    return url;
  }
  return null;
}

const files = fs.readdirSync(VENUES).filter((f) => f.endsWith(".json"));
const venues = files.flatMap((f) => JSON.parse(fs.readFileSync(path.join(VENUES, f), "utf8")));
const targets = venues.filter((v) => v.status === "open" && !v.photos?.length && ownSite(v));
console.log(`${targets.length} imageless venues with an own site\n`);

const found = [];
let i = 0;
for (const v of targets) {
  i++;
  const out = path.join(STAGE, `${v.slug}.jpg`);
  if (fs.existsSync(out)) {
    found.push({ slug: v.slug, cached: true });
    continue;
  }
  const site = ownSite(v);
  const html = curl(site);
  if (!html) continue;
  const img = ogImage(html, site);
  if (!img) continue;
  const raw = path.join(STAGE, `${v.slug}.raw`);
  try {
    execFileSync("curl", ["-sSL", "--max-time", "25", "-A", UA, "-e", site, "-o", raw, img], { stdio: "ignore" });
    const meta = await sharp(raw).metadata();
    const longEdge = Math.max(meta.width ?? 0, meta.height ?? 0);
    if (longEdge < 600) {
      fs.rmSync(raw, { force: true });
      continue;
    }
    await sharp(raw).resize({ width: Math.min(meta.width, 1400) }).jpeg({ quality: 84, mozjpeg: true }).toFile(out);
    fs.rmSync(raw, { force: true });
    found.push({ slug: v.slug, name: v.name, hood: v.neighborhood_slug, site, img, what: "og:image from own site" });
    if (i % 20 === 0) console.log(`  ${i}/${targets.length} scanned, ${found.length} staged`);
  } catch {
    try { fs.rmSync(raw, { force: true }); } catch {}
  }
}

fs.writeFileSync(OUT, JSON.stringify(found.filter((f) => !f.cached), null, 1) + "\n");
console.log(`\n${found.length} images staged (of ${targets.length} venues with a site)`);
console.log(`manifest: research/data/og-harvest.json`);
