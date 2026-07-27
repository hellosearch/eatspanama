"use client";

/**
 * Client-only hours table. The "today" row highlight depends on the visitor's
 * real clock, so it is computed in useEffect AFTER mount - never during SSG or
 * the first client render. That keeps the server HTML and the first client
 * render byte-identical (no date-dependent class), which eliminates the React
 * #418 hydration mismatch the old server-baked `new Date().getDay()` produced.
 */
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { DayHours } from "@/data/mock";

export default function HoursTable({ hours, locale }: { hours: DayHours[]; locale: string }) {
  const t = useTranslations("Profile");
  // null until mounted -> server + first client render emit NO "today" class.
  const [todayIdx, setTodayIdx] = useState<number | null>(null);

  useEffect(() => {
    setTodayIdx((new Date().getDay() + 6) % 7); // JS Sun..Sat -> Mon-first index
  }, []);

  return (
    <table className="hours">
      <tbody>
        {hours.map((h, i) => {
          const closed = !h.open || h.open === "Closed";
          const cls = `${i === todayIdx ? "today " : ""}${closed ? "closed" : ""}`.trim();
          // "Open 24 hours" or a blank close render as the open label alone.
          const range = !h.close || /24\s*hours/i.test(h.open) ? h.open : `${h.open} - ${h.close}`;
          return (
            <tr key={h.day_en} className={cls || undefined}>
              <td>{(locale === "es" ? h.day_es : h.day_en).slice(0, 3)}</td>
              <td>{closed ? t("closed") : range}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
