"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * One delegated click listener that turns `data-ga-event` clicks (WhatsApp,
 * directions, etc.) into GA4 events - no per-element JS, mirrors CreditClicks.
 * NewsletterForm fires its own `newsletter_signup` on submit success. A no-op
 * when GA isn't loaded (NEXT_PUBLIC_GA_ID unset).
 */
export default function GaEvents() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.("[data-ga-event]") as HTMLElement | null;
      if (!el || typeof window.gtag !== "function") return;
      const name = el.getAttribute("data-ga-event");
      if (!name) return;
      const label = el.getAttribute("data-ga-label") || undefined;
      window.gtag("event", name, label ? { label } : {});
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
