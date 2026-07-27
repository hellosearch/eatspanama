"use client";

import { useEffect, useState, type MouseEvent } from "react";

/**
 * Sticky "On this page" section nav (Chris: anchor-jump TOC like long-form
 * articles). Self-configuring: on mount it scans the rendered profile H2
 * headings, assigns each an id, and builds the list - so it always matches
 * exactly the sections that rendered (conditional sections included). Scrollspy
 * via IntersectionObserver highlights the current section. Desktop only (hidden
 * < 1200px via CSS).
 */
export default function SectionNav({ title }: { title: string }) {
  const [items, setItems] = useState<{ id: string; label: string }[]>([]);
  const [active, setActive] = useState("");

  useEffect(() => {
    const heads = Array.from(document.querySelectorAll<HTMLElement>(".profile h2.p-sec"));
    const list = heads
      .map((h) => {
        const raw = (h.textContent || "").trim();
        if (!raw) return null;
        if (!h.id) {
          h.id = "s-" + raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        }
        h.style.scrollMarginTop = "88px";
        // Trim the venue/hood name off headings so the TOC (and the mobile chip
        // bar) stay tight: "About X"/"Around X" -> the verb; the long "Order &
        // find X online" -> "Order online".
        const label = raw
          .replace(/^(About|Around)\s+.+/i, (_m, p1) => p1)
          .replace(/^Order & find\b.*/i, "Order online");
        return { id: h.id, label };
      })
      .filter(Boolean) as { id: string; label: string }[];
    setItems(list);

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive((e.target as HTMLElement).id);
        });
      },
      { rootMargin: "-80px 0px -68% 0px", threshold: 0 }
    );
    heads.forEach((h) => obs.observe(h));
    return () => obs.disconnect();
  }, []);

  if (items.length < 3) return null;

  const jump = (e: MouseEvent, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <>
      {/* Desktop: sticky vertical TOC in the rail. */}
      <nav className="section-nav" aria-label={title}>
        <p className="sn-title">{title}</p>
        <ul>
          {items.map((it) => (
            <li key={it.id}>
              <a href={`#${it.id}`} className={active === it.id ? "active" : ""} onClick={(e) => jump(e, it.id)}>
                {it.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {/* Mobile/tablet (< 1200px, where the vertical TOC is hidden): a sticky
          horizontal chip bar so a long profile still has jump-nav on a phone. */}
      <nav className="section-nav-m" aria-label={title}>
        {items.map((it) => (
          <a key={it.id} href={`#${it.id}`} className={active === it.id ? "active" : ""} onClick={(e) => jump(e, it.id)}>
            {it.label}
          </a>
        ))}
      </nav>
    </>
  );
}
