"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export interface AreaMarker {
  name: string;
  count: number;
  lat: number;
  lng: number;
  href: string;
}

/**
 * City-hub map: ONE labeled marker per neighborhood (name + venue count), sized
 * by count, click -> that neighborhood's page. No 775-pin clutter; the map is a
 * clean navigational overview that reinforces internal linking (SEO). The
 * detailed per-restaurant pin map lives on each neighborhood page.
 */
export default function NeighborhoodMap({ areas, className = "rmap" }: { areas: AreaMarker[]; className?: string }) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = await import("leaflet");
      const L = ((mod as unknown as { default?: typeof import("leaflet") }).default ?? mod) as typeof import("leaflet");
      if (cancelled || !elRef.current || mapRef.current) return;
      const map = L.map(elRef.current, { scrollWheelZoom: true, attributionControl: true });
      // Drop Leaflet's outbound "Leaflet" prefix link; keep the required OSM
      // credit as plain, non-clickable text (see RestaurantMap).
      map.attributionControl.setPrefix(false);
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        // OSM credit via the /go/ gateway: clickable but non-crawlable (see
        // RestaurantMap + credit-link.ts STATIC_CREDIT_LINKS.osmCopyright).
        attribution:
          '<a href="/go/325efde5d5/" rel="nofollow noopener noreferrer" target="_blank">&copy; OpenStreetMap contributors</a>',
      }).addTo(map);

      const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
      const bounds: [number, number][] = [];
      const maxCount = Math.max(...areas.map((a) => a.count), 1);
      for (const a of areas) {
        if (!Number.isFinite(a.lat) || !Number.isFinite(a.lng)) continue;
        bounds.push([a.lat, a.lng]);
        const scale = (0.86 + 0.42 * (a.count / maxCount)).toFixed(2);
        const icon = L.divIcon({
          className: "",
          html: `<a class="area-pin" href="${esc(a.href)}" style="transform:translate(-50%,-50%) scale(${scale})"><b>${esc(a.name)}</b><i>${a.count}</i></a>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });
        L.marker([a.lat, a.lng], { icon, riseOnHover: true }).addTo(map);
      }
      const frame = () => {
        mapRef.current?.invalidateSize();
        if (bounds.length) mapRef.current?.fitBounds(bounds, { padding: [46, 46] });
      };
      setTimeout(frame, 80);
      setTimeout(frame, 320);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [areas]);

  return <div ref={elRef} className={className} role="application" aria-label="Neighborhood map" />;
}
