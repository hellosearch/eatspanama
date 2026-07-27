// Wire the Instagram photos that passed BOTH reviews: the sourcing agent's, and
// mine on the contact sheets (public/_audit/ig-sheet-*.jpg).
//
// Credit goes to the venue's own handle and links to their profile - rendered
// client-side, nofollow, new tab (see PhotoCredit), same as every other credit
// on the site.
//
// Usage: node scripts/wire_ig_photos.mjs [--apply]
import fs from "node:fs";
import path from "node:path";

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
const VENUES = path.join(ROOT, "src", "data", "venues");
const APPLY = process.argv.includes("--apply");

/**
 * Rejected on my review of the sheets, with the reason kept so the call is
 * auditable rather than a silent omission.
 */
const REJECT = {
  "gelato-co-casco-viejo": "promotional text overlaid on the image (match-day offer)",
  "corte-argentino": "venue is held for review - reviews describe a butcher shop, not a restaurant",
  longplay: "venue is held for review - reviews describe a record shop with a coffee counter",
  "golden-unicorn": "venue closed permanently in July 2026 (press + its own Instagram) - listing should be retired, not illustrated",
  "parque-infantil-happy-park": "venue is held for review - it is a children's indoor play park",
  // Round 2 (2026-07-21) - rejected on my review of the contact sheets.
  "nacionsushi-san-francisco": "dark neon-abstract shot, does not read as the room or a dish",
  "roadster-s-diner": "three people posed at a table - people as subject, not the place or food",
  "alejandro-s": "centred Don Julio bottle - reads as a liquor advert, not the venue",
  "cevichera-la-bendicion": "row of staff in matching shirts - a staff photo",
  "tacos-la-neta": "night crowd of people dancing - people as subject",
  "el-patio-human-friendly": "dogs fill the frame - animals as subject, not the place or food",
  "peru-chicken-calle-50-frente-al-hotel-riu": "overlaid address + phone banner (promo tile)",
  "plaza-causeway": "overlaid marketing words on the image (Suave / Cremozo)",
  "bar-blue": "Bombay/Martini/Campari bottles as subject - a branded-product shot",
  // Round 3 (2026-07-21) - rejected on my review of the contact sheets.
  "pony-up": "bartender occupies half the frame - person as co-subject",
  "organica-bites-costa-del-este": "overlaid 'at Bites' script on the image (promo graphic)",
  // Round 4 (2026-07-21) - rejected on my review of the contact sheets.
  // Policy settled this round: a chain's one good FOOD photo may repeat across
  // its branch pages (credited to the brand account) - but a location-specific
  // shot (storefront/interior) must not appear on a branch it may not depict.
  "cafe-unido-obarrio": "branded Flash Brew cans as subject - a product promo shot",
  "casa-25": "chocolate-pour frame is blurry",
  "kappers-507": "person posing at the entrance - person as co-subject",
  "umami-bodega": "dark crowd shot during live music - people as subject",
  "panama-criollo-by-asados-gabydana": "overlaid marketing graphic band (TAN RICO COMO ESTE ASADO)",
  "restaurante-y-pizzeria-leonardo": "storefront photo of ONE Leonardo location; cannot verify which - location-specific, not safe on either branch",
  "leonardo-pizza-albrook-2": "same storefront photo - same reasoning as its sibling record",
  // Round 5 (2026-07-22) - rejected on my review of the contact sheets.
  "mendo-coffee-co": "overlaid 'ICED LATTE BLUEBERRIES' text and arrow on the image",
  "leonardo-pizza-costa-del-este": "the Albrook Mall storefront photo on the Costa del Este record - wrong location",
  "naked-lukas-costa-del-este": "person's face beneath the held-up burger - person as co-subject",
  "chilli-republic": "overlaid CHILI / QUESO ingredient labels on the image",
  "hiddens-find-the-flavor": "hand fanning dollar bills over the tray - money gimmick, not the food",
  "stain-coffee-and-art": "overlaid meme caption ('But it's just coffee...') on the storefront",
  "la-tapa-del-coco": "branded beer bottles held up as the visual subject",
  "haffner-terminal-albrook": "overlaid 'Especial' promo text on the image",
  // Round 6 (2026-07-23) - rejected on my review of the contact sheets.
  "chillin-plaza": "pizza close-up is blurry / low resolution",
  "fire-point": "mostly a hedge wall - the dish is not readable in the frame",
  "makea-coffee": "out-of-focus shot - platters not readable",
  "french-bistro-1739": "couple dining as the subject - people, not the place or food",
  "celia-s-restaurante": "overlaid dish-name text (Lonjas de Cerdo) on the image",
  "clayton-perk-cafe": "neon plant wall with the drink barely visible - subject unreadable",
  "pintas-spot": "terrace packed with a watching crowd - people as subject",
  // Round 7 (2026-07-23) - rejected on my review of the contact sheets.
  "restaurante-yee-paitilla": "'PLATO ESPECIAL / CAMARON FOO YOUNG' text bands overlaid on the image",
  "la-cantina-de-villa": "big 'MARRANITA CAMPECHANA' title band overlaid on the image",
  "mangu-vip-discotec-restaurant": "a pool/billiards table - not the dining room or food",
  "golfers-inc-club": "golf driving range with players - not the place or food",
  "fud-lab-via-israel": "meme WhatsApp-chat overlay on the image",
  "el-nacional-by-chef-ayelet": "'POV: You just found the best' meme caption overlaid",
  "padron-vista-hermosa": "a man facing camera fills the frame - person as subject",
  "ciao-hotel-megapolis": "a waiter in the foreground is the subject - person, not the food",
  "shuarma-stop": "ornate frame + logo badge composited onto the image (a graphic, not a photo)",
  "par-de-pintas-urbana": "'By PAR DE PINTAS / URBANA' logo overlay on the image",
  "kfe-break": "full marketing-copy text overlay ('UNA EXPERIENCIA EN CADA NIVEL...')",
  "hotel-covadonga": "a hotel guest bedroom - not a dining room or food",
  // Round 8 (2026-07-23) - rejected on my review of the contact sheets.
  "mariscos-eve-sa": "long table of guests at an event - people as subject",
  "museo-casa-coronel-del-cacao-y-del-chocolate": "crowd at the tasting bar - people as subject",
  "spot-cafe-san-felipe-neri": "a phone held up in front of the latte - phone is the subject",
  "pa-que-henry": "a person eating at the counter fills the frame - person as subject",
  "pipas-y-cocadas-costa-del-este": "a tourism-branded coconut ('PANAMA LIVE FOR MORE') - reads as an ad",
  "panaderia-galipan": "a person on the street carrying a bag - person as subject",
  "jamrock-restaurant-507": "a 'RESTAURANTE JAMROCK' logo badge composited onto the image",
  "restaurante-grila": "big 'THIS IS HOW IT STARTS' meme text overlaid",
  "texas-ranch-bbq": "engagement-bait promo text overlaid ('COMENTA TU FAVORITO')",
  // Round 9 (2026-07-23) - rejected on my review of the contact sheets.
  "yoss-bakery": "'FRESH' marketing text overlaid on the image",
  "farmhouse-san-francisco": "'pollo spiced, siempre' tagline overlaid on the image",
  "brazas": "a man eating fills the frame - person as subject",
  "arepadictos": "'Arepa de Pollo Mechado' text band overlaid on the image",
  "tequenos-prontomasa-san-francisco": "a customer-review screenshot overlaid on the image",
};

const picks = new Map();
for (const [dir, re] of [[BATCHES, /^out-ig-\d+\.json$/], [FIND, /^out-find-\d+\.json$/], ...ROUNDS.map((r) => [r, /^out-(find-\d+|known-ig)\.json$/])]) {
  for (const f of fs.readdirSync(dir).filter((f) => re.test(f))) {
    for (const r of JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))) {
      if (r.url) picks.set(r.slug, r);
    }
  }
}

const files = fs.readdirSync(VENUES).filter((f) => f.endsWith(".json"));
const data = new Map(files.map((f) => [f, JSON.parse(fs.readFileSync(path.join(VENUES, f), "utf8"))]));

let wired = 0;
const skipped = [];

for (const [file, arr] of data) {
  let touched = false;
  for (const v of arr) {
    const pick = picks.get(v.slug);
    if (!pick) continue;
    if (REJECT[v.slug]) {
      skipped.push(`${v.name}: ${REJECT[v.slug]}`);
      continue;
    }
    if (v.status !== "open") {
      skipped.push(`${v.name}: not published (status ${v.status})`);
      continue;
    }
    if (v.photos?.length) continue;
    const staged = path.join(STAGE, `${v.slug}.jpg`);
    if (!fs.existsSync(staged)) {
      skipped.push(`${v.name}: image did not download`);
      continue;
    }
    const handle = (v.social?.instagram ?? "").replace(/\/+$/, "").split("/").pop();
    if (!handle) {
      skipped.push(`${v.name}: no Instagram handle to credit`);
      continue;
    }
    if (APPLY) {
      fs.copyFileSync(staged, path.join(ROOT, "public", "venues", `${v.slug}.jpg`));
      v.photos = [
        {
          url: `/venues/${v.slug}.jpg`,
          alt_en: pick.alt_en ?? `${v.name}, Panama City`,
          alt_es: pick.alt_es ?? `${v.name}, Ciudad de Panamá`,
          credit_en: `Photo: @${handle}`,
          credit_url: v.social.instagram,
        },
      ];
      touched = true;
    }
    wired++;
  }
  if (touched && APPLY) fs.writeFileSync(path.join(VENUES, file), JSON.stringify(arr, null, 1) + "\n");
}

console.log(`${APPLY ? "APPLIED" : "DRY RUN"}: ${wired} Instagram photos wired`);
for (const s of skipped) console.log(`  skipped ${s}`);
