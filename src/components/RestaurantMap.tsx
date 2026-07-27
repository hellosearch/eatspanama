"use client";

import { useEffect, useRef } from "react";
// Leaflet CSS is side-effect-only (no window access) so it is safe at module top.
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

export interface MapPin {
  slug: string;
  name: string;
  cuisine: string;
  price: string;
  lat: number;
  lng: number;
  href: string;
  photo?: string;
}

/**
 * Interactive restaurant discovery map (Leaflet + OpenStreetMap raster tiles,
 * no API key). The map is created ONCE; the marker set is (re)populated whenever
 * `pins` changes (e.g. live filtering) without tearing down the map - so
 * filtering updates the pins smoothly and re-frames to the filtered results.
 * Brand-tinted div-icon markers avoid Leaflet's default-icon image-path problem.
 */
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export default function RestaurantMap({
  pins,
  activeSlug,
  onHover,
  onSearchArea,
  searchAreaLabel = "Search this area",
  suppressAutoFit = false,
  viewLabel = "View",
  className = "rmap",
}: {
  pins: MapPin[];
  activeSlug?: string | null;
  onHover?: (slug: string | null) => void;
  /** Called with the current map bounds when the visitor clicks "Search this
   *  area" after panning. When set, that button appears on user map moves. */
  onSearchArea?: (bounds: MapBounds) => void;
  searchAreaLabel?: string;
  /** True while an area filter is active - keep the map where the visitor put
   *  it (don't auto-reframe to the filtered pins). */
  suppressAutoFit?: boolean;
  viewLabel?: string;
  className?: string;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const clusterRef = useRef<import("leaflet").MarkerClusterGroup | null>(null);
  const markersRef = useRef<Record<string, import("leaflet").Marker>>({});
  const onHoverRef = useRef(onHover);
  onHoverRef.current = onHover;
  const onSearchAreaRef = useRef(onSearchArea);
  onSearchAreaRef.current = onSearchArea;
  const searchLabelRef = useRef(searchAreaLabel);
  searchLabelRef.current = searchAreaLabel;
  const suppressFitRef = useRef(suppressAutoFit);
  suppressFitRef.current = suppressAutoFit;
  const searchBtnRef = useRef<HTMLButtonElement | null>(null);
  // True while a programmatic fitBounds is in flight, so its moveend does NOT
  // pop the "Search this area" button (that button is for USER pans only).
  const progRef = useRef(false);

  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

  const populate = (pinList: MapPin[]) => {
    const Lm = LRef.current;
    const cluster = clusterRef.current;
    const map = mapRef.current;
    if (!Lm || !cluster || !map) return;
    cluster.clearLayers();
    markersRef.current = {};
    const bounds: [number, number][] = [];
    // 24x24 icon box = a >=24px tap target (WCAG 2.5.8 / target-size); the
    // visible 15px pin is flex-centered inside it, so the map looks unchanged
    // but each marker is comfortably tappable.
    // Labeled pins: show the price glyph ($/$$/$$$) on the marker so the map is
    // scannable without opening each popup; a plain dot when price is unknown.
    const icon = (price: string) =>
      price
        ? Lm.divIcon({ className: "rpin-marker rpin-priced", html: `<span class="rpin-label">${esc(price)}</span>`, iconSize: [34, 22], iconAnchor: [17, 11] })
        : Lm.divIcon({ className: "rpin-marker", html: `<span class="rpin"></span>`, iconSize: [24, 24], iconAnchor: [12, 12] });
    for (const p of pinList) {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
      bounds.push([p.lat, p.lng]);
      // title + alt give the marker an accessible name (Leaflet writes both onto
      // the focusable .leaflet-marker-icon element); without them screen readers
      // and Lighthouse see an unnamed button per pin (aria-command-name).
      const label = p.cuisine ? `${p.name} - ${p.cuisine}` : p.name;
      const m = Lm.marker([p.lat, p.lng], { icon: icon(p.price), riseOnHover: true, title: label, alt: label });
      const thumb = p.photo
        ? `<span class="rpop-thumb" style="background-image:url('${esc(p.photo)}')"></span>`
        : `<span class="rpop-thumb"></span>`;
      m.bindPopup(
        `<div class="rpop">${thumb}<span class="rpop-body"><b>${esc(p.name)}</b>` +
          `<span class="rpop-meta">${esc(p.cuisine)}${p.price ? " &middot; " + esc(p.price) : ""}</span>` +
          `<a class="rpop-btn" href="${esc(p.href)}">${esc(viewLabel)} &rarr;</a></span></div>`,
        { closeButton: true, minWidth: 220, autoPan: true }
      );
      m.on("mouseover", () => onHoverRef.current?.(p.slug));
      m.on("mouseout", () => onHoverRef.current?.(null));
      m.on("click", () => onHoverRef.current?.(p.slug));
      markersRef.current[p.slug] = m;
      cluster.addLayer(m);
    }
    // Frame the filtered set (trim outliers when many, so one bad geocode can't
    // blow out the zoom). Re-run after the container has settled its size.
    const fit = () => {
      map.invalidateSize();
      // While an area filter is active, keep the visitor's current view.
      if (suppressFitRef.current || !bounds.length) return;
      let fb = bounds;
      if (bounds.length > 20) {
        const lat = bounds.map((b) => b[0]).sort((a, b) => a - b);
        const lng = bounds.map((b) => b[1]).sort((a, b) => a - b);
        const q = (arr: number[], p: number) => arr[Math.floor((arr.length - 1) * p)];
        fb = [[q(lat, 0.03), q(lng, 0.03)], [q(lat, 0.97), q(lng, 0.97)]];
      }
      progRef.current = true; // this move is programmatic - don't pop the button
      map.fitBounds(fb, { padding: [28, 28], maxZoom: 17 });
    };
    // Run twice: once soon, once after the sticky/grid container has fully
    // settled its height, so the frame is tight (not zoomed out).
    setTimeout(fit, 80);
    setTimeout(fit, 320);
  };

  // Create the map ONCE.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = await import("leaflet");
      const Lm = ((mod as unknown as { default?: typeof import("leaflet") }).default ?? mod) as typeof import("leaflet");
      await import("leaflet.markercluster");
      if (cancelled || !elRef.current || mapRef.current) return;
      LRef.current = Lm;
      const map = Lm.map(elRef.current, { scrollWheelZoom: true, attributionControl: true });
      mapRef.current = map;
      Lm.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      const cluster = (Lm as unknown as { markerClusterGroup: (o?: unknown) => import("leaflet").MarkerClusterGroup }).markerClusterGroup({
        showCoverageOnHover: false,
        // Airbnb-style: keep restaurants as individual, clickable pins at
        // neighborhood zoom - only cluster tight overlaps, and spiderfy (fan out)
        // the rest so no venue is ever un-clickable.
        maxClusterRadius: 34,
        disableClusteringAtZoom: 15,
        spiderfyOnMaxZoom: true,
      });
      clusterRef.current = cluster;
      map.addLayer(cluster);

      // "Search this area" control: a Leaflet control (positioned by Leaflet, so
      // no effect on the map container's sizing) that appears after a USER pan
      // and re-queries the list to the current map bounds on click.
      const ctrl = new Lm.Control({ position: "topright" });
      ctrl.onAdd = () => {
        const btn = Lm.DomUtil.create("button", "map-search-area") as HTMLButtonElement;
        btn.type = "button";
        btn.textContent = searchLabelRef.current;
        btn.style.display = "none";
        Lm.DomEvent.on(btn, "click", (e) => {
          Lm.DomEvent.stop(e);
          const b = map.getBounds();
          onSearchAreaRef.current?.({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
          btn.style.display = "none";
        });
        Lm.DomEvent.disableClickPropagation(btn);
        searchBtnRef.current = btn;
        return btn;
      };
      ctrl.addTo(map);
      map.on("moveend", () => {
        if (progRef.current) {
          progRef.current = false;
          return;
        }
        if (searchBtnRef.current && onSearchAreaRef.current) searchBtnRef.current.style.display = "block";
      });

      populate(pins);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      clusterRef.current = null;
      LRef.current = null;
      markersRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-populate markers when the filtered pin set changes (map stays alive).
  useEffect(() => {
    if (mapRef.current && clusterRef.current) populate(pins);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins]);

  // Emphasize the active marker (hover sync from the list).
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([slug, m]) => {
      const el = m.getElement()?.querySelector(".rpin");
      if (el) el.classList.toggle("active", slug === activeSlug);
    });
  }, [activeSlug, pins]);

  return <div ref={elRef} className={className} role="application" aria-label="Restaurant map" />;
}
