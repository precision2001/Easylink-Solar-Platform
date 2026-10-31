"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { toast } from "react-toastify";

import { PAGE_H, PAGE_W, ProposalPages } from "@/components/proposal/ProposalPages";
import { downloadPdfBlob } from "@/lib/proposal/generateProposalPdf";
import {
  loadProposalDocument,
  type LoadedProposal,
} from "@/lib/proposal/loadProposalDocument";
import { useAppSelector } from "@/lib/store/hooks";
import { selectDesignProposal } from "@/lib/store/designProposalSlice";

export type DesignsProposalDownloadModalProps = {
  open: boolean;
  onClose: () => void;
  /** Override first name for “Dear …” (defaults from Redux `customer.name`). */
  letterFirstName?: string;
  /** Optional hook after a successful PDF download. */
  onConfirmDownload?: () => void;
};


function firstWordName(fullName: string): string {
  const t = fullName.trim();
  if (!t) return "Customer";
  return t.split(/\s+/)[0] ?? "Customer";
}

/**
 * Proposal preview: the customer's ten proposal pages, priced and filled
 * from their design, with a download button. The PDF is drawn from the same
 * loaded pages, so the download matches the preview.
 */
export function DesignsProposalDownloadModal({
  open,
  onClose,
  letterFirstName,
  onConfirmDownload,
}: DesignsProposalDownloadModalProps) {
  const proposal = useAppSelector(selectDesignProposal);
  const [downloading, setDownloading] = useState(false);
  const [loaded, setLoaded] = useState<LoadedProposal | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [boxWidth, setBoxWidth] = useState(PAGE_W);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoaded(null);
    setLoadError(false);
    loadProposalDocument(proposal)
      .then((l) => {
        if (!cancelled) setLoaded(l);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
    // Reload when the modal opens; the design can't change while it's open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const fit = () => setBoxWidth(Math.min(PAGE_W, window.innerWidth - 64));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [open]);

  const dearName = useMemo(() => {
    if (letterFirstName?.trim()) return letterFirstName.trim();
    return firstWordName(proposal.customer.name);
  }, [letterFirstName, proposal.customer.name]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      if (!loaded) return;
      const { renderProposalPdfs } = await import("@/lib/proposal/renderProposalPdf");
      const { download, email } = await renderProposalPdfs(loaded);
      downloadPdfBlob(download, proposal.customer.name);

      const emailTo = proposal.customer.email?.trim();
      if (emailTo) {
        try {
          if (!email.fits) {
            console.warn("Proposal email copy is still over the size limit", email.blob.size);
          }
          // The compressed copy, sent as a file (no base64), so it stays under the
          // web server's 1 MB request limit.
          const fileSlug =
            proposal.customer.name.replace(/[^\w\d\-]+/g, "-").slice(0, 48) ||
            "Customer";
          const form = new FormData();
          form.append("to", emailTo);
          form.append("filename", `Solar-Energy-Proposal-${fileSlug}.pdf`);
          form.append("dearName", dearName);
          form.append("pdf", email.blob, `Solar-Energy-Proposal-${fileSlug}.pdf`);
          const res = await fetch("/api/proposal/send-email", {
            method: "POST",
            body: form,
          });
          const raw = await res.text();
          let payload: { message?: string } = {};
          try {
            payload = raw ? (JSON.parse(raw) as { message?: string }) : {};
          } catch {
            payload = { message: raw || undefined };
          }

          if (!res.ok) {
            console.error(
              "Proposal PDF email failed",
              res.status,
              payload.message,
            );
            toast.error(
              payload.message ??
                "Proposal downloaded, but we could not email it.",
            );
          } else {
            toast.success(`Proposal emailed to ${emailTo}.`);
          }
        } catch (emailErr) {
          console.error("Proposal PDF email failed", emailErr);
          toast.error(
            "Proposal downloaded, but sending the email failed.",
          );
        }
      }

      onConfirmDownload?.();
      onClose();
    } catch (err) {
      console.error("Proposal PDF download failed", err);
      toast.error("Could not generate or download your proposal PDF.");
    } finally {
      setDownloading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8 sm:px-8"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[rgba(47,47,47,0.67)] backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="proposal-download-modal-title"
        className="relative z-[1] flex max-h-[min(841px,90vh)] w-full max-w-[880px] flex-col overflow-y-auto rounded-[16px] bg-white shadow-[0px_8px_40px_rgba(0,0,0,0.25)]"
      >
        <div className="sticky top-0 z-[2] flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
          <div>
            <h2
              id="proposal-download-modal-title"
              className="font-source-sans text-[20px] font-bold leading-tight text-[#0B1426] sm:text-[24px]"
            >
              Your solar proposal, {dearName}
            </h2>
            <p className="font-source-sans text-[14px] text-slate-600">
              Ten pages, priced for your design. Download it or check it below.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={downloading || !loaded}
              className="flex h-11 items-center justify-center rounded-[12px] bg-[#FFD60A] px-5 font-source-sans text-[16px] font-bold text-[#0B1426] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void handleDownload()}
            >
              {downloading ? "Preparing PDF…" : loaded ? "Download PDF" : "Loading…"}
            </button>
            <button
              type="button"
              aria-label="Close"
              className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-slate-300 text-[22px] leading-none text-slate-700 hover:bg-slate-100"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>

        <div className="bg-slate-100 px-4 py-6 sm:px-8">
          {loaded ? (
            <div className="mx-auto flex flex-col items-center">
              <div
                  style={{
                    width: boxWidth,
                    height: (PAGE_H * 10 + 24 * 9) * (boxWidth / PAGE_W),
                    overflow: "hidden",
                  }}
                >
                  <div style={{ width: PAGE_W, transform: `scale(${boxWidth / PAGE_W})`, transformOrigin: "top left" }}>
                    <ProposalPages doc={loaded.doc} images={loaded.images} gap={24} />
                  </div>
              </div>
            </div>
          ) : (
            <p className="py-24 text-center font-source-sans text-[16px] text-slate-600">
              {loadError ? "We couldn't load your proposal. Close this and try again." : "Pricing your design and drawing your proposal…"}
            </p>
          )}
          <p className="mx-auto mt-6 max-w-[640px] text-center font-source-sans text-[13px] text-slate-600">
            Figures are estimates from your design and bill. Your installer confirms the final design and price at your free site check.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
