import type { PriceTier } from "@/data/mock";

/** Price tier -> display glyphs. No star ratings exist anywhere - ever. */
export function priceGlyphs(tier: PriceTier): string {
  return "$".repeat(tier);
}

/**
 * Maps a cuisine label to a CuisineGlyph name, so a photoless card can show a
 * food icon that hints at the kind of place (a bullseye told the visitor
 * nothing). Order matters: check the specific patterns before the generic ones.
 */
export function cuisineGlyphName(cuisine: string | undefined): string {
  const c = (cuisine ?? "").toLowerCase();
  if (/sushi|japan|nikkei|ramen|korean|thai|chin|asian|noodle/.test(c)) return "sushi";
  if (/seafood|fish|marisc|ceviche|oyster|shrimp/.test(c)) return "seafood";
  if (/coffee|caf[eé]|brunch|bakery|deli|breakfast|dessert|pastr/.test(c)) return "cafe";
  if (/bar|cocktail|pub|wine|beer|lounge|night/.test(c)) return "bar";
  if (/pizza|italian/.test(c)) return "pizza";
  if (/burger|american|wings/.test(c)) return "burger";
  if (/steak|grill|parrilla|meat|bbq|smokehouse|churrasc/.test(c)) return "steak";
  if (/panam|latin|crioll|venezuel|mexic|peru|caribbean|arepa|empanad|taco/.test(c)) return "local";
  return "food";
}

export function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

/** Dish price: "$10" for whole dollars, "$10.50" otherwise. */
export function formatDishPrice(n: number): string {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
/** "2026-07" -> "Jul 2026" (EN) / "jul 2026" (ES). Passes through anything it can't parse. */
export function formatMonth(ym: string, locale?: string): string {
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  if (!m) return ym;
  const idx = parseInt(m[2], 10) - 1;
  if (idx < 0 || idx >= 12) return ym;
  const names = locale === "es" ? MONTHS_ES : MONTHS;
  return `${names[idx]} ${m[1]}`;
}

/** wa.me deep link for the tap-to-book affordance. */
export function whatsappUrl(phone: string, text?: string): string {
  // 51 venues store a full WhatsApp URL (wa.link/xxxx, wa.me/message/xxxx,
  // api.whatsapp.com/send?phone=...) rather than a bare number. Stripping to
  // digits turned wa.link/qlui2r into wa.me/2 - a dead CTA. If the value is
  // already a link, hand it back as-is; only build wa.me/<digits> from a raw
  // number. (Short links carry their own prefilled message, so no ?text on
  // those.)
  if (/^https?:\/\//i.test(phone.trim())) return phone.trim();
  const digits = phone.replace(/[^\d]/g, "");
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${q}`;
}

export function telUrl(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function mapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * Raw cuisine strings from the dataset can carry long descriptive tails
 * ("Italian - it shares a kitchen with MASA...", "Healthy coastal-inspired
 * cafe (bowls, poke...)"). For chips, titles and hub links we want the short
 * head label: cut at the first parenthesis / comma / dash clause, trim, cap.
 */
export function cleanCuisine(raw: string): string {
  const head = raw.split(/[(,]| - | – /)[0].trim();
  return head.length > 34 ? head.slice(0, 34).trim() : head;
}

/** Primary (first) cuisine, cleaned. Empty string when none. */
export function primaryCuisine(cuisines: string[]): string {
  return cuisines.length ? cleanCuisine(cuisines[0]) : "";
}

/** URL-safe slug from any label (cuisine hub links, etc.). */
/**
 * The name to PRINT, as opposed to the name we collected.
 *
 * Google Maps names carry branch labels and keyword stuffing that read as spam
 * in running copy: "Sisu Coffee Studio [Mallol Design House]", "Alura
 * Restaurant · Brunch · Specialty Coffee", "Subway | Albrook Mall". 112 of the
 * 1,327 open venues have one. The branch label still matters for telling two
 * locations apart, so it is dropped for display only - `name` stays intact in
 * the data and the profile page still shows the address.
 */
export function displayName(raw: string): string {
  let s = raw
    .replace(/\s*[[(][^\])]*[\])]\s*$/g, "") // trailing [branch] or (branch)
    .split(/\s+[|•·–—/]\s+/)[0] // branch/keyword tail after a separator
    .split(/\s+-\s+/)[0] // "Al Alma Café Restaurante - Casa Lefevre"
    .replace(/,\s*(specialty coffee|coffee|brunch|cafe|café|restaurant|restaurante|bar|bakery|pizzeria|pizzería)\b.*$/i, "")
    .replace(/,\s*(panam[aá]|ciudad de panam[aá])\s*$/i, "") // ", Panamá" tail
    .replace(/\s{2,}/g, " ")
    .trim();
  // Never hand back something shorter than a name: if the rules ate too much,
  // the original was not the shape they assume.
  if (s.length < 3) s = raw.trim();
  return s;
}

/**
 * "Updated July 2026" for a guide, derived from its ISO date.
 *
 * The old fixture carried a frozen `updated_label_en` string beside the ISO
 * date, so the two could disagree and the label could outlive the content.
 * One source, formatted at render.
 */
export function guideUpdated(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  return `Updated ${d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}`;
}

/**
 * The freshness month for a page, taken from the records actually shown on it.
 *
 * Replaces a hardcoded "Updated Jul 2026" message string that would have kept
 * saying July 2026 indefinitely.
 */
export function latestChecked(items: { verified_at?: string }[]): string {
  return (
    items
      .map((v) => v.verified_at)
      .filter((v): v is string => Boolean(v))
      .sort()
      .at(-1) ?? ""
  );
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
