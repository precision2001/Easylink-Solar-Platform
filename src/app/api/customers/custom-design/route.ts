import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";
import { readDesignBodyText } from "@/lib/server/image-compress";

export async function GET() {
  const res = await backendAuthedFetch("customer", "/designs/custom");
  return forwardBackendJson(res);
}

export async function PUT(request: Request) {
  const body = await readDesignBodyText(request);
  const res = await backendAuthedFetch("customer", "/designs/custom", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body,
  });
  return forwardBackendJson(res);
}
