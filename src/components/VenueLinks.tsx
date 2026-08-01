import { ArrowUpRight, BagGlyph, GlobeGlyph, InstagramGlyph, ScooterGlyph } from "@/components/icons";

export type VenueLinkKind = "ubereats" | "pedidosya" | "website" | "instagram";

export interface VenueLink {
  kind: VenueLinkKind;
  label: string;
  href: string;
}

const GLYPH: Record<VenueLinkKind, () => React.ReactElement> = {
  ubereats: BagGlyph,
  pedidosya: ScooterGlyph,
  website: GlobeGlyph,
  instagram: InstagramGlyph,
};

/** Short, human host caption: the IG handle for Instagram, else the bare domain. */
function hostLabel(kind: VenueLinkKind, href: string): string {
  try {
    const u = new URL(href);
    if (kind === "instagram") {
      const handle = u.pathname.replace(/\/+$/, "").split("/").filter(Boolean).pop();
      return handle ? `@${handle}` : "Instagram";
    }
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * "Order & find online" - the venue's real external presence (delivery apps,
 * own site, Instagram) as branded tiles. Deliberately separate from the sticky
 * contact rail: the rail is how you reach or visit them (hours, address,
 * directions, WhatsApp); this is where you order from them or follow them.
 * Every link is real and verified - never a placeholder.
 *
 * Each tile emits a `<kind>_click` GA4 event (ubereats_click, pedidosya_click,
 * website_click, instagram_click) through the delegated listener in GaEvents,
 * labelled with the venue slug so reports can answer "which venues convert".
 */
export default function VenueLinks({ title, note, links, venueSlug }: { title: string; note?: string; links: VenueLink[]; venueSlug?: string }) {
  if (links.length === 0) return null;
  return (
    <section className="venue-links" aria-label={title}>
      <div className="vl-head">
        <h2 className="p-sec">{title}</h2>
        {note && <p className="vl-note">{note}</p>}
      </div>
      <div className="vl-grid">
        {links.map((l) => {
          const Glyph = GLYPH[l.kind];
          return (
            <a
              key={l.kind}
              className={`vl-tile vl-${l.kind}`}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              data-ga-event={`${l.kind}_click`}
              data-ga-label={venueSlug}
            >
              <span className="vl-ico" aria-hidden="true">
                <Glyph />
              </span>
              <span className="vl-text">
                <span className="vl-label">{l.label}</span>
                <span className="vl-host">{hostLabel(l.kind, l.href)}</span>
              </span>
              <span className="vl-arrow" aria-hidden="true">
                <ArrowUpRight />
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
