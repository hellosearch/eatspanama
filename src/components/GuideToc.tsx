"use client";

import { useEffect, useState } from "react";

/**
 * Sticky "In this guide" anchor nav for guide articles - the same sticky
 * side-rail + scrollspy the venue profile uses (SectionNav), but built directly
 * from `guide.toc` because each entry already renders `id={venue.slug}` on its
 * `article.g-venue`. No DOM scan needed. Desktop only (hidden < 1200px via CSS;
 * the inline TocCard covers small screens).
 */
export default function GuideToc({
  title,
  items,
}: {
  title: string;
  items: { slug: string; name: string }[];
}) {
  const [active, setActive] = useState("");

  useEffect(() => {
    const heads = items
      .map((it) => document.getElementById(it.slug))
      .filter((el): el is HTMLElement => !!el);
    heads.forEach((h) => (h.style.scrollMarginTop = "88px"));

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
  }, [items]);

  if (items.length < 3) return null;

  return (
    <nav className="section-nav guide-toc" aria-label={title}>
      <p className="sn-title">{title}</p>
      <ul>
        {items.map((it, i) => (
          <li key={it.slug}>
            <a
              href={`#${it.slug}`}
              className={active === it.slug ? "active" : ""}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(it.slug)?.scrollIntoView({ behavior: "smooth", block: "start" });
                history.replaceState(null, "", `#${it.slug}`);
              }}
            >
              <span className="gt-n">{String(i + 1).padStart(2, "0")}</span>
              {it.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
