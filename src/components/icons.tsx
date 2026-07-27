/**
 * Inline icon set, 1:1 from the locked prototypes. currentColor where the
 * comps used a fixed ink stroke on white; explicit fill where the comps did.
 */

export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.8-4.8" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  );
}

export function WhatsAppIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm5.2 13.9c-.2.7-1.3 1.3-1.9 1.4-.5.1-1.1.2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.4l.9 2.1c.1.2.1.4 0 .6l-.4.6c-.1.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1.1 2.2 1.4 2.5 1.5.3.1.5.1.7-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.3 0 .2 0 .6-.3 1z" />
    </svg>
  );
}

export function PhoneIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </svg>
  );
}

export function SendIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 11l19-8-8 19-2.5-8.5L3 11z" />
    </svg>
  );
}

/** Map pin (tangerine, ink stroke) used on map placeholders. */
export function MapPin({ width = 44, height = 52 }: { width?: number; height?: number }) {
  return (
    <svg className="pin" width={width} height={height} viewBox="0 0 36 44" aria-hidden="true">
      <path
        d="M18 1.5C9.2 1.5 2.8 7.9 2.8 16.4 2.8 24.7 10.6 30.5 18 43 25.4 30.5 33.2 24.7 33.2 16.4 33.2 7.9 26.8 1.5 18 1.5z"
        fill="var(--color-accent)"
        stroke="var(--color-ink)"
        strokeWidth="2"
      />
      <circle cx="18" cy="16" r="6" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * Small section-heading icon. Subtle accent mark beside each profile H2 to make
 * the page more engaging as you scroll (Chris). One stroke style, currentColor.
 */
export function SecIcon({ name }: { name: string }) {
  const P: Record<string, React.ReactNode> = {
    about: <><rect x="4" y="9" width="16" height="11" rx="1.5" /><path d="M4 9l2-4h12l2 4M9 20v-5h6v5" /></>,
    good: <><path d="M12 3l2.4 5 5.6.7-4 3.9 1 5.5L12 15.9 6.9 18l1-5.5-4-3.9L9.6 8 12 3z" /></>,
    food: <><path d="M6 3v7a2 2 0 0 0 2 2v9M6 3v4M9 3v4M17 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4v8" /></>,
    where: <><path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
    know: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5v.5" /></>,
    time: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
    notable: <><circle cx="12" cy="9" r="5" /><path d="M9 13.5L7.5 21l4.5-2.5L16.5 21 15 13.5" /></>,
    faq: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7M12 16.5v.3" /></>,
    nearby: <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" /></>,
    explore: <><circle cx="11" cy="11" r="7" /><path d="M16 16l4 4" /></>,
    night: <><path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5z" /></>,
    waves: <><path d="M3 8c2 0 2 1.6 4 1.6S9 8 11 8s2 1.6 4 1.6S17 8 19 8M3 13c2 0 2 1.6 4 1.6S9 13 11 13s2 1.6 4 1.6S17 13 19 13M3 18c2 0 2 1.6 4 1.6S9 18 11 18s2 1.6 4 1.6S17 18 19 18" /></>,
    city: <><path d="M4 20V9l5-3v14M9 20V4l6 3v13M15 20v-9l5 3v6M3 20h18" /></>,
    home: <><path d="M4 11l8-6 8 6M6 10v9h12v-9M10 19v-5h4v5" /></>,
    coin: <><circle cx="12" cy="12" r="8.5" /><path d="M14.2 9.3c-.4-.8-1.2-1.3-2.2-1.3-1.4 0-2.3.8-2.3 1.8 0 1.1 1 1.5 2.3 1.8 1.3.3 2.3.7 2.3 1.9 0 1-.9 1.8-2.3 1.8-1.1 0-1.9-.5-2.3-1.4M12 6.6v1.4M12 16v1.4" /></>,
    calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 9.5h16M8 3v4M16 3v4" /></>,
  };
  return (
    <svg className="sec-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name] ?? P.about}
    </svg>
  );
}

/** Small cuisine glyph for the browse-by-cuisine chips. */
export function CuisineGlyph({ name }: { name: string }) {
  const P: Record<string, React.ReactNode> = {
    seafood: <><path d="M4 14c0-4 3.5-7 8-7s8 3 8 7" /><path d="M3 14h18" /><path d="M8 18h8" /></>,
    sushi: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2" /></>,
    cafe: <><path d="M4 11h12v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3z" /><path d="M16 12h2a2 2 0 0 1 0 4h-2" /><path d="M7 4v2M11 4v2" /></>,
    bar: <><path d="M6 3h12l-1 5a5 5 0 0 1-10 0L6 3z" /><path d="M12 13v7M8 20h8" /></>,
    pizza: <><path d="M3 8l9-4 9 4-9 4-9-4z" /><path d="M3 8v5c0 2 4 4 9 4s9-2 9-4V8" /></>,
    burger: <><path d="M4 9a8 8 0 0 1 16 0M4 9h16M5 13h14M7 17h10" /></>,
    steak: <><path d="M6 4v16M6 8h5a3 3 0 0 1 0 6H6" /></>,
    local: <><path d="M5 20h14M6 20l1-8h10l1 8M8 12V8a4 4 0 0 1 8 0v4" /></>,
    food: <><path d="M6 3v7a2 2 0 0 0 2 2v9M6 3v4M9 3v4M17 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4v8" /></>,
  };
  return (
    <svg className="cci" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name] ?? P.food}
    </svg>
  );
}

/**
 * Large facet glyph for the /good-for/ index tiles that have no curated photo,
 * so those tiles read as intentional icon cards instead of empty gradients.
 * Rendered as a faint watermark over the branded fill. One best-fit line icon
 * per facet (reused from the sets above).
 */
export function FacetGlyph({ slug }: { slug: string }) {
  const P: Record<string, React.ReactNode> = {
    // occasion
    rooftop: <><path d="M4 20V9l5-3v14M9 20V4l6 3v13M15 20v-9l5 3v6M3 20h18" /></>,
    "date-night": <><path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5z" /></>,
    "with-a-view": <><path d="M3 17l5-6 4 4 3-4 6 6M3 20h18" /><circle cx="7" cy="7" r="2" /></>,
    outdoor: <><path d="M12 3v18M6 9c0 3 2.5 4.5 6 4.5M18 7c0 3.5-2.5 5.5-6 5.5" /><path d="M5 21h14" /></>,
    "cheap-eats": <><circle cx="12" cy="12" r="8.5" /><path d="M14.2 9.3c-.4-.8-1.2-1.3-2.2-1.3-1.4 0-2.3.8-2.3 1.8 0 1.1 1 1.5 2.3 1.8 1.3.3 2.3.7 2.3 1.9 0 1-.9 1.8-2.3 1.8-1.1 0-1.9-.5-2.3-1.4M12 6.6v1.4M12 16v1.4" /></>,
    groups: <><circle cx="8" cy="9" r="3" /><circle cx="16" cy="9" r="3" /><path d="M3 20c0-3 2.2-5 5-5s5 2 5 5M13 20c0-3 1.5-5 3-5s5 2 5 5" /></>,
    "live-music": <><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></>,
    "work-friendly": <><path d="M4 11h12v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3z" /><path d="M16 12h2a2 2 0 0 1 0 4h-2" /><path d="M7 4v2M11 4v2" /></>,
    brunch: <><path d="M4 11h12v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3z" /><path d="M16 12h2a2 2 0 0 1 0 4h-2" /><path d="M7 4v2M11 4v2" /></>,
    "family-friendly": <><path d="M4 11l8-6 8 6M6 10v9h12v-9M10 19v-5h4v5" /></>,
    "dog-friendly": <><ellipse cx="6" cy="9" rx="1.4" ry="2" /><ellipse cx="18" cy="9" rx="1.4" ry="2" /><ellipse cx="9.5" cy="6.5" rx="1.4" ry="2" /><ellipse cx="14.5" cy="6.5" rx="1.4" ry="2" /><path d="M12 11c3 0 5 2.2 5 4.5S15 20 12 20s-5-2.2-5-4.5S9 11 12 11z" /></>,
    // dish
    ceviche: <><path d="M4 12h16a8 8 0 0 1-16 0z" /><path d="M3 12h18" /><path d="M9 8.5c1-1 2-1 3 0s2 1 3 0" /></>,
    wings: <><path d="M7.7 16.3l8.6-8.6" /><circle cx="5.6" cy="16.8" r="1.7" /><circle cx="7.2" cy="18.4" r="1.7" /><circle cx="16.8" cy="7.2" r="1.7" /><circle cx="18.4" cy="5.6" r="1.7" /></>,
    empanadas: <><path d="M4 13a8 4 0 0 1 16 0z" /><path d="M4 13c0 2 3.6 3.5 8 3.5s8-1.5 8-3.5" /><path d="M6.5 12l1-1.5M10 11.5l1-1.5M13.5 11.5l1-1.5M17 12l1-1.5" /></>,
    bbq: <><path d="M12 3c.6 3 4 4.2 4 8a4 4 0 1 1-8 0c0-2.3 1.4-3.4 2.3-4.4C10.9 8.3 11.6 5.8 12 3z" /><path d="M12 19.5v1.5" /></>,
    patacones: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.4" /></>,
    tacos: <><path d="M4 16a8 8 0 0 1 16 0z" /><path d="M3 16h18" /><path d="M9 13.5c.6-1 2.4-1 3 0" /></>,
    tapas: <><circle cx="8" cy="13" r="3.6" /><circle cx="16.5" cy="14" r="2.9" /><circle cx="13.5" cy="7.5" r="2.5" /></>,
    sancocho: <><path d="M5 12h14v2a6 6 0 0 1-12 0v-2z" /><path d="M4 12h16" /><path d="M10 8.5c0-1.2 1-1.2 1-2.5M14 8.5c0-1.2 1-1.2 1-2.5" /></>,
    ramen: <><path d="M5 12h14v2a6 6 0 0 1-12 0v-2z" /><path d="M4 12h16" /><path d="M10 8.5c0-1.2 1-1.2 1-2.5M14 8.5c0-1.2 1-1.2 1-2.5" /></>,
    arepas: <><ellipse cx="12" cy="8" rx="6.5" ry="2.5" /><path d="M5.5 8v3.5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5V8" /><path d="M5.5 11.5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5" /></>,
    // drink
    cocktails: <><path d="M6 3h12l-1 5a5 5 0 0 1-10 0L6 3z" /><path d="M12 13v7M8 20h8" /></>,
    "specialty-coffee": <><path d="M4 11h12v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3z" /><path d="M16 12h2a2 2 0 0 1 0 4h-2" /><path d="M7 4v2M11 4v2" /></>,
    "craft-beer": <><path d="M6 7h9v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7z" /><path d="M15 9h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3" /><path d="M8 4.5c1-1 3-1 4 0" /></>,
    "wine-bar": <><path d="M7 3h10l-1.2 6a3.8 3.8 0 0 1-7.6 0L7 3z" /><path d="M12 15v5M9 20h6" /></>,
    // dietary
    vegetarian: <><path d="M20 4c-9 0-14 4-14 10a4 4 0 0 0 8 0c0-6-6-6-6-10" /><path d="M6 20c0-4 2-7 6-9" /></>,
    "gluten-free": <><path d="M12 3v18M12 7c-2-2-4-2-5-1 1 2 3 3 5 3M12 7c2-2 4-2 5-1-1 2-3 3-5 3M12 13c-2-2-4-2-5-1 1 2 3 3 5 3M12 13c2-2 4-2 5-1-1 2-3 3-5 3" /><path d="M5 4l14 16" /></>,
  };
  return (
    <svg className="gfcard-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[slug] ?? <path d="M6 3v7a2 2 0 0 0 2 2v9M6 3v4M9 3v4M17 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4v8" />}
    </svg>
  );
}

/** Small line glyph for the "What to order" dishes (accent, not a boxed tile). */
export function DishGlyph({ name }: { name: string }) {
  const P: Record<string, React.ReactNode> = {
    ceviche: <><path d="M4 12h16a8 8 0 0 1-16 0z" /><path d="M3 12h18" /><path d="M9 8.5c1-1 2-1 3 0s2 1 3 0" /></>,
    fish: <><path d="M4 12c3-4 9-4 12 0-3 4-9 4-12 0z" /><path d="M16 12l4-3v6l-4-3z" /><circle cx="8" cy="11" r="0.9" fill="currentColor" stroke="none" /></>,
    soup: <><path d="M5 12h14v2a6 6 0 0 1-12 0v-2z" /><path d="M4 12h16" /><path d="M10 8.5c0-1.2 1-1.2 1-2.5M14 8.5c0-1.2 1-1.2 1-2.5" /></>,
    plate: <><circle cx="11" cy="12" r="7.5" /><circle cx="11" cy="12" r="3.4" /><path d="M21 5.5v13" /></>,
    stack: <><ellipse cx="12" cy="8" rx="6.5" ry="2.5" /><path d="M5.5 8v3.5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5V8" /><path d="M5.5 11.5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5" /></>,
    rice: <><path d="M4 12.5h16a8 8 0 0 1-16 0z" /><path d="M3 12.5h18" /><path d="M9 9.5l.6-1.2M12 9V7.6M15 9.5l-.6-1.2" /></>,
  };
  return (
    <svg className="dgi" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name] ?? P.plate}
    </svg>
  );
}

/** Fork-in-pin brand mark + wordmark. `ink` variant is the footer version. */
/* ---- "Find online" module glyphs (currentColor; brand tint set on the tile) ---- */

/** Instagram camera glyph. */
export function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Globe = the venue's own website. */
export function GlobeGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.6 2.5 4 5.6 4 9s-1.4 6.5-4 9c-2.6-2.5-4-5.6-4-9s1.4-6.5 4-9z" />
    </svg>
  );
}

/** Takeaway bag = Uber Eats (green brand tint on the tile). */
export function BagGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 8h12l-1 12H7L6 8z" />
      <path d="M9 8V6.2A3 3 0 0 1 12 3.2a3 3 0 0 1 3 3V8" />
    </svg>
  );
}

/** Delivery scooter = PedidosYa (red brand tint on the tile). */
export function ScooterGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="18" r="2.4" />
      <circle cx="18" cy="18" r="2.4" />
      <path d="M8.4 18h7.2M6 18l3.4-8H7M13.6 10h3.1l1.9 6M12.2 10h4" />
    </svg>
  );
}

/** Small external-link arrow. */
export function ArrowUpRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17L17 7M8 7h9v9" />
    </svg>
  );
}

/* ---- Real brand marks for the premium action rail (order / directions / share) ---- */

/** Google Maps full-colour pin (for the Directions button). */
export function GoogleMapsMark() {
  return (
    <svg viewBox="0 0 256 367" aria-hidden="true" width="18" height="18">
      <path fill="#34a853" d="M70.585 271.865a371 371 0 0 1 28.911 42.642c7.374 13.982 10.448 23.463 15.837 40.31c3.305 9.308 6.292 12.086 12.714 12.086c6.998 0 10.173-4.726 12.626-12.035c5.094-15.91 9.091-28.052 15.397-39.525c12.374-22.15 27.75-41.833 42.858-60.75c4.09-5.354 30.534-36.545 42.439-61.156c0 0 14.632-27.035 14.632-64.792c0-35.318-14.43-59.813-14.43-59.813l-41.545 11.126l-25.23 66.451l-6.242 9.163l-1.248 1.66l-1.66 2.078l-2.914 3.319l-4.164 4.163l-22.467 18.304l-56.17 32.432z"/>
      <path fill="#fbbc04" d="M12.612 188.892c13.709 31.313 40.145 58.839 58.031 82.995l95.001-112.534s-13.384 17.504-37.662 17.504c-27.043 0-48.89-21.595-48.89-48.825c0-18.673 11.234-31.501 11.234-31.501l-64.489 17.28z"/>
      <path fill="#4285f4" d="M166.705 5.787c31.552 10.173 58.558 31.53 74.893 63.023l-75.925 90.478s11.234-13.06 11.234-31.617c0-27.864-23.463-48.68-48.81-48.68c-23.969 0-37.735 17.475-37.735 17.475v-57z"/>
      <path fill="#1a73e8" d="M30.015 45.765C48.86 23.218 82.02 0 127.736 0c22.18 0 38.89 5.823 38.89 5.823L90.29 96.516H36.205z"/>
      <path fill="#ea4335" d="M12.612 188.892S0 164.194 0 128.414c0-33.817 13.146-63.377 30.015-82.649l60.318 50.759z"/>
    </svg>
  );
}

/** Uber Eats wordmark (currentColor - set the tile colour on the button). */
export function UberEatsMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M0 2.865v4.997c0 1.883 1.332 3.13 3.084 3.13a2.97 2.97 0 0 0 2.15-.877v.743h1.211V2.864H5.223v4.934c0 1.265-.87 2.12-1.995 2.122c-1.139-.002-1.997-.834-1.997-2.122V2.865zm7.363 0v7.993h1.162v-.732a3 3 0 0 0 2.118.876a3.044 3.044 0 1 0 0-6.086a2.97 2.97 0 0 0-2.107.876V2.865zm9.885 2.056a3.02 3.02 0 0 0-3.035 3.024c0 1.737 1.373 3.037 3.153 3.037a3.12 3.12 0 0 0 2.558-1.243l-.85-.618a2.05 2.05 0 0 1-1.708.858a1.97 1.97 0 0 1-1.97-1.655h4.817v-.379c0-1.734-1.254-3.024-2.964-3.024zm6.163.066a1.6 1.6 0 0 0-1.376.766v-.719h-1.163v5.824h1.174V7.546c0-.902.559-1.484 1.327-1.484h.495V4.989zm-6.203.944a1.844 1.844 0 0 1 1.834 1.486h-3.618a1.844 1.844 0 0 1 1.784-1.486m-6.659.006a2.021 2.021 0 1 1 .002 4.042a2.02 2.02 0 0 1-1.416-.598a2.02 2.02 0 0 1-.585-1.422a2.02 2.02 0 0 1 .584-1.422a2.02 2.02 0 0 1 1.415-.6M0 12.987v7.971h5.722v-1.367H1.546v-1.97H5.61v-1.315H1.545v-1.955h4.176v-1.365zm14.56.41v1.685h-1.15v1.338h1.154v3.143c0 .793.572 1.421 1.6 1.421h1.643l-.006-1.338H16.66c-.348 0-.572-.15-.572-.464v-2.768H17.8v-1.332h-1.706v-1.686zm-5.297 1.527a3.103 3.103 0 1 0 .07 6.205a3 3 0 0 0 1.913-.666v.532h1.517v-5.913h-1.509v.526a3 3 0 0 0-1.92-.684zm11.771.007c-1.585 0-2.7.644-2.7 1.886c0 .86.613 1.421 1.936 1.695l1.448.328c.57.11.722.259.722.49c0 .371-.438.603-1.127.603c-.876 0-1.378-.19-1.573-.848h-1.533c.22 1.231 1.157 2.05 3.049 2.05h.002c1.752 0 2.742-.819 2.742-1.953c0-.806-.585-1.408-1.809-1.667l-1.294-.26c-.751-.136-.988-.274-.988-.546c0-.357.361-.575 1.03-.575c.722 0 1.252.192 1.405.847h1.518c-.086-1.229-.99-2.05-2.827-2.05m-11.567 1.25c1.01.01 1.819.837 1.807 1.847A1.8 1.8 0 0 1 9.45 19.83a1.824 1.824 0 0 1 .018-3.648"/>
    </svg>
  );
}

/** PedidosYa scooter mark (currentColor). */
export function PedidosYaMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" width="20" height="20">
      <path fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M12.5 16.405c-5.21 0-7.601-2.38-6.846-9.97h25.081c6.557.097 11.825 5.939 11.765 12.963s-5.425 13.04-11.983 12.942H17.606l-1.87 6.043c-1.1 3.337-4.015 2.931-10.092 2.931l4.716-18.578h19.78c1.316 0 3.057-.923 3.057-3.342c0-2.204-1.74-2.988-3.054-2.989z"/>
    </svg>
  );
}

/** Share glyph. */
export function ShareGlyph() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

/** Heart for the save/shortlist toggle; `filled` when saved. */
export function HeartIcon({ filled = false, size = 18 }: { filled?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

export function Logo({ variant = "accent", markSize = 36 }: { variant?: "accent" | "ink"; markSize?: number }) {
  const brand = variant === "ink" ? "var(--color-ink)" : "var(--color-accent)";
  return (
    <>
      <svg width={markSize} height={markSize} viewBox="0 0 36 36" aria-hidden="true">
        <rect x="0" y="0" width="36" height="36" rx="9" fill={brand} />
        <path
          d="M18 6.5c-4.9 0-8.4 3.4-8.4 8 0 4.5 4.2 7.6 8.4 14.5 4.2-6.9 8.4-10 8.4-14.5 0-4.6-3.5-8-8.4-8z"
          fill="#FFFFFF"
        />
        <path
          d="M14.6 10.2v4.1c0 1.5 1 2.6 2.3 2.9v5h2.2v-5c1.3-.3 2.3-1.4 2.3-2.9v-4.1h-1.6v3.9h-1.1v-3.9h-1.4v3.9h-1.1v-3.9h-1.6z"
          fill={brand}
        />
      </svg>
      <svg width={markSize > 32 ? 152 : 132} height={markSize > 32 ? 26 : 24} viewBox="0 0 152 26" aria-label="EatsPanama">
        <text
          x="0"
          y="20"
          fontFamily="var(--font-display)"
          fontWeight="700"
          fontSize="21.5"
          letterSpacing="-0.6"
          fill="var(--color-ink)"
        >
          Eats
          <tspan fill="var(--color-accent)">Panama</tspan>
        </text>
      </svg>
    </>
  );
}
