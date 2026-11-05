import { NextResponse } from "next/server";
import { backendAuthedFetch } from "@/lib/server/backend-authed-fetch";

type Ctx = { params: Promise<{ id: string; size: string }> };

/** The lead's roof design image (thumb or large), from the backend. */
export async function GET(_request: Request, ctx: Ctx) {
  const { id, size } = await ctx.params;
  if (size !== "thumb" && size !== "large") return NextResponse.json({ message: "Unknown size" }, { status: 400 });
  const res = await backendAuthedFetch("admin", `/leads/${encodeURIComponent(id)}/roof-design/image/${size}`);
  if (res instanceof NextResponse) return res;
  if (!res.ok) return NextResponse.json({ message: "No roof design image" }, { status: res.status });
  return new NextResponse(await res.arrayBuffer(), {
    status: 200,
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=86400" },
  });
}
