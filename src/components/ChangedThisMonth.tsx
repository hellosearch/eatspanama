import type { ChangeEntry } from "@/data/mock";
import { UpdatedStamp } from "@/components/badges";

/**
 * "What's changed this month" - the listing-page freshness module (approved
 * acceptance criterion): additions, removals and re-visits from the month's
 * neighborhood walk, styled with the system's ink date tags.
 */
export default function ChangedThisMonth({ entries, locale }: { entries: ChangeEntry[]; locale: string }) {
  if (!entries.length) return null;
  return (
    <div className="changelog">
      {entries.map((e, i) => (
        <div className="change-row" key={i}>
          <UpdatedStamp className={e.type}>
            {locale === "es" ? e.date_label_es : e.date_label_en}
          </UpdatedStamp>
          <p>
            <b>{e.venue_name}.</b> {locale === "es" ? e.note_es : e.note_en}
          </p>
        </div>
      ))}
    </div>
  );
}
