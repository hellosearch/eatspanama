// Apply the handle-finding results: store every PROVEN Instagram account, and
// stage the photos for review.
//
// The handle is worth keeping even when no photo was usable - it is the venue's
// own channel, which is the only source the photo rule accepts, so a proven
// handle makes that venue cheap to revisit later.
//
// Photos are only wired after they have been downloaded and reviewed on a
// contact sheet (scripts/ig_download.mjs builds them); this script writes the
// handles and reports what is ready to wire.
//
// Usage: node scripts/wire_found_ig.mjs [--apply]
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const FIND = path.resolve(ROOT, "..", "research", "data", "ig-find");
const DATA = path.resolve(ROOT, "..", "research", "data");
const ROUNDS = fs
  .readdirSync(DATA)
  .filter((d) => /^ig-round\d+$/.test(d))
  .map((d) => path.join(DATA, d));
const VENUES = path.join(ROOT, "src", "data", "venues");
const APPLY = process.argv.includes("--apply");

const found = new Map();
for (const [dir, re] of [[FIND, /^out-find-\d+\.json$/], ...ROUNDS.map((r) => [r, /^out-(find-\d+|known-ig)\.json$/])]) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((f) => re.test(f))) {
    for (const r of JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))) {
      found.set(r.slug, r);
    }
  }
}

const files = fs.readdirSync(VENUES).filter((f) => f.endsWith(".json"));
const data = new Map(files.map((f) => [f, JSON.parse(fs.readFileSync(path.join(VENUES, f), "utf8"))]));

let handles = 0, withPhoto = 0, noAccount = 0, noPhoto = 0;

for (const [file, arr] of data) {
  let touched = false;
  for (const v of arr) {
    const r = found.get(v.slug);
    if (!r) continue;
    if (!r.instagram) {
      noAccount++;
      continue;
    }
    if (APPLY) {
      v.social = { ...(v.social ?? {}), instagram: r.instagram };
      // Keep the proof on the record: a handle without its evidence is just a
      // guess that happens to be written down.
      if (r.proof) v.social_proof = r.proof;
      if (!(v.sources ?? []).includes(r.instagram)) {
        v.sources = [r.instagram, ...(v.sources ?? [])];
      }
      touched = true;
    }
    handles++;
    if (r.url) withPhoto++;
    else noPhoto++;
  }
  if (touched && APPLY) fs.writeFileSync(path.join(VENUES, file), JSON.stringify(arr, null, 1) + "\n");
}

console.log(`${APPLY ? "APPLIED" : "DRY RUN"}`);
console.log(`  proven Instagram handles stored: ${handles}`);
console.log(`    ...of which have a photo ready: ${withPhoto}`);
console.log(`    ...proven but no usable photo:  ${noPhoto}`);
console.log(`  no account could be proven:       ${noAccount}`);
