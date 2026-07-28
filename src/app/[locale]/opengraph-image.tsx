import { ImageResponse } from "next/og";
import { getEditorsPicks } from "@/lib/picks";
import { ogCard } from "@/og/card";
import { ogFonts, OG_SIZE } from "@/og/fonts";

/** Homepage share card: the H1 over the week's top editors'-pick photo. */
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "EatsPanama - Where Panama actually eats";

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const fonts = await ogFonts();
  const es = locale === "es";
  const pick = getEditorsPicks(1, locale)[0];
  return new ImageResponse(
    ogCard({
      title: es ? "Donde Panamá realmente come" : "Where Panama actually eats",
      meta: es ? "La guía independiente para comer en la Ciudad de Panamá" : "The independent guide to eating in Panama City",
      photo: pick?.photo,
    }),
    { ...OG_SIZE, fonts }
  );
}
