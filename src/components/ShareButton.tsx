"use client";

import { useState } from "react";
import { ShareGlyph } from "@/components/icons";

/**
 * Share the current venue: native share sheet on mobile, copy-link fallback on
 * desktop. Pure client behaviour, no account/state.
 */
export default function ShareButton({ title, label, copiedLabel }: { title: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* user cancelled the share sheet - nothing to do */
    }
  };

  return (
    <button type="button" className="act act-gh" onClick={onClick}>
      <ShareGlyph />
      {copied ? copiedLabel : label}
    </button>
  );
}
