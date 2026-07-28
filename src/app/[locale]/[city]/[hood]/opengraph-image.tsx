import { ImageResponse } from "next/og";
import { allNeighborhoods, getCity, getNeighborhood, getVenue } from "@/lib/data";
import { getBrand } from "@/lib/brands";
import { localizeVenue } from "@/lib/localize";
import { cleanCuisine } from "@/lib/format";
import { cuisineLabelEs } from "@/lib/hub-copy";
import { ogCard } from "@/og/card";
import { ogFonts, OG_SIZE } from "@/og/fonts";

/**
 * Social card for the second city segment (neighborhood | brand | venue),
 * resolved in the same order as the page. Generated on demand + CDN-cached
 * (no build-time fan-out over ~1,300 venues). See src/og/card.tsx.
 */
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "EatsPanama";
export const dynamicParams = true;
export function generateStaticParams() {
  return [] as { city: string; hood: string }[];
}

const cityName = (locale: string) => (locale === "es" ? "Ciudad de Panamá" : "Panama City");

export default async function Image({ params }: { params: Promise<{ locale: string; city: string; hood: string }> }) {
  const { locale, city, hood } = await params;
  const fonts = await ogFonts();
  const es = locale === "es";

  // 1) neighborhood
  const nb = await getNeighborhood(city, hood, locale);
  if (nb) {
    const h = nb.hood;
    const img = (h.hero_image ?? h.photo)?.url;
    return new ImageResponse(
      ogCard({
        title: h.name,
        meta: `${h.venue_count} ${es ? "restaurantes" : "restaurants"} · ${cityName(locale)}`,
        photo: img,
        tag: es ? "Barrio" : "Neighborhood",
      }),
      { ...size, fonts }
    );
  }

  // 2) brand
  const cityRec = await getCity(city, locale);
  if (cityRec) {
    const brand = getBrand(cityRec.slug, hood);
    if (brand) {
      return new ImageResponse(
        ogCard({
          title: brand.name,
          meta: `${brand.count} ${es ? "ubicaciones" : "locations"} · ${cityName(locale)}`,
          tag: es ? "Cadena" : "Multiple locations",
        }),
        { ...size, fonts }
      );
    }
  }

  // 3) venue
  const vRaw = await getVenue(hood);
  if (vRaw) {
    const v = localizeVenue(vRaw, locale);
    const raw = v.cuisine_en?.[0] ?? "";
    const cuisine = raw ? (es ? cuisineLabelEs(cleanCuisine(raw)) : cleanCuisine(raw)) : "";
    const hoodName = allNeighborhoods.find((n) => n.slug === v.neighborhood_slug)?.name ?? "";
    const price = v.price_tier ? "$".repeat(Number(v.price_tier)) : "";
    const meta = [cuisine, hoodName, price].filter(Boolean).join(" · ");
    return new ImageResponse(
      ogCard({
        title: v.name,
        meta,
        photo: v.photos?.[0]?.url,
        tag: v.editors_pick_rank ? (es ? "Selección del editor" : "Editors' pick") : undefined,
      }),
      { ...size, fonts }
    );
  }

  // fallback
  return new ImageResponse(
    ogCard({ title: "EatsPanama", meta: es ? "Donde Panamá realmente come" : "Where Panama actually eats" }),
    { ...size, fonts }
  );
}
