/**
 * Build-time guard for the shared second URL segment.
 *
 * /{city}/{segment}/ is a neighborhood OR a venue, resolved neighborhood-first.
 * That is only safe while the two sets of slugs are disjoint: a venue that took
 * a neighborhood's slug would be unreachable, silently, with no error anywhere.
 * A restaurant genuinely called "Marbella" or "Amador" is not far-fetched, so
 * this fails the build instead of shipping a missing page.
 */
import { allVenues, allNeighborhoods } from "@/lib/data";
import { brands } from "@/lib/brands";

/** Neighborhood slugs (EN + ES) may never be used by a venue. */
export function reservedSegments(): Set<string> {
  const out = new Set<string>();
  for (const n of allNeighborhoods) {
    out.add(n.slug);
    if (n.slug_es) out.add(n.slug_es);
  }
  return out;
}

export function assertNoVenueHoodCollision(): void {
  const reserved = reservedSegments();
  const problems: string[] = [];

  // Two venues on one slug means one of them has no page at all. Next.js will
  // happily build duplicate static params and silently keep the last, so this
  // has to be caught here rather than noticed later.
  const bySlug = new Map<string, string[]>();
  for (const v of allVenues) {
    if (v.status !== "open") continue;
    bySlug.set(v.slug, [...(bySlug.get(v.slug) ?? []), `${v.name} (${v.neighborhood_slug})`]);
  }
  for (const [slug, names] of bySlug) {
    if (names.length > 1) {
      problems.push(`slug "${slug}" is claimed by ${names.length} venues: ${names.join(" / ")}`);
    }
  }

  for (const v of allVenues) {
    if (v.status === "open" && reserved.has(v.slug)) {
      problems.push(`venue "${v.name}" (${v.slug}) in ${v.neighborhood_slug} uses a neighborhood slug`);
    }
  }
  // Brands share the segment too, and are resolved after neighborhoods but
  // before venues - so a brand may not take a neighborhood's name either, and
  // must not shadow a venue that is not one of its own branches.
  const venueSlugs = new Map(allVenues.filter((v) => v.status === "open").map((v) => [v.slug, v]));
  for (const b of brands) {
    if (reserved.has(b.slug)) {
      problems.push(`brand "${b.name}" (${b.slug}) uses a neighborhood slug`);
    }
    // The brand resolves BEFORE venues, so any venue holding the bare brand
    // slug is unreachable - including one of the brand's own branches. That is
    // the likely case after an import: the first branch takes the clean slug,
    // later branches get qualified, and then the brand appears on top of it.
    const shadowed = venueSlugs.get(b.slug);
    if (shadowed) {
      problems.push(
        `brand "${b.name}" (${b.slug}) shadows venue "${shadowed.name}" - qualify that venue's slug`
      );
    }
  }

  if (problems.length) {
    throw new Error(
      `URL segment collision - one of these pages would be unreachable:\n` +
        problems.map((p) => `  - ${p}`).join("\n") +
        `\nGive the venue a qualified slug (e.g. append its neighborhood) and rebuild.`
    );
  }
}
