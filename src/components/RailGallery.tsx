"use client";

import { useState } from "react";
import Image from "next/image";
import type { ClientPhoto } from "@/lib/client-photo";
import PhotoCredit from "@/components/PhotoCredit";

/**
 * Profile rail gallery. Clicking a thumbnail swaps the MAIN photo in place
 * (Chris: don't open a new tab - "open where the picture already is"). The
 * active thumb is highlighted. Credit follows the active photo.
 */
export default function RailGallery({ photos, locale }: { photos: ClientPhoto[]; locale: string }) {
  const [active, setActive] = useState(0);
  if (!photos.length) return null;
  const alt = (p: ClientPhoto) => (locale === "es" ? p.alt_es : p.alt_en);
  const main = photos[active];

  return (
    <>
      <div className="rail-photo">
        <Image src={main.url} alt={alt(main)} fill sizes="340px" className="img-cover" priority />
        {main.credit_en && (
          <PhotoCredit text={main.credit_en} href={main.credit_href} />
        )}
      </div>
      {photos.length > 1 && (
        <div className="rail-gallery" role="group" aria-label={locale === "es" ? "Galería de fotos" : "Photo gallery"}>
          {photos.map((p, i) => (
            <button
              key={i}
              type="button"
              className={`rg-thumb${i === active ? " active" : ""}`}
              aria-label={alt(p)}
              aria-pressed={i === active}
              onClick={() => setActive(i)}
            >
              <Image src={p.url} alt="" fill sizes="110px" className="img-cover" />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
