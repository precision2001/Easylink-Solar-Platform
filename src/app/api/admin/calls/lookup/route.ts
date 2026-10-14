import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");
  if (!phone) {
    return new Response(
      JSON.stringify({ message: "phone is required." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const res = await backendAuthedFetch(
    "admin",
    `/calls/lookup?phone=${encodeURIComponent(phone)}`,
  );
  return forwardBackendJson(res);
}
