"use client";

import { useState } from "react";
import { Button } from "@/components/Buttons";

/**
 * Newsletter signup form. Progressive enhancement: with JS it POSTs JSON to
 * /api/subscribe and shows inline feedback; without JS the native form still
 * posts to the same endpoint, which redirects back to /newsletter/ with a flag.
 * A hidden honeypot ("company") catches bots. Used by the band + the page.
 */
export default function NewsletterForm({
  locale,
  placeholder,
  ariaLabel,
  buttonLabel,
  className,
}: {
  locale: string;
  placeholder?: string;
  ariaLabel: string;
  buttonLabel: string;
  className?: string;
}) {
  const es = locale === "es";
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement)?.value.trim() ?? "";
    const company = (form.elements.namedItem("company") as HTMLInputElement)?.value ?? "";
    if (!email) return;
    setStatus("loading");
    try {
      const r = await fetch("/api/subscribe/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale, company }),
      });
      if (r.ok) {
        (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.("event", "newsletter_signup", { method: "site" });
      }
      setStatus(r.ok ? "ok" : "err");
    } catch {
      setStatus("err");
    }
  };

  if (status === "ok") {
    return <p className="nl-ok">{es ? "¡Listo! Te escribimos pronto." : "You're on the list. Talk soon."}</p>;
  }

  return (
    <form className={className} action="/api/subscribe/" method="post" onSubmit={onSubmit}>
      <input type="email" name="email" required placeholder={placeholder} aria-label={ariaLabel} />
      {/* Honeypot: hidden from people, tempting to bots. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />
      <input type="hidden" name="locale" value={locale} />
      <Button type="submit" variant="accent" disabled={status === "loading"}>
        {status === "loading" ? (es ? "Enviando..." : "Sending...") : buttonLabel}
      </Button>
      {status === "err" && (
        <span className="nl-err" role="alert">
          {es ? "Hubo un problema. Intenta de nuevo." : "Something went wrong. Try again."}
        </span>
      )}
    </form>
  );
}
