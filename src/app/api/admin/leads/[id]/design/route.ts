import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

/**
 * Operations staff save a design for a lead (Quotes & Leads → Solar Design →
 * Save design). The backend puts it on the lead's customer account without
 * emailing the customer. Body is the builder's design input.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await backendAuthedFetch("admin", `/leads/${encodeURIComponent(id)}/design`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: await req.text(),
  });
  return forwardBackendJson(res);
}
