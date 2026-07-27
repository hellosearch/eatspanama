// Post-build scan of the generated HTML. Catches what a source scan cannot.
//
// The photo-credit rule has two halves:
//   1. the credit link must NOT be a crawlable <a href> in the server HTML -
//      it is rendered client-side after hydration, with rel="nofollow"
//   2. the source URL must not appear in the HTML AS TEXT either
//
// Half 2 is the one that quietly broke. `PhotoCredit` only ever received a
// base64 string, so half 1 held everywhere. But anything handed to a CLIENT
// component is serialized into the RSC flight payload, which ships inside the
// same HTML document - and `DiscoveryView` took whole `Venue` objects. Every
// `photos[].credit_url` on a listing was sitting in the page source in plain
// text (80 on the Casco Viejo listing) even though that page renders no credit
// at all. Nothing in the source looked wrong; only the output did.
//
// So this runs against the built HTML, where both halves are observable.
//
// Usage: node scripts/check_html.mjs   (wired to `npm run build` as postbuild)
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const APP = path.join(ROOT, ".next", "server", "app");

if (!fs.existsSync(APP)) {
  console.log("check_html: no build output to scan (run next build first)");
  process.exit(0);
}

const RULES = [
  // Photo credits must not be links AT ALL - not even internal ones. They
  // render as <button data-credit>, intercepted by a delegated listener, so a
  // crawler finds nothing to follow even after executing JavaScript.
  [/<a[^>]*class="[^"]*photo-credit/i, "photo credit rendered as an <a> - it must be a <button data-credit>"],
  [/<a[^>]*class="[^"]*lh-hero-credit/i, "hero credit rendered as an <a> - it must be a <button data-credit>"],
  // A venue URL must never reach the document, in any element.
  [/data-credit="(?!\/go\/)/i, "data-credit must point at the internal /go/ gateway, never an external URL"],
  // Unquoted on purpose: inside the RSC flight payload the JSON is escaped, so
  // the key appears as \"credit_url\" and a quoted pattern silently never fires.
  // The first version of this rule was quoted and passed a build that had 80
  // leaks in it.
  [/credit_url/, "credit_url serialized into the RSC payload - strip it with toClientPhoto/toClientVenue"],
  [/images\.unsplash\.com|source\.unsplash\.com/i, "stock image URL in output"],
];

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith(".html")) yield p;
  }
}

const hits = new Map(); // why -> {count, sample}
let scanned = 0;
for (const file of walk(APP)) {
  scanned++;
  const html = fs.readFileSync(file, "utf8");
  for (const [re, why] of RULES) {
    if (re.test(html)) {
      const h = hits.get(why) ?? { count: 0, sample: path.relative(ROOT, file) };
      h.count++;
      hits.set(why, h);
    }
  }
}

if (hits.size) {
  console.error(`\nHTML OUTPUT CHECK: problems in the built pages (${scanned} scanned)\n`);
  for (const [why, h] of hits) {
    console.error(`  ${h.count} page(s): ${why}`);
    console.error(`    e.g. ${h.sample}\n`);
  }
  process.exit(1);
}
console.log(`html output check: ${scanned} pages clean`);
