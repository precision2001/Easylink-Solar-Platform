/**
 * A product's downloadable documents, the same everywhere (website, customer,
 * installer and operations portals): EasyLink's own stored copy of the
 * datasheet first (specs.datasheet.url, saved by the backend's
 * import-product-datasheets script so links don't break when makers move
 * files), else the original link (specs.datasheetUrl); then any brand
 * documents such as compatibility lists (specs.documents).
 */
export type ProductDocument = { title: string; url: string; kind: "datasheet" | "document" };

const isUrl = (v: unknown): v is string => typeof v === "string" && /^https?:\/\//.test(v);

function specsOf(specs: unknown): Record<string, unknown> {
  return specs && typeof specs === "object" ? (specs as Record<string, unknown>) : {};
}

export function productDatasheetUrl(specs: unknown): string | null {
  const s = specsOf(specs);
  const stored = (s.datasheet as { url?: unknown } | undefined)?.url;
  if (isUrl(stored)) return stored;
  return isUrl(s.datasheetUrl) ? s.datasheetUrl : null;
}

export function productDocuments(specs: unknown): ProductDocument[] {
  const s = specsOf(specs);
  const out: ProductDocument[] = [];
  const ds = productDatasheetUrl(s);
  if (ds) out.push({ title: "Datasheet", url: ds, kind: "datasheet" });
  const docs = Array.isArray(s.documents) ? s.documents : [];
  for (const d of docs) {
    const doc = d as { title?: unknown; url?: unknown };
    if (isUrl(doc.url) && typeof doc.title === "string" && doc.title.trim() && !out.some((o) => o.url === doc.url)) {
      out.push({ title: doc.title.trim(), url: doc.url, kind: "document" });
    }
  }
  return out;
}
