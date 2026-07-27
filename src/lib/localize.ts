import type { Venue, Guide } from "@/data/mock";

/**
 * Editorial fields with API-generated es-419 twins (see scripts/localize-es.mjs).
 * Enum/filter fields (cuisine, tags, dietary), owner quotes, and dish proper
 * names are deliberately NOT localized.
 */
const FLAT = [
  "about", "tagline", "story", "typical_spend", "dataset_comparison", "best_time",
  "notable_mention", "walk_note", "address_note", "pick_verdict", "special_hours_note",
  "highlights", "whats_good", "attributes",
] as const;

/**
 * Return a venue whose editorial fields read as native Spanish on the ES locale:
 * when a `{field}_es` twin exists it is swapped into the `{field}_en` slot the
 * components already read, so no component has to change. On EN (or when a twin
 * is missing) the original is returned untouched.
 */
/**
 * The `best_time` object's busiest/easy/sweet notes are drawn from a fixed
 * vocabulary of ~22 canned phrases (3,600+ uses), so they are translated with a
 * lookup map rather than per-venue API calls. Any unmapped phrase falls through
 * to English (none currently).
 */
const BEST_TIME_NOTE_ES: Record<string, string> = {
  "Calm, easy to get a table": "Tranquilo, fácil conseguir mesa",
  "Dinner buzz without the wait": "Ambiente de cena sin la espera",
  "Early dinner before it fills": "Cena temprana antes de que se llene",
  "Easy midday seat": "Fácil conseguir mesa al mediodía",
  "Fresh and unhurried before the brunch wave": "Fresco y sin prisa antes de la ola del brunch",
  "Full service, calmer pace": "Servicio completo, a un ritmo más tranquilo",
  "Golden-hour views, still an easy table": "Vistas al atardecer y todavía fácil conseguir mesa",
  "Inside Edificio The Gray on Calle 50.": "Dentro del Edificio The Gray, en la Calle 50.",
  "Late-evening weekend buzz": "Ambiente de fin de semana a última hora",
  "Lively but before the late rush": "Animado pero antes del ajetreo de la noche",
  "Lunch peak freshness, ahead of the rush": "Frescura del almuerzo en su punto, antes del ajetreo",
  "Prime weekend dinner service": "El mejor servicio de cena del fin de semana",
  "Quick, easy seat": "Rápido y fácil de sentarse",
  "Quieter room, easier reservation": "Salón más tranquilo, reserva más fácil",
  "Quieter, easy seat at the bar": "Más tranquilo, fácil sentarse en la barra",
  "Relaxed, easy to seat": "Relajado, fácil conseguir mesa",
  "Sunset and weekend crowd fills the terrace": "El atardecer y la gente del fin de semana llenan la terraza",
  "Walk-ins usually fine before 8 PM": "Sin reserva suele estar bien antes de las 8 PM",
  "Weekend brunch is the peak": "El brunch de fin de semana es el momento pico",
  "Weekend dinner is busiest": "Las cenas de fin de semana son las más concurridas",
  "Weekend lunch is busiest": "Los almuerzos de fin de semana son los más concurridos",
  "Weekend nights draw the crowd": "Las noches de fin de semana atraen a la gente",
};

export function localizeVenue(v: Venue, locale: string): Venue {
  if (locale !== "es") return v;
  const raw = v as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = { ...raw };
  for (const base of FLAT) {
    const es = raw[`${base}_es`];
    if (es != null && !(Array.isArray(es) && es.length === 0)) out[`${base}_en`] = es;
  }
  const room = raw.room_en as { caption_en: string; caption_es?: string }[] | undefined;
  if (Array.isArray(room)) out.room_en = room.map((r) => (r.caption_es ? { ...r, caption_en: r.caption_es } : r));
  const dishes = raw.dishes as { description_en?: string; description_es?: string }[] | undefined;
  if (Array.isArray(dishes))
    out.dishes = dishes.map((d) => (d.description_es ? { ...d, description_en: d.description_es } : d));
  const bt = raw.best_time as Record<string, unknown> | undefined;
  if (bt && typeof bt === "object" && !Array.isArray(bt)) {
    const nbt: Record<string, unknown> = { ...bt };
    for (const k of ["busiest_note_en", "easy_note_en", "sweet_note_en"]) {
      const val = bt[k];
      if (typeof val === "string" && BEST_TIME_NOTE_ES[val]) nbt[k] = BEST_TIME_NOTE_ES[val];
    }
    out.best_time = nbt;
  }
  if (raw.signature_es) out.signature_en = raw.signature_es;
  return out as unknown as Venue;
}

/**
 * Same swap pattern for a guide article: on ES, move any `{field}_es` twin into
 * the `{field}_en` slot the guide page already reads, including the array fields
 * (criteria, known_for) and the nested entries[] + faqs_en[]. Untranslated
 * fields fall through to English, so a partially-translated guide never breaks.
 */
const GUIDE_FLAT = ["title", "description", "intro"];
const GUIDE_LIST = ["criteria"];
const ENTRY_FLAT = ["summary", "best_time"];
const ENTRY_LIST = ["known_for"];

/** Swap `{base}_es` twins into the `{base}_en` slots, in place on a cast copy. */
function swapEs(obj: Record<string, unknown>, flat: string[], list: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = { ...obj };
  for (const base of flat) {
    const es = obj[`${base}_es`];
    if (typeof es === "string" && es.trim()) out[`${base}_en`] = es;
  }
  for (const base of list) {
    const es = obj[`${base}_es`];
    if (Array.isArray(es) && es.length) out[`${base}_en`] = es;
  }
  return out;
}

export function localizeGuide(g: Guide, locale: string): Guide {
  if (locale !== "es") return g;
  const out = swapEs(g as unknown as Record<string, unknown>, GUIDE_FLAT, GUIDE_LIST);
  const entries = out.entries as Record<string, unknown>[] | undefined;
  if (Array.isArray(entries)) out.entries = entries.map((e) => swapEs(e, ENTRY_FLAT, ENTRY_LIST));
  const faqs = out.faqs_en as { q: string; a: string; q_es?: string; a_es?: string }[] | undefined;
  if (Array.isArray(faqs)) {
    out.faqs_en = faqs.map((f) => ({
      ...f,
      q: f.q_es?.trim() ? f.q_es : f.q,
      a: f.a_es?.trim() ? f.a_es : f.a,
    }));
  }
  return out as unknown as Guide;
}
