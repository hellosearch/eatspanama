"use client";

import { useState } from "react";
import { MapPin } from "@/components/icons";

/**
 * Google Maps embed for the profile "Where it is" section, behind a
 * click-to-load facade. The keyless `maps.google.com/...&output=embed` iframe
 * sets third-party cookies (_GRECAPTCHA, __Secure-OSID) and pulls a heavy Google
 * bundle on load - on ~1,300 venue pages that is a real privacy + performance
 * cost and drops Lighthouse Best Practices. The facade is pure CSS (no Google
 * request) until the visitor clicks; only then does the iframe mount. Directions
 * still deep-link to Google Maps from the profile regardless.
 *
 * Swap to the Google Maps Embed API URL once the API key is provisioned at
 * preflight (M32); CSP frame-src already allows maps.google.com + www.google.com.
 */
export function MapEmbed({
  lat,
  lng,
  title,
  loadLabel,
  zoom = 16,
  className = "map-embed",
  eager = false,
}: {
  lat: number;
  lng: number;
  title: string;
  /** Localized "Load map" call to action. */
  loadLabel: string;
  zoom?: number;
  className?: string;
  /** Premium pages preload the map (skip the click-to-load facade) - the few
   *  premium venues can absorb the privacy/perf cost for a nicer first look. */
  eager?: boolean;
}) {
  const [loaded, setLoaded] = useState(eager);
  const src = `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;

  if (loaded) {
    return (
      <div className={className}>
        <iframe
          src={src}
          title={title}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          aria-label={title}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        className="map-facade"
        onClick={() => setLoaded(true)}
        aria-label={`${loadLabel}: ${title}`}
      >
        <span className="map-facade-grid" aria-hidden="true" />
        <span className="map-facade-pin" aria-hidden="true">
          <MapPin />
        </span>
        <span className="map-facade-cta">{loadLabel}</span>
      </button>
    </div>
  );
}
