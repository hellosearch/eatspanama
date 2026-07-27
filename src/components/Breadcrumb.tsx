import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/jsonld";

export interface Crumb {
  name: string;
  href?: string; // absolute or root-relative; last crumb has none
  absUrl?: string; // absolute URL for the BreadcrumbList schema
}

/**
 * Breadcrumb trail + BreadcrumbList JSON-LD (always emitted together - the
 * approved SEO rules require both on every templated page).
 * `variant="article"` renders the narrower guide-column style.
 */
export default function Breadcrumb({ crumbs, variant = "page" }: { crumbs: Crumb[]; variant?: "page" | "article" }) {
  return (
    <>
      <nav className={variant === "article" ? "g-crumbs" : "crumbs"} aria-label="Breadcrumb">
        <ol>
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <li key={i}>
                {/* Only the final crumb is the current page. A middle crumb
                    without an href renders as plain text - never a second
                    aria-current (a duplicate confuses assistive tech). */}
                {last ? (
                  <b aria-current="page">{c.name}</b>
                ) : c.href ? (
                  <a href={c.href}>{c.name}</a>
                ) : (
                  <span>{c.name}</span>
                )}
                {!last && (
                  <span className="sep" aria-hidden="true">
                    /
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd data={breadcrumbJsonLd(crumbs.map((c) => ({ name: c.name, url: c.absUrl })))} />
    </>
  );
}
