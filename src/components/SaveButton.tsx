"use client";

import { useEffect, useState } from "react";
import { HeartIcon } from "@/components/icons";
import { isSaved, toggleSaved, SAVED_EVENT, type SavedVenue } from "@/lib/saved";

/**
 * Save/shortlist toggle. Anonymous, localStorage-backed. Renders a neutral
 * (unsaved) shell on the server / first client paint and only reflects the real
 * saved state after mount, so the static HTML and the hydrated tree match (no
 * React #418). Syncs with every other SaveButton + the header count via a
 * window event. `variant="chip"` is the compact card corner; default is the
 * labelled rail button.
 */
export default function SaveButton({
  venue,
  locale,
  variant = "button",
}: {
  venue: SavedVenue;
  locale: string;
  variant?: "button" | "chip";
}) {
  const [on, setOn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const saveLabel = locale === "es" ? "Guardar" : "Save";
  const savedLabel = locale === "es" ? "Guardado" : "Saved";

  useEffect(() => {
    setMounted(true);
    setOn(isSaved(venue.slug));
    const sync = () => setOn(isSaved(venue.slug));
    window.addEventListener(SAVED_EVENT, sync);
    return () => window.removeEventListener(SAVED_EVENT, sync);
  }, [venue.slug]);

  const active = mounted && on;
  const label = active ? savedLabel : saveLabel;
  const cls = variant === "chip" ? "save-chip" : "act save-btn";

  return (
    <button
      type="button"
      className={`${cls}${active ? " on" : ""}`}
      aria-pressed={mounted ? on : undefined}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOn(toggleSaved(venue));
      }}
    >
      <HeartIcon filled={active} />
      {variant === "button" && <span>{label}</span>}
    </button>
  );
}
