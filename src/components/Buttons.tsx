/**
 * Button family (locked rules):
 * - accent  = brand action (search, newsletter, brand CTAs)
 * - ghost   = secondary (call, directions)
 * - whatsapp = tap-to-book ONLY. Always WhatsApp green (token), never brand
 *   accent - the only green button family on the site.
 */
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { WhatsAppIcon } from "@/components/icons";

type Variant = "accent" | "ghost" | "wa";
type Size = "default" | "mini" | "card";

function classes(variant: Variant, size: Size, extra?: string) {
  const v = variant === "accent" ? "btn-accent" : variant === "ghost" ? "btn-ghost" : "btn-wa";
  const s = size === "mini" ? " btn-mini" : size === "card" ? " wa-card" : "";
  return `btn ${v}${s}${extra ? ` ${extra}` : ""}`;
}

export function Button({
  variant = "accent",
  size = "default",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <button className={classes(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "accent",
  size = "default",
  className,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <a className={classes(variant, size, className)} {...rest}>
      {children}
    </a>
  );
}

/**
 * WhatsApp CTA - the tap-to-book affordance. Emits `whatsapp_click` via the
 * delegated listener in GaEvents; pass `venueSlug` so the event says which
 * venue was tapped, not just that a tap happened.
 */
export function WhatsAppButton({
  href,
  label,
  size = "mini",
  venueSlug,
}: {
  href: string;
  label: string;
  size?: Size;
  venueSlug?: string;
}) {
  return (
    <ButtonLink variant="wa" size={size} href={href} target="_blank" rel="noopener noreferrer" data-ga-event="whatsapp_click" data-ga-label={venueSlug}>
      <WhatsAppIcon size={size === "card" ? 14 : size === "mini" ? 15 : 18} />
      {label}
    </ButtonLink>
  );
}
