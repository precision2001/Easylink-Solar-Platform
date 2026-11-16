import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

/** The AI reads the lead's record and moves it to the stage that record supports. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await backendAuthedFetch("admin", `/leads/${encodeURIComponent(id)}/pipeline/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: (await req.text()) || "{}",
  });
  return forwardBackendJson(res);
}
