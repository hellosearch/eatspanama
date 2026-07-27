"use client";

/**
 * Client-only "open now" pill. The server (and the first client render) emit
 * NOTHING, so the static HTML and the hydrated tree always match - this
 * eliminates the build-time-vs-hydration mismatch (React #418) that a
 * server-computed `new Date()` pill produced. After mount, it computes the
 * live open/closed state from the venue's hours against the visitor's real
 * clock, so the pill also reflects the user's "now", not the build day.
 */
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { DayHours } from "@/data/mock";
import { freshnessOf } from "@/lib/freshness";

/** "8:00 AM" / "5:00" / "10:00 PM" -> minutes since midnight, or null. */
function toMinutes(raw: string): number | null {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const mer = m[3]?.toUpperCase();
  if (mer === "PM") h = h === 12 ? 12 : h + 12;
  else if (mer === "AM") h = h === 12 ? 0 : h;
  else if (h >= 1 && h <= 6) h += 12; // no meridiem: infer evening service
  return h * 60 + min;
}

/** A valid opening for a day, or null when the day is Closed / unparseable. */
function dayOpenMinutes(h: DayHours | undefined): number | null {
  if (!h || !h.open || h.open === "Closed") return null;
  if (/24\s*hours/i.test(h.open)) return 0;
  return toMinutes(h.open);
}

// "hidden" = we deliberately show nothing (stale hours / no hours): silence
// beats a confident but possibly-wrong claim. "closed" carries the next opening
// so a closed venue still answers "when can I go?" instead of rendering null.
type PillState =
  | { kind: "hidden" }
  | { kind: "open"; close?: string }
  | { kind: "closed"; opensTime?: string; opensDay?: string };

export default function OpenNowPill({
  hours,
  lastChecked,
  locale = "en",
}: {
  hours: DayHours[];
  /** "YYYY-MM" stamp; hours older than STALE_AFTER_MONTHS stop asserting. */
  lastChecked?: string;
  /** For the localized day name in the "opens {day}" closed state. */
  locale?: string;
}) {
  const t = useTranslations("Profile");
  const [state, setState] = useState<PillState | null>(null);

  useEffect(() => {
    const now = new Date();
    // Old hours must not be presented as a live open/closed fact - show nothing.
    if (freshnessOf(lastChecked, now) === "stale") {
      setState({ kind: "hidden" });
      return;
    }
    const idx = (now.getDay() + 6) % 7; // JS Sun..Sat -> Mon-first index
    const today = hours[idx];
    const cur = now.getHours() * 60 + now.getMinutes();
    const openM = dayOpenMinutes(today);

    // Is it open right now?
    if (openM != null) {
      if (/24\s*hours/i.test(today!.open)) {
        setState({ kind: "open" });
        return;
      }
      const closeM = today!.close ? toMinutes(today!.close) : null;
      let isOpen: boolean;
      if (closeM == null) isOpen = cur >= openM;
      else if (closeM <= openM) isOpen = cur >= openM || cur < closeM; // crosses midnight
      else isOpen = cur >= openM && cur < closeM;
      if (isOpen) {
        setState({ kind: "open", close: today!.close });
        return;
      }
    }

    // Closed now: find the next opening so the pill still answers "when?".
    // Today counts only if it opens later today; otherwise scan forward a week.
    if (openM != null && cur < openM) {
      setState({ kind: "closed", opensTime: today!.open });
      return;
    }
    for (let k = 1; k <= 7; k++) {
      const d = hours[(idx + k) % 7];
      if (dayOpenMinutes(d) != null) {
        const dayName = (locale === "es" ? d!.day_es : d!.day_en).slice(0, 3);
        setState({ kind: "closed", opensTime: d!.open, opensDay: dayName });
        return;
      }
    }
    setState({ kind: "closed" }); // no known opening anywhere in the week
  }, [hours, lastChecked, locale]);

  if (!state || state.kind === "hidden") return null;

  if (state.kind === "open") {
    return (
      <span className="open-pill">
        <i aria-hidden="true" />
        {state.close ? t("openNow", { time: state.close }) : t("openNowSimple")}
      </span>
    );
  }

  // Closed: greyed pill, still useful ("Closed - opens Tue 8:00 AM").
  const label = state.opensDay
    ? t("closedOpensDay", { day: state.opensDay, time: state.opensTime! })
    : state.opensTime
      ? t("closedOpensAt", { time: state.opensTime })
      : t("closed");
  return (
    <span className="closed-pill">
      <i aria-hidden="true" />
      {label}
    </span>
  );
}
