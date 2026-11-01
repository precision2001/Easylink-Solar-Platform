import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { compressImageFile } from "@/lib/server/image-compress";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_FILE_BYTES = 12 * 1024 * 1024;

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

const FILE_TYPES = new Set([
  ...IMAGE_TYPES,
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export type UploadKind = "image" | "attachment";

export async function saveChatUploadToPublic(
  upload: File,
  kind: UploadKind,
): Promise<{ ok: true; url: string; filename: string } | { ok: false; message: string }> {
  // Every image is compressed before it is stored (lib/images/policy.ts).
  const file = await compressImageFile(upload);
  if (!file.size) {
    return { ok: false, message: "Empty file." };
  }

  const max = kind === "image" ? MAX_IMAGE_BYTES : MAX_FILE_BYTES;
  if (file.size > max) {
    return {
      ok: false,
      message: `File too large (max ${Math.round(max / (1024 * 1024))} MB).`,
    };
  }

  const mime = file.type || "application/octet-stream";
  if (kind === "image") {
    if (!mime.startsWith("image/") && !IMAGE_TYPES.has(mime)) {
      return { ok: false, message: "Please choose an image file." };
    }
  } else if (!FILE_TYPES.has(mime) && !mime.startsWith("image/")) {
    return {
      ok: false,
      message: "This file type is not allowed.",
    };
  }

  const original = file.name.replace(/[^\w.\-()\s]/g, "_").slice(0, 120);
  const ext =
    path.extname(original) ||
    (mime === "image/png"
      ? ".png"
      : mime === "image/jpeg"
        ? ".jpg"
        : mime === "image/webp"
          ? ".webp"
          : mime === "image/gif"
            ? ".gif"
            : "");

  const storedName = `${randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "chat");
  await mkdir(dir, { recursive: true });

  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, storedName), buf);

  const url = `/uploads/chat/${storedName}`;
  return { ok: true, url, filename: original || storedName };
}
