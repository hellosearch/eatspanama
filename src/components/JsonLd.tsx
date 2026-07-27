/**
 * Inline JSON-LD script. Data is site-authored (never user input), and the
 * serialized JSON is additionally hardened: `<` is escaped to its unicode form so no
 * string value could ever terminate the <script> element (XSS breakout).
 */
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, "\\u003c") }}
        />
      ))}
    </>
  );
}
