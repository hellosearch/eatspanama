// Download the Instagram picks the agents chose, then build contact sheets so
// every image gets a second look before it reaches the site.
//
// The agents inspected these visually and verified the URLs, but these photos
// ship under the venue-owned rule, so they get reviewed again here rather than
// taken on trust. Instagram CDN URLs are signed and expire, which is also why
// the file is downloaded and re-hosted rather than hotlinked.
//
// Usage: node scripts/ig_download.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const BATCHES = path.resolve(ROOT, "..", "research", "data", "ig-batches");
const FIND = path.resolve(ROOT, "..", "research", "data", "ig-find");
const DATA = path.resolve(ROOT, "..", "research", "data");
// Every photo round lives in ig-round<N>/ - pick them all up so re-running
// after a new round needs no script edit.
const ROUNDS = fs
  .readdirSync(DATA)
  .filter((d) => /^ig-round\d+$/.test(d))
  .map((d) => path.join(DATA, d));
const STAGE = path.join(ROOT, ".photostage", "ig");
fs.mkdirSync(STAGE, { recursive: true });

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

const picks = [];
for (const [dir, re] of [[BATCHES, /^out-ig-\d+\.json$/], [FIND, /^out-find-\d+\.json$/], ...ROUNDS.map((r) => [r, /^out-(find-\d+|known-ig)\.json$/])]) {
  for (const f of fs.readdirSync(dir).filter((f) => re.test(f))) {
    for (const r of JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))) {
      if (r.url) picks.push(r);
    }
  }
}
console.log(`${picks.length} picks to download`);

const ok = [];
for (const p of picks) {
  const out = path.join(STAGE, `${p.slug}.jpg`);
  if (fs.existsSync(out)) {
    ok.push(p);
    continue;
  }
  const raw = path.join(STAGE, `${p.slug}.raw`);
  try {
    execFileSync("curl", ["-sSL", "--max-time", "30", "-A", UA, "-e", "https://www.instagram.com/", "-o", raw, p.url], {
      stdio: "ignore",
    });
    const meta = await sharp(raw).metadata();
    // Judge the LONG edge: a portrait post is ~360x640, which is perfectly
    // usable but was being rejected by a width-only threshold.
    const longEdge = Math.max(meta.width ?? 0, meta.height ?? 0);
    if (longEdge < 600) {
      console.log(`  too small (${meta.width}x${meta.height}): ${p.slug}`);
      fs.rmSync(raw, { force: true });
      continue;
    }
    await sharp(raw).resize({ width: Math.min(meta.width, 1400) }).jpeg({ quality: 84, mozjpeg: true }).toFile(out);
    fs.rmSync(raw, { force: true });
    ok.push(p);
  } catch {
    console.log(`  download failed: ${p.slug}`);
    try { fs.rmSync(raw, { force: true }); } catch {}
  }
}
console.log(`downloaded ${ok.length}/${picks.length}`);

// Contact sheets, 4 across, labelled with the slug and what the agent said it is.
const tw = 320, th = 210, cols = 4;
for (let s = 0; s * 16 < ok.length; s++) {
  const chunk = ok.slice(s * 16, s * 16 + 16);
  const rows = Math.ceil(chunk.length / cols);
  const tiles = [];
  for (let i = 0; i < chunk.length; i++) {
    const p = chunk[i];
    let buf;
    try {
      buf = await sharp(path.join(STAGE, `${p.slug}.jpg`)).resize(tw, th, { fit: "cover" }).jpeg().toBuffer();
    } catch {
      buf = await sharp({ create: { width: tw, height: th, channels: 3, background: "#900" } }).jpeg().toBuffer();
    }
    const left = (i % cols) * tw, top = Math.floor(i / cols) * th;
    tiles.push({ input: buf, left, top });
    const label = Buffer.from(
      `<svg width="${tw}" height="34"><rect width="100%" height="100%" fill="black" opacity="0.66"/>` +
        `<text x="4" y="13" fill="#fff" font-size="10" font-family="sans-serif">${(s * 16 + i)}. ${p.slug.slice(0, 36)}</text>` +
        `<text x="4" y="27" fill="#7fd" font-size="9" font-family="sans-serif">${(p.what || "").slice(0, 44)}</text></svg>`
    );
    tiles.push({ input: label, left, top });
  }
  const outFile = path.join(ROOT, "public", "_audit", `ig-sheet-${s + 1}.jpg`);
  await sharp({ create: { width: cols * tw, height: rows * th, channels: 3, background: "#111" } })
    .composite(tiles)
    .jpeg({ quality: 82 })
    .toFile(outFile);
  console.log(`sheet ${s + 1}: ${chunk.length} images -> ${path.basename(outFile)}`);
}
