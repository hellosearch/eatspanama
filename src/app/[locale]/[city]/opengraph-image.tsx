import { ImageResponse } from "next/og";
import { allNeighborhoods, cityVenueCount, getCity } from "@/lib/data";
import { ogCard } from "@/og/card";
import { ogFonts, OG_SIZE } from "@/og/fonts";

/** City hub share card: city name + live totals over a neighborhood hero. */
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "EatsPanama";
export const dynamicParams = true;
export function generateStaticParams() {
  return [] as { city: string }[];
}

export default async function Image({ params }: { params: Promise<{ locale: string; city: string }> }) {
  const { locale, city } = await params;
  const fonts = await ogFonts();
  const es = locale === "es";
  const c = await getCity(city, locale);
  if (!c) {
    return new ImageResponse(ogCard({ title: "EatsPanama", meta: es ? "Donde Panamá realmente come" : "Where Panama actually eats" }), { ...OG_SIZE, fonts });
  }
  const hoods = allNeighborhoods.filter((n) => n.city_slug === c.slug);
  const withImg = hoods.find((n) => n.hero_image ?? n.photo);
  const photo = (withImg?.hero_image ?? withImg?.photo)?.url;
  const count = cityVenueCount(c.slug);
  const name = es ? c.name_es : c.name_en;
  const meta = `${count} ${es ? "restaurantes" : "restaurants"} · ${hoods.length} ${es ? "barrios" : "neighborhoods"}`;
  return new ImageResponse(ogCard({ title: name, meta, photo }), { ...OG_SIZE, fonts });
}
