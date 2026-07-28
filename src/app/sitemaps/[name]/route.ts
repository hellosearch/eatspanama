import { sitemapChunk, sitemapManifest } from "@/lib/sitemap-data";

/**
 * A child sitemap (one <=CHUNK_SIZE slice of a content-type group, e.g.
 * "venues-1", "guides-1"). Listed by the /sitemap.xml index. Prebuilt for every
 * name in the manifest; unknown names 404. Styled via /sitemap.xsl.
 */
// Children carry a .xml extension (e.g. "venues-1.xml") so they behave like
// files: no trailing slash, and the i18n middleware skips them (its matcher
// excludes dotted paths) - same reason /sitemap.xml itself works. Prebuilt for
// every manifest name; unknown names 404. CDN-cached via Cache-Control below.
export function generateStaticParams() {
  return sitemapManifest().map((c) => ({ name: `${c.name}.xml` }));
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }): Promise<Response> {
  const { name } = await params;
  const entries = sitemapChunk(name.replace(/\.xml$/, ""));
  if (!entries) return new Response("Not found", { status: 404 });

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
