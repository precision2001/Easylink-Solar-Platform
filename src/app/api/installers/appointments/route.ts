import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";
import { forwardBackendJsonWithEvents } from "@/lib/server/ai-platform";

export async function GET(request: Request) {
  const qs = new URL(request.url).searchParams.toString();
  const path = `/appointments${qs ? `?${qs}` : ""}`;
  const res = await backendAuthedFetch("installer", path);
  return forwardBackendJson(res);
}

export async function POST(request: Request) {
  const body = await request.text();
  const res = await backendAuthedFetch("installer", "/appointments", {
    method: "POST",
    body,
  });
  return forwardBackendJsonWithEvents(res, "installer", (d) => [
    {
      type: "appointment.booked",
      subject: { type: "appointment", id: String(d.id ?? "") },
      links: [
        ...(d.leadId ? [{ type: "lead", id: String(d.leadId) }] : []),
        ...(d.customerId ? [{ type: "customer", id: String(d.customerId) }] : []),
      ],
      data: { startsAt: d.startTime ?? d.startsAt ?? d.date ?? null, kind: d.type ?? null },
    },
  ]);
}
