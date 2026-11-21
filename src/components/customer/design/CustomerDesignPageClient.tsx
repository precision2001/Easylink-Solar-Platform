"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  buildShareUrl,
  createShareLink,
  fetchReferralOverview,
  type ReferralOverview,
} from "@/lib/customers/referrals";
import { CustomerDashboardHeader } from "@/components/customer/dashboard/CustomerDashboardHeader";
import { DesignComparisonTable } from "@/components/customer/design/DesignComparisonTable";
import { ReferralProgramCard } from "@/components/customer/design/ReferralProgramCard";
import { SelectedDesignPanel } from "@/components/customer/design/SelectedDesignPanel";
import { ShareJourneyCard } from "@/components/customer/design/ShareJourneyCard";
import { YourEquipmentSection } from "@/components/customer/design/YourEquipmentSection";
import {
  buildComparisonTable,
  buildDesignSpecs,
  buildEquipmentCards,
  buildPerformanceEstimates,
  designMapScreenshotUrl,
  designStatusLabel,
  formatDesignUpdatedAt,
  formatSavingsLabel,
  pickPrimaryDesign,
} from "@/lib/customers/customer-design-view";
import {
  fetchCustomerDesigns,
  isCustomerEditableDesign,
  type CustomerDesign,
} from "@/lib/customers/designs";
import { useAppSelector } from "@/lib/store/hooks";
import Icon from "@/components/ui/Icons";

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

export function CustomerDesignPageClient({
  initialDesigns,
  initialReferrals,
}: Props) {
  const user = useAppSelector((s) => s.customerAuth.user);
  const [designs, setDesigns] = useState<CustomerDesign[]>(
    initialDesigns ?? [],
  );
  const [loading, setLoading] = useState(initialDesigns === null);
  const [error, setError] = useState<string | null>(null);
  const designsPrimedByServer = useRef(initialDesigns !== null);

  useEffect(() => {
    if (designsPrimedByServer.current) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCustomerDesigns({ limit: 20 });
        if (!cancelled) setDesigns(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load designs");
          setDesigns([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const primaryDesign = useMemo(() => pickPrimaryDesign(designs), [designs]);

  const canEdit = primaryDesign ? isCustomerEditableDesign(primaryDesign) : false;

  const [pdfBusy, setPdfBusy] = useState(false);

  /**
   * Rebuilds the same proposal PDF the design builder produces, from the stored
   * design — one generator, so the two documents cannot drift.
   */
  async function handleDownloadPdf() {
    if (!primaryDesign || pdfBusy) return;
    setPdfBusy(true);
    try {
      // Loaded on demand: the generator pulls in jsPDF (~380 KB), which is
      // dead weight for every visitor who never presses these two buttons.
      const { downloadDesignProposalPdf } = await import(
        "@/lib/customers/design-pdf"
      );
      await downloadDesignProposalPdf(primaryDesign);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not generate your PDF",
      );
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
      const { viewDesignProposalPdf } = await import(
        "@/lib/customers/design-pdf"
      );
      await viewDesignProposalPdf(primaryDesign, viewer);
    } catch (err) {
      viewer?.close();
      toast.error(
        err instanceof Error ? err.message : "Could not open your PDF",
      );
    } finally {
      setPdfBusy(false);
    }
  }

  const comparison = useMemo(
    () =>
      designs.length
        ? buildComparisonTable(
            [...designs].sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
            ),
            primaryDesign?.id ?? null,
          )
        : { columns: [], rows: [] },
    [designs, primaryDesign?.id],
  );

  // Referral totals and the share link are both real now. The share token is
  // minted on demand for the design on screen, so nothing is publicly reachable
  // until the customer opens this page.
  const [referrals, setReferrals] = useState<ReferralOverview | null>(
    initialReferrals,
  );
  const [referralsLoading, setReferralsLoading] = useState(
    initialReferrals === null,
  );
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const referralsPrimedByServer = useRef(initialReferrals !== null);

  const loadReferrals = useCallback(async () => {
    try {
      setReferrals(await fetchReferralOverview());
    } catch {
      // Non-fatal: the card renders its empty state.
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
      .then((link) => {
        if (!cancelled) setShareUrl(buildShareUrl(link));
      })
      .catch(() => {
        if (!cancelled) setShareUrl(null);
      })
      .finally(() => {
        if (!cancelled) setShareLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [primaryDesignId]);

  return (
    <div className="customer-page-bg flex min-h-screen flex-col">
      <CustomerDashboardHeader
        firstName={user?.firstName}
        lastName={user?.lastName}
        activeNav="designs"
      />

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-4 px-4 py-5 md:gap-5 md:px-5">
        {loading ? (
          <div className="customer-card-bg customer-cream-card-border rounded-[10px] border p-8 text-center font-dm-sans text-sm customer-text-subtle">
            Loading your designs…
          </div>
        ) : error ? (
          <div className="customer-card-bg customer-cream-card-border rounded-[10px] border p-8 text-center font-dm-sans text-sm text-red-400">
            {error}
          </div>
        ) : !primaryDesign ? (
          <div className="customer-card-bg customer-cream-card-border rounded-[10px] border p-8 text-center font-dm-sans text-sm customer-text-subtle">
            No solar designs yet. Your installer will add designs here once they are
            ready.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-dm-sans text-xs customer-text-subtle">
                {canEdit
                  ? "Open the design builder to change this design."
                  : "This design has been approved, so it is now read-only. Contact your installer to request a change."}
              </p>
              {canEdit ? (
                <Link
                  href={`/designs?designId=${encodeURIComponent(primaryDesign.id)}`}
                  className="flex items-center gap-1.5 rounded-lg border border-warm-border bg-white px-3 py-1.5 font-dm-sans text-xs font-semibold text-warm-ink hover:bg-cream-50"
                >
                  <Icon name="Pencil" className="size-3.5" />
                  Edit design
                </Link>
              ) : null}
            </div>

            <SelectedDesignPanel
              title={primaryDesign.title}
              lastUpdated={formatDesignUpdatedAt(primaryDesign.updatedAt)}
              savingsLabel={formatSavingsLabel(primaryDesign)}
              statusLabel={designStatusLabel(primaryDesign)}
              statusApproved={primaryDesign.status === "COMPLETED"}
              designSpecs={buildDesignSpecs(primaryDesign)}
              performanceEstimates={buildPerformanceEstimates(primaryDesign)}
              mapImageSrc={designMapScreenshotUrl(primaryDesign)}
              onViewPdf={() => void handleViewPdf()}
              onDownloadPdf={() => void handleDownloadPdf()}
              pdfBusy={pdfBusy}
            />

            {primaryDesign.customerNotes ? (
              <section className="customer-card-bg customer-cream-card-border rounded-[10px] border p-4">
                <p className="font-dm-sans text-[10px] font-semibold uppercase tracking-wide customer-text-muted">
                  Your notes for the installer
                </p>
                <p className="mt-1.5 whitespace-pre-wrap font-dm-sans text-sm customer-text-on-dark">
                  {primaryDesign.customerNotes}
                </p>
              </section>
            ) : null}

            <YourEquipmentSection cards={buildEquipmentCards(primaryDesign)} />
          </>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
          <ShareJourneyCard shareUrl={shareUrl} loading={shareLoading} />
          <ReferralProgramCard
            overview={referrals}
            loading={referralsLoading}
            onInvited={() => void loadReferrals()}
          />
        </div>

        {designs.length > 1 ? (
          <DesignComparisonTable
            designs={comparison.columns}
            rows={comparison.rows}
          />
        ) : null}
      </main>
    </div>
  );
}
