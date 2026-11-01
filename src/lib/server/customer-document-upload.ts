import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { compressImageFile } from "@/lib/server/image-compress";

const MAX_FILE_BYTES = 12 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export async function saveCustomerDocumentToPublic(
  customerId: string,
  upload: File,
): Promise<
  | {
      ok: true;
      url: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
    }
  | { ok: false; message: string }
> {
  if (!customerId.trim()) {
    return { ok: false, message: "Customer is required." };
  }

  // Every image is compressed before it is stored (lib/images/policy.ts).
  const file = await compressImageFile(upload);
  if (!file.size) {
    return { ok: false, message: "Empty file." };
  }

  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      message: `File too large (max ${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB).`,
    };
  }

  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_TYPES.has(mime) && !mime.startsWith("image/")) {
    return { ok: false, message: "This file type is not allowed." };
  }

  const original = file.name.replace(/[^\w.\-()\s]/g, "_").slice(0, 255);
  const ext =
    path.extname(original) ||
    (mime === "application/pdf"
      ? ".pdf"
      : mime === "image/png"
        ? ".png"
        : mime === "image/jpeg"
          ? ".jpg"
          : "");

  const storedName = `${randomUUID()}${ext}`;
  const dir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "customer-documents",
    customerId,
  );
  await mkdir(dir, { recursive: true });

  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, storedName), buf);

  const url = `/uploads/customer-documents/${customerId}/${storedName}`;
  return {
    ok: true,
    url,
    fileName: original || storedName,
    mimeType: mime,
    sizeBytes: file.size,
  };
}

export function customerDocumentPathFromUrl(url: string): string | null {
  const prefix = "/uploads/customer-documents/";
  if (!url.startsWith(prefix)) return null;
  const relative = url.slice(prefix.length);
  if (!relative || relative.includes("..")) return null;
  return path.join(process.cwd(), "public", "uploads", "customer-documents", relative);
}
