"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Header shell. On phones the desktop `.links` nav is hidden, so without this
 * the Neighborhoods / Cuisines / Guides nav is unreachable on mobile: the
 * burger re-opens that same nav as a drawer (no duplicated markup, so the
 * links stay single-sourced and crawlable).
 */
export default function NavShell({
  menuLabel,
  children,
}: {
  menuLabel: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on navigation and on Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open]);

  return (
    <header className={`nav${open ? " mnav-open" : ""}`}>
      {children}
      <button
        type="button"
        className="nav-burger"
        aria-expanded={open}
        aria-label={menuLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>
    </header>
  );
}
