/**
 * Presentational hub-spoke interlink module (data from lib/interlink.ts).
 * Server component; renders nothing if every section is empty. Row labels come
 * from the Interlink message namespace keyed by section.key.
 */
import { getTranslations } from "next-intl/server";
import type { IlSection } from "@/lib/interlink";

export default async function InterlinkModule({
  locale,
  sections,
}: {
  locale: string;
  sections: IlSection[];
}) {
  const visible = sections.filter((s) => s.links.length > 0);
  if (!visible.length) return null;
  const t = await getTranslations({ locale, namespace: "Interlink" });

  return (
    <section className="block interlink">
      <div className="il-card">
        <p className="il-cap">{t("keepExploring")}</p>
        {visible.map((s) => (
          <div className="il-row" key={s.key}>
            <span className="il-lb">{t(s.key)}</span>
            <span className="il-lnks">
              {s.links.map((l) => (
                <a key={l.href} href={l.href}>
                  {l.name}
                  {l.count != null && <span className="il-c">{l.count}</span>}
                </a>
              ))}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
