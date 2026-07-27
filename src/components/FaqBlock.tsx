import JsonLd from "@/components/JsonLd";
import { faqJsonLd } from "@/lib/jsonld";
import type { Faq } from "@/lib/faq";

/**
 * FAQ module + FAQPage JSON-LD, always emitted together.
 * variant="grid"  -> 2-col cards (listing pages)
 * variant="stack" -> bordered rows inside the article column (guides)
 * Content is data-generated per page (see src/lib/faq.ts) - never
 * hand-written per page.
 */
function FaqAnswer({ f }: { f: Faq }) {
  return (
    <>
      <p>{f.a}</p>
      {f.bullets && f.bullets.length > 0 && (
        <ul className="faq-bullets">
          {f.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
      {f.aEnd && <p className="faq-end">{f.aEnd}</p>}
    </>
  );
}

export default function FaqBlock({
  faqs,
  variant = "grid",
}: {
  faqs: Faq[];
  variant?: "grid" | "stack" | "accordion" | "editorial" | "accordion2";
}) {
  if (!faqs.length) return null;
  // Two balanced columns for the accordion2 layout.
  const mid = Math.ceil(faqs.length / 2);
  const cols = [faqs.slice(0, mid), faqs.slice(mid)];
  return (
    <>
      {variant === "accordion2" ? (
        <div className="faq-acc2">
          {cols.map((col, ci) => (
            <div className="faq-acc-col" key={ci}>
              {col.map((f, i) => (
                // Collapsed by default, but the answer is server-rendered inside
                // <details> - present in the HTML, so it stays crawlable + keeps
                // the FAQPage schema below.
                <details className="faq-ac2" key={i}>
                  <summary>{f.q}</summary>
                  <div className="faq-ac2-body">
                    <FaqAnswer f={f} />
                  </div>
                </details>
              ))}
            </div>
          ))}
        </div>
      ) : variant === "editorial" ? (
        <div className="faq-ed">
          {faqs.map((f, i) => (
            <div className="faq-ed-item" key={i}>
              <span className="faq-ed-q" aria-hidden="true">Q</span>
              <div className="faq-ed-body">
                <h3>{f.q}</h3>
                <FaqAnswer f={f} />
              </div>
            </div>
          ))}
        </div>
      ) : variant === "accordion" ? (
        <div className="faq-accordion">
          {faqs.map((f, i) => (
            // All collapsed by default (the visitor clicks to open). The answer
            // is still server-rendered inside <details> - present in the HTML,
            // so it stays crawlable + keeps the FAQPage schema below.
            <details className="faq-ac" key={i}>
              <summary>{f.q}</summary>
              <div className="faq-ac-body">
                <FaqAnswer f={f} />
              </div>
            </details>
          ))}
        </div>
      ) : variant === "grid" ? (
        <div className="faq-grid">
          {faqs.map((f, i) => (
            <div className="faq-item" key={i}>
              <h3>{f.q}</h3>
              <FaqAnswer f={f} />
            </div>
          ))}
        </div>
      ) : (
        <div>
          {faqs.map((f, i) => (
            <div className="qa" key={i}>
              <h3>{f.q}</h3>
              <FaqAnswer f={f} />
            </div>
          ))}
        </div>
      )}
      <JsonLd data={faqJsonLd(faqs)} />
    </>
  );
}
