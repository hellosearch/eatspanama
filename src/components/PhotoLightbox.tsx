"use client";

import { useCallback, useEffect, useState } from "react";

export interface LightboxPhoto {
  url: string;
  alt?: string;
}

/**
 * "See all photos" chip that opens a full-screen photo viewer (arrows, dots,
 * keyboard, click-scrim-to-close). Client component: the premium hero shows a
 * muted film loop, so the still photos live here rather than in a strip.
 */
export default function PhotoLightbox({
  photos,
  openLabel,
  closeLabel,
  prevLabel,
  nextLabel,
}: {
  photos: LightboxPhoto[];
  openLabel: string;
  closeLabel: string;
  prevLabel: string;
  nextLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const go = useCallback((n: number) => setI((n + photos.length) % photos.length), [photos.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") go(i + 1);
      if (e.key === "ArrowLeft") go(i - 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, i, go]);

  if (photos.length === 0) return null;
  const cur = photos[i];

  return (
    <>
      <button type="button" className="seeall" onClick={() => { setI(0); setOpen(true); }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        {openLabel}
      </button>
      {open && (
        <div className="lb" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <button type="button" className="lb-x" aria-label={closeLabel} onClick={() => setOpen(false)}>✕</button>
          <button type="button" className="lb-prev" aria-label={prevLabel} onClick={() => go(i - 1)}>‹</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="lb-img" src={cur.url} alt={cur.alt ?? ""} />
          <button type="button" className="lb-next" aria-label={nextLabel} onClick={() => go(i + 1)}>›</button>
          <div className="lb-cap">{i + 1} / {photos.length}{cur.alt ? `  ·  ${cur.alt}` : ""}</div>
        </div>
      )}
    </>
  );
}
