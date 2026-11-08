import { productDocuments } from "@/lib/products/datasheet";

/**
 * Download links for a product's datasheet and brand documents (PDFs open in
 * a new tab, where they can be saved). Renders nothing when there are none.
 */
export function ProductDocumentLinks({
  specs,
  label,
  className = "",
  linkClassName = "",
}: {
  specs: unknown;
  /** Names the product for screen readers, e.g. "GoodWe ESA 17.7kWh". */
  label: string;
  className?: string;
  linkClassName?: string;
}) {
  const docs = productDocuments(specs);
  if (!docs.length) return null;
  return (
    <span className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      {docs.map((d) => (
        <a
          key={d.url}
          href={d.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${d.title} for ${label} (PDF, opens in a new tab)`}
          className={`inline-flex items-center gap-1 underline-offset-2 hover:underline ${linkClassName}`}
        >
          <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
          </svg>
          {d.title}
        </a>
      ))}
    </span>
  );
}
