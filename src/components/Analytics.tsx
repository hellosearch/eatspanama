import Script from "next/script";

/**
 * GA4 (gtag.js). Renders only when NEXT_PUBLIC_GA_ID is set (a "G-XXXXXXXXXX"
 * Measurement ID), so the site ships zero analytics until a property exists and
 * the env var is provided in Vercel. The googletagmanager / google-analytics
 * hosts are allow-listed in the CSP (next.config.ts). NEXT_PUBLIC_* is inlined
 * at build, so setting the id needs a redeploy to take effect.
 */
export default function Analytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID;
  if (!id) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`}
      </Script>
    </>
  );
}
