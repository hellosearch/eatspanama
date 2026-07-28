import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { getCity } from "@/lib/data";
import { getGoodFor } from "@/lib/goodfor";
import { ogCard } from "@/og/card";
import { ogFonts, OG_SIZE } from "@/og/fonts";

/** "Good for" occasion share card: facet label + count over a top venue photo. */
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "EatsPanama";
export const dynamicParams = true;
export function generateStaticParams() {
  return [] as { city: string; occasion: string }[];
}

export default async function Image({ params }: { params: Promise<{ locale: string; city: string; occasion: string }> }) {
  const { locale, city, occasion } = await params;
  const fonts = await ogFonts();
  const es = locale === "es";
  const c = await getCity(city, locale);
  const occ = c ? getGoodFor(c.slug, occasion) : undefined;
  if (!occ) {
    return new ImageResponse(ogCard({ title: "EatsPanama", meta: es ? "Ideal para" : "Good for" }), { ...OG_SIZE, fonts });
  }
  const t = await getTranslations({ locale, namespace: "GoodFor" });
  const label = t(`label_${occasion}`);
  const photo = occ.venues.find((v) => v.photos?.length)?.photos[0]?.url;
  const meta = `${occ.count} ${es ? "lugares" : "spots"} · ${es ? "Ciudad de Panamá" : "Panama City"}`;
  return new ImageResponse(ogCard({ title: label, meta, photo, tag: es ? "Ideal para" : "Good for" }), { ...OG_SIZE, fonts });
}
