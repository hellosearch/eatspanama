import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Always allow crawling + advertise the sitemap. Staging non-indexation is
// handled by the env-gated noindex (meta + X-Robots-Tag, SITE_NOINDEX=1) -
// NOT by blocking robots.txt, so tools can still crawl staging.
// /search is kept crawlable too: its pages carry noindex,follow so link
// equity flows to the indexable guides/listings they reference.
export default function robots(): MetadataRoute.Robots {
  return {
    // /go/ is the photo-credit gateway: it 302s to the venue's own site. It is
    // the one path on the site crawlers are asked to stay out of, so the
    // outbound credit links carry no crawl or ranking signal. Everything else
    // is server-rendered and open.
    rules: [{ userAgent: "*", allow: "/", disallow: "/go/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
