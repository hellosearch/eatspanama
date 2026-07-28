import { ImageResponse } from "next/og";
import { getCity } from "@/lib/data";
import { cityCuisineHubs } from "@/lib/cuisines";
import { cuisineLabelEs } from "@/lib/hub-copy";
import { ogCard } from "@/og/card";
import { ogFonts, OG_SIZE } from "@/og/fonts";

/** City-cuisine share card: cuisine + live count over a representative dish. */
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "EatsPanama";
export const dynamicParams = true;
export function generateStaticParams() {
  return [] as { city: string; seg: string }[];
}

export default async function Image({ params }: { params: Promise<{ locale: string; city: string; seg: string }> }) {
  const { locale, city, seg } = await params;
  const fonts = await ogFonts();
  const es = locale === "es";
  const c = await getCity(city, locale);
  const hub = c ? cityCuisineHubs.find((h) => h.citySlug === c.slug && h.seg === seg) : undefined;
  if (!hub) {
    return new ImageResponse(ogCard({ title: "EatsPanama", meta: es ? "Cocinas" : "Cuisines" }), { ...OG_SIZE, fonts });
  }
  const label = es ? cuisineLabelEs(hub.cuisine) : hub.cuisine;
  const photo = hub.venues.find((v) => v.photos?.length)?.photos[0]?.url;
  const meta = `${hub.count} ${es ? "restaurantes" : "restaurants"} · ${es ? "Ciudad de Panamá" : "Panama City"}`;
  return new ImageResponse(ogCard({ title: label, meta, photo, tag: es ? "Cocina" : "Cuisine" }), { ...OG_SIZE, fonts });
}
