import { createHash } from "node:crypto";
import { allVenues, allNeighborhoods } from "@/lib/data";

/**
 * Outbound photo-credit links, routed through an internal gateway.
 *
 * THE REQUIREMENT
 * The whole site should be server-rendered and crawlable. The ONE exception is
 * the photo credit's outbound link to the venue: humans must be able to click
 * it, crawlers must not have an outbound link to follow.
 *
 * WHY THE PREVIOUS APPROACH DID NOT WORK
 * It rendered a <span> server-side and swapped in an <a href> after hydration.
 * That keeps the URL out of a raw HTML fetch, but Googlebot executes
 * JavaScript - it renders the page and sees the hydrated anchor like any other.
 * So it dressed the problem up without solving it, and it cost SSR on the one
 * element it touched.
 *
 * WHAT THIS DOES INSTEAD
 * The HTML carries a normal, server-rendered anchor to an INTERNAL path:
 *
 *     <a href="/go/3f9a1c2b8d/" rel="nofollow noopener noreferrer" target="_blank">
 *
 * `/go/*` is Disallowed in robots.txt and serves `X-Robots-Tag: noindex,
 * nofollow`, so a crawler is told not to fetch it and gets no outbound link
 * even if it does. The venue's real URL appears nowhere in the document - not
 * in an href, not in the RSC payload - because the key is a one-way hash, not
 * an encoding. Decoding it is not possible; only the server can resolve it.
 *
 * Users get a real link: hoverable, middle-clickable, works with JS disabled.
 *
 * Redirect targets come exclusively from this registry, which is built from the
 * dataset at module load. There is no `?url=` parameter, so this cannot be used
 * as an open redirect.
 */

function keyFor(url: string): string {
  return createHash("sha1").update(url).digest("hex").slice(0, 10);
}

/** key -> external URL, built once from every credit in the dataset. */
const registry: Map<string, string> = (() => {
  const m = new Map<string, string>();
  const add = (url?: string) => {
    if (url && /^https?:\/\//i.test(url)) m.set(keyFor(url), url);
  };
  for (const v of allVenues) for (const p of v.photos ?? []) add(p.credit_url);
  for (const n of allNeighborhoods) {
    add(n.hero_image?.credit_url);
    add(n.photo?.credit_url);
    for (const p of n.media ?? []) add(p.credit_url);
  }
  return m;
})();

/** The internal href to print for a credit. Empty string when there is none. */
export function creditHref(url?: string): string | undefined {
  if (!url || !/^https?:\/\//i.test(url)) return undefined;
  return `/go/${keyFor(url)}/`;
}

/** Server-only: resolve a gateway key back to its destination. */
export function resolveCredit(key: string): string | undefined {
  return registry.get(key);
}

export function creditRegistrySize(): number {
  return registry.size;
}
