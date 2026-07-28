/**
 * Trust grammar primitives (locked component rules):
 * - VerifiedStamp: accentTint fill + accentDeep text + check glyph
 * - UpdatedStamp: ink fill + white text (also carries ADDED / RE-VISITED tags)
 * - CountPill: tabular numbers + tangerine dot
 */
import type { ReactNode } from "react";
import { CheckIcon } from "@/components/icons";

export function VerifiedStamp({ children }: { children: ReactNode }) {
  return (
    <span className="badge-verified">
      <CheckIcon />
      {children}
    </span>
  );
}

export function UpdatedStamp({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={`badge-date${className ? ` ${className}` : ""}`}>{children}</span>;
}

export function CountPill({ children, href }: { children: ReactNode; href?: string }) {
  const inner = (
    <>
      <i aria-hidden="true" />
      {children}
    </>
  );
  // When an href is passed the pill becomes a real, tappable link (used for the
  // homepage "15 neighborhoods" / "3 guides" kicker); otherwise it is a static
  // count badge.
  return href ? (
    <a className="count-pill count-pill-link" href={href}>
      {inner}
    </a>
  ) : (
    <span className="count-pill">{inner}</span>
  );
}
