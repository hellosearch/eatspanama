"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import "leaflet/dist/leaflet.css";

export interface HoodItem {
  slug: string;
  name: string;
  count: number;
  hook: string;
  cuisines: string[];
  tags: { key: string; label: string }[];
  href: string;
  lat: number;
  lng: number;
  num: number;
  photo?: { url: string; credit?: string };
  tile: "ora" | "ink" | "warm" | "deep";
}

export interface HoodLabels {
  areas: string; // "{n} areas"
  goodFor: string; // "Good for"
  reset: string; // "All"
  spots: string; // "{count} spots" template
}

export default function NeighborhoodBrowser({
  items,
  filters,
  labels,
  header,
  viewLabel,
}: {
  items: HoodItem[];
  filters: { key: string; label: string }[];
  labels: HoodLabels;
  header?: React.ReactNode;
  viewLabel: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markers = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const LRef = useRef<typeof import("leaflet") | null>(null);

  const filtered = useMemo(
    () => (filter ? items.filter((i) => i.tags.some((t) => t.key === filter)) : items),
    [items, filter]
  );

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = await import("leaflet");
      const L = ((mod as unknown as { default?: typeof import("leaflet") }).default ?? mod) as typeof import("leaflet");
      if (cancelled || !elRef.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(elRef.current, { scrollWheelZoom: true, attributionControl: true });
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      populate(filtered);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markers.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-plot pins whenever the filtered set changes.
  function populate(list: HoodItem[]) {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    for (const m of markers.current.values()) m.remove();
    markers.current.clear();
    const esc = (s: string) =>
      s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
    const bounds: [number, number][] = [];
    for (const h of list) {
      if (!Number.isFinite(h.lat) || !Number.isFinite(h.lng)) continue;
      bounds.push([h.lat, h.lng]);
      const icon = L.divIcon({
        className: "",
        html: `<span class="hb-pin" data-slug="${h.slug}">${h.num}</span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = L.marker([h.lat, h.lng], { icon, riseOnHover: true }).addTo(map);
      marker.on("mouseover", () => setActive(h.slug));
      marker.on("mouseout", () => setActive(null));
      // Click a pin -> a popup card for that neighborhood (name, count, hook, View).
      marker.bindPopup(
        `<a class="hb-pop" href="${esc(h.href)}">` +
          (h.photo ? `<span class="hb-pop-img" style="background-image:url('${esc(h.photo.url)}')"></span>` : `<span class="hb-pop-img t-${h.tile}"></span>`) +
          `<span class="hb-pop-b"><b>${esc(h.name)}</b>` +
          `<span class="hb-pop-m">${h.count} · ${esc(h.cuisines.slice(0, 2).join(" · "))}</span>` +
          `<span class="hb-pop-h">${esc(h.hook)}</span>` +
          `<span class="hb-pop-v">${esc(viewLabel)} →</span></span></a>`,
        { closeButton: true, className: "hb-popwrap", minWidth: 232, maxWidth: 232 }
      );
      markers.current.set(h.slug, marker);
    }
    const fit = () => {
      map.invalidateSize();
      if (bounds.length) map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
    };
    setTimeout(fit, 80);
    setTimeout(fit, 320);
  }

  useEffect(() => {
    populate(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  // Toggle the active pin.
  useEffect(() => {
    for (const [slug, marker] of markers.current.entries()) {
      const el = marker.getElement()?.querySelector(".hb-pin");
      if (el) el.classList.toggle("hot", slug === active);
    }
  }, [active]);

  return (
    <div className="hb">
      <div className="hb-split">
        <div className="hb-left">
          {header}
          <div className="hb-bar">
            <span className="hb-count">{labels.areas.replace("{n}", String(filtered.length))}</span>
            <span className="hb-fplabel">{labels.goodFor}:</span>
            <button className={`hb-fp${filter === null ? " on" : ""}`} onClick={() => setFilter(null)}>
              {labels.reset}
            </button>
            {filters.map((f) => (
              <button
                key={f.key}
                className={`hb-fp${filter === f.key ? " on" : ""}`}
                onClick={() => setFilter(filter === f.key ? null : f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="hb-list">
            {filtered.map((h) => (
            <a
              className={`hb-row${active === h.slug ? " active" : ""}`}
              key={h.slug}
              href={h.href}
              onMouseEnter={() => setActive(h.slug)}
              onMouseLeave={() => setActive(null)}
            >
              <div className="hb-thumb">
                <span className="hb-num">{h.num}</span>
                {h.photo ? (
                  <>
                    <Image src={h.photo.url} alt="" fill sizes="140px" className="img-cover" />
                    <span className="hb-grad" aria-hidden="true" />
                  </>
                ) : (
                  <span className={`hb-tile t-${h.tile}`} aria-hidden="true">
                    <span className="hb-motif" />
                  </span>
                )}
              </div>
              <div className="hb-body">
                <div className="hb-head">
                  <span className="hb-name">{h.name}</span>
                  <span className="hb-spots">{labels.spots.replace("{count}", String(h.count))}</span>
                </div>
                <p className="hb-hook">{h.hook}</p>
                {h.cuisines.length > 0 && <div className="hb-cz">{h.cuisines.slice(0, 3).join(" · ")}</div>}
                {h.tags.length > 0 && (
                  <div className="hb-tags">
                    {h.tags.slice(0, 3).map((t) => (
                      <span className="hb-tag" key={t.key}>{t.label}</span>
                    ))}
                  </div>
                )}
              </div>
            </a>
            ))}
          </div>
        </div>
        <div className="hb-mapcol">
          <div ref={elRef} className="hb-map rmap" role="application" aria-label="Neighborhood map" />
        </div>
      </div>
    </div>
  );
}
