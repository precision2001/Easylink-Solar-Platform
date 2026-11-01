import { fetchWithInstallerSession } from "@/lib/installers/installer-fetch-client";
import { compressImageForUpload } from "@/lib/images/compress-browser";

export type InstallerCustomerDocument = {
  id: string;
  installerId: string;
  customerId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

export async function fetchInstallerCustomerDocuments(
  customerId: string,
  init?: RequestInit,
): Promise<InstallerCustomerDocument[]> {
  const res = await fetchWithInstallerSession(
    `/api/installers/customers/${encodeURIComponent(customerId)}/documents`,
    { cache: "no-store", ...init },
  );
  const json = (await res.json()) as ApiEnvelope<InstallerCustomerDocument[]>;
  if (!res.ok) {
    throw new Error(json.message || "Failed to load documents");
  }
  return Array.isArray(json.data) ? json.data : [];
}

export async function uploadInstallerCustomerDocument(
  customerId: string,
  file: File,
): Promise<InstallerCustomerDocument> {
  const formData = new FormData();
  // Images are shrunk before upload (lib/images/policy.ts); other files untouched.
  formData.set("file", await compressImageForUpload(file));

  const res = await fetchWithInstallerSession(
    `/api/installers/customers/${encodeURIComponent(customerId)}/documents`,
    {
      method: "POST",
      body: formData,
    },
  );
  const json = (await res.json()) as ApiEnvelope<InstallerCustomerDocument>;
  if (!res.ok || !json.data) {
    throw new Error(json.message || "Failed to upload document");
  }
  return json.data;
}

export async function deleteInstallerCustomerDocument(id: string): Promise<void> {
  const res = await fetchWithInstallerSession(
    `/api/installers/customer-documents/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  const json = (await res.json()) as ApiEnvelope<unknown>;
  if (!res.ok) {
    throw new Error(json.message || "Failed to delete document");
  }
}

export function formatDocumentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
