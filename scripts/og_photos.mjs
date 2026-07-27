// Auto-source venue photos from each venue's OWN website og:image (venue-owned
// by definition). Usage: node scripts/og_photos.mjs <hood-file-basename>
// Stages images to .photostage/<hood>/<slug>.jpg + writes a manifest for QA/wire.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const hood = process.argv[2];
if (!hood) throw new Error("usage: node scripts/og_photos.mjs <hood>");
const vf = path.join(ROOT, "src", "data", "venues", `${hood}.json`);
const stage = path.join(ROOT, ".photostage", hood);
fs.mkdirSync(stage, { recursive: true });

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const BANNED =
  /degusta|tripadvisor|google|yelp|foursquare|ubereats|opentable|wanderlog|facebook|instagram|linktr\.ee|wheree|latinoplaces|myguide|honestcooking|revistapanorama|cascoviejo360|panamacascoviejo|fodors|coolhunting|dcist|comunicaffe|starwinelist|evendo|airial|week\.pa|maps\.app|goo\.gl|therooftopguide|rooftopguide|pedidosya|rappi|glovo|doordash|didifood|foursquare|zomato|restaurantguru|happycow|trip\.com|booking|expedia|panamaequity|panamacascoviejo/i;

function curl(args, timeoutMs = 20000) {
  try {
    return execFileSync("curl", ["-sSL", "--max-time", String(timeoutMs / 1000), "-A", UA, ...args], {
      maxBuffer: 1 << 26,
    });
  } catch {
    return null;
  }
}
function ownSite(v) {
  for (const s of v.sources ?? []) {
    try {
      if (!BANNED.test(new URL(s).hostname)) return s;
    } catch {}
  }
  return null;
}
function extractOg(html, base) {
  if (!html) return null;
  const pick = (re) => {
    const m = html.match(re);
    return m ? m[1] : null;
  };
  const raw =
    pick(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i) ||
    pick(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
    pick(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  if (!raw) return null;
  try {
    return new URL(raw, base).href;
  } catch {
    return null;
  }
}

const arr = JSON.parse(fs.readFileSync(vf, "utf8"));
const targets = arr.filter((v) => v.status === "open" && !(v.photos && v.photos.length) && ownSite(v));
console.log(`${hood}: ${targets.length} imageless venues with an own-site source`);

const manifest = [];
let ok = 0;
for (const v of targets) {
  const site = ownSite(v);
  const domain = new URL(site).hostname.replace(/^www\./, "");
  const html = curl([site])?.toString("utf8") ?? "";
  const og = extractOg(html, site);
  if (!og || BANNED.test((() => { try { return new URL(og).hostname; } catch { return ""; } })())) {
    manifest.push({ slug: v.slug, name: v.name, domain, status: "no-og" });
    continue;
  }
  const out = path.join(stage, `${v.slug}.jpg`);
  const raw = path.join(stage, `${v.slug}.raw`);
  const code = curl(["-o", raw, "-e", new URL(og).origin + "/", "-w", "%{http_code}", og])?.toString().trim();
  if (code !== "200" || !fs.existsSync(raw) || fs.statSync(raw).size < 8000) {
    manifest.push({ slug: v.slug, name: v.name, domain, og, status: "small-or-fail" });
    try { fs.rmSync(raw, { force: true }); } catch {}
    continue;
  }
  try {
    const meta = await sharp(raw).metadata();
    if ((meta.width ?? 0) < 400 || (meta.height ?? 0) < 300) {
      manifest.push({ slug: v.slug, name: v.name, domain, og, status: `tiny-${meta.width}x${meta.height}` });
      try { fs.rmSync(raw, { force: true }); } catch {}
      continue;
    }
    await sharp(raw)
      .resize({ width: Math.min(meta.width, 1400) })
      .jpeg({ quality: 84, mozjpeg: true })
      .toFile(out);
    try { fs.rmSync(raw, { force: true }); } catch {}
    manifest.push({
      slug: v.slug,
      name: v.name,
      domain,
      og,
      credit_en: `Photo: ${domain}`,
      credit_url: new URL(site).origin + "/",
      dims: `${meta.width}x${meta.height}`,
      status: "ok",
    });
    ok++;
  } catch {
    manifest.push({ slug: v.slug, name: v.name, domain, og, status: "decode-fail" });
    try { fs.rmSync(raw, { force: true }); } catch {}
  }
}
fs.writeFileSync(path.join(stage, "_manifest.json"), JSON.stringify(manifest, null, 1) + "\n");
const by = manifest.reduce((a, m) => ((a[m.status.replace(/tiny.*/, "tiny")] = (a[m.status.replace(/tiny.*/, "tiny")] || 0) + 1), a), {});
console.log(`downloaded ok: ${ok}/${targets.length} | breakdown:`, JSON.stringify(by));
