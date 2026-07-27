"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * "Watch {venue}" - the full titled commercial (sound on). Shows the poster
 * with a play button; on click it mounts the <video controls autoplay> in place
 * (no autoplay on load, so it never costs data/battery until the visitor asks).
 */
export default function WatchFilm({
  src,
  poster,
  title,
  playLabel,
  blurb,
}: {
  src: string;
  poster: string;
  title: string;
  playLabel: string;
  blurb?: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="watch-film">
      <div className="wf-stage">
        {playing ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video className="wf-video" src={src} poster={poster} controls autoPlay playsInline />
        ) : (
          <button type="button" className="wf-facade" onClick={() => setPlaying(true)} aria-label={playLabel}>
            <Image src={poster} alt={title} fill sizes="(max-width: 1000px) 100vw, 720px" className="img-cover" />
            <span className="wf-scrim" aria-hidden="true" />
            <span className="wf-play" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </span>
            <span className="wf-cta">{playLabel}</span>
          </button>
        )}
      </div>
      {blurb && !playing && <p className="wf-blurb">{blurb}</p>}
    </div>
  );
}
