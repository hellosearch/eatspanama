<?xml version="1.0" encoding="UTF-8"?>
<!--
  XSLT 1.0 stylesheet that browsers apply to /sitemap.xml so a human opening it
  sees a clean, on-brand HTML table instead of raw XML. Search engines ignore
  this transform entirely and read the underlying XML directly.

  The sitemap namespace (sitemaps.org/schemas/sitemap/0.9) is bound to the `s`
  prefix and the xhtml namespace to `x`, so XPath can select <loc>, <lastmod>,
  etc. (they are NOT in the null namespace). All styling is inlined (no external
  CSS request).
-->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:x="http://www.w3.org/1999/xhtml">

  <xsl:output method="html" version="5.0" encoding="UTF-8" indent="yes"
    doctype-system="about:legacy-compat" />

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <title>EatsPanama - XML Sitemap</title>
        <style>
          :root {
            --ink: #1a1a1a;
            --muted: #5b6573;
            --line: #e6e3df;
            --panel: #ffffff;
            --bg: #f7f5f2;
            --accent: #FF5A1F;
            --accent-deep: #C0400B;
          }
          * { box-sizing: border-box; }
          html { -webkit-text-size-adjust: 100%; }
          body {
            margin: 0;
            background: var(--bg);
            color: var(--ink);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
              Helvetica, Arial, sans-serif;
            font-size: 15px;
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
          }
          .wrap { max-width: 1040px; margin: 0 auto; padding: 40px 20px 64px; }
          header { margin-bottom: 28px; }
          .brand {
            display: inline-flex; align-items: center; gap: 10px;
            font-weight: 700; letter-spacing: -0.01em; font-size: 18px;
          }
          .dot {
            width: 11px; height: 11px; border-radius: 50%;
            background: var(--accent);
            box-shadow: 0 0 0 4px rgba(255,90,31,0.16);
          }
          h1 {
            margin: 16px 0 6px;
            font-size: clamp(24px, 4vw, 32px);
            letter-spacing: -0.02em; line-height: 1.15;
          }
          .lede { margin: 0; color: var(--muted); max-width: 60ch; }
          .lede a { color: var(--accent-deep); text-decoration: none; }
          .lede a:hover { text-decoration: underline; }
          .count {
            display: inline-block; margin-top: 16px;
            background: rgba(255,90,31,0.10);
            color: var(--accent-deep);
            border: 1px solid rgba(255,90,31,0.22);
            padding: 5px 12px; border-radius: 999px;
            font-size: 13px; font-weight: 600;
          }
          .card {
            margin-top: 24px; background: var(--panel);
            border: 1px solid var(--line); border-radius: 14px;
            overflow: hidden;
            box-shadow: 0 1px 2px rgba(20,24,31,0.04),
              0 8px 24px rgba(20,24,31,0.04);
          }
          .scroll { overflow-x: auto; }
          table { width: 100%; border-collapse: collapse; }
          thead th {
            text-align: left; font-size: 12px; font-weight: 600;
            text-transform: uppercase; letter-spacing: 0.06em;
            color: var(--muted); background: #fafbfc;
            padding: 13px 18px; border-bottom: 1px solid var(--line);
            white-space: nowrap;
          }
          tbody td {
            padding: 13px 18px; border-bottom: 1px solid var(--line);
            vertical-align: top;
          }
          tbody tr:last-child td { border-bottom: 0; }
          tbody tr:hover { background: #fbfcfd; }
          .url a {
            color: var(--ink); text-decoration: none; font-weight: 500;
            word-break: break-all;
          }
          .url a:hover { color: var(--accent-deep); text-decoration: underline; }
          .num {
            font-variant-numeric: tabular-nums; color: var(--muted);
            white-space: nowrap;
          }
          .freq { color: var(--muted); white-space: nowrap; }
          .idx { color: #aab1bd; font-variant-numeric: tabular-nums; width: 1%; white-space: nowrap; }
          footer {
            margin-top: 22px; color: var(--muted); font-size: 13px;
          }
          footer a { color: var(--accent-deep); text-decoration: none; }
          footer a:hover { text-decoration: underline; }
          @media (max-width: 640px) {
            .hide-sm { display: none; }
            thead th, tbody td { padding: 11px 12px; }
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <header>
            <span class="brand"><span class="dot"></span>EatsPanama</span>
            <h1>XML Sitemap</h1>
            <p class="lede">
              This page lists the URLs EatsPanama submits to search engines. It
              is generated for crawlers like Googlebot - the styling you see here
              is just for humans. Learn more at
              <a href="https://www.sitemaps.org/">sitemaps.org</a>.
            </p>
            <span class="count">
              <xsl:value-of select="count(s:urlset/s:url)" />
              <xsl:text> URLs</xsl:text>
            </span>
          </header>

          <div class="card">
            <div class="scroll">
              <table>
                <thead>
                  <tr>
                    <th class="idx">#</th>
                    <th>URL</th>
                    <th class="hide-sm">Last Modified</th>
                    <th class="hide-sm">Change Freq.</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  <xsl:for-each select="s:urlset/s:url">
                    <tr>
                      <td class="idx"><xsl:value-of select="position()" /></td>
                      <td class="url">
                        <a href="{s:loc}"><xsl:value-of select="s:loc" /></a>
                      </td>
                      <td class="num hide-sm">
                        <xsl:choose>
                          <xsl:when test="s:lastmod">
                            <xsl:value-of select="substring(s:lastmod, 1, 10)" />
                          </xsl:when>
                          <xsl:otherwise>&#8211;</xsl:otherwise>
                        </xsl:choose>
                      </td>
                      <td class="freq hide-sm">
                        <xsl:choose>
                          <xsl:when test="s:changefreq">
                            <xsl:value-of select="s:changefreq" />
                          </xsl:when>
                          <xsl:otherwise>&#8211;</xsl:otherwise>
                        </xsl:choose>
                      </td>
                      <td class="num">
                        <xsl:choose>
                          <xsl:when test="s:priority">
                            <xsl:value-of select="s:priority" />
                          </xsl:when>
                          <xsl:otherwise>&#8211;</xsl:otherwise>
                        </xsl:choose>
                      </td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </div>
          </div>

          <footer>
            Raw XML: <a href="/sitemap.xml">/sitemap.xml</a> ·
            <a href="https://eatspanama.com/">eatspanama.com</a>
          </footer>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
