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

export function CountPill({ children }: { children: ReactNode }) {
  return (
    <span className="count-pill">
      <i aria-hidden="true" />
      {children}
    </span>
  );
}
