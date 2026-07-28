import Image from "next/image";
import PhotoCredit from "@/components/PhotoCredit";
import { venuePath, withLocale } from "@/lib/paths";
import type { EditorPick } from "@/lib/picks";

/**
 * "The Wall" homepage hero mosaic: a gap-free grid of this week's editors'
 * picks beside the search rail. The first pick is the featured 2x2 tile; the
 * rest tile the remaining cells (3 columns x 4 rows fills exactly with a 2x2
 * feature + 8 singles = 9 tiles, no blank space). Each tile is a real venue
 * link; the photo credit is a sibling /go/ button (never a nested anchor), same
 * pattern as the carousel it replaces. Server-rendered - no client JS.
 */
export default function HeroWall({
  picks,
  locale,
  pickLabel,
}: {
  picks: EditorPick[];
  locale: string;
  pickLabel: string;
}) {
  if (!picks.length) return null;
  const href = (p: EditorPick) => withLocale(locale, venuePath(p.citySlug, p.slug, locale));

  return (
    <div className="hw-grid" role="list">
      {picks.map((p, k) => (
        <div className={"hw-tile" + (k === 0 ? " hw-feat" : "")} role="listitem" key={p.slug}>
          <a className="hw-link" href={href(p)}>
            <Image
              src={p.photo}
              alt={locale === "es" ? p.alt_es : p.alt_en}
              fill
              sizes={k === 0 ? "(max-width: 980px) 100vw, 420px" : "(max-width: 980px) 50vw, 220px"}
              className="img-cover"
              priority={k < 2}
            />
            <span className="hw-ov" aria-hidden="true" />
            <span className="hw-body">
              {k === 0 && (
                <span className="hw-pick">
                  <span aria-hidden="true">&#9733;</span> {pickLabel}
                </span>
              )}
              <span className="hw-name">{p.name}</span>
              <span className="hw-meta">
                {p.cuisine}
                {p.hood ? ` · ${p.hood}` : ""}
              </span>
            </span>
          </a>
          {p.creditText && <PhotoCredit text={p.creditText} href={p.creditHref} className="hw-credit photo-credit" />}
        </div>
      ))}
    </div>
  );
}
