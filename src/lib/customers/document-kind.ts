/** A short, plain label for a shared document's type, from its MIME type or file name. */
export function documentKindLabel(doc: { mimeType?: string | null; fileName?: string | null }): string {
  const mime = (doc.mimeType ?? "").toLowerCase();
  const ext = (doc.fileName ?? "").toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  if (mime === "application/pdf" || ext === "pdf") return "PDF";
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "heic"].includes(ext)) return "Image";
  if (mime.includes("spreadsheet") || mime.includes("excel") || ["xls", "xlsx", "csv"].includes(ext)) return "Spreadsheet";
  if (mime.includes("word") || ["doc", "docx"].includes(ext)) return "Word document";
  if (mime.startsWith("text/") || ext === "txt") return "Text";
  return ext ? ext.toUpperCase() : "File";
}
