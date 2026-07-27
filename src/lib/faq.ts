/**
 * Data-generated FAQs (locked rule: FAQ blocks are generated per page from
 * THAT page's venue data - prices, reservation norms - never hand-written
 * per page). Computed here from the fixtures; the same functions run
 * unchanged against Supabase rows later.
 */
import type { Neighborhood, Venue } from "@/data/mock";
import { cleanCuisine, formatUsd, priceGlyphs } from "@/lib/format";
import { cuisineLabelEs } from "@/lib/hub-copy";

/** Common dietary enum labels in es-419 (the tags are an EN enum; here we only
 *  translate the handful that surface in the venue FAQ answer). */
const DIETARY_ES: Record<string, string> = {
  vegetarian: "vegetarianas",
  vegan: "veganas",
  "gluten-free": "sin gluten",
  "dairy-free": "sin lácteos",
  halal: "halal",
  kosher: "kosher",
  "nut-free": "sin frutos secos",
  organic: "orgánicas",
};
const dietaryEs = (d: string) => DIETARY_ES[d.toLowerCase()] ?? d;

export interface Faq {
  q: string;
  a: string;
  /** Optional scannable bullet list rendered under the intro line. */
  bullets?: string[];
  /** Optional closing line after the bullets. */
  aEnd?: string;
}

function dishPrices(venues: Venue[]): number[] {
  return venues
    .flatMap((v) => (v.dishes ?? []).map((d) => d.price))
    .filter((p): p is number => p != null)
    .sort((a, b) => a - b);
}

function tierRange(venues: Venue[]): string {
  const tiers = venues.map((v) => v.price_tier).filter((t) => t > 0); // 0 = unknown, exclude
  if (!tiers.length) return "";
  const min = Math.min(...tiers);
  const max = Math.max(...tiers);
  return min === max ? priceGlyphs(min as 1) : `${priceGlyphs(min as 1)} to ${priceGlyphs(max as 1)}`;
}

export function neighborhoodFaqs(
  hood: Neighborhood,
  venues: Venue[],
  locale: string
): Faq[] {
  if (!venues.length) return [];
  const ranked = venues
    .filter((v) => v.editors_pick_rank)
    .sort((a, b) => (a.editors_pick_rank ?? 9) - (b.editors_pick_rank ?? 9));
  // Fall back to the listing's leading venues when a hood has no picks yet.
  const picks = ranked.length ? ranked : venues;
  const prices = dishPrices(venues);
  const hasPrices = prices.length > 0;
  const low = prices[0];
  const high = prices[prices.length - 1];
  const waCount = venues.filter((v) => v.phones.whatsapp).length;
  const openLate = venues.filter((v) => v.open_until && /1[01]:|1:00 AM/.test(v.open_until));

  if (locale === "es") {
    return [
      {
        q: `¿Cuál es el mejor restaurante de ${hood.name}?`,
        a: `No hay uno solo - depende de la noche. Entre los lugares conocidos de ${hood.name} están ${picks
          .slice(0, 3)
          .map((v) => v.name)
          .join(", ")}. Cada ficha se arma con información pública y se actualiza cada mes.`,
      },
      {
        q: `¿Qué tan caro es comer en ${hood.name}?`,
        a: hasPrices
          ? `${tierRange(venues) ? `Los lugares de esta lista van de ${tierRange(venues)}. ` : ""}Donde el menú es público, los platos fuertes suelen costar entre ${formatUsd(low)} y ${formatUsd(high)}.`
          : tierRange(venues)
            ? `Los lugares de esta lista van de ${tierRange(venues)}, desde barras informales hasta salones de alta cocina.`
            : `${hood.name} abarca desde barras informales hasta salones de alta cocina; los precios aparecen en cada ficha cuando son públicos.`,
      },
      {
        q: `¿Hace falta reservar en ${hood.name}?`,
        a: `Viernes y sábado por la noche, sí: los salones son pequeños y se llenan temprano. ${waCount} de los ${venues.length} lugares listados reservan por WhatsApp - el botón verde de cada tarjeta abre el chat.`,
      },
      {
        q: `¿Dónde comer tarde en ${hood.name}?`,
        a: openLate.length
          ? `${openLate
              .slice(0, 3)
              .map((v) => `${v.name} (hasta ${v.open_until})`)
              .join(", ")} siguen sirviendo cuando el resto del barrio cierra. Horarios según fuentes públicas, revisados ${venues[0]?.verified_at ?? "este mes"}.`
          : `La mayoría de las cocinas del barrio cierra entre 9 y 11 PM. Los horarios aparecen en cada ficha.`,
      },
    ];
  }

  const tr = tierRange(venues);
  return [
    {
      q: `What is the best restaurant in ${hood.name}?`,
      a: `There is no single best - it depends on the night. Well-known ${hood.name} spots include ${picks
        .slice(0, 3)
        .map((v) => v.name)
        .join(", ")}. Every listing here is built from public information and updated monthly.`,
    },
    {
      q: `How expensive is eating in ${hood.name}?`,
      a: hasPrices
        ? `${tr ? `Places on this list run ${tr}. ` : ""}Where menus are published, mains typically fall between ${formatUsd(low)} and ${formatUsd(high)}.`
        : tr
          ? `Places on this list run ${tr}, from casual counters to higher-end dining rooms.`
          : `${hood.name} spans casual counters to higher-end dining rooms; menu prices are shown on each listing where published.`,
    },
    {
      q: `Do I need reservations in ${hood.name}?`,
      a: `Friday and Saturday nights, yes - most rooms are small and fill early. ${waCount} of the ${venues.length} listed spots take bookings over WhatsApp; the green button on each card starts the chat.`,
    },
    {
      q: `Where can I eat late in ${hood.name}?`,
      a: openLate.length
        ? `${openLate
            .slice(0, 3)
            .map((v) => `${v.name} (until ${v.open_until})`)
            .join(", ")} keep serving after most kitchens close. Hours from public sources, last checked ${venues[0]?.verified_at ?? "this month"}.`
        : `Most kitchens in the neighborhood close between 9 and 11 PM. Hours are shown on each listing.`,
    },
  ];
}


/** Honest, plain hours summary from the venue's own hours rows (EN or es-419). */
function hoursSummary(venue: Venue, locale: string): string | null {
  const hours = venue.hours ?? [];
  if (!hours.length) return null;
  const isClosed = (h: { open?: string }) => !h.open || h.open === "Closed";
  const open = hours.filter((h) => !isClosed(h));
  if (!open.length) return null;
  const es = locale === "es";
  const closed = hours.filter(isClosed).map((h) => (es ? h.day_es : h.day_en));
  const rep = open[0];
  const is24 = /24\s*hours/i.test(rep.open);
  const hoursLine = is24
    ? es
      ? "Algunos días abre 24 horas - los horarios día por día están en esta página."
      : "Some days it runs 24 hours - the day-by-day hours are listed on this page."
    : rep.close
      ? es
        ? `La mayoría de los días abre alrededor de las ${rep.open.trim()} y cierra alrededor de las ${rep.close.trim()}.`
        : `Most days it opens around ${rep.open.trim()} and closes around ${rep.close.trim()}.`
      : es
        ? "Los horarios están listados día por día en esta página."
        : "Opening hours are listed day-by-day on this page.";
  if (!closed.length) {
    return es
      ? `${venue.name} abre los siete días de la semana. ${hoursLine}`
      : `${venue.name} serves seven days a week. ${hoursLine}`;
  }
  return es
    ? `${venue.name} abre casi toda la semana y cierra los ${closed.join(", ")}. ${hoursLine}`
    : `${venue.name} is open most of the week and closed ${closed.join(", ")}. ${hoursLine}`;
}

/**
 * Profile-page FAQs, computed from the venue's own held data - 5-8 honest Qs,
 * each omitted when its source data is absent. No visit claims, no ratings:
 * every answer restates facts already on the page or in the dataset.
 */
export function venueFaqs(venue: Venue, hoodName: string, locale: string = "en"): Faq[] {
  const es = locale === "es";
  const faqs: Faq[] = [];
  const cuisines = (venue.cuisine_en ?? [])
    .map((c) => (es ? cuisineLabelEs(cleanCuisine(c)) : cleanCuisine(c)))
    .filter(Boolean);
  const dishNames = (venue.dishes ?? []).map((d) => d.name).filter(Boolean);
  const prices = (venue.dishes ?? [])
    .map((d) => d.price)
    .filter((p): p is number => p != null)
    .sort((a, b) => a - b);

  // What kind of food (cuisine + a few dish names)
  if (cuisines.length || dishNames.length) {
    const cuisinePart = cuisines.length
      ? es
        ? `${venue.name} sirve ${cuisines.join(", ")}.`
        : `${venue.name} serves ${cuisines.join(", ")}.`
      : es
        ? `El menú de ${venue.name}`
        : `${venue.name}'s menu`;
    const dishPart = dishNames.length
      ? es
        ? ` El menú incluye ${dishNames.slice(0, 3).join(", ")}.`
        : ` The menu includes ${dishNames.slice(0, 3).join(", ")}.`
      : "";
    faqs.push({
      q: es ? `¿Qué tipo de comida sirve ${venue.name}?` : `What kind of food does ${venue.name} serve?`,
      a: `${cuisinePart}${dishPart}`.trim(),
    });
  }

  // What's good (synthesized public sentiment, explicitly no ratings). On ES the
  // whats_good bullet arrives already translated (localizeVenue swapped the _es).
  const wg = venue.whats_good_en?.[0]?.trim();
  if (wg) {
    const clean = wg.replace(/\s*\.\s*$/, "");
    faqs.push({
      q: es ? `¿Qué es lo bueno de ${venue.name}?` : `What's good at ${venue.name}?`,
      a: es
        ? `${clean}. Eso refleja lo que la gente dice de forma consistente en internet - EatsPanama no publica calificaciones con estrellas.`
        : `${clean}. That reflects what people consistently say online - EatsPanama does not post star ratings.`,
    });
  }

  // Cost (only when the dataset holds dish prices)
  if (prices.length) {
    const low = Math.min(...prices);
    const high = Math.max(...prices);
    const tier = venue.price_tier > 0 ? (es ? ` (${priceGlyphs(venue.price_tier)} en general)` : ` (${priceGlyphs(venue.price_tier)} overall)`) : "";
    // A single price (or all dishes the same) must not read "run $6.95 to $6.95".
    const span = es
      ? low === high
        ? `los platos rondan los ${formatUsd(low)}`
        : `los platos van de ${formatUsd(low)} a ${formatUsd(high)}`
      : low === high
        ? `dishes are around ${formatUsd(low)}`
        : `dishes run ${formatUsd(low)} to ${formatUsd(high)}`;
    faqs.push({
      q: es ? `¿Cuánto cuesta comer en ${venue.name}?` : `How much does a meal at ${venue.name} cost?`,
      a: es ? `Según su menú publicado, ${span}${tier}.` : `Based on its published menu, ${span}${tier}.`,
    });
  }

  // Hours (name the days / closed day)
  const hoursLine = hoursSummary(venue, locale);
  if (hoursLine) {
    faqs.push({ q: es ? `¿Cuándo abre ${venue.name}?` : `When is ${venue.name} open?`, a: hoursLine });
  }

  // Dietary (only when the dataset holds dietary options)
  const dietary = venue.dietary_en ?? [];
  if (dietary.length) {
    faqs.push({
      q: es
        ? `¿${venue.name} tiene opciones vegetarianas, veganas o sin gluten?`
        : `Does ${venue.name} have vegetarian, vegan or gluten-free options?`,
      a: es
        ? `La ficha indica opciones ${dietary.map(dietaryEs).join(", ")}. Las opciones pueden cambiar, así que confírmalo con el restaurante cuando vayas.`
        : `The listing notes ${dietary.join(", ")}. Options can change, so confirm with the restaurant when you go.`,
    });
  }

  // Reservations (only when a WhatsApp contact is held)
  if (venue.phones.whatsapp) {
    faqs.push({
      q: es ? `¿${venue.name} acepta reservas?` : `Does ${venue.name} take reservations?`,
      a: es
        ? `Tiene un contacto de WhatsApp - el botón verde de esta página abre el chat directamente.`
        : `It lists a WhatsApp contact - the green button on this page opens the chat directly.`,
    });
  }

  // Where (always available). address_note is the _es twin on ES (localizeVenue).
  const cityLabel = es ? "Ciudad de Panamá" : "Panama City";
  faqs.push({
    q: es ? `¿Dónde está ${venue.name}?` : `Where is ${venue.name}?`,
    a: `${venue.address}, ${hoodName}, ${cityLabel}. ${venue.address_note_en ?? ""}`.trim(),
  });

  return faqs;
}
