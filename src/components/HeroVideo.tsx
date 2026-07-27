"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Muted-autoplay hero reel that sits over the poster image.
 *
 * - The poster <Image> underneath is always the LCP element, so the video never
 *   blocks first paint and reduced-motion users simply keep the still.
 * - The reel plays on DESKTOP only. On phones we skip it entirely and keep the
 *   poster still - lighter payload, no autoplay-video battery/data cost, and the
 *   page still shows a beautiful lead image. (Reduced-motion also keeps the still.)
 * - Autoplay must be muted (browser policy); a tap unmutes for sound-on.
 */
export default function HeroVideo({
  srcMobile,
  srcDesktop,
  poster,
  unmuteLabel,
  muteLabel,
}: {
  srcMobile: string;
  srcDesktop?: string;
  poster: string;
  unmuteLabel: string;
  muteLabel: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // keep the still
    const wide = window.matchMedia("(min-width: 1000px)").matches;
    if (!wide) return; // phones keep the poster still (perf) - no autoplay video
    setSrc(srcDesktop ?? srcMobile);
  }, [srcMobile, srcDesktop]);

  if (!src) return null;

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted) void v.play();
  };

  return (
    <>
      <video
        ref={ref}
        className="prem-hero-video img-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        poster={poster}
        aria-hidden="true"
      >
        <source src={src} type="video/mp4" />
      </video>
      <button type="button" className="prem-hero-mute" onClick={toggle} aria-label={muted ? unmuteLabel : muteLabel}>
        {muted ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4V5z" />
            <path d="M22 9l-6 6M16 9l6 6" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4V5z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
          </svg>
        )}
      </button>
    </>
  );
}
