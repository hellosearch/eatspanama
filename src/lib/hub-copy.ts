/**
 * Shared copy helpers for the cuisine / good-for hub landing pages. Everything
 * here is DATA-DRIVEN and honest (computed from the venues a hub actually holds)
 * so the H1s carry the real keyword + count, and the "at a glance" panel + FAQ
 * add unique, indexable copy without fabricating anything.
 *
 * English is the fully-optimised path (these pages target English search
 * queries first); the ES equivalents keep their existing strings until the
 * deferred Spanish editorial pass, so nothing regresses.
 */
import type { Venue } from "@/data/mock";
import type { FacetKind } from "@/lib/goodfor";
import { priceGlyphs } from "@/lib/format";

/** Title-case a short label ("date night" -> "Date Night"). */
function tc(s: string): string {
  return s.replace(/\b\w/g, (m) => m.toUpperCase());
}

/**
 * Plural place-noun for a cuisine, so H1s read as real search phrases:
 * "Spanish Restaurants", "Cafés", "Bars", "Burger Restaurants".
 */
const CUISINE_NOUN: Record<string, string> = {
  bakery: "Bakeries",
  bar: "Bars",
  cafe: "Cafés",
  "café": "Cafés",
  deli: "Delis",
  steakhouse: "Steakhouses",
  burgers: "Burger Restaurants",
  takeaway: "Takeaway Spots",
  healthy: "Healthy Restaurants",
};
export function cuisineNoun(cuisine: string): string {
  return CUISINE_NOUN[cuisine.toLowerCase()] ?? `${cuisine} Restaurants`;
}

/**
 * Native es-419 plural noun-phrase for a cuisine, so the ES H1/meta read as a
 * real Spanish search phrase ("48 restaurantes italianos en Ciudad de Panamá"),
 * NOT the half-English "Italian en Ciudad de Panamá". Keyed on the clean EN
 * label (lowercased) - the same key as CUISINE_NOUN. Cuisines with a dedicated
 * Spanish place-noun (pizzerías, panaderías, cafés) get it; the rest compose as
 * "restaurantes {adjetivo}" with the adjective in masculine plural to agree with
 * "restaurantes". Unmapped cuisines fall back to the honest, grammatical
 * "restaurantes de {cuisine}" so nothing ever renders half-translated.
 */
const CUISINE_NOUN_ES: Record<string, string> = {
  // dedicated place-nouns
  bakery: "panaderías",
  bar: "bares",
  cafe: "cafés",
  "café": "cafés",
  deli: "delis",
  pizza: "pizzerías",
  burgers: "hamburgueserías",
  seafood: "marisquerías",
  steakhouse: "asadores",
  // "restaurantes {adjetivo}" - adjective in masculine plural
  italian: "restaurantes italianos",
  japanese: "restaurantes japoneses",
  chinese: "restaurantes chinos",
  peruvian: "restaurantes peruanos",
  colombian: "restaurantes colombianos",
  spanish: "restaurantes españoles",
  american: "restaurantes americanos",
  mexican: "restaurantes mexicanos",
  french: "restaurantes franceses",
  caribbean: "restaurantes caribeños",
  venezuelan: "restaurantes venezolanos",
  thai: "restaurantes tailandeses",
  mediterranean: "restaurantes mediterráneos",
  international: "restaurantes internacionales",
  panamanian: "restaurantes panameños",
  greek: "restaurantes griegos",
  vegan: "restaurantes veganos",
  vegetarian: "restaurantes vegetarianos",
  healthy: "restaurantes saludables",
  nikkei: "restaurantes nikkei",
  indian: "restaurantes indios",
  korean: "restaurantes coreanos",
  argentine: "restaurantes argentinos",
  argentinian: "restaurantes argentinos",
  brazilian: "restaurantes brasileños",
  fusion: "restaurantes de cocina fusión",
  vietnamese: "restaurantes vietnamitas",
  lebanese: "restaurantes libaneses",
  turkish: "restaurantes turcos",
  german: "restaurantes alemanes",
  asian: "restaurantes asiáticos",
};
export function cuisineNounEs(cuisine: string): string {
  const key = cuisine.toLowerCase();
  return CUISINE_NOUN_ES[key] ?? `restaurantes de ${cuisine.toLowerCase()}`;
}

/** Capitalize the first letter (for a Spanish phrase leading a heading/title). */
function ucFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export { ucFirst };

/**
 * Singular es-419 category label for one cuisine, for venue <title>/<meta> lines
 * ("... - Italiana en Albrook"). National cuisines take the feminine singular
 * (agreeing with the implied "cocina/comida"); place-type cuisines take their
 * Spanish noun. Unmapped labels fall back to the original so nothing renders
 * half-broken. Keyed on the clean EN label, lowercased.
 */
const CUISINE_LABEL_ES: Record<string, string> = {
  italian: "Italiana", japanese: "Japonesa", chinese: "China", peruvian: "Peruana",
  colombian: "Colombiana", spanish: "Española", american: "Americana", mexican: "Mexicana",
  french: "Francesa", caribbean: "Caribeña", venezuelan: "Venezolana", thai: "Tailandesa",
  mediterranean: "Mediterránea", international: "Internacional", panamanian: "Panameña",
  greek: "Griega", vegan: "Vegana", vegetarian: "Vegetariana", healthy: "Saludable",
  nikkei: "Nikkei", indian: "India", korean: "Coreana", argentine: "Argentina",
  argentinian: "Argentina", brazilian: "Brasileña", fusion: "Fusión", vietnamese: "Vietnamita",
  lebanese: "Libanesa", turkish: "Turca", german: "Alemana", asian: "Asiática",
  // place-type cuisines -> Spanish noun
  bakery: "Panadería", bar: "Bar", cafe: "Café", "café": "Café", deli: "Deli",
  pizza: "Pizza", burgers: "Hamburguesas", seafood: "Mariscos", steakhouse: "Parrilla",
};
export function cuisineLabelEs(cuisine: string): string {
  return CUISINE_LABEL_ES[cuisine.toLowerCase()] ?? cuisine;
}

/**
 * Heading for a good-for facet. Occasion/drink/dietary facets get a real noun
 * phrase that composes with a count ("12 Cocktail Bars"); dish facets use a
 * "Where to Eat X" phrasing that matches search intent and reads better without
 * a leading count.
 */
const GOODFOR_HEADING: Record<string, string> = {
  rooftop: "Rooftop Bars",
  brunch: "Brunch Spots",
  "date-night": "Date-Night Restaurants",
  "with-a-view": "Restaurants with a View",
  outdoor: "Outdoor Dining Spots",
  "family-friendly": "Family-Friendly Restaurants",
  "cheap-eats": "Cheap Eats",
  groups: "Restaurants for Groups",
  "live-music": "Live-Music Venues",
  "dog-friendly": "Dog-Friendly Restaurants",
  "work-friendly": "Cafés to Work From",
  vegetarian: "Vegetarian & Vegan Spots",
  "gluten-free": "Gluten-Free Restaurants",
  cocktails: "Cocktail Bars",
  "specialty-coffee": "Specialty Coffee Shops",
  "craft-beer": "Craft Beer Bars",
  "wine-bar": "Wine Bars",
};
export function goodForHeading(
  slug: string,
  kind: FacetKind,
  label: string
): { phrase: string; useCount: boolean } {
  if (kind === "dish") return { phrase: `Where to Eat ${tc(label)}`, useCount: false };
  return { phrase: GOODFOR_HEADING[slug] ?? `${tc(label)} Restaurants`, useCount: true };
}

/** Facts computed from a hub's venues, for the "at a glance" panel + copy + FAQ. */
export interface HubFacts {
  count: number;
  priceRange: string | null; // "$$–$$$" or null when unknown
  topHoods: { slug: string; name: string; count: number }[];
}

export function hubFacts(
  venues: Venue[],
  hoodName: (slug: string) => string,
  topN = 3
): HubFacts {
  const tiers = venues.map((v) => Number(v.price_tier) || 0).filter((t) => t > 0);
  const g = (t: number) => priceGlyphs(t as Parameters<typeof priceGlyphs>[0]);
  const priceRange =
    tiers.length > 0
      ? (() => {
          const lo = Math.min(...tiers);
          const hi = Math.max(...tiers);
          return lo === hi ? g(lo) : `${g(lo)}–${g(hi)}`;
        })()
      : null;

  const byHood = new Map<string, number>();
  for (const v of venues) byHood.set(v.neighborhood_slug, (byHood.get(v.neighborhood_slug) ?? 0) + 1);
  const topHoods = [...byHood.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, topN)
    .map(([slug, count]) => ({ slug, name: hoodName(slug), count }));

  return { count: venues.length, priceRange, topHoods };
}

/**
 * Data-driven FAQ (EN) for a hub. Formulaic + true, so it is safe to render and
 * emit as FAQPage schema. `subject` is the noun phrase ("Spanish Restaurants" /
 * "Rooftop Bars" / "Ceviche spots"), `city` the city name.
 */
/**
 * Curated, fact-checked local knowledge per facet/cuisine (keyed by slug). These
 * are the type-specific, locally-relevant Q&A - "what's a Panamanian cocktail",
 * "what is sancocho" - that carry real search intent and NLP keywords. Every
 * answer is verified against public sources (web research 2026-07), never
 * guessed, to hold the site's "we don't make things up" line. Facets without an
 * entry simply fall back to the data-driven questions.
 */
const FACET_KNOWLEDGE: Record<string, { q: string; a: (city: string) => string }[]> = {
  cocktails: [
    {
      q: "What are typical Panamanian cocktails?",
      a: () =>
        "Most start with Seco Herrerano, Panama's national spirit - a light, sugarcane-based rum. The classics are the Chichita Panama (seco with pineapple and grapefruit juice) and seco con vaca (seco with milk); chicha fuerte, a fermented-corn drink, shows up too. Several bars here now build modern craft cocktails around infused seco.",
    },
  ],
  ceviche: [
    {
      q: "What is Panamanian ceviche made of?",
      a: () =>
        "Panama-style ceviche is corvina (sea bass) cured in lime or sour-orange juice with onion, cilantro or culantro and chopped peppers - often with a little aji chombo for heat. The classic spot is the Mercado de Mariscos by Casco Viejo, where it's sold fresh by the cup, but plenty of restaurants on this list serve their own.",
    },
  ],
  "specialty-coffee": [
    {
      q: "Is Panama known for coffee?",
      a: () =>
        "Very - Panama's Boquete highlands grow Geisha, widely considered the world's finest and most expensive coffee, prized for its floral, citrus (bergamot) cup. Many specialty rooms in the city pour Panamanian Geisha as filter or pour-over alongside espresso.",
    },
  ],
  cafe: [
    {
      q: "Is Panama known for coffee?",
      a: () =>
        "Very - Panama's Boquete highlands grow Geisha, widely regarded as the world's finest coffee, with a floral, citrusy cup. A number of cafes in the city pour Panamanian Geisha as pour-over next to the usual espresso drinks.",
    },
  ],
  sancocho: [
    {
      q: "What is sancocho?",
      a: () =>
        "Sancocho de gallina is Panama's national dish - a hearty hen soup with name and yuca (root vegetables), corn and culantro, the herb that gives it its signature flavour. It's mild rather than spicy, usually served with a side of white rice, and locals treat it as comfort food.",
    },
  ],
  patacones: [
    {
      q: "What are patacones?",
      a: () =>
        "Patacones are green plantains sliced, fried, smashed flat, then fried again until golden - a savoury staple served alongside almost everything, from fried fish to breakfast platters, with just a pinch of salt.",
    },
  ],
  seafood: [
    {
      q: "What seafood is Panama known for?",
      a: () =>
        "Corvina (sea bass) is the star, from both Pacific and Caribbean waters, served as ceviche and as pescado frito (whole fried fish). Panama City's Mercado de Mariscos is the dock-to-plate heart of it; langostinos and octopus are common too.",
    },
  ],
  panamanian: [
    {
      q: "What are typical Panamanian dishes?",
      a: () =>
        "Everyday Panamanian food centres on sancocho de gallina (the national dish, a hen-and-root-vegetable soup), patacones (twice-fried plantains), ceviche de corvina, arroz con pollo, and fried hojaldres or tortillas at breakfast - mild, hearty and root-vegetable heavy.",
    },
  ],
  nikkei: [
    {
      q: "What is Nikkei cuisine, and why is it popular in Panama City?",
      a: () =>
        "Nikkei is Japanese-Peruvian fusion - sushi and sashimi technique crossed with Peruvian flavours like aji amarillo and leche de tigre. It has become one of the city's signature fine-dining styles, especially around Casco Viejo, with tiraditos, causas and ceviche served alongside sushi and robata-grilled plates.",
    },
  ],
  peruvian: [
    {
      q: "What Peruvian dishes are popular in Panama?",
      a: () =>
        "Peruvian food is a Panama City favourite - look for ceviche, lomo saltado (stir-fried beef), causa (chilled potato terrine) and aji de gallina. The Peruvian-Japanese crossover, Nikkei, is big here too, so many Peruvian rooms also lean into sushi-grade fish.",
    },
  ],
  venezuelan: [
    {
      q: "Why is Venezuelan food so common in Panama City?",
      a: () =>
        "Large-scale Venezuelan migration over the past decade made arepas, empanadas venezolanas, tequenos and cachapas everyday food here - from arepera counters to breakfast spots. Grilled corn arepas split and stuffed, and cheese-filled tequenos, are the ones you'll see most.",
    },
  ],
  chinese: [
    {
      q: "Why is Chinese food such a big deal in Panama?",
      a: () =>
        "Chinese immigration dates to the 1850s railroad and canal era, and Panama has one of Central America's largest Chinese communities. Arroz frito (fried rice) and chow mein were adapted with local ingredients and are now everyday food - many Panamanians grow up on them, and the dim sum here is genuinely good.",
    },
  ],
  arepas: [
    {
      q: "What are arepas?",
      a: () =>
        "Arepas are grilled or griddled corn cakes, split and stuffed with fillings like shredded beef, cheese or black beans. A Venezuelan and Colombian staple, they became an everyday breakfast and street food across Panama City with Venezuelan migration.",
    },
  ],
  empanadas: [
    {
      q: "What kinds of empanadas will I find in Panama?",
      a: () =>
        "Two main styles: Panamanian empanadas (fried corn dough, usually filled with seasoned beef or chicken) and empanadas venezolanas, which Venezuelan migration made common city-wide. Either way they're a cheap, everywhere breakfast and snack.",
    },
  ],
  "craft-beer": [
    {
      q: "Does Panama have a craft beer scene?",
      a: () =>
        "Yes - it took off with La Rana Dorada, the Casco Viejo pioneer named after Panama's golden frog, and there are now twenty-plus local microbreweries. Expect Belgian-style blondes, IPAs and seasonals brewed with local passion fruit, coffee or cacao.",
    },
  ],
};

export function hubFaqs(
  subject: string,
  city: string,
  facts: HubFacts,
  topic?: string
): { q: string; a: string }[] {
  // Curated, locally-relevant questions FIRST (what a Panamanian cocktail is,
  // what sancocho is) where we have verified knowledge for this facet - these
  // carry the real search intent + NLP keywords; then the data-backed ones (how
  // many, where, price, trust). Capped at 6 to fill the 2-col grid without
  // spamming. Subject kept as passed so proper adjectives stay capitalised.
  const curated = (topic ? FACET_KNOWLEDGE[topic] : undefined)?.map((k) => ({ q: k.q, a: k.a(city) })) ?? [];
  const faqs: { q: string; a: string }[] = [];
  faqs.push({
    q: `How many ${subject} are there in ${city}?`,
    a: `We currently track ${facts.count} ${subject} across ${city}, each pinned on the map and filterable by price, neighborhood and features.`,
  });
  if (facts.topHoods.length > 0) {
    const list = facts.topHoods.map((h) => `${h.name} (${h.count})`).join(", ");
    faqs.push({
      q: `Which neighborhoods have the most ${subject} in ${city}?`,
      a: `The highest concentration right now is in ${list}. Filter the map by neighborhood to see each area on its own.`,
    });
  }
  if (facts.priceRange) {
    faqs.push({
      q: `What is the price range for ${subject} in ${city}?`,
      a: `Across the ${facts.count} ${subject} we track, prices span ${facts.priceRange} - from budget spots to higher-end. You can narrow the list to a single price band on the map.`,
    });
  }
  faqs.push({
    q: `How does EatsPanama choose which ${subject} to include?`,
    a: `Listings are compiled from public sources and owner submissions, then ordered on merit. Nothing is added or moved up for payment.`,
  });
  faqs.push({
    q: `Do ${subject} pay to appear or rank on EatsPanama?`,
    a: `No - placement is never sold. Sponsored content, when it exists, is clearly labelled and kept out of the main list.`,
  });
  faqs.push({
    q: `How current is this list of ${subject}?`,
    a: `We re-check hours and details from public sources on a rolling basis, and the list updates as places open, move or close. Each listing shows the month it was last checked.`,
  });
  return [...curated, ...faqs].slice(0, 6);
}
