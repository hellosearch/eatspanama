import { sitemapEntries } from "@/lib/sitemap-data";

/**
 * /sitemap.xml as a route handler (not Next's built-in sitemap.ts) so we can
 * prepend an `<?xml-stylesheet?>` directive - browsers then render the sitemap
 * as a styled table (public/sitemap.xsl) while crawlers read the raw XML and
 * ignore the transform. The URL set itself comes from sitemapEntries().
 */
export const dynamic = "force-static";

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function GET(): Response {
  const entries = sitemapEntries();

  const urls = entries
    .map((e) => {
      const langs = e.alternates?.languages ?? {};
      const alts = Object.entries(langs)
        .map(([lang, href]) => `<xhtml:link rel="alternate" hreflang="${lang}" href="${xmlEscape(String(href))}" />`)
        .join("");
      const changefreq = e.changeFrequency ? `<changefreq>${e.changeFrequency}</changefreq>` : "";
      const priority = e.priority != null ? `<priority>${e.priority}</priority>` : "";
      return `<url><loc>${xmlEscape(String(e.url))}</loc>${alts}${changefreq}${priority}</url>`;
    })
    .join("\n");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    `${urls}\n` +
    `</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
