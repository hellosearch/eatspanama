/**
 * Boilerplate detection for auto-generated "About" text.
 *
 * ~60% of venue `about_en` values are a single templated sentence that just
 * restates the name + type + location and says nothing a visitor couldn't read
 * off the header ("X is an Italian restaurant in the Casco Viejo neighborhood
 * of Panama City." / "X is a restaurant in Albrook, Panama City."). Showing it
 * contradicts the site's own "we don't guess" policy, so callers hide the
 * About section when this returns true. Real, multi-sentence prose (Luna Cafe's
 * paragraph) is always kept.
 */
const TEMPLATES: RegExp[] = [
  / is an? .+ in the .+ neighborhood of .+\.?$/i,
  / is an? [a-z& '-]+ in [^,]+, .+\.?$/i,
];

export function isBoilerplateAbout(text?: string): boolean {
  const a = (text ?? "").trim();
  if (!a) return false;
  // Real write-ups run to multiple sentences; the template is exactly one.
  if ((a.match(/\./g) ?? []).length > 1) return false;
  return TEMPLATES.some((re) => re.test(a));
}
