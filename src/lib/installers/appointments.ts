import { fetchWithInstallerSession } from "@/lib/installers/installer-fetch-client";

export const INSTALLER_APPOINTMENT_STATUSES = [
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type InstallerAppointmentStatus =
  (typeof INSTALLER_APPOINTMENT_STATUSES)[number];

export type InstallerAppointment = {
  id: string;
  leadId: string | null;
  customerId: string | null;
  installerId: string;
  title: string;
  notes: string | null;
  startAt: string;
  endAt: string;
  status: InstallerAppointmentStatus;
  /** Set when the EasyLink AI booked it on a call. */
  aiKind?: "SITE_VISIT" | "CALLBACK" | "SERVICE" | null;
  createdAt: string;
  updatedAt: string;
  lead?: {
    id: string;
    customerName: string;
    status: string;
    assignedToId: string | null;
  } | null;
  customer?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

export type ListAppointmentsParams = {
  page?: number;
  limit?: number;
  status?: InstallerAppointmentStatus;
  leadId?: string;
  customerId?: string;
  startFrom?: string;
  startTo?: string;
};

function buildAppointmentsUrl(params: ListAppointmentsParams = {}) {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.status) sp.set("status", params.status);
  if (params.leadId?.trim()) sp.set("leadId", params.leadId.trim());
  if (params.customerId?.trim()) sp.set("customerId", params.customerId.trim());
  if (params.startFrom?.trim()) sp.set("startFrom", params.startFrom.trim());
  if (params.startTo?.trim()) sp.set("startTo", params.startTo.trim());
  const qs = sp.toString();
  return `/api/installers/appointments${qs ? `?${qs}` : ""}`;
}

export async function fetchInstallerAppointments(
  params: ListAppointmentsParams = {},
  init?: RequestInit,
): Promise<InstallerAppointment[]> {
  const res = await fetchWithInstallerSession(buildAppointmentsUrl(params), {
    cache: "no-store",
    ...init,
  });
  const json = (await res.json()) as ApiEnvelope<InstallerAppointment[]>;
  if (!res.ok) {
    throw new Error(json.message || "Failed to load appointments");
  }
  return Array.isArray(json.data) ? json.data : [];
}

export type CreateAppointmentInput = {
  title: string;
  startAt: string;
  endAt: string;
  leadId?: string;
  customerId?: string;
  notes?: string;
  status?: InstallerAppointmentStatus;
};

export async function createInstallerAppointment(input: CreateAppointmentInput) {
  const res = await fetchWithInstallerSession("/api/installers/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiEnvelope<InstallerAppointment>;
  if (!res.ok) {
    throw new Error(json.message || "Failed to create appointment");
  }
  if (!json.data) {
    throw new Error(json.message || "Failed to create appointment");
  }
  return json.data;
}

export type UpdateAppointmentInput = Partial<
  Pick<CreateAppointmentInput, "title" | "startAt" | "endAt" | "notes" | "status">
>;

export async function updateInstallerAppointment(
  id: string,
  input: UpdateAppointmentInput,
) {
  const res = await fetchWithInstallerSession(
    `/api/installers/appointments/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  const json = (await res.json()) as ApiEnvelope<InstallerAppointment>;
  if (!res.ok) {
    throw new Error(json.message || "Failed to update appointment");
  }
  return json.data;
}

export async function deleteInstallerAppointment(id: string) {
  const res = await fetchWithInstallerSession(
    `/api/installers/appointments/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );
  const json = (await res.json()) as ApiEnvelope<InstallerAppointment>;
  if (!res.ok) {
    throw new Error(json.message || "Failed to cancel appointment");
  }
  return json.data;
}
