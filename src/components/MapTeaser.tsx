import { MapPin } from "@/components/icons";

/**
 * Static map placeholders (grid + tangerine dots), 1:1 from the comps.
 * TODO(maps): swap for a real static-map/interactive map in the maps ticket -
 * keep the ink-bordered teaser frame and dot styling.
 */

const TEASER_DOTS = [
  { left: "22%", top: "24%" },
  { left: "48%", top: "40%" },
  { left: "66%", top: "20%" },
  { left: "35%", top: "58%" },
  { left: "74%", top: "52%" },
];

export function MapTeaser({ label }: { label: string }) {
  return (
    <div className="map-teaser" aria-hidden="true">
      {TEASER_DOTS.map((d, i) => (
        <span key={i} className="mdot" style={{ left: d.left, top: d.top }} />
      ))}
      <span className="see-map">{label}</span>
    </div>
  );
}

const PANEL_DOTS = [
  { left: "18%", top: "28%" },
  { left: "33%", top: "66%" },
  { left: "41%", top: "22%" },
  { left: "58%", top: "70%" },
  { left: "64%", top: "30%" },
  { left: "77%", top: "62%" },
  { left: "84%", top: "24%" },
];

// MapEmbed moved to ./MapEmbed.tsx (client component) - it now renders a
// click-to-load facade so Google Maps' iframe (and its third-party cookies /
// heavy bundle) only loads on user interaction.

export function MapPanel({
  ariaLabel,
  pinLabel,
  profile = false,
  showDots = true,
}: {
  ariaLabel: string;
  pinLabel: string;
  profile?: boolean;
  showDots?: boolean;
}) {
  return (
    <div className={`map-ph${profile ? " profile" : ""}`} role="img" aria-label={ariaLabel}>
      <span className="road" style={{ left: 0, right: 0, top: "56%", height: 10 }} />
      <span className="road" style={{ top: 0, bottom: 0, left: "26%", width: 10 }} />
      <span className="road" style={{ top: 0, bottom: 0, left: "70%", width: 8 }} />
      {showDots &&
        PANEL_DOTS.map((d, i) => <span key={i} className="mdot" style={{ left: d.left, top: d.top }} />)}
      <MapPin />
      <span className="pin-label">{pinLabel}</span>
    </div>
  );
}
