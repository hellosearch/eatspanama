/**
 * Photo credit that opens the venue's site for a human, and is not a link at
 * all for a crawler.
 *
 * This element is server-rendered like the rest of the site, but it renders a
 * <button>, never an <a href>. A crawler - including one that executes
 * JavaScript, which Google does - finds no link here at any point in the page
 * lifecycle, because none is ever created. Interception happens through one
 * delegated click listener (see CreditClicks), so there is no per-credit JS and
 * nothing to hydrate.
 *
 * Two approaches were tried and rejected first:
 *   1. Server-render a <span>, swap in an <a href> after hydration. Useless:
 *      Googlebot renders JS and sees the hydrated anchor.
 *   2. Server-render an <a href="/go/key/"> through a robots-Disallowed
 *      redirect gateway. Correct and standard - the venue URL never appears and
 *      the link is nofollowed - but it still puts a visible anchor in the HTML,
 *      which is more than was wanted on this one element.
 *
 * The /go/ gateway is kept underneath as the destination: the button carries
 * only that internal path, so even the intercepted click never exposes the
 * venue's URL in the document, and the gateway stays noindex/nofollow and
 * robots-Disallowed. Defense in depth rather than a single trick.
 *
 * Trade-off, accepted deliberately: with JavaScript disabled the credit is
 * inert text. Attribution still reads correctly, which is what it is for.
 */
export default function PhotoCredit({
  text,
  href,
  className = "photo-credit",
}: {
  text: string;
  /** Internal /go/<key>/ path from creditHref(). Omit to render plain text. */
  href?: string;
  className?: string;
}) {
  if (!href) return <span className={className}>{text}</span>;
  return (
    <button type="button" className={className} data-credit={href} title={text}>
      {text}
    </button>
  );
}
