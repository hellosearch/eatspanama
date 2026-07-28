import { sitemapManifest } from "@/lib/sitemap-data";
import { SITE_URL } from "@/lib/seo";

/**
 * /sitemap.xml is the SITEMAP INDEX. It lists one child sitemap per content-type
 * chunk (src/app/sitemaps/[name]) so no single file is big/heavy and each section
 * is monitorable on its own in Search Console. A route handler (not Next's
 * sitemap.ts) is used so we can prepend the `<?xml-stylesheet?>` directive that
 * renders it as a styled table for humans; crawlers read the raw XML.
 */
export const dynamic = "force-static";

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function GET(): Response {
  const items = sitemapManifest()
    .map((c) => `<sitemap><loc>${xmlEscape(`${SITE_URL}/sitemaps/${c.name}.xml`)}</loc></sitemap>`)
    .join("\n");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<?xml-stylesheet type="text/xsl" href="/sitemap-index.xsl"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${items}\n` +
    `</sitemapindex>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
