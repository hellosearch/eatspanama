"use client";

/**
 * List / Map toggle for the search page. Search is the single "explore all
 * venues" surface: the list is the query results (or the empty-state prompt),
 * the map is the same set of venues pinned (all city venues when there is no
 * query, so /search/?view=map is a full-city map). The list stays in the DOM
 * (hidden) so it is never re-rendered on toggle; the map mounts only when shown
 * so Leaflet initializes once.
 */
import { useState } from "react";
import RestaurantMap, { type MapPin } from "@/components/RestaurantMap";

export default function SearchViewToggle({
  pins,
  initialView,
  listLabel,
  mapLabel,
  viewLabel,
  children,
}: {
  pins: MapPin[];
  initialView: "list" | "map";
  listLabel: string;
  mapLabel: string;
  viewLabel: string;
  children: React.ReactNode;
}) {
  const [view, setView] = useState<"list" | "map">(initialView);

  return (
    <div className="search-view">
      <div className="sv-toggle" role="tablist" aria-label={`${listLabel} / ${mapLabel}`}>
        <button
          type="button"
          role="tab"
          aria-selected={view === "list"}
          className={"sv-tab" + (view === "list" ? " on" : "")}
          onClick={() => setView("list")}
        >
          {listLabel}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "map"}
          className={"sv-tab" + (view === "map" ? " on" : "")}
          onClick={() => setView("map")}
        >
          {mapLabel}
        </button>
      </div>

      <div className="sv-list" hidden={view !== "list"}>
        {children}
      </div>
      {view === "map" && (
        <div className="sv-map">
          <RestaurantMap pins={pins} viewLabel={viewLabel} className="rmap search-map" />
        </div>
      )}
    </div>
  );
}
