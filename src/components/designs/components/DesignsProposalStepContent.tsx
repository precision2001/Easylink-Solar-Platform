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
import { probeSignedInCustomer, submitDesignCapture } from "@/lib/designs/capture";
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

/** Frosted glass card: translucent fill, blur, light edge, soft depth. */
const GLASS =
  "relative overflow-hidden rounded-[16px] border backdrop-blur-xl backdrop-saturate-150 shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.18)]";

/** EasyLink tints for the glass: cyan/blue, gold/orange, the Solar Design blue→red, and neutral. */
const TINT = {
  cyan: "border-[rgba(125,211,252,0.5)] bg-[linear-gradient(156deg,rgba(32,148,243,0.45)_0%,rgba(23,207,207,0.32)_100%)]",
  gold: "border-[rgba(253,230,138,0.55)] bg-[linear-gradient(156deg,rgba(253,224,71,0.42)_0%,rgba(247,141,0,0.38)_100%)]",
  design: "border-[rgba(255,255,255,0.35)] bg-[linear-gradient(159deg,rgba(84,116,235,0.5)_16%,rgba(255,60,60,0.42)_100%)]",
  neutral: "border-white/20 bg-white/[0.07]",
  /** EasyLink logo yellow → gold, near-solid so the brand colour reads at full strength. */
  brandGold: "border-[rgba(255,245,170,0.85)] bg-[linear-gradient(133deg,rgba(255,239,98,0.95)_0%,rgba(255,200,40,0.93)_45%,rgba(247,141,0,0.93)_100%)]",
} as const;

function Sheen() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_100%)]"
    />
  );
}

function CardTitle({ children, right, dark }: { children: React.ReactNode; right?: React.ReactNode; dark?: boolean }) {
  return (
    <div className="relative flex items-center justify-between gap-2">
      <p className={`font-source-sans text-[12px] font-bold uppercase tracking-[1px] ${dark ? "text-[#152238]" : "text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]"}`}>
        {children}
      </p>
      {right}
    </div>
  );
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
  return (
    <div className={`${GLASS} ${TINT[variant]} flex min-w-0 flex-col items-center justify-center px-2 py-[clamp(4px,0.9vh,10px)]`}>
      <Sheen />
      <p className="relative font-source-sans text-[11px] font-semibold uppercase tracking-[0.7px] text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
        {label}
      </p>
      <p className="relative font-source-sans text-[clamp(16px,2.4vh,22px)] font-bold leading-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
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
    <p className="flex min-w-0 items-baseline gap-x-1.5 text-[clamp(11px,1.7vh,14px)] leading-[1.35]">
      <span className="shrink-0 font-source-sans font-bold text-[#152238]">{label}:</span>
      <span
        className="min-w-0 truncate font-inter font-medium text-[#152238]/85"
        title={value}
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
    <div className="flex min-w-0 flex-1 flex-col items-center rounded-[10px] border border-white/15 bg-white/10 px-1 py-[clamp(2px,0.6vh,6px)]">
      <p className="truncate font-inter text-[10.5px] text-white/60">{label}</p>
      <p className="font-source-sans text-[clamp(14px,2.1vh,18px)] font-semibold leading-tight">
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
    <div className={`${GLASS} ${TINT.design} flex h-full min-h-0 w-full flex-col p-[clamp(8px,1.4vh,14px)]`}>
      <Sheen />
      <CardTitle>Panel Tier</CardTitle>
      <div className="relative mt-2 flex min-h-0 flex-1 flex-col justify-evenly gap-1.5">
        {PANEL_TIER_OPTIONS.map((tier) => {
          const selected = tier.id === selectedId;
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => onSelect(tier.id)}
              className={`flex w-full items-center justify-between gap-2 rounded-[10px] border px-2.5 py-[clamp(3px,0.8vh,8px)] text-left transition ${
                selected
                  ? "border-yellow-lemon/70 bg-[#0B2A4A]/90 shadow-md"
                  : "border-white/25 bg-white/15 hover:bg-white/25"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={`flex size-3.5 shrink-0 items-center justify-center rounded-full border-2 ${
                    selected ? "border-yellow-lemon" : "border-white/60"
                  }`}
                >
                  {selected ? <span className="size-1.5 rounded-full bg-yellow-lemon" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="font-source-sans text-[13px] font-semibold text-white">{tier.label}</span>
                    {tier.recommended ? (
                      <span className="rounded-full bg-yellow-lemon px-1.5 font-source-sans text-[8.5px] font-bold uppercase tracking-[0.4px] text-black">
                        Recommended
                      </span>
                    ) : null}
                  </span>
                  <span className="block truncate font-inter text-[10.5px] text-white/70">
                    {info?.[tier.id] ? `${info[tier.id].w}W · ${info[tier.id].model.replace(/\s*\d{3}W\b/, "")}` : `${tier.wattageLabel} · ${tier.brandModel}`}
                  </span>
                </span>
              </span>
              <span className={`shrink-0 font-source-sans text-[12.5px] font-semibold ${selected ? "text-yellow-lemon" : "text-white"}`}>
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
    <div className={`${GLASS} ${TINT.brandGold} flex h-full min-h-0 w-full flex-col p-[clamp(8px,1.4vh,14px)]`}>
      <Sheen />
      <CardTitle
        dark
        right={
          <span className="rounded-full bg-black/70 px-2.5 py-[1px] font-source-sans text-[12px] font-semibold text-yellow-lemon">
            {selected.label}
          </span>
        }
      >
        Battery
      </CardTitle>
      <div className="relative mt-2 grid min-h-0 flex-1 grid-cols-2 gap-1.5 sm:grid-cols-4">
        {BATTERY_CAPACITY_OPTIONS.map((battery) => {
          const isSelected = battery.id === selectedId;
          return (
            <button
              key={battery.id}
              type="button"
              onClick={() => onSelect(battery.id)}
              className={`flex flex-col items-center justify-center rounded-[9px] border px-1 py-[clamp(1px,0.5vh,6px)] font-source-sans text-[12.5px] font-semibold leading-tight transition ${
                isSelected
                  ? "border-white bg-[#0B2A4A]/90 text-white shadow-md"
                  : "border-white/70 bg-white/55 text-[#152238] hover:bg-white/75"
              }`}
            >
              {battery.label}
              {battery.id !== "none" && prices[battery.id] ? (
                <span className={`text-[10px] font-normal ${isSelected ? "text-yellow-lemon" : "text-[#152238]/70"}`}>
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
      // Redux auth lives in sessionStorage, so a signed-in customer in a new
      // tab has no user here even though their cookie is valid. Ask quietly
      // before treating them as a visitor, or they'd get a duplicate design.
      const signedInUser = customerUser ?? (await probeSignedInCustomer());
      if (signedInUser && !customerUser) dispatch(setUser(signedInUser));

      // Signed-out visitor: one call saves the design, creates their account
      // and lead, and emails a portal link. No sign-in bounce; the link in
      // their inbox is how they get in.
      if (!signedInUser) {
        const { emailSent } = await submitDesignCapture(proposal);
        clearDesignDraft();
        router.push(emailSent ? "/designs/saved" : "/designs/saved?email=unsent");
        return;
      }

      const update = profileDiff(signedInUser, {
        name: proposal.customer.name,
        phoneNumber: proposal.customer.phoneNumber,
      });

      if (Object.keys(update).length > 0) {
        const saved = await updateCustomerProfile(update);
        dispatch(setUser({ ...signedInUser, ...saved }));
      }

      // Kept for a signed-in session that expires mid-save: the 401 bounces
      // to sign-in (fetchWithCustomerSession's redirect, `?from=` pointing
      // back here) and a fresh mount would otherwise reset the wizard. Cleared
      // the moment a save actually succeeds.
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
    // One screen, no page scroll on desktop: a stat strip, then four frosted
    // glass columns that share the remaining height (details, panel tier,
    // battery, price). Phones stack and scroll as before.
    <div className="flex h-full min-h-0 w-full flex-1 self-stretch overflow-y-auto lg:overflow-hidden">
      <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-[1446px] flex-col gap-[clamp(6px,1.2vh,12px)] px-4 py-[clamp(4px,1vh,10px)] sm:px-8 lg:px-[81px]">
        <div className="grid shrink-0 grid-cols-2 gap-[clamp(6px,1vw,12px)] lg:grid-cols-4">
          <ProposalStatCard label="System Size" value={proposal.summary.systemSize} variant="cyan" />
          <ProposalStatCard label="Total Panels" value={proposal.summary.totalPanels} variant="gold" />
          <ProposalStatCard label="Yearly Savings" value={proposal.summary.yearlySavings} variant="cyan" />
          <ProposalStatCard label="Payback" value={proposal.summary.payback} variant="gold" />
        </div>

        {/* Row 1: panel tier and battery side by side (the placement the owner chose). */}
        <div className="grid min-h-0 flex-[1.05] grid-cols-1 gap-[clamp(6px,1vw,12px)] lg:grid-cols-[1fr_1.33fr]">
          <PanelTierSelector
            selectedId={panelTierId}
            onSelect={handleSelectPanelTier}
            deltas={tierDeltas}
            info={priced?.tierInfo}
          />
          <BatterySelector
            selectedId={batteryCapacityId}
            onSelect={handleSelectBattery}
            prices={batteryPrices}
            sizeKwh={batteryKwh}
          />
        </div>

        {/* Row 2: system details, price, 25-year net savings. */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-[clamp(6px,1vw,12px)] md:grid-cols-3">
          <div className={`${GLASS} ${TINT.brandGold} flex min-h-0 flex-col p-[clamp(8px,1.4vh,14px)]`}>
            <Sheen />
            <CardTitle dark>System Details</CardTitle>
            <div className="relative mt-1.5 flex min-h-0 flex-1 flex-col justify-evenly overflow-hidden">
              <ProposalDetailRow label="Customer" value={displayCustomerName} mask />
              <ProposalDetailRow label="Address" value={proposal.customer.address} mask />
              <ProposalDetailRow label="Property" value={proposal.customer.property} />
              {EQUIPMENT_CATEGORY_KEYS.map((key) => {
                const items = proposal.equipment.items[key];
                if (!items || items.length === 0) return null;
                const value = items
                  .map((item) => `${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ""} ${item.ratingLabel}`.trim())
                  .join(", ");
                return <ProposalDetailRow key={key} label={CATEGORY_DETAIL_LABEL[key]} value={value} />;
              })}
              {batteryKwh > 0 && !(proposal.equipment.items.battery?.length) ? (
                <ProposalDetailRow label="Battery" value={`${Math.round(batteryKwh * 10) / 10} kWh`} />
              ) : null}
              <ProposalDetailRow label="Number of Panels" value={proposal.summary.totalPanels} />
              <ProposalDetailRow label="Panel Tier" value={findPanelTier(panelTierId).label} />
              <ProposalDetailRow label="CO2 Offset" value={proposal.equipment.co2Offset} />
            </div>
          </div>

          <div className={`${GLASS} ${TINT.cyan} flex min-h-0 flex-col p-[clamp(8px,1.4vh,14px)]`}>
            <Sheen />
            <div className="relative flex min-h-0 flex-1 flex-col justify-evenly gap-1 text-center">
              <p className="font-source-sans text-[11px] font-semibold uppercase tracking-[0.8px] text-white/85">
                Total System Price
              </p>
              <p className="font-source-sans text-[clamp(26px,5vh,40px)] font-bold leading-[1.05]">
                <span className="bg-[linear-gradient(154.91deg,#FFEF62_0%,#F78D00_100%)] bg-clip-text text-transparent [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.35))]">
                  {computedTotalPrice != null ? formatAud(computedTotalPrice) : pricingError ? "Price on request" : "Pricing…"}
                </span>
              </p>
              <p className="line-clamp-2 font-source-sans text-[10px] leading-[13px] text-white/70" aria-live="polite">
                {selectedQuote
                  ? `*Includes installation and GST, after ${selectedQuote.stcCount} STCs (${formatAud(selectedQuote.stcValue)}). ${
                      selectedQuote.battery?.inverterBuiltIn ? `${selectedQuote.battery.model}` : (selectedQuote.inverter?.model ?? "")
                    }${selectedQuote.phase === 3 ? ", three-phase supply" : ""}.${pricingLoading ? " Updating…" : ""}`
                  : pricingError
                    ? "We couldn't price this design just now. Your installer will confirm the price."
                    : "Working out your price…"}
              </p>
              <div className="flex gap-1.5">
                <ProposalSubMetric label="Monthly Savings" value={proposal.pricing.monthlySavings} />
                <ProposalSubMetric label="Current Bill" value={proposal.pricing.currentBill} />
                <ProposalSubMetric
                  label="New Bill"
                  value={proposal.pricing.newBill}
                  valueClassName="inline-block bg-[linear-gradient(142.91deg,#FFEF62_0%,#F78D00_100%)] bg-clip-text text-transparent"
                />
              </div>
            </div>
          </div>

          <div className={`${GLASS} ${TINT.neutral} flex min-h-0 flex-col items-center justify-center p-[clamp(8px,1.4vh,14px)]`}>
            <Sheen />
            <p className="relative font-source-sans text-[12px] font-semibold uppercase tracking-[0.8px] text-white/80">
              25-Year Net Savings
            </p>
            <p className="relative font-source-sans text-[clamp(26px,5vh,40px)] font-bold leading-[1.1]">
              <span className="bg-[linear-gradient(154.98deg,#2094F3_0%,#17CFCF_100%)] bg-clip-text text-transparent [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.35))]">
                {formatAud(netSavings25yr)}
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          className="mx-auto w-full max-w-[478px] shrink-0 rounded-[12px] bg-[linear-gradient(172.76deg,#2094F3_0%,#17CFCF_100%)] py-[clamp(4px,1vh,10px)] font-source-sans text-[clamp(14px,2.2vh,18px)] font-semibold uppercase tracking-[0.9px] text-white shadow-[0px_0px_30px_0px_rgba(32,148,243,0.45)] ring-1 ring-white/40 transition hover:brightness-110"
          onClick={() => setDownloadModalOpen(true)}
        >
          Download your proposal
        </button>
      </div>

      <DesignsProposalDownloadModal
        open={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        letterFirstName={letterFirstName}
      />
    </div>
  );
});
