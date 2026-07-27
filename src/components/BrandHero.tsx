/**
 * v2 cuisine-keyed branded hero (Basic tier: NO photos). A colored block +
 * motif keyed off the venue's primary cuisine, with a "Claim this listing"
 * affordance. Ported 1:1 from design/templates/profile-samples-v2.html:
 *  - green  = healthy / international / plant-forward
 *  - coral  = Caribbean / Panamanian / seafood
 *  - (default) accent tint = everything else
 */

type HeroKey = "green" | "coral" | "";

const GREEN = /(healthy|vegan|vegetarian|salad|poke|juice|bowl|brunch|wellness)/;
const CORAL = /(caribbean|panamanian|seafood|ceviche|marisco|fish|nikkei|peruvian|latin|afro)/;

export function heroKeyFor(cuisines: string[]): HeroKey {
  const s = cuisines.join(" ").toLowerCase();
  if (CORAL.test(s)) return "coral";
  if (GREEN.test(s)) return "green";
  return "";
}

function LeafIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="#2EA05A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="24" cy="24" r="13" />
      <path d="M30 17c-6 1-10 5-11 11 6-1 10-5 11-11z" />
      <path d="M19 28c2.5-2.5 5.5-4.5 9-6" />
    </svg>
  );
}
function LeafDeco() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="#2EA05A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M40 8C22 10 10 22 8 40c18-2 30-14 32-32z" />
      <path d="M14 34c6-6 13-11 22-15" />
    </svg>
  );
}
function FishIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="#FF5A1F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21c5-6 15-6 20 0-5 6-15 6-20 0z" />
      <path d="M29 21l8-5v10z" />
      <circle cx="16" cy="19.5" r="1.2" fill="#FF5A1F" stroke="none" />
      <path d="M8 33c2-2.4 4.5-2.4 6.5 0s4.5 2.4 6.5 0 4.5-2.4 6.5 0 4.5 2.4 6.5 0" />
    </svg>
  );
}
function WaveDeco() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="#FF5A1F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 18c4-5 8-5 12 0s8 5 12 0 8-5 12 0" />
      <path d="M4 30c4-5 8-5 12 0s8 5 12 0 8-5 12 0" />
    </svg>
  );
}
function PlateIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="#FF5A1F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="24" cy="24" r="13" />
      <circle cx="24" cy="24" r="6.5" />
      <path d="M14 12v7M35 12v9c0 1.5-1.4 2-2 2" />
    </svg>
  );
}
function PlateDeco() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="#FF5A1F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="24" r="18" />
      <circle cx="24" cy="24" r="9" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <circle cx="12" cy="13" r="3.4" />
      <path d="M8 6l1.6-2.6h4.8L16 6" />
    </svg>
  );
}

export default function BrandHero({
  cuisineLabel,
  hoodCity,
  cuisines,
  noPhotosNote,
  brandedFlag,
  claimLabel,
}: {
  cuisineLabel: string;
  hoodCity: string;
  cuisines: string[];
  noPhotosNote: string;
  brandedFlag: string;
  claimLabel: string;
}) {
  const key = heroKeyFor(cuisines);
  const Icon = key === "green" ? LeafIcon : key === "coral" ? FishIcon : PlateIcon;
  const Deco = key === "green" ? LeafDeco : key === "coral" ? WaveDeco : PlateDeco;
  return (
    <div className={`brand-hero${key ? ` hero-${key}` : ""}`}>
      <div className="bh-left">
        <div className="bh-icon">
          <Icon />
        </div>
        <div>
          <p className="bh-cuisine">{cuisineLabel}</p>
          <p className="bh-hood">{hoodCity}</p>
          <p className="bh-note">{noPhotosNote}</p>
        </div>
      </div>
      <div className="bh-right">
        <span className="bh-flag">{brandedFlag}</span>
        <button className="btn btn-ghost" type="button">
          <CameraIcon />
          {claimLabel}
        </button>
      </div>
      <div className="bh-deco" aria-hidden="true">
        <Deco />
      </div>
    </div>
  );
}
