#!/usr/bin/env node
/**
 * Design-token pipeline: brand-tokens.json -> Tailwind 4 theme CSS.
 *
 * Source of truth: clients/eatspanama/design/tokens/brand-tokens.json
 * (LOCKED 2026-07-14, D2 "The Modern Guide" / Tangerine).
 *
 * Output: src/styles/tokens.generated.css - a Tailwind 4 `@theme` block.
 * Tailwind emits every @theme entry as a :root CSS variable, so both utility
 * classes (bg-accent, rounded-card, shadow-offset) and plain CSS
 * (var(--color-accent)) resolve from the same single source.
 *
 * The generated file is committed; run `npm run tokens` after any token change.
 * Nothing else in the repo hardcodes brand hex values.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const TOKENS_PATH = join(here, "..", "..", "design", "tokens", "brand-tokens.json");
const OUT_PATH = join(here, "..", "src", "styles", "tokens.generated.css");

const t = JSON.parse(readFileSync(TOKENS_PATH, "utf8"));

const c = (k) => t.color[k].value;

const lines = [];
lines.push("/* AUTO-GENERATED - do not edit by hand.");
lines.push(` * Source: design/tokens/brand-tokens.json (${t.meta.direction} / ${t.meta.palette}, locked ${t.meta.locked})`);
lines.push(" * Regenerate: npm run tokens");
lines.push(" */");
lines.push("@theme {");
lines.push("  /* ---- color ---- */");
lines.push(`  --color-ink: ${c("ink")};`);
lines.push(`  --color-ink-soft: ${c("inkSoft")};`);
lines.push(`  --color-gray: ${c("gray")};`);
lines.push(`  --color-paper: ${c("paper")};`);
lines.push(`  --color-fog: ${c("fog")};`);
lines.push(`  --color-line: ${c("line")};`);
lines.push(`  --color-canvas: ${c("canvas")};`);
lines.push(`  --color-accent: ${c("accent")};`);
lines.push(`  --color-accent-deep: ${c("accentDeep")};`);
lines.push(`  --color-accent-tint: ${c("accentTint")};`);
lines.push(`  --color-whatsapp: ${c("whatsapp")};`);
lines.push(`  --color-whatsapp-deep: ${c("whatsappDeep")};`);
lines.push(`  --color-open-now: ${c("openNow")};`);
// NOTE: t.color.specAnnotation is deliberately NOT emitted - it is a
// design-spec-only token ("strip from production").
lines.push("");
lines.push("  /* ---- type ---- */");
lines.push(`  --font-display: var(--font-space-grotesk), ${t.font.display.family.replace(/'Space Grotesk',\s*/, "")};`);
lines.push(`  --font-body: var(--font-inter), ${t.font.body.family.replace(/'Inter',\s*/, "")};`);
lines.push("");
lines.push("  /* ---- radius ---- */");
lines.push(`  --radius-card: ${t.radius.card};`);
lines.push(`  --radius-button: ${t.radius.button};`);
lines.push(`  --radius-image: ${t.radius.image};`);
lines.push(`  --radius-chip-square: ${t.radius.chipSquare};`);
lines.push(`  --radius-pill: ${t.radius.pill};`);
lines.push(`  --radius-hero: ${t.radius.hero};`);
lines.push("");
lines.push("  /* ---- shadow ---- */");
lines.push(`  --shadow-button-accent: ${t.shadow.buttonAccent};`);
lines.push(`  --shadow-button-whatsapp: ${t.shadow.buttonWhatsapp};`);
lines.push(`  /* THE brand signature: use once per viewport, never stacked. */`);
lines.push(`  --shadow-offset: ${t.shadow.signatureOffset.value};`);
lines.push("");
lines.push("  /* ---- space ---- */");
lines.push(`  --spacing-section-y: ${t.space.sectionY};`);
lines.push(`  --spacing-card-pad: ${t.space.cardPad};`);
lines.push(`  --spacing-grid-gap: ${t.space.gridGap};`);
lines.push(`  --spacing-page-max: ${t.space.pageMaxWidth};`);
lines.push(`  --spacing-page-x: ${t.space.pagePadX};`);
lines.push("}");
lines.push("");

writeFileSync(OUT_PATH, lines.join("\n"), "utf8");
console.log(`tokens.generated.css written from ${TOKENS_PATH}`);
