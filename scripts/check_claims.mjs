// Fail the build if the site claims something we cannot back up.
//
// Written after the July 2026 content-integrity pass, which found that the
// prototype editorial layer had survived into a site with a real 1,327-venue
// database and was making claims none of it supported:
//
//   - a brunch guide listing 14 venues, 11 of which did not exist anywhere
//   - "Visited all 14 in person - we pay for our own meals, always"
//   - a named senior editor who does not exist, emitted as Person JSON-LD
//   - a neighborhood change log reporting the closure of a fictional restaurant
//   - "1,800+ readers" and "Sample issue No. 41" for a newsletter never sent
//   - stock photography on a site whose rule is venue-owned photos only
//
// Every one of those was a string a human had to notice. This makes the build
// notice instead. Run against the SOURCE (components + message catalogs), not
// the rendered output, so the failure points at the line to fix.
//
// Usage: node scripts/check_claims.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SCAN = ["src", "messages"];

/** [pattern, why it is banned, allowed-if-matches] */
const RULES = [
  [/\bvisited (all|every|it|them|unannounced)/i, "claims a first-hand visit we did not make"],
  [/\bwe (visited|ate|tried|tasted|went)\b/i, "claims first-hand dining experience"],
  [/we pay for our own meals|paid in full|came off our own card/i, "claims we paid for meals we never ate"],
  [/\b(second|third|fourth|fifth) visit\b/i, "claims a visit count"],
  [/\bunannounced\b/i, "claims unannounced visits"],
  [/re-?walk(ed)? (the|monthly)|fixed route every month/i, "claims a monthly re-visit route"],
  [/\bno press invites\b/i, "claims a press-invite policy for visits we do not make"],
  [/images\.unsplash\.com|source\.unsplash\.com|pexels\.com|istockphoto/i, "stock imagery - photos must be venue-owned"],
  [/lugares que visitamos|todos visitados|comieron en los|visitado en persona/i, "ES copy claiming first-hand visits"],
  // Frozen numbers in JSX: a literal count passed to a translated string.
  [/\bcount:\s*\d{2,}/, "hardcoded count - derive it from the data"],
  [/Updated (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}/i,
   "frozen 'Updated <month>' string - derive it from a date field"],
  [/Sample issue|No\.\s*\d+\s*·|readers['"]?\s*:\s*['"][\d,]+\+/i, "invented newsletter issue number or readership"],
];

/** Paths whose matches are commentary ABOUT the rules, not claims. */
const EXEMPT = [
  path.join("scripts", "check_claims.mjs"),
  path.join("scripts", "build_guides.mjs"),
];

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      yield* walk(p);
    } else if (/\.(tsx?|json)$/.test(e.name)) {
      yield p;
    }
  }
}

/**
 * Blank out comments so a note explaining WHY something was removed does not
 * trip the rule that removed it - while KEEPING the line count, so a reported
 * line number points at the real line. (Deleting them made every number after
 * the first comment wrong.) JSON has no comments.
 */
function stripComments(src, file) {
  if (file.endsWith(".json")) return src;
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^(\s*)\/\/.*$/gm, "$1");
}

const failures = [];
for (const dir of SCAN) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  for (const file of walk(abs)) {
    const rel = path.relative(ROOT, file);
    if (EXEMPT.some((e) => rel.endsWith(e))) continue;
    const raw = fs.readFileSync(file, "utf8");
    const src = stripComments(raw, file);
    for (const [re, why] of RULES) {
      const lines = src.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(re);
        if (m) failures.push({ rel, line: i + 1, text: m[0].trim(), why });
      }
    }
  }
}

// The guides must reference venues that exist and are published.
const guidesPath = path.join(ROOT, "src", "data", "guides.json");
if (fs.existsSync(guidesPath)) {
  const VENUES = path.join(ROOT, "src", "data", "venues");
  const open = new Set(
    fs
      .readdirSync(VENUES)
      .filter((f) => f.endsWith(".json"))
      .flatMap((f) => JSON.parse(fs.readFileSync(path.join(VENUES, f), "utf8")))
      .filter((v) => v.status === "open")
      .map((v) => v.slug)
  );
  for (const g of JSON.parse(fs.readFileSync(guidesPath, "utf8"))) {
    for (const t of [...g.toc.map((t) => t.slug), ...g.entries.map((e) => e.venue_slug)]) {
      if (!open.has(t)) {
        failures.push({
          rel: "src/data/guides.json",
          line: 0,
          text: `${g.slug} -> ${t}`,
          why: "guide references a venue that is not a published venue",
        });
      }
    }
  }
}

if (failures.length) {
  console.error(`\nCONTENT INTEGRITY: ${failures.length} unsupportable claim(s)\n`);
  for (const f of failures) {
    console.error(`  ${f.rel}:${f.line}`);
    console.error(`    ${JSON.stringify(f.text)}`);
    console.error(`    -> ${f.why}\n`);
  }
  console.error("Every claim on this site has to be traceable to the dataset. Fix or remove.\n");
  process.exit(1);
}
console.log("content integrity: no unsupportable claims found");
