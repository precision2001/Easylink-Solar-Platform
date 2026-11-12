"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { PortalPageHeader } from "@/components/customer/portal/CustomerPortalShell";
import { PortalIcon } from "@/components/customer/portal/PortalIcon";
import { ButtonLink, EmptyNote, Panel, Skeleton } from "@/components/customer/portal/PortalParts";
import { DesignComparisonTable } from "@/components/customer/design/DesignComparisonTable";
import { CustomerTopNav } from "@/components/customer/portal/CustomerTopNav";
import {
  DesignEquipmentCards,
  DesignSpecColumns,
  StcRatioWarning,
  STC_RATIO_LIMIT,
} from "@/components/customer/design/DesignMockLayout";
import { DesignMapPreviewImage } from "@/components/customer/design/DesignMapPreviewImage";
import { ShareAndEarnPanel } from "@/components/customer/design/ShareAndEarnPanel";
import { CustomerQuotesSection } from "@/components/customer/design/CustomerQuotesSection";
import {
  buildComparisonTable,
  designMapScreenshotUrl,
  designStatusLabel,
  formatDesignUpdatedAt,
  pickPrimaryDesign,
} from "@/lib/customers/customer-design-view";
import { fetchDesignOptions, type DesignOptions } from "@/lib/customers/design-options";
import { buildDesignSpecSheet, kwLabel, optionForDesign } from "@/lib/customers/design-spec-sheet";
import { fetchCustomerDesigns, isCustomerEditableDesign, type CustomerDesign } from "@/lib/customers/designs";
import { buildShareUrl, createShareLink, fetchReferralOverview, type ReferralOverview } from "@/lib/customers/referrals";

type Props = {
  /**
   * Server-primed data from the page's Server Component. `null` means the
   * server couldn't fetch it (most commonly: the access-token cookie had
   * expired before the browser got a chance to refresh it) — distinct from
   * an empty array, which is a legitimate "no designs yet" result worth
   * trusting as-is. `null` triggers exactly the client-side fetch this page
   * always used to do unconditionally, so the worst case is unchanged from
   * before; the common case skips it entirely.
   */
  initialDesigns: CustomerDesign[] | null;
  initialReferrals: ReferralOverview | null;
};

const actionBtn =
  "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[13px] px-[18px] text-[14.5px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60";

/** "My design": the customer's selected system, its proposal, and sharing. */
export function CustomerDesignPageClient({ initialDesigns, initialReferrals }: Props) {
  const [designs, setDesigns] = useState<CustomerDesign[]>(initialDesigns ?? []);
  const [loading, setLoading] = useState(initialDesigns === null);
  const [error, setError] = useState<string | null>(null);
  const designsPrimedByServer = useRef(initialDesigns !== null);

  useEffect(() => {
    if (designsPrimedByServer.current) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCustomerDesigns({ limit: 20 })
      .then((data) => !cancelled && setDesigns(data))
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load designs");
        setDesigns([]);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Design options carry the price after STCs for the stored design. Optional:
  // without them the spec sheet falls back to what the design itself holds.
  const [options, setOptions] = useState<DesignOptions | null>(null);
  useEffect(() => {
    let live = true;
    fetchDesignOptions()
      .then((d) => live && setOptions(d))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const primaryDesign = useMemo(() => pickPrimaryDesign(designs), [designs]);
  const canEdit = primaryDesign ? isCustomerEditableDesign(primaryDesign) : false;
  const sheet = useMemo(
    () => (primaryDesign ? buildDesignSpecSheet(primaryDesign, optionForDesign(options, primaryDesign.id)) : null),
    [primaryDesign, options],
  );

  const [pdfBusy, setPdfBusy] = useState(false);

  /**
   * Rebuilds the same proposal PDF the design builder produces, from the stored
   * design — one generator, so the two documents cannot drift.
   */
  async function handleDownloadPdf() {
    if (!primaryDesign || pdfBusy) return;
    setPdfBusy(true);
    try {
      // Loaded on demand: the generator pulls in jsPDF (~380 KB).
      const { downloadDesignProposalPdf } = await import("@/lib/customers/design-pdf");
      await downloadDesignProposalPdf(primaryDesign);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate your PDF");
    } finally {
      setPdfBusy(false);
    }
  }

  async function handleViewPdf() {
    if (!primaryDesign || pdfBusy) return;
    // Opened before the await so the click gesture is still active; a popup
    // opened afterwards gets blocked.
    const viewer = window.open("", "_blank", "noopener,noreferrer");
    setPdfBusy(true);
    try {
      const { viewDesignProposalPdf } = await import("@/lib/customers/design-pdf");
      await viewDesignProposalPdf(primaryDesign, viewer);
    } catch (err) {
      viewer?.close();
      toast.error(err instanceof Error ? err.message : "Could not open your PDF");
    } finally {
      setPdfBusy(false);
    }
  }

  const comparison = useMemo(
    () =>
      designs.length
        ? buildComparisonTable(
            [...designs].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
            primaryDesign?.id ?? null,
          )
        : { columns: [], rows: [] },
    [designs, primaryDesign?.id],
  );

  // Referral totals and the share link are both real. The share token is
  // minted on demand for the design on screen, so nothing is publicly reachable
  // until the customer opens this page.
  const [referrals, setReferrals] = useState<ReferralOverview | null>(initialReferrals);
  const [referralsLoading, setReferralsLoading] = useState(initialReferrals === null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const referralsPrimedByServer = useRef(initialReferrals !== null);

  const loadReferrals = useCallback(async () => {
    try {
      setReferrals(await fetchReferralOverview());
    } catch {
      setReferrals(null);
    } finally {
      setReferralsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (referralsPrimedByServer.current) return;
    void loadReferrals();
  }, [loadReferrals]);

  const primaryDesignId = primaryDesign?.id;
  useEffect(() => {
    if (!primaryDesignId) {
      setShareUrl(null);
      return;
    }
    let cancelled = false;
    setShareLoading(true);
    createShareLink(primaryDesignId)
      .then((link) => !cancelled && setShareUrl(buildShareUrl(link)))
      .catch(() => !cancelled && setShareUrl(null))
      .finally(() => !cancelled && setShareLoading(false));
    return () => {
      cancelled = true;
    };
  }, [primaryDesignId]);

  /**
   * Panel DC against inverter AC, as a percentage — the one piece of real
   * logic in the mock's banner. Only computable when both are known, and
   * only shown when it actually exceeds what the STC rules allow.
   */
  const stcRatio =
    sheet?.kw && sheet.inverterKw
      ? (sheet.kw / sheet.inverterKw) * 100
      : undefined;

  const locked = primaryDesign ? !canEdit : false;
  const editHref = primaryDesign ? `/designs?designId=${encodeURIComponent(primaryDesign.id)}` : "/designs";

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6FA] text-[#0F172A]">
      <CustomerTopNav active="designs" />
      <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-[18px] px-6 pt-6 pb-14">
      {loading ? (
        <>
          <Skeleton className="h-[76px] max-w-[520px]" />
          <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
            <Skeleton className="h-[520px]" />
            <Skeleton className="h-[520px]" />
          </div>
        </>
      ) : error ? (
        <>
          <PortalPageHeader title="My design" />
          <EmptyNote icon="design" title="We couldn't load your design">
            {error}. Refresh the page to try again, or message us if it keeps happening.
          </EmptyNote>
        </>
      ) : !primaryDesign || !sheet ? (
        <>
          <PortalPageHeader title="My design" intro="Your solar system, its proposal and your savings, all in one place." />
          <Panel>
            <EmptyNote icon="design" title="No design yet">
              Design your system in about five minutes: find your roof, tell us your bill, and see your savings and price straight away. It appears here as soon as you save it.
            </EmptyNote>
            <div>
              <ButtonLink href="/designs" icon="arrow">
                Design my system
              </ButtonLink>
            </div>
          </Panel>
          <CustomerQuotesSection hasDesign={false} />
        </>
      ) : (
        <>
          <PortalPageHeader
            eyebrow={`${designStatusLabel(primaryDesign)} · updated ${formatDesignUpdatedAt(primaryDesign.updatedAt)}`}
            title={sheet.title}
            intro={
              canEdit
                ? "This is the system we'll quote. You can change it in the design builder until it's approved."
                : "Your design is approved and locked in. To change anything, message us and your installer will update it."
            }
            actions={
              canEdit ? (
                <ButtonLink href={editHref} variant="quiet" icon="edit">
                  Edit in builder
                </ButtonLink>
              ) : (
                <ButtonLink href="/customers/messages" variant="quiet" icon="messages">
                  Ask for a change
                </ButtonLink>
              )
            }
          />

          {/* The mock's single design card: title row, the STC warning when it
              applies, then the roof image beside two specification columns. */}
          <section
            aria-label="Selected design"
            className="flex flex-col gap-3.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="m-0 grow text-[18px] font-bold">
                {sheet.title}
                {sheet.kw ? ` · ${kwLabel(sheet.kw)}` : ""}
              </h2>
              {stcRatio !== undefined && stcRatio > STC_RATIO_LIMIT ? (
                <span className="rounded-full bg-[#FEF3C7] px-2.5 py-0.75 text-[12px] font-bold text-[#92400E]">
                  Needs a change
                </span>
              ) : null}
              <span className="rounded-full bg-[#E2E8F0] px-2.5 py-0.75 text-[12px] font-bold text-[#334155]">
                {designStatusLabel(primaryDesign)} · updated{" "}
                {formatDesignUpdatedAt(primaryDesign.updatedAt)}
              </span>
            </div>

            {stcRatio !== undefined && stcRatio > STC_RATIO_LIMIT ? (
              <StcRatioWarning
                ratio={stcRatio}
                panelCount={sheet.panelCount}
                inverterKw={sheet.inverterKw}
              />
            ) : null}

            <div className="flex flex-wrap items-start gap-4.5">
            <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2">
            <section aria-label="Your roof layout and proposal" className="flex flex-col overflow-hidden rounded-[22px] border border-[#E2E8F0] bg-white">
              <div className="relative aspect-[4/3] w-full bg-[#E8EDF3]">
                <DesignMapPreviewImage
                  src={designMapScreenshotUrl(primaryDesign)}
                  alt={`Roof layout for ${sheet.title}`}
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  priority
                />
                <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                  {locked ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-[#0B1A2E] px-3 py-1.5 text-[13px] font-bold text-white">
                      <PortalIcon name="lock" size={14} />
                      Approved and locked
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/95 px-3 py-1.5 text-[13px] font-bold text-[#0B1A2E]">{designStatusLabel(primaryDesign)}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-4 p-5 sm:p-6">
                <div className="flex flex-col gap-1">
                  <h2 className="m-0 text-[17px] font-bold text-[#0F172A]">Your proposal</h2>
                  <p className="m-0 text-[14px] leading-[1.5] text-[#475569]">
                    The full proposal with your roof layout, equipment, savings and price. The same document your installer sees.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button type="button" onClick={() => void handleDownloadPdf()} disabled={pdfBusy} className={`${actionBtn} bg-[#F68A0A] text-[#3B1D00] hover:bg-[#FF9A1F]`}>
                    <PortalIcon name="download" size={18} />
                    {pdfBusy ? "Preparing…" : "Download proposal"}
                  </button>
                  <button type="button" onClick={() => void handleViewPdf()} disabled={pdfBusy} className={`${actionBtn} border border-[#CBD5E1] bg-white text-[#0F172A] hover:border-[#64748B]`}>
                    View PDF
                  </button>
                  <a href="#share" className={`${actionBtn} text-[#1D4ED8] no-underline hover:underline`}>
                    <PortalIcon name="share" size={17} />
                    Share my design
                  </a>
                </div>
                {locked ? (
                  <p className="m-0 flex items-start gap-2 rounded-[12px] bg-[#F4F6FA] px-3.5 py-3 text-[13.5px] leading-[1.5] text-[#475569]">
                    <PortalIcon name="lock" size={16} className="mt-0.5 shrink-0 text-[#0B1A2E]" />
                    Approved designs can&rsquo;t be edited in the builder, so the quote and the install always match.
                  </p>
                ) : null}
              </div>
            </section>
              {primaryDesign.customerNotes ? (
                <Panel title="Your notes for the installer">
                  <p className="m-0 whitespace-pre-wrap text-[14.5px] leading-[1.55] text-[#334155]">{primaryDesign.customerNotes}</p>
                </Panel>
              ) : null}
            </div>

            <DesignSpecColumns sheet={sheet} />
            </div>
          </section>

          <CustomerQuotesSection hasDesign />

          <DesignEquipmentCards design={primaryDesign} />
        </>
      )}

      {!loading ? (
        <ShareAndEarnPanel
          shareUrl={shareUrl}
          shareLoading={shareLoading}
          canShareDesign={Boolean(primaryDesign)}
          overview={referrals}
          loading={referralsLoading}
          onInvited={() => void loadReferrals()}
        />
      ) : null}

      {designs.length > 1 ? <DesignComparisonTable
          designs={comparison.columns}
          // The comparison sums each design's equipment; say so, so it isn't read as the after-STC price above.
          rows={comparison.rows.map((r) => (r.feature === "Price" ? { ...r, feature: "Equipment total" } : r))}
        /> : null}
      </main>
    </div>
  );
}
