/**
 * Branded neighborhood hero for listing pages. The 15 real neighborhood
 * records carry NO imagery (photos come only from owner-claim / editorial
 * visits later), so instead of a broken photo grid the listing head shows a
 * consistent branded block: colored panel + neighborhood name + venue count +
 * top cuisines. Cuisine-keyed color matches the venue BrandHero (green /
 * coral / accent), so profiles and listings feel like one system.
 */
import { heroKeyFor } from "@/components/BrandHero";

export default function NeighborhoodHero({
  name,
  cityName,
  countLabel,
  topCuisines = [],
}: {
  name: string;
  cityName: string;
  countLabel: string;
  topCuisines?: string[];
}) {
  const key = heroKeyFor(topCuisines);
  return (
    <div className={`hood-hero${key ? ` hero-${key}` : ""}`} aria-hidden="true">
      <div className="hh-body">
        <p className="hh-city">{cityName}</p>
        <p className="hh-name">{name}</p>
        <p className="hh-count">{countLabel}</p>
        {topCuisines.length > 0 && (
          <div className="hh-tags">
            {topCuisines.slice(0, 4).map((c) => (
              <span className="hh-tag" key={c}>
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
      <svg className="hh-deco" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="24" r="18" />
        <circle cx="24" cy="24" r="9" />
      </svg>
    </div>
  );
}
