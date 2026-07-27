/**
 * Typed mock fixtures, shaped like the future Supabase schema.
 *
 * Tables this mirrors (later ticket): cities, neighborhoods, venues,
 * venue_photos, venue_hours, editors, verdicts, dishes, guides, guide_entries,
 * occasions, change_log, newsletter_issues.
 *
 * Content rules (locked): no star ratings, no deals/coupons, trust grammar
 * everywhere (named editor + visited date), ES copy written natively in
 * Spanish - never machine-mirrored (es_reviewed flags the editor gate).
 */

export type PriceTier = 0 | 1 | 2 | 3 | 4; // 0 = unknown (Basic-tier enrichment)

export interface Photo {
  url: string;
  alt_en: string;
  alt_es: string;
  credit_en?: string; // subtle source credit, e.g. "Photo: The Wallace"
  credit_url?: string; // source link - rendered client-side only, nofollow + new tab (see PhotoCredit)
}

export interface DayHours {
  day_en: string;
  day_es: string;
  open: string;
  close: string;
}

export interface Dish {
  name: string;
  description_en: string;
  price?: number | null; // USD; null/absent when only the dish name is known (Basic tier)
  popular?: boolean; // most-mentioned dish flag (v2 enrichment)
  photo?: string; // optional dish photo (owner-provided / editorial); thumbnail in "The food"
  category?: string; // menu section header ("Bagels & toasts", "Coffee & drinks", ...) - groups the dish list
  signature?: boolean; // the one "most ordered" dish - rendered as a large featured card above the grid
}

/**
 * "Best time to go" - Option A (labeled rows). Three optional lines, each a
 * specific day+time recommendation with a one-line why. Inferred from venue
 * type / cuisine / hours (Google's API does not expose real popular-times), so
 * it is framed as an editorial recommendation, not measured data.
 */
export interface BestTime {
  busiest?: string; // e.g. "Thu-Sat, 8-11 PM"
  busiest_note_en?: string;
  easy?: string; // e.g. "Tue-Wed evenings"
  easy_note_en?: string;
  sweet?: string; // e.g. "Fri, 6:30-7:30 PM"
  sweet_note_en?: string;
}

export interface Venue {
  id: string;
  slug: string;
  name: string;
  cuisine_en: string[];
  cuisine_es: string[];
  price_tier: PriceTier;
  /** "menu" = tier derived from the venue's own listed dish prices, not stated.
   *  Absent = stated/verified. See scripts/derive_price_tier.mjs. */
  price_source?: "menu";
  /** Official channels found on the venue's own site - the only sources the
   *  photo rule accepts. */
  social?: { instagram?: string; facebook?: string };
  neighborhood_slug: string;
  address: string;
  address_note_en?: string;
  lat: number;
  lng: number;
  phones: { whatsapp?: string; call?: string };
  hours: DayHours[];
  photos: Photo[];
  verified_at: string; // YYYY-MM
  added_at?: string; // ISO date -> ADDED tag
  revisited_at?: string; // ISO date -> RE-VISITED tag
  tags_en: string[];
  tags_es: string[];
  walk_note_en?: string;
  walk_note_es?: string;
  open_until?: string; // mock "open now" state
  editors_pick_rank?: number; // 1-3 on its neighborhood listing
  pick_verdict_en?: string; // short card verdict (picks grid)
  pick_verdict_es?: string;
  dishes?: Dish[];
  status: "open" | "closed";
  es_reviewed: boolean; // native-ES editorial gate (review_flag)

  /* ---- v2 Basic-tier enrichment (casco-viejo.json) ---- */
  last_checked?: string; // YYYY-MM freshness stamp (rail + Highlights badge)
  about_en?: string; // "About {venue}" prose
  highlights_en?: string[]; // Highlights bullets
  whats_good_en?: string[]; // synthesized public sentiment (no ratings)
  typical_spend_en?: string | null; // e.g. "$8 to $18 a main"
  dataset_comparison_en?: string | null; // e.g. "One of 11 international kitchens in Casco Viejo"
  attributes_en?: string[]; // "Good to know" venue attributes
  special_hours_note_en?: string | null; // e.g. "Closed for Semana Santa" - render-ready; surfaces only when data is present
  best_time_en?: string | null; // "Best time to go" prose (legacy fallback)
  best_time?: BestTime | null; // "Best time to go" labeled rows (Option A)
  notable_mention_en?: string | null; // citable press/award
  dietary_en?: string[]; // dietary options
  sources?: string[]; // provenance URLs (not rendered)
  google_maps_url?: string; // canonical Google Maps place link (Get directions)
  place_id?: string; // Google place id (internal join key; not rendered)

  /* ---- Premium tier (claimed / showcase venues) ---- */
  tier?: "premium"; // renders the premium profile (hero gallery, story, menu, launchpad)
  tagline_en?: string; // short editorial hook, shown under the name in the hero
  story_en?: string; // long-form editorial (paragraphs, split on blank line)
  signature_en?: { name: string; note: string }; // signature-item spotlight
  room_en?: { photo: string; caption_en: string }[]; // "The room": venue photos + informative captions
  owner_quote_en?: { quote: string; attribution: string }; // real owner pull-quote (only when collected - never fabricated)
  video?: { srcMobile: string; srcDesktop?: string; poster: string }; // hero reel: 9:16 mobile + optional landscape desktop cut, muted autoplay loop over the poster
  film?: { src: string; poster: string }; // the full titled commercial (sound on) - "Watch Luna" section, click-to-play
  website?: string; // official site, for the "find online" module
  delivery?: { ubereats?: string; pedidosya?: string }; // order-online links (real, verified)
}

export interface Neighborhood {
  slug: string; // EN URL segment
  slug_es: string; // ES URL segment
  name: string;
  city_slug: string;
  city_slug_es?: string; // present on the real neighborhoods.json records
  descriptor_en: string;
  descriptor_es: string;
  venue_count: number; // full-DB count
  intro_en: string;
  intro_es: string;
  kicker_en: string;
  kicker_es: string;
  h1_en: { pre: string; accent: string; post: string };
  h1_es: { pre: string; accent: string; post: string };
  top_cuisines?: string[]; // real data: ranked cuisines in the hood
  // photo/media are mock-only (real records carry no imagery). Optional so the
  // 15 real neighborhoods.json records validate; the listing renders a branded
  // NeighborhoodHero when media is absent.
  photo?: Photo;
  media?: Photo[]; // listing-head grid (3 photos + map teaser)
  hero_image?: Photo & { credit_en?: string; credit_url?: string }; // real neighborhood establishing shot (hero right side)
  es_reviewed: boolean;
}

export interface City {
  slug: string;
  slug_es: string;
  name_en: string;
  name_es: string;
  venue_count: number;
}

export interface Occasion {
  slug: string;
  title_en: string;
  sub_es: string; // ES echo line under EN title (approved home design)
  title_es: string;
  sub_en: string;
  count: number;
  photo: Photo;
}

export interface GuideEntry {
  venue_slug: string;
  /** Factual placement sentence, from the venue record. */
  summary_en: string;
  /** Recurring themes in public diner feedback (synthesis-gated). */
  known_for_en: string[];
  best_time_en?: string;
  order_dish?: { name: string; price: number };
}

/**
 * A guide is a CURATED SHORTLIST drawn from the venue database - not a visit
 * diary. There is no `editor_id` and no visit count because we have not
 * visited: every claim on the page has to be traceable to the dataset or to
 * the stated selection criteria. Built by scripts/build_guides.mjs.
 */
export interface Guide {
  slug: string;
  title_en: string;
  description_en: string;
  updated_iso: string;
  published_iso: string;
  intro_en: string;
  /** How the list was selected, printed verbatim on the page. */
  criteria_en: string[];
  /** Venues that qualified for consideration - the honest denominator. */
  pool_size: number;
  candidate_total: number;
  toc: { slug: string; name: string }[];
  entries: GuideEntry[];
  faqs_en: { q: string; a: string }[];
  /** Venue-owned photo borrowed from a venue ON the list. Never stock. */
  hero?: Photo & { venue_slug: string; venue_name: string };
}

export interface ChangeEntry {
  type: "added" | "removed" | "revisited";
  venue_name: string;
  date_label_en: string;
  date_label_es: string;
  note_en: string;
  note_es: string;
}

/* ================================================================
   CITIES + NEIGHBORHOODS
================================================================ */
export const cities: City[] = [
  {
    slug: "panama-city",
    slug_es: "ciudad-de-panama",
    name_en: "Panama City",
    name_es: "Ciudad de Panamá",
    venue_count: 406,
  },
];


// Real, venue-owned + enhanced food photos (from the neighborhood-card set).
export const heroCollage: Photo[] = [
  { url: "/hoods/san-francisco.jpg", alt_en: "A plated dish at Maito in San Francisco", alt_es: "Un plato de Maito en San Francisco" },
  { url: "/hoods/obarrio.jpg", alt_en: "Nikkei sushi rolls at Enkai in Obarrio", alt_es: "Rolls de sushi nikkei en Enkai, Obarrio" },
  { url: "/hoods/marbella.jpg", alt_en: "Dim sum at Palacio Lung Fung in Marbella", alt_es: "Dim sum en Palacio Lung Fung, Marbella" },
  { url: "/hoods/el-cangrejo.jpg", alt_en: "Fish and chips at The Wallace in El Cangrejo", alt_es: "Fish and chips en The Wallace, El Cangrejo" },
];
