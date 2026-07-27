// Build a labeled QA contact sheet of a hood's harvested og:images.
// Usage: node scripts/og_sheet.mjs <hood>
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const hood = process.argv[2];
const stage = path.join(ROOT, ".photostage", hood);
const man = JSON.parse(fs.readFileSync(path.join(stage, "_manifest.json"), "utf8")).filter((m) => m.status === "ok");
if (!man.length) {
  console.log(`${hood}: 0 ok images`);
  process.exit(0);
}
const tw = 300, th = 196, cols = 4, rows = Math.ceil(man.length / cols);
const tiles = [];
for (let i = 0; i < man.length; i++) {
  const m = man[i];
  let buf;
  try {
    buf = await sharp(path.join(stage, `${m.slug}.jpg`)).resize(tw, th, { fit: "cover" }).jpeg().toBuffer();
  } catch {
    buf = await sharp({ create: { width: tw, height: th, channels: 3, background: "#900" } }).jpeg().toBuffer();
  }
  tiles.push({ input: buf, left: (i % cols) * tw, top: Math.floor(i / cols) * th });
  const lbl = Buffer.from(
    `<svg width="${tw}" height="30"><rect width="100%" height="100%" fill="black" opacity="0.62"/><text x="4" y="12" fill="#fff" font-size="10" font-family="sans-serif">${i}. ${m.slug.slice(0, 34)}</text><text x="4" y="25" fill="#7fd" font-size="9" font-family="sans-serif">${m.domain.slice(0, 36)}</text></svg>`
  );
  tiles.push({ input: lbl, left: (i % cols) * tw, top: Math.floor(i / cols) * th });
}
fs.mkdirSync(path.join(ROOT, "public", "_audit"), { recursive: true });
await sharp({ create: { width: cols * tw, height: rows * th, channels: 3, background: "#111" } })
  .composite(tiles)
  .jpeg({ quality: 80 })
  .toFile(path.join(ROOT, "public", "_audit", `og-${hood}.jpg`));
console.log(`${hood}: sheet with ${man.length} images (indices 0-${man.length - 1})`);
