import { NextResponse } from "next/server";
import { resolveCredit } from "@/lib/credit-link";

/**
 * Photo-credit gateway. `/go/<key>/` -> 302 to the venue's own URL.
 *
 * Crawlers are told to stay out three ways: robots.txt Disallows /go/, this
 * response carries X-Robots-Tag: noindex, nofollow, and the anchors pointing
 * here are rel="nofollow". Humans get a working link.
 *
 * The key is a hash looked up in a registry built from our own dataset, so
 * there is no way to make this redirect somewhere we did not publish - an
 * `?url=` style gateway would be an open redirect and a spam magnet.
 */
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const target = resolveCredit(key);

  if (!target) {
    return new NextResponse("Not found", {
      status: 404,
      headers: { "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  return NextResponse.redirect(target, {
    status: 302, // temporary: the destination is the venue's, not ours
    headers: {
      "X-Robots-Tag": "noindex, nofollow",
      // Referrer is already suppressed by rel="noreferrer" on the anchor; this
      // covers the no-JS / direct-hit path too.
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
