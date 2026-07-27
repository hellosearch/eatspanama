"use client";

/**
 * The line under the hours table. Its wording escalates with the age of the
 * `last_checked` stamp, because on a statically generated page the stamp keeps
 * ageing long after the HTML was written.
 *
 * Like OpenNowPill and HoursTable, the age is measured against the VISITOR's
 * clock after mount. The first client render must match the server HTML, so it
 * starts on the neutral wording and escalates once mounted.
 */
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { freshnessOf, type FreshnessLevel } from "@/lib/freshness";

export default function HoursNote({
  month,
  lastChecked,
}: {
  /** Pre-formatted month, e.g. "July 2026" (formatting stays server-side). */
  month: string;
  /** Raw "YYYY-MM" stamp. */
  lastChecked?: string;
}) {
  const t = useTranslations("Profile");
  const [level, setLevel] = useState<FreshnessLevel>("fresh");

  useEffect(() => setLevel(freshnessOf(lastChecked, new Date())), [lastChecked]);

  if (level === "fresh") return <p className="last-checked">{t("lastChecked", { month })}</p>;
  return (
    <p className={`last-checked ${level === "stale" ? "hours-stale" : "hours-aging"}`}>
      {t(level === "stale" ? "hoursStale" : "hoursAging", { month })}
    </p>
  );
}
