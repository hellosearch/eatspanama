// Centralized font loading via next/font (self-hosted at build time, zero
// render-blocking third-party CSS). Locked pairing: Space Grotesk (display) +
// Inter (body). latin + latin-ext subsets cover ES accented characters.
import { Inter, Space_Grotesk } from "next/font/google";

export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-space-grotesk",
  // variable font: 500/600/700 served from one file
});

export const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});
