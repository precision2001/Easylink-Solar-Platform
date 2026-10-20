import { S3Client, GetObjectTaggingCommand } from "@aws-sdk/client-s3";

/**
 * Content safety for anything sent between portal users (spec 11.6). Anyone
 * signed in may send files and messages to anyone on record; what is refused
 * is dangerous, oversized or malicious content. Every check here is
 * deterministic: no model decides whether a file is safe.
 */
export const LIMITS = {
  /** Largest single file that may be sent at all. */
  maxFileBytes: 25 * 1024 * 1024,
  /** Largest total of attachments on one email; above this, files go as links. */
  maxAttachBytes: 10 * 1024 * 1024,
  maxFilesPerMessage: 20,
  maxBodyChars: 4000,
  /** Per sender (people only; agents have their own budget). */
  perHour: 60,
  perDay: 300,
};

/** File kinds people exchange on solar jobs. Everything else is refused. */
const ALLOWED: Record<string, string[]> = {
  pdf: ["application/pdf"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
  heic: ["image/heic", "image/heif"],
  gif: ["image/gif"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xls: ["application/vnd.ms-excel"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  csv: ["text/csv", "text/plain"],
  txt: ["text/plain"],
  mp4: ["video/mp4"],
  mov: ["video/quicktime"],
};

/** Never sent, whatever the name or type claims. */
const BLOCKED_EXT = new Set([
  "exe", "msi", "bat", "cmd", "com", "scr", "pif", "ps1", "vbs", "vbe", "js", "jse", "wsf", "wsh", "hta", "jar",
  "apk", "app", "dmg", "pkg", "iso", "img", "lnk", "reg", "dll", "sys", "sh", "html", "htm", "svg", "xhtml",
  "docm", "xlsm", "pptm", "dotm", "xltm", "one", "zip", "rar", "7z",
]);

export type SafetyVerdict = { ok: true; scan: ScanStatus } | { ok: false; reason: string; code: SafetyCode };
export type SafetyCode = "blocked_type" | "type_mismatch" | "too_large" | "active_content" | "malware" | "unscanned" | "too_many_files";
export type ScanStatus = "clean" | "basic_checks_only";

export function extOf(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m?.[1] ?? "";
}

/** What the first bytes say the file really is. */
export function sniff(bytes: Uint8Array): string | null {
  const b = (i: number) => bytes[i] ?? -1;
  if (b(0) === 0x25 && b(1) === 0x50 && b(2) === 0x44 && b(3) === 0x46) return "pdf";
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "jpg";
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return "png";
  if (b(0) === 0x47 && b(1) === 0x49 && b(2) === 0x46) return "gif";
  if (b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 && b(8) === 0x57 && b(9) === 0x45) return "webp";
  if (b(4) === 0x66 && b(5) === 0x74 && b(6) === 0x79 && b(7) === 0x70) return "ftyp"; // heic, mp4, mov
  if (b(0) === 0x50 && b(1) === 0x4b && b(2) === 0x03 && b(3) === 0x04) return "zip"; // docx, xlsx are zips
  if (b(0) === 0xd0 && b(1) === 0xcf && b(2) === 0x11 && b(3) === 0xe0) return "ole"; // doc, xls
  if (b(0) === 0x4d && b(1) === 0x5a) return "exe";
  if (b(0) === 0x7f && b(1) === 0x45 && b(2) === 0x4c && b(3) === 0x46) return "exe"; // ELF
  return null;
}

const SNIFF_OK: Record<string, string[]> = {
  pdf: ["pdf"],
  jpg: ["jpg"],
  jpeg: ["jpg"],
  png: ["png"],
  gif: ["gif"],
  webp: ["webp"],
  heic: ["ftyp"],
  mp4: ["ftyp"],
  mov: ["ftyp"],
  docx: ["zip"],
  xlsx: ["zip"],
  doc: ["ole"],
  xls: ["ole"],
};

/**
 * Checks a file before it is sent. `bytes` may be the whole file or its first
 * part; `scan` is the malware scan result when the file is in S3 with
 * GuardDuty Malware Protection, or null when no scan exists.
 */
export function checkFile(f: { name: string; sizeBytes?: number; mimeType?: string; bytes?: Uint8Array | null; scan?: "clean" | "infected" | null }): SafetyVerdict {
  const name = f.name || "file";
  const ext = extOf(name);
  // Double extensions such as invoice.pdf.exe
  const parts = name.toLowerCase().split(".").slice(1);
  if (parts.some((p) => BLOCKED_EXT.has(p)) || BLOCKED_EXT.has(ext)) {
    return { ok: false, code: "blocked_type", reason: `${name}: this kind of file can't be sent (.${parts.find((p) => BLOCKED_EXT.has(p)) ?? ext}).` };
  }
  if (!ALLOWED[ext]) return { ok: false, code: "blocked_type", reason: `${name}: .${ext || "no extension"} files can't be sent. Send a PDF, photo, Word or Excel file instead.` };
  if (f.mimeType && !ALLOWED[ext]!.includes(f.mimeType.toLowerCase()) && f.mimeType !== "application/octet-stream") {
    return { ok: false, code: "type_mismatch", reason: `${name}: the file type (${f.mimeType}) doesn't match its name.` };
  }
  if ((f.sizeBytes ?? f.bytes?.byteLength ?? 0) > LIMITS.maxFileBytes) {
    return { ok: false, code: "too_large", reason: `${name}: larger than ${LIMITS.maxFileBytes / 1024 / 1024} MB.` };
  }
  if (f.scan === "infected") return { ok: false, code: "malware", reason: `${name}: the malware scan found a threat. It has been held for review.` };
  if (f.bytes?.byteLength) {
    const kind = sniff(f.bytes);
    if (kind === "exe") return { ok: false, code: "blocked_type", reason: `${name}: this is a program, not a document.` };
    const expect = SNIFF_OK[ext];
    if (expect && kind && !expect.includes(kind)) return { ok: false, code: "type_mismatch", reason: `${name}: the contents don't match a .${ext} file.` };
    if (ext === "pdf") {
      const head = new TextDecoder("latin1").decode(f.bytes.subarray(0, Math.min(f.bytes.byteLength, 2_000_000)));
      if (/\/(JavaScript|JS|Launch|EmbeddedFile|OpenAction\s*<<[^>]*\/S\s*\/JavaScript)/.test(head)) {
        return { ok: false, code: "active_content", reason: `${name}: the PDF contains scripts or embedded files. Re-save it as a plain PDF ("Print to PDF").` };
      }
    }
    if ((ext === "docx" || ext === "xlsx") && /vbaProject\.bin/.test(new TextDecoder("latin1").decode(f.bytes))) {
      return { ok: false, code: "active_content", reason: `${name}: the document contains macros. Save it without macros.` };
    }
  }
  return { ok: true, scan: f.scan === "clean" ? "clean" : "basic_checks_only" };
}

/** Message text from people: no links to unknown sites (the most common scam), no oversize bodies. */
export function checkMessageBody(body: string, opts: { senderIsStaff: boolean; allowedDomains?: string[] }): { ok: true } | { ok: false; reason: string } {
  if (body.length > LIMITS.maxBodyChars) return { ok: false, reason: `Message is longer than ${LIMITS.maxBodyChars} characters.` };
  if (opts.senderIsStaff) return { ok: true };
  const allowed = opts.allowedDomains ?? ["easylinksolar.com.au", "gov.au", "cleanenergyregulator.gov.au"];
  const urls = body.match(/\b(?:https?:\/\/|www\.)[^\s<>"')]+/gi) ?? [];
  for (const u of urls) {
    let host = "";
    try {
      host = new URL(u.startsWith("http") ? u : `https://${u}`).hostname.toLowerCase();
    } catch {
      return { ok: false, reason: "The message contains a link that can't be read." };
    }
    if (!allowed.some((d) => host === d || host.endsWith(`.${d}`))) {
      return { ok: false, reason: `Links to ${host} can't be sent through the portal. Attach the file instead, or ask EasyLink staff to send it.` };
    }
  }
  return { ok: true };
}

/** Reads the GuardDuty Malware Protection for S3 result tag on an object. */
export async function s3ScanStatus(bucket: string, key: string, s3 = new S3Client({ region: process.env.AWS_REGION ?? "ap-southeast-2" })): Promise<"clean" | "infected" | null> {
  try {
    const r = await s3.send(new GetObjectTaggingCommand({ Bucket: bucket, Key: key }));
    const v = r.TagSet?.find((t) => t.Key === "GuardDutyMalwareScanStatus")?.Value;
    if (v === "NO_THREATS_FOUND") return "clean";
    if (v === "THREATS_FOUND") return "infected";
    return null;
  } catch {
    return null;
  }
}
