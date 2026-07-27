import type { ReactNode } from "react";

/**
 * Filter / fact chip. `interactive` renders a button (filter bars - wiring to
 * real query params is a later ticket with Typesense); otherwise a static
 * span (fact chips on profiles/guides).
 */
export default function FilterChip({
  children,
  active = false,
  price = false,
  interactive = false,
  href,
  title,
}: {
  children: ReactNode;
  active?: boolean;
  price?: boolean;
  interactive?: boolean;
  href?: string;
  /** Hover/assistive explanation, e.g. "estimated from menu prices". */
  title?: string;
}) {
  const cls = `chip${active ? " active" : ""}${price ? " price" : ""}${!interactive && !href ? " static" : ""}`;
  if (href) {
    return (
      <a className={cls} href={href} title={title}>
        {children}
      </a>
    );
  }
  if (interactive) {
    return (
      <button type="button" className={cls} title={title}>
        {children}
      </button>
    );
  }
  return (
    <span className={cls} title={title}>
      {children}
    </span>
  );
}
