"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { toast } from "react-toastify";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  EQUIPMENT_CATEGORY_KEYS,
  selectDesignProposal,
  mergeProposalData,
  type EquipmentCategoryKey,
} from "@/lib/store/designProposalSlice";
import { setUser } from "@/lib/store/customerAuthSlice";
import {
  profileDiff,
  updateCustomerProfile,
} from "@/lib/customers/profile";
import { useRouter, useSearchParams } from "next/navigation";
import {
  proposalProducts,
  proposalToDesignInput,
  saveBuilderDesign,
  saveCustomDesign,
} from "@/lib/customers/custom-design";
import {
  addProductToInstallerDesign,
  removeProductFromInstallerDesign,
  updateInstallerDesign,
  type InstallerCustomerDesign,
} from "@/lib/installers/designs";
import { clearDesignDraft, saveDesignDraft } from "@/lib/designs/draft-persistence";
import { DesignsProposalDownloadModal } from "./DesignsProposalDownloadModal";
import {
  DEFAULT_BATTERY_CAPACITY_ID,
  DEFAULT_PANEL_TIER_ID,
  BATTERY_CAPACITY_OPTIONS,
  PANEL_TIER_OPTIONS,
  findBatteryCapacity,
  findPanelTier,
} from "@/lib/designs/proposalOptions";
import {
  DEFAULT_FINANCIAL_PROJECTION_ASSUMPTIONS,
  buildFinancialProjectionFromProposal,
} from "@/lib/proposal/financialProjection";
import { estimateSavings } from "@/lib/proposal/proposalPricing";
import { useProposalPricing } from "@/lib/proposal/useProposalPricing";


/** Usable kWh from a battery option label ("14.6kWh" → 14.6; "None" → 0). */
function batteryKwhOf(id: string): number {
  const n = Number.parseFloat(findBatteryCapacity(id).label);
  return Number.isFinite(n) ? n : 0;
}

/**
 * The installer save endpoint (PATCH /designs/:id) doesn't accept a
 * `products` array the way the customer builder's PUT does — only the
 * per-product add/remove endpoints exist for installers. So the wizard's
 * equipment picks are reconciled against the design's existing products one
 * at a time: anything newly picked or with a changed quantity is (re)added
 * (the backend upserts by productId), anything no longer picked is removed.
 * Without this, equipment chosen in the Items step never shows up on the
 * installer's job page, which only reads `design.products`.
 */
async function syncInstallerDesignProducts(
  designId: string,
  desired: { productId: string; quantity: number }[],
  existing: InstallerCustomerDesign["products"],
): Promise<void> {
  const existingByProductId = new Map(
    (existing ?? [])
      .filter((item) => item.product?.id)
      .map((item) => [item.product!.id, item]),
  );

  for (const item of desired) {
    const current = existingByProductId.get(item.productId);
    if (!current || current.quantity !== item.quantity) {
      await addProductToInstallerDesign(designId, item);
    }
  }

  const desiredIds = new Set(desired.map((item) => item.productId));
  for (const [productId] of existingByProductId) {
    if (!desiredIds.has(productId)) {
      await removeProductFromInstallerDesign(designId, productId);
    }
  }
}

function parseMoneyToNumber(raw: string): number {
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function formatAud(n: number): string {
  return `$${Math.round(n).toLocaleString("en-AU")}`;
}

function ProposalStatCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: "cyan" | "gold";
}) {
  const bg =
    variant === "cyan"
      ? "bg-[linear-gradient(156.24deg,rgba(32,148,243,0.24)_0%,rgba(23,207,207,0.24)_100%)]"
      : "bg-[linear-gradient(156.24deg,rgba(253,224,71,0.24)_0%,rgba(247,141,0,0.24)_100%)]";

  return (
    <div
      className={`flex min-w-0 flex-1 flex-col rounded-[16.471px] p-1 ${bg}`}
    >
      <p className="text-center font-source-sans text-[12px] font-normal uppercase leading-[21.618px] tracking-[0.7206px] text-white/70">
        {label}
      </p>
      <p className="text-center font-source-sans text-[16px] font-normal text-white">
        {value}
      </p>
    </div>
  );
}

const CATEGORY_DETAIL_LABEL: Record<EquipmentCategoryKey, string> = {
  solarPanel: "Solar Panels",
  inverter: "Inverter",
  battery: "Battery",
  evCharger: "EV Charger",
  heatPump: "Heat Pump",
};

function ProposalDetailRow({
  label,
  value,
  mask,
}: {
  label: string;
  value: string;
  /** Set for rows carrying customer PII (name/address) — hides the value from Clarity session recordings. */
  mask?: boolean;
}) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-1.5 text-[13px] leading-[20px]">
      <span className="shrink-0 font-source-sans font-semibold text-black">
        {label}:
      </span>
      <span
        className="min-w-0 font-inter font-normal text-black/80"
        {...(mask ? { "data-clarity-mask": "true" } : {})}
      >
        {value}
      </span>
    </p>
  );
}

function ProposalSubMetric({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  /** Applied to the value span (e.g. gradient text). */
  valueClassName?: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-[14.412px] bg-white/10 px-[16.465px] pt-[10px]">
      <p className="text-center font-inter text-[12.353px] font-normal leading-[18.529px] text-white/50">
        {label}
      </p>
      <p className="mt-1 text-center font-source-sans text-[20.588px] font-normal leading-[30.882px]">
        <span className={valueClassName ?? "text-white"}>{value}</span>
      </p>
    </div>
  );
}

function PanelTierSelector({
  selectedId,
  onSelect,
  deltas,
  info,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  /** Price difference vs Standard for this design, from the pricing engine. */
  deltas: Record<string, number>;
  /** The panel behind each tier, from the price book. */
  info?: Record<string, { model: string; w: number }>;
}) {
  return (
    <div
      className="flex h-full w-full flex-col rounded-[20px] border-[1.5px] border-solid border-white/40 p-[16px] shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)]"
      style={{
        // Same gradient as the Solar Design button (SolarDesignCtaButton).
        backgroundImage: "linear-gradient(158.907deg, rgb(84, 116, 235) 16.143%, rgb(255, 60, 60) 99.619%)",
      }}
    >
      <p className="font-source-sans text-[13px] font-bold uppercase tracking-[1px] text-white">
        Panel Tier
      </p>
      <div className="mt-3 flex flex-1 flex-col justify-evenly gap-[10px]">
        {PANEL_TIER_OPTIONS.map((tier) => {
          const selected = tier.id === selectedId;
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => onSelect(tier.id)}
              className={`flex w-full items-center justify-between gap-3 rounded-[12px] border px-[16px] py-1.5 text-left transition ${
                selected
                  ? "border-[#0B2A4A] bg-[#0B2A4A] shadow-md"
                  : "border-white bg-white/85 hover:bg-white"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    selected ? "border-yellow-lemon" : "border-[#0B2A4A]/40"
                  }`}
                >
                  {selected ? (
                    <span className="h-2 w-2 rounded-full bg-yellow-lemon" />
                  ) : null}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={`font-source-sans text-[15px] font-semibold ${selected ? "text-white" : "text-[#0B2A4A]"}`}>
                      {tier.label}
                    </span>
                    {tier.recommended ? (
                      <span className="rounded-full bg-yellow-lemon px-2 py-[1px] font-source-sans text-[10px] font-bold uppercase tracking-[0.5px] text-black">
                        Recommended
                      </span>
                    ) : null}
                  </span>
                  <span className={`block font-inter text-[12px] ${selected ? "text-white/70" : "text-[#0B2A4A]/60"}`}>
                    {info?.[tier.id] ? `${info[tier.id].w}W · ${info[tier.id].model.replace(/\s*\d{3}W\b/, "")}` : `${tier.wattageLabel} · ${tier.brandModel}`}
                  </span>
                </span>
              </div>
              <span className={`shrink-0 font-source-sans text-[14px] font-semibold ${selected ? "text-yellow-lemon" : "text-[#0B2A4A]"}`}>
                {(deltas[tier.id] ?? 0) === 0
                  ? "Included"
                  : `${deltas[tier.id] > 0 ? "+" : "−"}${formatAud(Math.abs(deltas[tier.id]))}`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BatterySelector({
  selectedId,
  onSelect,
  prices,
  sizeKwh,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  /** Added cost of each battery for this design (after battery STCs), from the quote engine. */
  prices: Record<string, number>;
  /** The design's battery size; shown when it isn't one of the buttons (e.g. 13 kWh from the Energy step). */
  sizeKwh: number;
}) {
  const option = findBatteryCapacity(selectedId);
  const optionKwh = Number.parseFloat(option.label);
  const selected =
    sizeKwh > 0 && !(Number.isFinite(optionKwh) && Math.abs(optionKwh - sizeKwh) < 0.05)
      ? { ...option, label: `${Math.round(sizeKwh * 10) / 10}kWh` }
      : option;
  return (
    <div className="flex h-full w-full flex-col rounded-[20px] border-[1.5px] border-solid border-design-accent-cyan bg-linear-to-r from-yellow-lemon to-orange-amber p-[16px] shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)]">
      <div className="flex items-center justify-between">
        <p className="font-source-sans text-[13px] font-bold uppercase tracking-[1px] text-black/75">
          Battery
        </p>
        <p className="rounded-full bg-black/80 px-3 py-[2px] font-source-sans text-[13px] font-semibold text-yellow-lemon">
          {selected.label}
        </p>
      </div>
      <div className="mt-3 grid flex-1 grid-cols-2 gap-[8px]">
        {BATTERY_CAPACITY_OPTIONS.map((battery) => {
          const isSelected = battery.id === selectedId;
          return (
            <button
              key={battery.id}
              type="button"
              onClick={() => onSelect(battery.id)}
              className={`rounded-[10px] px-[10px] py-[10px] text-center font-source-sans text-[13px] font-semibold transition ${
                isSelected
                  ? "bg-[#0B2A4A] text-white ring-2 ring-white shadow-md"
                  : "bg-white/85 text-black hover:bg-white"
              }`}
            >
              {battery.label}
              {battery.id !== "none" && prices[battery.id] ? (
                <span className={`block text-[11px] font-normal ${isSelected ? "text-yellow-lemon" : "text-black/60"}`}>
                  +{formatAud(prices[battery.id])}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type DesignsProposalStepContentProps = {
  customerName?: string;
  /** Mirrors the internal `saving` state up so the wizard's Finish button can show it. */
  onSavingChange?: (saving: boolean) => void;
};

export type DesignsProposalStepHandle = {
  /** Invoked by the wizard's Finish button — same persistence the old standalone Save button used. */
  save: () => void;
};

/**
 * Figma Screen 32 (20:22020) — proposal summary, system details, pricing, CTA.
 */
export const DesignsProposalStepContent = forwardRef<
  DesignsProposalStepHandle,
  DesignsProposalStepContentProps
>(function DesignsProposalStepContent(
  { customerName = "Charli Abdo", onSavingChange },
  ref,
) {
  const proposal = useAppSelector(selectDesignProposal);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const customerUser = useAppSelector((s) => s.customerAuth.user);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingDesignId = searchParams.get("designId");
  /**
   * Set when an installer opened the Designer for a customer (see
   * InstallerHomeSolarDesignCard) — this session has no customer auth
   * cookies at all, so saving must go through the installer-authenticated
   * endpoint instead of the customer one, which would just 401/403.
   */
  const installerCustomerId = searchParams.get("customerId");
  const isInstallerEditing = Boolean(installerCustomerId);

  /**
   * Persists the builder output so it shows on the customer's design page and
   * to their installer. When the customer arrived from their design page
   * (`?designId=`) the edit is written back to that design and we return them
   * there; otherwise it upserts their custom design. Triggered by the wizard's
   * Finish button — there used to also be a standalone Save button here, but
   * that just duplicated Finish for no reason once Finish itself persists.
   */
  async function handleSaveToAccount() {
    if (saving) return;
    setSaving(true);
    onSavingChange?.(true);
    try {
      const input = proposalToDesignInput(proposal);

      // Installer session: no customer cookies to write a profile with, and
      // the customer-scoped save endpoints reject anyone but the design's
      // owner — this is the only path an installer can actually write to.
      if (isInstallerEditing) {
        if (!editingDesignId) {
          throw new Error(
            "This customer has no design yet to save changes to.",
          );
        }
        const updated = await updateInstallerDesign(editingDesignId, {
          wizardData: input.wizardData,
          title: input.title,
          address: input.address,
          panelCount: input.panelCount,
          estimatedSavings: input.estimatedSavings,
        });
        await syncInstallerDesignProducts(
          editingDesignId,
          proposalProducts(proposal) ?? [],
          updated.products,
        );
        toast.success("Design changes saved.");
        router.push("/installers/dashboard/home");
        return;
      }

      // Contact details belong to the account record, not the design — the
      // design page, the installer and comms all read it there. Without this
      // write the customer's edit lives only in wizardData and is overwritten
      // by the account values on the next load.
      if (customerUser) {
        const update = profileDiff(customerUser, {
          name: proposal.customer.name,
          phoneNumber: proposal.customer.phoneNumber,
        });

        if (Object.keys(update).length > 0) {
          const saved = await updateCustomerProfile(update);
          dispatch(setUser({ ...customerUser, ...saved }));
        }
      }

      // A signed-out visitor's save 401s and gets bounced to sign-in/sign-up
      // (fetchWithCustomerSession's own redirect, with `?from=` pointing back
      // here) — a fresh mount of this page with no designId/customerId then
      // resets the wizard's Redux state, so without this snapshot the design
      // they just finished building would be gone when they came back signed
      // in. Cleared the moment a save actually succeeds.
      saveDesignDraft(proposal);

      if (editingDesignId) {
        await saveBuilderDesign(editingDesignId, input);
        clearDesignDraft();
        toast.success("Your design changes were saved.");
        router.push("/customers/design");
        return;
      }

      // Without this redirect the page kept the no-designId URL after saving,
      // so a reload (or just navigating back into the builder) couldn't
      // rehydrate anything from `wizardData` — every field the customer had
      // just set, including the Energy step's battery slider, looked reset.
      await saveCustomDesign(input);
      clearDesignDraft();
      toast.success("Design saved to your account.");
      router.push("/customers/design");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save your design",
      );
    } finally {
      setSaving(false);
      onSavingChange?.(false);
    }
  }

  useImperativeHandle(
    ref,
    () => ({
      save: () => void handleSaveToAccount(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [proposal, isInstallerEditing, editingDesignId, customerUser],
  );

  const displayCustomerName = proposal.customer.name || customerName;

  const letterFirstName = useMemo(() => {
    const first = displayCustomerName.trim().split(/\s+/)[0];
    return first || "Adam";
  }, [displayCustomerName]);

  const panelTierId = proposal.equipment.panelTierId ?? DEFAULT_PANEL_TIER_ID;
  /**
   * One battery size for the whole design, so the proposal follows the
   * system the customer built: the Energy step's battery size (kWh) first,
   * then a battery picked in the equipment step, then this step's own pick.
   * Before, this step only read its own pick (default None), so a 20 kWh
   * battery set on the Energy step was neither priced nor selected here.
   */
  const itemsBatteryKwh = useMemo(() => {
    const items = proposal.equipment.items.battery ?? [];
    const total = items.reduce((sum, it) => {
      const kwh = Number.parseFloat(it.ratingLabel);
      return Number.isFinite(kwh) && /kwh/i.test(it.ratingLabel) ? sum + kwh * Math.max(1, it.quantity) : sum;
    }, 0);
    return total > 0 ? total : undefined;
  }, [proposal.equipment.items.battery]);
  const designBatteryKwh =
    proposal.equipment.batteryCapacityKwh ??
    itemsBatteryKwh ??
    batteryKwhOf(proposal.equipment.batteryCapacityId ?? DEFAULT_BATTERY_CAPACITY_ID);
  /** The battery button that matches the design's size (the nearest one). */
  const batteryCapacityId = useMemo(() => {
    let best = BATTERY_CAPACITY_OPTIONS[0];
    for (const b of BATTERY_CAPACITY_OPTIONS) {
      if (Math.abs(batteryKwhOf(b.id) - designBatteryKwh) < Math.abs(batteryKwhOf(best.id) - designBatteryKwh)) best = b;
    }
    return best.id;
  }, [designBatteryKwh]);

  /**
   * Pricing engine: the design's panels, tier and battery priced with the
   * quote engine (supply, install, margin, GST, less solar and battery STCs;
   * inverter sized under the 200% / 133% rules), and savings estimated from
   * the design's generation against the customer's bill. Replaces the fixed
   * $11,200 and the fixed 26% saving the page used to show.
   */
  const panelCount =
    Number.parseInt(proposal.equipment.numberOfPanels || proposal.summary.totalPanels || "0", 10) || 0;
  const monthlyBill = parseMoneyToNumber(proposal.pricing.currentBill);
  // Priced at the design's exact size (the Energy step can set e.g. 13 kWh).
  const batteryKwh = designBatteryKwh;
  const batteryOptionsKwh = useMemo(
    () => BATTERY_CAPACITY_OPTIONS.map((b) => batteryKwhOf(b.id)),
    [],
  );
  const tierIds = useMemo(() => PANEL_TIER_OPTIONS.map((x) => x.id), []);
  const { data: priced, loading: pricingLoading, error: pricingError } = useProposalPricing(
    panelCount,
    panelTierId,
    batteryKwh,
    batteryOptionsKwh,
    tierIds,
  );
  const selectedQuote = priced?.selected ?? null;
  const arrayKw = selectedQuote?.arrayKw ?? 0;
  const savings = useMemo(
    () => estimateSavings(monthlyBill, arrayKw, batteryKwh),
    [monthlyBill, arrayKw, batteryKwh],
  );
  const tierDeltas = useMemo(() => {
    const totals = priced?.tierTotals ?? {};
    const base = totals.standard ?? 0;
    return Object.fromEntries(
      PANEL_TIER_OPTIONS.map((t) => [t.id, totals[t.id] != null ? totals[t.id] - base : 0]),
    ) as Record<string, number>;
  }, [priced]);
  const batteryPrices = useMemo(() => {
    const totals = priced?.batteryTotals ?? {};
    const none = totals["0"] ?? 0;
    return Object.fromEntries(
      BATTERY_CAPACITY_OPTIONS.map((b) => {
        const t = totals[String(batteryKwhOf(b.id))];
        return [b.id, t != null ? Math.max(0, t - none) : 0];
      }),
    ) as Record<string, number>;
  }, [priced]);

  /** null until the backend has priced this design. */
  const computedTotalPrice = selectedQuote ? selectedQuote.net : null;
  const yearlySavingsNum = savings.yearlySavings;
  const computedPayback =
    computedTotalPrice != null && yearlySavingsNum > 0
      ? `${(computedTotalPrice / yearlySavingsNum).toFixed(1)} yrs`
      : proposal.summary.payback;

  const netSavings25yr = useMemo(() => {
    const { rows } = buildFinancialProjectionFromProposal(
      {
        ...proposal,
        pricing: {
          ...proposal.pricing,
          totalSystemPrice: formatAud(computedTotalPrice ?? 0),
        },
      },
      { ...DEFAULT_FINANCIAL_PROJECTION_ASSUMPTIONS, projectionYears: 25 },
    );
    return rows.at(-1)?.cumulativeImpacts ?? 0;
  }, [proposal, computedTotalPrice]);

  function handleSelectPanelTier(id: string) {
    dispatch(mergeProposalData({ equipment: { panelTierId: id } }));
  }

  function handleSelectBattery(id: string) {
    // Written to the shared size too, so the Energy step shows the same battery.
    dispatch(mergeProposalData({ equipment: { batteryCapacityId: id, batteryCapacityKwh: batteryKwhOf(id) } }));
  }

  /**
   * Keeps the stored price, savings and payback in sync with the engine so
   * downstream reads (PDF, save-to-account) see the same numbers.
   */
  useEffect(() => {
    // Don't overwrite the saved price until the pricing engine has answered.
    if (computedTotalPrice == null) return;
    const next = {
      totalSystemPrice: formatAud(computedTotalPrice),
      monthlySavings: formatAud(savings.monthlySavings),
      newBill: formatAud(savings.newBill),
      yearlySavings: formatAud(savings.yearlySavings),
      payback: computedPayback,
    };
    if (
      proposal.pricing.totalSystemPrice === next.totalSystemPrice &&
      proposal.pricing.monthlySavings === next.monthlySavings &&
      proposal.pricing.newBill === next.newBill &&
      proposal.summary.yearlySavings === next.yearlySavings &&
      proposal.summary.payback === next.payback
    ) {
      return;
    }
    dispatch(
      mergeProposalData({
        pricing: {
          totalSystemPrice: next.totalSystemPrice,
          monthlySavings: next.monthlySavings,
          newBill: next.newBill,
        },
        summary: { yearlySavings: next.yearlySavings, payback: next.payback },
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedTotalPrice, computedPayback, savings]);

  return (
    <div className="flex w-full flex-1 items-start self-start overflow-y-auto">
      <div className="relative z-10 mx-auto flex w-full max-w-[1446px] flex-col px-4 pb-8 pt-4 sm:px-8 lg:px-[81px] lg:pt-[12px]">
        <div className="mx-auto flex w-full flex-col gap-[10px]">
          <div className="flex flex-col gap-[20px]">
            <div className="grid grid-cols-2 gap-[16.465px] lg:grid-cols-4">
              <ProposalStatCard
                label="System Size"
                value={proposal.summary.systemSize}
                variant="cyan"
              />
              <ProposalStatCard
                label="Total Panels"
                value={proposal.summary.totalPanels}
                variant="gold"
              />
              <ProposalStatCard
                label="Yearly Savings"
                value={proposal.summary.yearlySavings}
                variant="cyan"
              />
              <ProposalStatCard
                label="Payback"
                value={proposal.summary.payback}
                variant="gold"
              />
            </div>
          </div>

          <div className="flex flex-col gap-[16px]">
            <div className="flex flex-col items-stretch gap-[16px] lg:flex-row">
              <div className="flex w-full lg:max-w-[550.735px] lg:shrink-0">
                <PanelTierSelector
                  selectedId={panelTierId}
                  onSelect={handleSelectPanelTier}
                  deltas={tierDeltas}
                  info={priced?.tierInfo}
                />
              </div>
              <div className="flex w-full flex-1">
                <BatterySelector
                  selectedId={batteryCapacityId}
                  onSelect={handleSelectBattery}
                  prices={batteryPrices}
                  sizeKwh={batteryKwh}
                />
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-[16px] lg:flex-row">
              <div className="flex w-full flex-col justify-center rounded-[20px] border-[1.5px] border-solid border-design-accent-cyan bg-[linear-gradient(133.09deg,#FFEF62_0%,#F78D00_100%)] px-[20px] py-[16px] lg:w-[33%]">
                <h2 className="font-source-sans text-[15px] font-bold uppercase tracking-[0.8px] text-black">
                  System Details
                </h2>

                <div className="flex flex-col gap-[4px]">
                  <ProposalDetailRow
                    label="Customer"
                    value={displayCustomerName}
                    mask
                  />
                  <ProposalDetailRow
                    label="Address"
                    value={proposal.customer.address}
                    mask
                  />
                  <ProposalDetailRow
                    label="Property"
                    value={proposal.customer.property}
                  />
                  {EQUIPMENT_CATEGORY_KEYS.map((key) => {
                    const items = proposal.equipment.items[key];
                    if (!items || items.length === 0) return null;
                    const value = items
                      .map((item) =>
                        `${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ""} ${item.ratingLabel}`.trim(),
                      )
                      .join(", ");
                    return (
                      <ProposalDetailRow
                        key={key}
                        label={CATEGORY_DETAIL_LABEL[key]}
                        value={value}
                      />
                    );
                  })}
                  {batteryKwh > 0 && !(proposal.equipment.items.battery?.length) ? (
                    <ProposalDetailRow label="Battery" value={`${Math.round(batteryKwh * 10) / 10} kWh`} />
                  ) : null}
                  <ProposalDetailRow
                    label="Number of Panels"
                    value={proposal.summary.totalPanels}
                  />
                  <ProposalDetailRow
                    label="Panel Tier"
                    value={findPanelTier(panelTierId).label}
                  />
                  <ProposalDetailRow
                    label="CO2 Offset"
                    value={proposal.equipment.co2Offset}
                  />
                </div>
              </div>

              <div className="w-full rounded-[20px] border-[1.5px] border-solid border-design-accent-cyan bg-[rgba(23,23,23,0.6)] px-[24px] py-2 lg:w-[33%]">
                <p className="text-center font-source-sans text-[13px] font-normal uppercase leading-[20px] tracking-[0.6px] text-white/60">
                  Total System Price
                </p>
                <p className="mt-1 text-center font-source-sans text-[clamp(20px,3.5vw,20px)] font-normal">
                  <span className="bg-[linear-gradient(154.91deg,#FFEF62_0%,#F78D00_100%)] bg-clip-text text-transparent">
                    {computedTotalPrice != null ? formatAud(computedTotalPrice) : pricingError ? "Price on request" : "Pricing…"}
                  </span>
                </p>
                <p className="mt-1 text-center font-source-sans text-[11px] font-normal leading-[16px] text-white/40" aria-live="polite">
                  {selectedQuote
                    ? `*Includes installation and GST, after ${selectedQuote.stcCount} STCs (${formatAud(selectedQuote.stcValue)}). ${
                        selectedQuote.battery?.inverterBuiltIn ? `${selectedQuote.battery.model}` : (selectedQuote.inverter?.model ?? "")
                      }${selectedQuote.phase === 3 ? ", three-phase supply" : ""}.${pricingLoading ? " Updating…" : ""}`
                    : pricingError
                      ? "We couldn't price this design just now. Your installer will confirm the price."
                      : "Working out your price…"}
                </p>
                <div className="mt-2 flex gap-[8px]">
                  <ProposalSubMetric
                    label="Monthly Savings"
                    value={proposal.pricing.monthlySavings}
                  />
                  <ProposalSubMetric
                    label="Current Bill"
                    value={proposal.pricing.currentBill}
                  />
                  <ProposalSubMetric
                    label="New Bill"
                    value={proposal.pricing.newBill}
                    valueClassName="inline-block bg-[linear-gradient(142.91deg,#FFEF62_0%,#F78D00_100%)] bg-clip-text text-transparent"
                  />
                </div>
              </div>

              <div className="flex w-full flex-col justify-center rounded-[20px] border-[1.5px] border-solid border-design-accent-cyan bg-[rgba(255,255,255,0.08)] px-[24px] py-[16px] lg:w-[33%]">
                <p className="text-center font-source-sans text-[13px] font-normal uppercase leading-[20px] tracking-[0.6px] text-white/60">
                  25-Year Net Savings
                </p>
                <p className="mt-1 text-center font-source-sans text-[clamp(24px,3vw,32px)] font-normal leading-[1.2]">
                  <span className="bg-[linear-gradient(154.98deg,#2094F3_0%,#17CFCF_100%)] bg-clip-text text-transparent">
                    {formatAud(netSavings25yr)}
                  </span>
                </p>
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-[478.263px] flex-col gap-[10px]">
              <button
                type="button"
                className="py-2 w-full rounded-[14.412px] bg-[linear-gradient(172.76deg,#2094F3_0%,#17CFCF_100%)] font-source-sans text-[18.529px] font-medium uppercase leading-[27.794px] tracking-[0.9265px] text-white shadow-[0px_0px_30.882px_0px_rgba(32,148,243,0.4)] transition hover:brightness-105"
                onClick={() => setDownloadModalOpen(true)}
              >
                Download your proposal
              </button>

            </div>
          </div>
        </div>
      </div>

      <DesignsProposalDownloadModal
        open={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        letterFirstName={letterFirstName}
      />
    </div>
  );
});
