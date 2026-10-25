import * as XLSX from "xlsx";

/**
 * Reading a contact list in the browser.
 *
 * The file is parsed here rather than uploaded: lists run to tens of megabytes,
 * and the server has no multipart route and a 10 MB JSON limit, so sending the
 * file itself is not an option. Rows then go to the server in batches, which is
 * where deduplicating and inserting them actually happens.
 *
 * The trade-off is that the tab has to stay open until the import finishes.
 * That is said plainly on the page rather than hidden.
 */

/** Rows per request. Small enough to stay inside the body limit comfortably. */
export const IMPORT_BATCH = 2000;

/** Anything larger is almost certainly not a contact list. */
export const MAX_IMPORT_BYTES = 60 * 1024 * 1024;

export interface ImportFile {
  fileName: string;
  headings: string[];
  rows: Record<string, string | number | boolean | null>[];
  /** A sensible default list name, taken from the file name. */
  suggestedListName: string;
}

/** The fields a column can be mapped onto, with the labels the page shows. */
export const IMPORT_FIELD_OPTIONS: [string, string][] = [
  ["ignore", "Do not import"],
  ["sourceId", "Source ID"],
  ["fullName", "Full name"],
  ["firstName", "First name"],
  ["lastName", "Last name"],
  ["streetAddress", "Street address"],
  ["suburb", "Suburb / locality"],
  ["postcode", "Postcode"],
  ["state", "State"],
  ["region", "Region"],
  ["mobile", "Mobile"],
  ["landline", "Landline"],
  ["phoneAny", "Phone (any type)"],
  ["dncrMobile", "DNCR flag · mobile"],
  ["dncrLandline", "DNCR flag · landline"],
  ["email", "Email"],
  ["status", "Status / lead quality"],
  ["consentSms", "Consent / opt-in"],
];

const FIELD_LABEL = new Map(IMPORT_FIELD_OPTIONS);

/** "Full-name → Full name · Phone-Mobile → Mobile · 11 more". */
export function describeMapping(mapping: Record<string, string>): string {
  const used = Object.entries(mapping).filter(([, field]) => field && field !== "ignore");
  if (!used.length) return "No columns mapped";

  const shown = used
    .slice(0, 4)
    .map(([heading, field]) => `${heading} → ${FIELD_LABEL.get(field) ?? field}`);
  const rest = used.length - shown.length;
  return shown.join(" · ") + (rest > 0 ? ` · ${rest} more` : "");
}

/** Strips the extension and tidies separators: "ARD-NSW.xlsx" → "ARD NSW". */
function listNameFrom(fileName: string): string {
  return (
    fileName
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Imported list"
  );
}

/**
 * Parses a spreadsheet or CSV into headings and rows.
 *
 * Values are read as formatted text (`raw: false`) so a postcode of 2000 and a
 * phone number keep their leading zeros and do not arrive as numbers that have
 * already lost them.
 */
export async function readContactFile(file: File): Promise<ImportFile> {
  if (file.size > MAX_IMPORT_BYTES) {
    throw new Error(
      `That file is ${Math.round(file.size / 1024 / 1024)} MB; the limit is ${
        MAX_IMPORT_BYTES / 1024 / 1024
      } MB.`,
    );
  }

  const buffer = await file.arrayBuffer();
  const book = XLSX.read(buffer, { type: "array", cellDates: false, raw: false });

  const sheetName = book.SheetNames[0];
  if (!sheetName) throw new Error("That file has no sheets.");
  const sheet = book.Sheets[sheetName];
  if (!sheet) throw new Error("That sheet could not be read.");

  const rows = XLSX.utils.sheet_to_json<Record<string, string | number | boolean | null>>(
    sheet,
    { defval: null, raw: false },
  );

  if (!rows.length) throw new Error("That file has no rows under its headings.");

  // `sheet_to_json` keys every row by heading, so the first row carries them
  // all; a column that is empty throughout still appears thanks to `defval`.
  const headings = Object.keys(rows[0]!).filter(h => h.trim());
  if (!headings.length) throw new Error("That file has no column headings.");

  return {
    fileName: file.name,
    headings,
    rows,
    suggestedListName: listNameFrom(file.name),
  };
}
