"use client";

import { useEffect, useState } from "react";
import type { CustomerDesign } from "@/lib/customers/designs";

/**
 * The lead's proposal PDF, exactly as the design platform makes it: the saved
 * design is loaded and the same ten-page PDF is built in the browser, then
 * shown in the browser's PDF viewer (zoom, print and download included).
 */
export function LeadProposalPdf({ designId, customerName }: { designId: string | null; customerName: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!designId) return;
    let off = false;
    let made: string | null = null;
    setUrl(null);
    setError(null);
    (async () => {
      const res = await fetch(`/api/admin/designs/${encodeURIComponent(designId)}`, { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as { data?: CustomerDesign; message?: string };
      if (res.status === 401) throw new Error("Your sign-in has expired. Sign in again to see the proposal.");
      if (!res.ok || !json.data) throw new Error(json.message || "Couldn't load the saved design.");
      const [{ designToProposalState }, { generateProposalPdfBlob }] = await Promise.all([
        import("@/lib/customers/design-pdf"),
        import("@/lib/proposal/generateProposalPdf"),
      ]);
      const blob = await generateProposalPdfBlob(designToProposalState(json.data));
      if (off) return;
      made = URL.createObjectURL(blob);
      setUrl(made);
    })().catch((e: unknown) => {
      if (!off) setError(e instanceof Error ? e.message : "Couldn't make the proposal PDF.");
    });
    return () => {
      off = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [designId]);

  const box = "flex h-full items-center justify-center px-6 text-center text-[14px]";
  if (!designId)
    return <div className={`${box} text-[#C9D6EA]`}>No design has been saved for {customerName} yet, so there is no proposal. Use Solar Design to make one.</div>;
  if (error) return <div className={`${box} text-[#FCA5A5]`}>{error}</div>;
  if (!url)
    return (
      <div className={`${box} flex-col gap-3 text-[#C9D6EA]`} role="status">
        <span className="size-8 animate-spin rounded-full border-[3px] border-[#F68A0A] border-t-transparent" aria-hidden="true" />
        Preparing the proposal PDF…
      </div>
    );
  return <iframe title={`Proposal PDF for ${customerName}`} src={url} className="block h-full w-full border-0 bg-white" />;
}
