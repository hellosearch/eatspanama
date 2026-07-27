"use client";

import { useEffect, useState } from "react";
import { HeartIcon } from "@/components/icons";
import { getSaved, SAVED_EVENT } from "@/lib/saved";

/**
 * Header link to the shortlist, with a live count badge. Count is null until
 * mount (server + first paint render no badge) so hydration matches.
 */
export default function SavedCount({ href, label }: { href: string; label: string }) {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    const load = () => setN(getSaved().length);
    load();
    window.addEventListener(SAVED_EVENT, load);
    return () => window.removeEventListener(SAVED_EVENT, load);
  }, []);
  return (
    <a href={href} className="saved-link" aria-label={n ? `${label} (${n})` : label}>
      <HeartIcon size={18} />
      {n ? <span className="saved-badge">{n}</span> : null}
    </a>
  );
}
