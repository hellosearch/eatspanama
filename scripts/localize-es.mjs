#!/usr/bin/env node
/**
 * One-time (idempotent, resumable) EN -> native es-419 localizer for EatsPanama.
 *
 * Adds `_es` twins for FREE-TEXT EDITORIAL venue + guide fields via OpenRouter,
 * so the token-heavy translation runs on the API bill, NOT a Claude Code session.
 * It NEVER touches `_en` fields, skips anything already translated, and
 * checkpoints after every file (safe to Ctrl-C and rerun). Backup the data dir
 * before the first full run.
 *
 * Key: read from the existing search-leads .env files (same as the creative
 * OpenRouter brain). Model: high-end, es-419 quality - set via OR_MODEL.
 *
 *   node scripts/localize-es.mjs            # translate everything missing _es
 *   node scripts/localize-es.mjs --limit 5 # sample run (first 5 venues)
 *   node scripts/localize-es.mjs --guides   # guides.json only
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VENUE_DIR = path.join(ROOT, "src/data/venues");
const GUIDES = path.join(ROOT, "src/data/guides.json");

// ---- config ----
const MODEL = process.env.OR_MODEL || "anthropic/claude-sonnet-5"; // high-end es-419; override via OR_MODEL
const BATCH = Number(process.env.OR_BATCH || 40);
const argv = process.argv.slice(2);
const LIMIT = argv.includes("--limit") ? Number(argv[argv.indexOf("--limit") + 1]) : Infinity;
const GUIDES_ONLY = argv.includes("--guides");
const VENUES_ONLY = argv.includes("--venues");

// Free-text editorial fields to translate. Enum/filter fields (tags_en,
// dietary_en) and proper dish names are deliberately EXCLUDED - they map to ES
// via the label system, and translating them per-venue would fork the taxonomy.
const STR_FIELDS = [
  "about_en", "tagline_en", "story_en", "typical_spend_en", "dataset_comparison_en",
  "best_time_en", "notable_mention_en", "walk_note_en", "address_note_en",
  "pick_verdict_en", "special_hours_note_en",
];
const LIST_FIELDS = ["highlights_en", "whats_good_en", "attributes_en"];
const esKey = (enKey) => enKey.replace(/_en$/, "_es");

// ---- key loading (mirror the creative brain) ----
function loadKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  const files = [
    "C:/AI/search-leads/internal/tools/searchleads-crm/.env",
    "C:/AI/search-leads/internal/tools/editorial-links/.env",
    "C:/AI/_archive/claudework/projects/bookkeeper/.env",
  ];
  for (const f of files) {
    try {
      const txt = fs.readFileSync(f, "utf8");
      for (const line of txt.split(/\r?\n/)) {
        for (const pref of ["OPENROUTER_API_KEY=", "OPENROUTER="]) {
          if (line.startsWith(pref)) {
            const val = line.slice(pref.length).trim().replace(/^["']|["']$/g, "");
            if (val) return val; // skip an empty OPENROUTER_API_KEY= and try the next file
          }
        }
      }
    } catch {}
  }
  return null;
}
const KEY = loadKey();
if (!KEY) {
  console.error("No OPENROUTER_API_KEY found (env or the search-leads .env files). Aborting.");
  process.exit(1);
}

const SYSTEM = `You are a professional food-writer and editor translating EatsPanama, a Panama City restaurant guide, from English into natural, native Latin American Spanish (es-419) as read by Panamanian diners.
Rules:
- Translate each item into fluent, idiomatic es-419 that reads as if it was ORIGINALLY written in Spanish - never literal or word-for-word.
- Match a modern, confident, concise food-guide voice.
- PRESERVE exactly, untranslated: restaurant / place / neighborhood names, dish proper names, brand names, prices, numbers, and units.
- Never add, drop, or invent meaning. If an item is already Spanish, return it unchanged.
- Do NOT use em-dashes; use regular hyphens.
- Return ONLY a JSON array of objects {"id": <number>, "es": <string>} - no prose, no code fences.`;

async function translateBatch(items) {
  // items: [{id, text}]
  const user = "Translate each item's English text to es-419. Return the JSON array only.\n\n" + JSON.stringify(items);
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://eatspanama.com",
          "X-Title": "EatsPanama localize",
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.3,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: user },
          ],
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`HTTP ${res.status}: ${t.slice(0, 300)}`);
      }
      const data = await res.json();
      let content = data.choices?.[0]?.message?.content ?? "";
      content = content.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      // tolerate the model wrapping the array
      const start = content.indexOf("[");
      const end = content.lastIndexOf("]");
      if (start >= 0 && end > start) content = content.slice(start, end + 1);
      const arr = JSON.parse(content);
      if (!Array.isArray(arr)) throw new Error("model did not return a JSON array");
      return arr;
    } catch (e) {
      console.warn(`  batch attempt ${attempt} failed: ${e.message}`);
      if (attempt === 4) throw e;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

/** Collect translatable {id, text, apply} tasks from a venue object. */
function collectVenueTasks(v, sink) {
  const push = (text, apply) => {
    if (typeof text === "string" && text.trim()) sink.push({ text, apply });
  };
  for (const f of STR_FIELDS) {
    if (v[f] && !v[esKey(f)]) push(v[f], (es) => (v[esKey(f)] = es));
  }
  for (const f of LIST_FIELDS) {
    if (Array.isArray(v[f]) && v[f].length && !v[esKey(f)]) {
      // Seed with the ENGLISH originals and write the _es array on EACH item's
      // apply. A single stubborn item (one the model echoes untranslated) then
      // no longer blocks the whole array - the field completes with that one
      // item left on its English original instead of the array staying absent.
      const out = v[f].slice();
      v[f].forEach((item, i) => {
        push(item, (es) => {
          out[i] = es;
          v[esKey(f)] = out;
        });
      });
    }
  }
  if (Array.isArray(v.room_en)) {
    v.room_en.forEach((r) => {
      if (r.caption_en && !r.caption_es) push(r.caption_en, (es) => (r.caption_es = es));
    });
  }
  // Dish descriptions are free-text prose ("Sourdough bagel with cream cheese...")
  // and DO render on the venue page - translate them. Dish `name` stays as the
  // proper menu-item name.
  if (Array.isArray(v.dishes)) {
    v.dishes.forEach((d) => {
      if (d.description_en && !d.description_es) push(d.description_en, (es) => (d.description_es = es));
    });
  }
  if (v.signature_en && !v.signature_es) {
    const s = v.signature_en, out = {};
    let need = 0, got = 0;
    if (s.name) { need++; push(s.name, (es) => { out.name = es; if (++got === need) v.signature_es = out; }); }
    if (s.note) { need++; push(s.note, (es) => { out.note = es; if (++got === need) v.signature_es = out; }); }
  }
}

/**
 * Extract the Spanish translation from one returned element WITHOUT trusting the
 * key name. The model is inconsistent about the output key - it often echoes the
 * input field ("text") instead of "es", which silently no-opped every apply. So:
 * prefer known translation keys, else take the first non-id string field that
 * actually differs from the English input (an unchanged echo means "already
 * Spanish / not translated" - skip it and leave _es unset).
 */
function pickEs(o, originalText) {
  if (!o || typeof o !== "object") return null;
  for (const k of ["es", "translation", "translated", "spanish", "es_419", "value"]) {
    if (typeof o[k] === "string" && o[k].trim() && o[k] !== originalText) return o[k];
  }
  for (const [k, v] of Object.entries(o)) {
    if (k === "id") continue;
    if (typeof v === "string" && v.trim() && v !== originalText) return v;
  }
  return null;
}

async function runTasks(tasks) {
  // assign ids, batch, translate, apply
  let done = 0, missTotal = 0;
  for (let i = 0; i < tasks.length; i += BATCH) {
    const slice = tasks.slice(i, i + BATCH);
    const items = slice.map((t, j) => ({ id: j, text: t.text }));
    const arr = await translateBatch(items);
    // Match by POSITION (index), falling back to id-lookup. The model's output
    // key AND id numbering are both unreliable, so we anchor on order (we sent
    // items in order and asked for the array in that order) and read the value
    // key-agnostically via pickEs.
    const byId = new Map(arr.map((o) => [o?.id, o]));
    let applied = 0;
    slice.forEach((t, j) => {
      const es = pickEs(arr[j], t.text) ?? pickEs(byId.get(j), t.text);
      if (typeof es === "string" && es.trim()) { t.apply(es); applied++; }
    });
    if (applied < slice.length) {
      missTotal += slice.length - applied;
      console.warn(`\n  WARN: applied ${applied}/${slice.length} in this batch`);
    }
    done += slice.length;
    process.stdout.write(`\r    translated ${done}/${tasks.length} strings`);
  }
  if (tasks.length) process.stdout.write("\n");
  return missTotal;
}

async function main() {
  console.log(`Model: ${MODEL} | batch ${BATCH}`);
  // ---- guides ----
  if (!VENUES_ONLY) {
    const guides = JSON.parse(fs.readFileSync(GUIDES, "utf8"));
    const tasks = [];
    // Push each element of an array field as its own task, writing _es only once
    // the whole array is translated (mirrors the venue LIST_FIELDS handling).
    const pushList = (obj, f) => {
      if (!Array.isArray(obj[f]) || !obj[f].length || obj[esKey(f)]) return;
      const out = new Array(obj[f].length);
      let filled = 0;
      obj[f].forEach((item, i) => {
        if (typeof item !== "string" || !item.trim()) { out[i] = item; filled++; if (filled === obj[f].length) obj[esKey(f)] = out; return; }
        tasks.push({ text: item, apply: (es) => { out[i] = es; if (++filled === obj[f].length) obj[esKey(f)] = out; } });
      });
    };
    const pushStr = (obj, f) => {
      if (typeof obj[f] === "string" && obj[f].trim() && !obj[esKey(f)]) tasks.push({ text: obj[f], apply: (es) => (obj[esKey(f)] = es) });
    };
    for (const g of guides) {
      // Guide-level: flat prose + the criteria array.
      for (const f of ["title_en", "description_en", "intro_en"]) pushStr(g, f);
      pushList(g, "criteria_en");
      // Entry-level: the real schema is summary_en + known_for_en (array) +
      // best_time_en (NOT the old verdict/single_out/blurb field names).
      for (const e of g.entries ?? []) {
        for (const f of ["summary_en", "best_time_en"]) pushStr(e, f);
        pushList(e, "known_for_en");
      }
      for (const fq of g.faqs_en ?? []) {
        if (fq.q && !fq.q_es) tasks.push({ text: fq.q, apply: (es) => (fq.q_es = es) });
        if (fq.a && !fq.a_es) tasks.push({ text: fq.a, apply: (es) => (fq.a_es = es) });
      }
    }
    if (tasks.length) {
      console.log(`Guides: ${tasks.length} strings`);
      await runTasks(tasks);
      fs.writeFileSync(GUIDES, JSON.stringify(guides, null, 1));
    } else console.log("Guides: nothing to do");
  }
  // ---- venues ----
  if (!GUIDES_ONLY) {
    const files = fs.readdirSync(VENUE_DIR).filter((f) => f.endsWith(".json"));
    let vCount = 0;
    for (const file of files) {
      const fp = path.join(VENUE_DIR, file);
      const data = JSON.parse(fs.readFileSync(fp, "utf8"));
      if (!Array.isArray(data)) continue;
      const tasks = [];
      for (const v of data) {
        if (vCount >= LIMIT) break;
        collectVenueTasks(v, tasks);
        vCount++;
      }
      if (tasks.length) {
        console.log(`${file}: ${tasks.length} strings`);
        await runTasks(tasks);
        fs.writeFileSync(fp, JSON.stringify(data, null, 1));
      }
      if (vCount >= LIMIT) break;
    }
    console.log(`Venues processed: ${vCount}`);
  }
  console.log("Done.");
}
main().catch((e) => { console.error(e); process.exit(1); });
