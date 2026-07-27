"use client";

import { useEffect } from "react";

/**
 * One delegated click listener for every photo credit on the page.
 *
 * Photo credits render as <button data-credit="/go/<key>/"> rather than
 * anchors, so that no crawlable link exists for them at any point - see
 * PhotoCredit for why. This supplies the behaviour a human expects from them.
 *
 * Delegated on purpose: a listing can carry dozens of credits, and attaching a
 * handler per credit would mean hydrating dozens of components for one click
 * that will almost never happen. One listener on the document costs nothing.
 *
 * `noopener,noreferrer` mirrors what the anchor form carried: the opened tab
 * gets no window.opener handle, and the venue is not told where the click came
 * from. The destination is the internal /go/ gateway, which 302s onward - the
 * venue's own URL is never present in this document.
 */
export default function CreditClicks() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const el = (e.target as HTMLElement | null)?.closest?.("[data-credit]");
      const to = el?.getAttribute("data-credit");
      if (!to) return;
      e.preventDefault();
      window.open(to, "_blank", "noopener,noreferrer");
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
