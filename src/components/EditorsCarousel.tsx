"use client";

/**
 * Hero editors'-picks carousel. Rotates through the curated pick list (see
 * lib/picks.ts), auto-advancing and pausing on hover; arrows step, the
 * thumbnail strip jumps. Each card is a real venue linking to its profile and
 * carries the required photo credit via <PhotoCredit> (a non-crawlable /go/
 * button - see PhotoCredit / CreditClicks). The credit button is a sibling of
 * the card's <a>, never nested inside it, so the markup stays valid and the two
 * click targets never collide.
 *
 * Only creditText + creditHref reach this client component - never credit_url -
 * so the source URL stays out of the serialized flight payload.
 */
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import PhotoCredit from "@/components/PhotoCredit";
import { venuePath, withLocale } from "@/lib/paths";
import type { EditorPick } from "@/lib/picks";

export default function EditorsCarousel({
  picks,
  locale,
  eyebrow,
  pickLabel,
}: {
  picks: EditorPick[];
  locale: string;
  eyebrow: string;
  pickLabel: string;
}) {
  const n = picks.length;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const go = useCallback((k: number) => setI(((k % n) + n) % n), [n]);

  useEffect(() => {
    if (n < 2 || paused) return;
    const id = setInterval(() => setI((k) => (k + 1) % n), 4200);
    return () => clearInterval(id);
  }, [n, paused]);

  if (!n) return null;
  const href = (p: EditorPick) => withLocale(locale, venuePath(p.citySlug, p.slug, locale));

  return (
    <div className="epick" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="epick-head">
        <span className="epick-ek">{eyebrow}</span>
        <span className="epick-count">
          {i + 1} / {n}
        </span>
        <span className="epick-sp" />
        {n > 1 && (
          <>
            <button type="button" className="epick-arw" onClick={() => go(i - 1)} aria-label="Previous">
              &#8249;
            </button>
            <button type="button" className="epick-arw" onClick={() => go(i + 1)} aria-label="Next">
              &#8250;
            </button>
          </>
        )}
      </div>

      <div className="epick-stage">
        {picks.map((p, k) => (
          <div key={p.slug} className={"epick-slide" + (k === i ? " on" : "")} aria-hidden={k !== i}>
            <a className="epick-link" href={href(p)} tabIndex={k === i ? 0 : -1}>
              <Image
                src={p.photo}
                alt={locale === "es" ? p.alt_es : p.alt_en}
                fill
                sizes="(max-width: 960px) 100vw, 620px"
                className="img-cover"
                priority={k === 0}
              />
              <span className="epick-ov" />
              <span className="epick-body">
                <span className="epick-pick">
                  <span aria-hidden="true">&#9733;</span> {pickLabel}
                </span>
                <span className="epick-name">{p.name}</span>
                <span className="epick-meta">
                  {p.cuisine}
                  {p.hood ? ` · ${p.hood}` : ""}
                </span>
                <span className="epick-q">{p.blurb}</span>
              </span>
            </a>
            {p.creditText && k === i && (
              <PhotoCredit text={p.creditText} href={p.creditHref} className="epick-credit photo-credit" />
            )}
          </div>
        ))}
      </div>

      {n > 1 && (
        <div className="epick-thumbs">
          {picks.map((p, k) => (
            <button
              key={p.slug}
              type="button"
              className={"epick-thumb" + (k === i ? " on" : "")}
              onClick={() => go(k)}
              aria-label={p.name}
              aria-current={k === i}
            >
              <Image src={p.photo} alt="" fill sizes="150px" className="img-cover" />
              <span className="epick-tov" />
              <span className="epick-nm">{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
