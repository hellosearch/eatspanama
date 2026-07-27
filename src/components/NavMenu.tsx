"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";

/**
 * A nav dropdown (Neighborhoods / Cuisines / Guides).
 *
 * Two affordances, on purpose:
 *  - the LABEL is a real link to the section's landing page, so a CLICK
 *    navigates there (e.g. Neighborhoods -> /panama-city/).
 *  - the CARET is a button that toggles the panel, for keyboard users and for
 *    the mobile burger drawer where there is no hover.
 * On desktop the panel also opens on HOVER, handled in CSS (.navmenu:hover),
 * so pointer users never have to click the caret.
 *
 * The item links are always in the DOM (CSS-collapsed) so they stay crawlable.
 * Closes on outside-click and Escape.
 */
export default function NavMenu({
  label,
  href,
  items,
  allHref,
  allLabel,
}: {
  label: string;
  /** Landing page the LABEL navigates to on click. */
  href: string;
  items: { label: string; href: string }[];
  allHref: string;
  allLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div className={`navmenu${open ? " open" : ""}`} ref={ref}>
      <span className="navmenu-trigger">
        <Link href={href} className="navmenu-btn" onClick={() => setOpen(false)}>
          {label}
        </Link>
        <button
          type="button"
          className="navmenu-caret-btn"
          aria-expanded={open}
          aria-haspopup="true"
          aria-label={`${label} menu`}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="navmenu-caret" aria-hidden="true" />
        </button>
      </span>
      <div className="navmenu-panel" role="menu">
        <div className="navmenu-cols">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className="navmenu-item" role="menuitem" onClick={() => setOpen(false)}>
              {it.label}
            </Link>
          ))}
        </div>
        <Link href={allHref} className="navmenu-all" onClick={() => setOpen(false)}>
          {allLabel} →
        </Link>
      </div>
    </div>
  );
}
