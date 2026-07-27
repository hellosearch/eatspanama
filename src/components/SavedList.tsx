"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { HeartIcon } from "@/components/icons";
import { getSaved, removeSaved, SAVED_EVENT, type SavedVenue } from "@/lib/saved";

/**
 * Renders the visitor's saved shortlist from localStorage. Pure client (the
 * list lives only in the browser). Returns null until mounted so the server
 * HTML and first client render match.
 */
export default function SavedList({
  labels,
}: {
  labels: { empty: string; emptyCta: string; emptyHref: string; remove: string; count: string };
}) {
  const [items, setItems] = useState<SavedVenue[] | null>(null);

  useEffect(() => {
    const load = () => setItems(getSaved());
    load();
    window.addEventListener(SAVED_EVENT, load);
    return () => window.removeEventListener(SAVED_EVENT, load);
  }, []);

  if (items === null) return null;

  if (!items.length) {
    return (
      <div className="saved-empty">
        <HeartIcon size={30} />
        <p>{labels.empty}</p>
        <a className="btn-accent" href={labels.emptyHref}>
          {labels.emptyCta}
        </a>
      </div>
    );
  }

  return (
    <>
      <p className="saved-count">{labels.count.replace("{count}", String(items.length))}</p>
      <div className="saved-grid">
        {items.map((v) => (
          <div className="saved-card" key={v.slug}>
            <a href={v.href} className="saved-card-link">
              {v.photo ? (
                <Image src={v.photo} alt={v.name} width={132} height={100} className="img-cover saved-thumb" />
              ) : (
                <span className="saved-thumb saved-ph" aria-hidden="true" />
              )}
              <span className="saved-body">
                <span className="saved-name">{v.name}</span>
                <span className="saved-meta">{[v.cuisine, v.price, v.hood].filter(Boolean).join(" · ")}</span>
              </span>
            </a>
            <button type="button" className="saved-remove" aria-label={labels.remove} onClick={() => removeSaved(v.slug)}>
              <HeartIcon filled size={18} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
