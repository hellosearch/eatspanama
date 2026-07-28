import { ImageResponse } from "next/og";
import { getGuide } from "@/lib/data";
import { localizeGuide } from "@/lib/localize";
import { ogCard } from "@/og/card";
import { ogFonts, OG_SIZE } from "@/og/fonts";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "EatsPanama";
export const dynamicParams = true;
export function generateStaticParams() {
  return [] as { slug: string }[];
}

export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const fonts = await ogFonts();
  const es = locale === "es";
  const g0 = await getGuide(slug);
  if (!g0) {
    return new ImageResponse(ogCard({ title: "EatsPanama", meta: es ? "Guías" : "Guides" }), { ...OG_SIZE, fonts });
  }
  const g = localizeGuide(g0, locale);
  const title = g.title_en.split(":")[0].trim();
  const meta = `${g.entries.length} ${es ? "lugares" : "spots"} · ${es ? "Ciudad de Panamá" : "Panama City"}`;
  return new ImageResponse(ogCard({ title, meta, photo: g.hero?.url, tag: es ? "Guía" : "Guide" }), { ...OG_SIZE, fonts });
}
