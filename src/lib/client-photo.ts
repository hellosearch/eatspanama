import type { Photo, Venue } from "@/data/mock";
import { creditHref } from "@/lib/credit-link";

/**
 * The photo shape that is allowed to cross into a client component.
 *
 * WHY THIS TYPE EXISTS
 *
 * Photo credits link back to the venue that owns the image. That link must be
 * clickable for a human but must not give a crawler an outbound link to follow.
 * `PhotoCredit` renders a normal server-side anchor to the internal
 * `/go/<key>/` gateway (robots-Disallowed, noindex/nofollow); the venue's own
 * URL is resolved server-side and never reaches the document.
 *
 * This type exists because of the second, quieter half. Anything passed as
 * a prop to a client component is serialized into the RSC flight payload,
 * which ships inside the same HTML document. `DiscoveryView` takes whole
 * `Venue` objects, so every `photos[].credit_url` on a neighborhood listing was
 * sitting in the page source as plain text - 80 of them on Casco Viejo - even
 * though that page never renders a credit at all. The venue profile leaked its
 * one the same way, via `RailGallery`.
 *
 * So `credit_url` is REMOVED from the type rather than merely avoided, and the
 * internal gateway path takes its place. A raw `Photo` no longer type-checks
 * where a client component is expected, which makes the leak a build error
 * instead of something to remember.
 */
export type ClientPhoto = Omit<Photo, "credit_url"> & {
  /** Internal /go/<key>/ gateway path - never the venue's own URL. */
  credit_href?: string;
};

export type ClientVenue = Omit<Venue, "photos"> & { photos: ClientPhoto[] };

export function toClientPhoto(p: Photo): ClientPhoto {
  const { credit_url, ...rest } = p;
  const href = creditHref(credit_url);
  return href ? { ...rest, credit_href: href } : rest;
}

export function toClientVenue(v: Venue): ClientVenue {
  // `sources` is provenance data that nothing renders (see the Venue type). It
  // was still crossing the boundary, which put ~150 external URLs into a
  // listing page's payload as plain text - not links, so not followable, but
  // external URLs in the document for no reason, and payload weight for no
  // reason. Dropped here rather than at each call site.
  // `social` is the same story: the venue's Instagram/Facebook handles are used
  // by the photo-sourcing scripts and rendered by nothing, so they have no
  // reason to be in the HTML either.
  const { sources: _sources, social: _social, ...rest } = v;
  return { ...rest, photos: v.photos.map(toClientPhoto) };
}
