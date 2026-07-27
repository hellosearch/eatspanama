/** Guide table-of-contents card (offset-tint signature frame, anchor links). */
export default function TocCard({
  label,
  items,
}: {
  label: string;
  items: { slug: string; name: string }[];
}) {
  return (
    <nav className="toc" aria-label={label}>
      <p className="t-label">{label}</p>
      <ol>
        {items.map((it, i) => (
          <li key={it.slug}>
            <a href={`#${it.slug}`}>
              <span className="n">{String(i + 1).padStart(2, "0")}</span>
              {it.name}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
