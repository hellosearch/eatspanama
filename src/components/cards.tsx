/**
 * Card library, 1:1 with the approved comps:
 * VenueCard (listing grid), EditorsPickCard (numbered), ResultRowCard
 * (search), OccasionTile, HubSpokeTile, guide cards.
 * Trust grammar ships WITH the components: verified/visited stamps and
 * ADDED / RE-VISITED tags are part of the card, not page decoration.
 */
import Image from "next/image";
import type { Venue, Guide } from "@/data/mock";
import { VerifiedStamp, UpdatedStamp, CountPill } from "@/components/badges";
import { WhatsAppButton } from "@/components/Buttons";
import { cleanCuisine, cuisineGlyphName, priceGlyphs, whatsappUrl, formatMonth } from "@/lib/format";
import SaveButton from "@/components/SaveButton";
import { CuisineGlyph } from "@/components/icons";

function cuisineFor(v: Venue, locale: string) {
  const list = locale === "es" && v.cuisine_es.length ? v.cuisine_es : v.cuisine_en;
  return list.map((c) => cleanCuisine(c)).join(" · ");
}

/** Branded placeholder thumb for Basic-tier venues (no photos). A cuisine glyph
 *  hints at the kind of place instead of a meaningless bullseye. */
export function BrandThumb({ tag, cuisine }: { tag?: string; cuisine?: string }) {
  return (
    <div className="nb-thumb" aria-hidden="true">
      <CuisineGlyph name={cuisineGlyphName(cuisine)} />
      {tag && <span className="nb-tag">{tag}</span>}
    </div>
  );
}

/**
 * Branded thumb mark for a `.thumb` container when a Basic-tier venue has no
 * photo. Shows a cuisine-appropriate glyph so the card still reads as a real
 * place, not an empty/broken tile (Basic tier ships zero photos, so this is the
 * common case, not the edge).
 */
function ThumbMark({ cuisine }: { cuisine?: string }) {
  return (
    <span className="thumb-brand" aria-hidden="true">
      <CuisineGlyph name={cuisineGlyphName(cuisine)} />
    </span>
  );
}

export function MetaLine({ venue, locale, place }: { venue: Venue; locale: string; place: string }) {
  const price = priceGlyphs(venue.price_tier);
  return (
    <p className="meta-line">
      <b>{cuisineFor(venue, locale)}</b>
      {price && (
        <>
          <span className="dot">·</span>
          {price}
        </>
      )}
      <span className="dot">·</span>
      {place}
    </p>
  );
}

/** Listing-grid venue card (verified stamp + WhatsApp mini CTA). */
export function VenueCard({
  venue,
  href,
  locale,
  verifiedLabel,
  waLabel,
  brandCount,
  brandHref,
  hoodName,
  distanceLabel,
}: {
  venue: Venue;
  href: string;
  locale: string;
  verifiedLabel: string;
  waLabel: string;
  /** Set when this card stands in for a multi-location brand in a listing. */
  brandCount?: number;
  brandHref?: string;
  /** Neighborhood name for the meta line - shown instead of a street fragment
   *  when the result set spans multiple neighborhoods (cuisine/occasion hubs).
   *  A street snippet ("Av. A") tells a visitor nothing; the barrio does. */
  hoodName?: string;
  /** "1.2 km · 14 min walk" - set once the visitor opts into near-me. */
  distanceLabel?: string;
}) {
  const photo = venue.photos[0];
  // Verified stamp shows ONLY on editorial venues (Chris: drop it from every
  // thumbnail, keep it for the "custom" ones). Editorial now means exactly one
  // thing - an editors' pick. The other half of this test was a signed profile
  // verdict, a visit-diary shape no venue ever carried; it was removed with the
  // rest of that model. Standard cards carry no per-thumb badge.
  const isEditorial = Boolean(venue.editors_pick_rank);
  // An editors' pick is OUR choice, not a property of the venue, so it is
  // labelled as such wherever it jumps the queue - the site promises no
  // restaurant can pay to rank, and a silent pin to #1 would undercut that.
  const isPick = Boolean(venue.editors_pick_rank);
  const walkNote = locale === "es" ? venue.walk_note_es : venue.walk_note_en;
  // The whole card is clickable via a stretched-link overlay (`.card-link`),
  // NOT by wrapping the card in an <a>. That keeps the WhatsApp button (itself
  // an <a>) from being nested inside another <a> - invalid HTML the browser
  // reparses, which was a React #418 hydration mismatch on every card with a
  // WhatsApp number (listing + cuisine-hub grids).
  return (
    <div className="card venue-card">
      {/* Save chip in the card's top-right, above the stretched card-link
          (z-index) with stopPropagation, so tapping the heart saves without
          following the card. Direct child of the card (not the thumb) so it sits
          in the card corner on the horizontal listing layout. */}
      <SaveButton
        variant="chip"
        locale={locale}
        venue={{
          slug: venue.slug,
          name: venue.name,
          href,
          cuisine: cleanCuisine(venue.cuisine_en[0] ?? ""),
          hood: hoodName,
          price: priceGlyphs(venue.price_tier) || undefined,
          photo: photo?.url,
        }}
      />
      <div className="thumb">
        {/* One badge per corner: the pick flag replaces the verified stamp
            rather than stacking on top of it, and the date is formatted
            ("Jul 2026") instead of printing the raw "2026-07" key. */}
        {isPick ? (
          <span className="pick-flag">{locale === "es" ? "Selección del editor" : "Editor's pick"}</span>
        ) : (
          isEditorial && (
            <VerifiedStamp>
              {verifiedLabel} {formatMonth(venue.verified_at)}
            </VerifiedStamp>
          )
        )}
        {photo ? (
          <Image
            src={photo.url}
            alt={locale === "es" ? photo.alt_es : photo.alt_en}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="img-cover"
          />
        ) : (
          <ThumbMark cuisine={venue.cuisine_en[0]} />
        )}
      </div>
      <div className="body">
        <h3>{venue.name}</h3>
        <MetaLine venue={venue} locale={locale} place={hoodName || venue.address.split(",")[0]} />
        {distanceLabel && <p className="card-dist">{distanceLabel}</p>}
        {/* One row per brand in a listing: this card represents the whole brand,
            so it says how many branches there are and links to all of them. */}
        {brandCount && brandCount > 1 && brandHref && (
          <a className="brand-more" href={brandHref}>
            {locale === "es" ? `${brandCount} ubicaciones` : `${brandCount} locations`} →
          </a>
        )}
        <div className="v-foot">
          {/* Only show a walk note when there IS one. It used to fall back to
              address.split(",")[0] - the exact string MetaLine already prints
              above it - so most cards showed their address twice. */}
          {walkNote && (
            <span className="walk">
              <i aria-hidden="true" />
              {walkNote}
            </span>
          )}
          {venue.phones.whatsapp && (
            <WhatsAppButton size="card" href={whatsappUrl(venue.phones.whatsapp)} label={waLabel} />
          )}
        </div>
      </div>
      <a className="card-link" href={href} aria-label={venue.name} />
    </div>
  );
}

/** Basic-tier "nearby alternatives" card (branded thumb, no photo). */
export function NearbyCard({
  venue,
  href,
  locale,
  hoodName,
}: {
  venue: Venue;
  href: string;
  locale: string;
  hoodName: string;
}) {
  const price = priceGlyphs(venue.price_tier);
  return (
    <a className="card nb-card" href={href}>
      <BrandThumb tag={hoodName} cuisine={venue.cuisine_en[0]} />
      <div className="body">
        {/* h3: sits under the section's <h2> "Nearby" heading - keeps the
            profile heading order unbroken (h2 -> h3, never h2 -> h4). */}
        <h3>{venue.name}</h3>
        <p className="meta-line">
          <b>{cuisineFor(venue, locale)}</b>
          {price && (
            <>
              <span className="dot">·</span>
              {price}
            </>
          )}
        </p>
      </div>
    </a>
  );
}

/** Numbered editors'-pick card (rank tag + verdict line + visited stamp). */
export function EditorsPickCard({
  venue,
  href,
  locale,
  rank,
  visitedLabel,
}: {
  venue: Venue;
  href: string;
  locale: string;
  rank: number;
  visitedLabel: string;
}) {
  const photo = venue.photos[0];
  const verdict = locale === "es" ? venue.pick_verdict_es : venue.pick_verdict_en;
  return (
    <a className="card pick" href={href}>
      <div className="thumb">
        <span className="rank">{String(rank).padStart(2, "0")}</span>
        {photo ? (
          <Image
            src={photo.url}
            alt={locale === "es" ? photo.alt_es : photo.alt_en}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="img-cover"
          />
        ) : (
          <ThumbMark cuisine={venue.cuisine_en[0]} />
        )}
      </div>
      <div className="body">
        <h3>{venue.name}</h3>
        <MetaLine venue={venue} locale={locale} place={venue.address.split(",")[0]} />
        {verdict && <p className="verdict-line">{verdict}</p>}
        <div className="pick-foot">
          <span className="walk">
            <i aria-hidden="true" />
            {(locale === "es" ? venue.walk_note_es : venue.walk_note_en) ?? venue.address.split(",")[0]}
          </span>
          <VerifiedStamp>{visitedLabel}</VerifiedStamp>
        </div>
      </div>
    </a>
  );
}

/** Search result row (thumb | body | WhatsApp CTA column). */
export function ResultRowCard({
  venue,
  href,
  locale,
  openLabel,
  openState = "open",
  waLabel,
}: {
  venue: Venue;
  href: string;
  locale: string;
  openLabel: string;
  /** Drives the status dot colour - a green light beside "Closed now" is a lie. */
  openState?: "open" | "closed" | "unknown";
  waLabel: string;
}) {
  const photo = venue.photos[0];
  const walk = locale === "es" ? venue.walk_note_es : venue.walk_note_en;
  return (
    <div className="card res-card">
      {/* The photo/thumb link duplicates the named .body link below (same href),
          so it is hidden from AT + tab order - a Basic-tier thumb has no photo
          (aria-hidden placeholder) and would otherwise be a nameless link. */}
      <a className="thumb" href={href} aria-hidden="true" tabIndex={-1}>
        {photo ? (
          <Image
            src={photo.url}
            alt={locale === "es" ? photo.alt_es : photo.alt_en}
            fill
            sizes="216px"
            className="img-cover"
          />
        ) : (
          <ThumbMark cuisine={venue.cuisine_en[0]} />
        )}
      </a>
      <a className="body" href={href}>
        <h3>{venue.name}</h3>
        <MetaLine venue={venue} locale={locale} place={venue.address.split(",")[0]} />
        <p className={`open-line open-${openState}`}>
          <i aria-hidden="true" />
          {openLabel}
          {walk && (
            <>
              <span className="sep">·</span>
              <span className="walk-note">{walk}</span>
            </>
          )}
        </p>
      </a>
      <div className="cta">
        {venue.phones.whatsapp && (
          <WhatsAppButton size="mini" href={whatsappUrl(venue.phones.whatsapp)} label={waLabel} />
        )}
      </div>
    </div>
  );
}

/**
 * Occasion tile (photo + gradient + count pill). `sub` is the same label in the
 * other language - the bilingual motif the design runs throughout. `img` is
 * optional: a facet whose venues have no photo yet renders on the flat tint
 * rather than borrowing an unrelated image.
 */
export function OccasionTile({
  title,
  sub,
  img,
  href,
  countLabel,
}: {
  title: string;
  sub: string;
  img?: { url: string; credit?: string };
  href: string;
  countLabel: string;
}) {
  return (
    <a className={`occ${img ? "" : " occ-flat"}`} href={href}>
      {img && <Image src={img.url} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="img-cover" />}
      {/* Static attribution (no outbound link - this tile is itself a link).
          The facet art is a curated, genuinely-depicting venue-owned photo. */}
      {img?.credit && <span className="occ-credit">{img.credit}</span>}
      <div className="meta">
        <h3>
          {title}
          <span className="es">{sub}</span>
        </h3>
        <span className="cnt">{countLabel}</span>
      </div>
    </a>
  );
}

/**
 * Hub-spoke interlink tile (title + count + visible URL). When `href` is
 * omitted the tile renders as plain text (no anchor) - used to keep zero 404s:
 * a cuisine only links out if its (hood, cuisine) hub page actually exists.
 */
export function HubSpokeTile({ title, count, href }: { title: string; count: string; href?: string }) {
  const inner = (
    <span className="t">
      {title} <span className="n">{count}</span>
    </span>
  );
  return href ? (
    <a className="hublink" href={href}>
      {inner}
    </a>
  ) : (
    <span className="hublink hublink-static" aria-disabled="true">
      {inner}
    </span>
  );
}

/** "New this week" rail card (ADDED / RE-VISITED date tag). */
export function NewThisWeekCard({
  venue,
  href,
  locale,
  tag,
  hoodName,
}: {
  venue: Venue;
  href: string;
  locale: string;
  tag: string;
  hoodName: string;
}) {
  const photo = venue.photos[0];
  return (
    <a className="card new-card" href={href}>
      <div className="thumb">
        <UpdatedStamp>{tag}</UpdatedStamp>
        {photo ? (
          <Image
            src={photo.url}
            alt={locale === "es" ? photo.alt_es : photo.alt_en}
            fill
            sizes="274px"
            className="img-cover"
          />
        ) : (
          <ThumbMark cuisine={venue.cuisine_en[0]} />
        )}
      </div>
      <div className="body">
        <h3>{venue.name}</h3>
        {/* Comp order on the home rail: cuisine · neighborhood · price */}
        <p className="meta-line">
          <b>{cuisineFor(venue, locale)}</b>
          <span className="dot">·</span>
          {hoodName}
          <span className="dot">·</span>
          {priceGlyphs(venue.price_tier)}
        </p>
      </div>
    </a>
  );
}

/** Homepage / listing guide card. */
export function GuideCard({
  guide,
  href,
  locale,
  updatedLabel,
  spotsLabel,
  readLabel,
}: {
  guide: Guide;
  href: string;
  locale: string;
  updatedLabel: string;
  spotsLabel: string;
  readLabel: string;
}) {
  return (
    <a className="card guide-card" href={href}>
      <div className="thumb">
        {guide.hero ? (
          <Image
            src={guide.hero.url}
            alt={locale === "es" ? guide.hero.alt_es : guide.hero.alt_en}
            fill
            sizes="240px"
            className="img-cover"
          />
        ) : (
          // No stock fallback: a guide with no venue-owned photo shows the mark.
          <span className="thumb-brand" aria-hidden="true">
            <CuisineGlyph name="food" />
          </span>
        )}
      </div>
      <div className="body">
        <div className="badges">
          <VerifiedStamp>{updatedLabel}</VerifiedStamp>
          <CountPill>{spotsLabel}</CountPill>
        </div>
        <h3>{guide.title_en}</h3>
        <p>{guide.description_en}</p>
        <span className="go">{readLabel}</span>
      </div>
    </a>
  );
}
