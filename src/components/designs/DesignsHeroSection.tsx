"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  mergeProposalData,
  resetProposalData,
  selectDesignProposal,
} from "@/lib/store/designProposalSlice";
import { loadBuilderCatalogue } from "@/lib/store/builderCatalogueSlice";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  designToProposalPayload,
  fetchCustomDesign,
  fetchDesignById,
} from "@/lib/customers/custom-design";
import { fetchInstallerDesignById } from "@/lib/installers/designs";
import {
  clearDesignDraft,
  loadDesignDraft,
} from "@/lib/designs/draft-persistence";
import { fetchCustomerProfile } from "@/lib/customers/profile";
import { setUser } from "@/lib/store/customerAuthSlice";
import { DesignTopBar } from "../modules/DesignTopBar";
import {
  DesignsRegisterStepContent,
  type DesignsRegisterStepHandle,
} from "./components/DesignsAddressStepContent";
import {
  DesignsPropertyStepContent,
  type DesignsPropertyStepHandle,
} from "./components/DesignsPropertyStepContent";
import {
  DesignsLocationStepContent,
  type DesignsLocationStepHandle,
} from "./components/DesignsLocationStepContent";
import { DesignsHeroBackground } from "./components/DesignsHeroBackground";
import { DesignsHeroFooter } from "./components/DesignsHeroFooter";
import { DesignsHeroImagePanel } from "./components/DesignsHeroImagePanel";
import {
  DesignsSolarPanelStepContent,
  type DesignsSolarPanelStepHandle,
} from "./components/DesignsSolarPanelStepContent";
import {
  DesignsEnergyStepContent,
  type DesignsEnergyStepHandle,
} from "./components/DesignsEnergyStepContent";
import {
  DesignsItemsStepContent,
  type DesignsItemsStepHandle,
} from "./components/DesignsItemsStepContent";
import {
  DesignsProposalStepContent,
  type DesignsProposalStepHandle,
} from "./components/DesignsProposalStepContent";
import { DesignsHeroTagline } from "./components/DesignsHeroTagline";
import { DesignsSavingsPromoCard } from "./components/DesignsSavingsPromoCard";

type DesignsHeroSectionProps = {
  showNext?: boolean;
};

/**
 * Designs flow hero — dual cards + tagline + progress (optional Next).
 * Step UIs keep local state; Redux merges on Next via step refs.
 */
export function DesignsHeroSection({
  showNext = true,
}: DesignsHeroSectionProps) {
  const dispatch = useAppDispatch();
  const proposal = useAppSelector(selectDesignProposal);
  const customerUser = useAppSelector((s) => s.customerAuth.user);
  const searchParams = useSearchParams();
  const editingDesignId = searchParams.get("designId");
  /**
   * Set when an installer opens the Designer for a customer they've already
   * registered (see InstallerHomeSolarDesignCard) — the contact-details step
   * would just be re-asking for name/email/phone the installer already has
   * on file, so it's skipped and pre-filled from these params instead.
   */
  const installerCustomerId = searchParams.get("customerId");

  // A draft snapshot left by the Proposal step right before a signed-out
  // visitor got bounced to sign-in/sign-up — that's this same visitor coming
  // back, not a new one. Read synchronously (once, on mount) so the screen
  // this page opens on can account for it below without a flash of the
  // marketing intro before flipping over to the Proposal step.
  const [initialDraft] = useState(() =>
    !editingDesignId && !installerCustomerId ? loadDesignDraft() : null,
  );

  // The store is a live singleton for the whole tab, not reset on client-side
  // navigation — so a customer's contact details entered on a previous visit
  // to this page (e.g. an installer's prefill for a different customer, or a
  // customer's own in-progress draft) would otherwise leak into a fresh visit
  // that has no `designId`/`customerId` context of its own. Runs once, before
  // the hydration/prefill effects below, so it never clobbers what they set.
  //
  // `initialDraft` is the one exception: restored instead of wiped, then
  // cleared so it can't leak into a later, unrelated visit.
  const freshVisitResetRef = useRef(false);
  useEffect(() => {
    if (freshVisitResetRef.current) return;
    freshVisitResetRef.current = true;
    if (!editingDesignId && !installerCustomerId) {
      if (initialDraft) {
        dispatch(mergeProposalData(initialDraft));
        clearDesignDraft();
      } else {
        dispatch(resetProposalData());
      }
    }
  }, [dispatch, editingDesignId, initialDraft, installerCustomerId]);

  /**
   * Load the design being edited.
   *
   * `?designId=` is set when the customer arrives from their design page, so
   * the builder edits exactly the design shown there — which may be a
   * materialised package, not only their custom one. Without it we fall back to
   * their custom design. Runs once per visit; failures are silent because the
   * builder must still work for anonymous lead-gen visitors.
   */
  const hydratedRef = useRef(false);
  // The step components seed their local state from the store on mount, so they
  // must not mount until hydration has landed — otherwise they capture the
  // blank defaults and the customer sees empty placeholders.
  //
  // Gated on the URL param, not on `customerUser`: auth is restored in a
  // layout effect, so the user is still null during the first render and a
  // user-based gate would open before the design had loaded.
  const [hydrating, setHydrating] = useState(Boolean(editingDesignId));

  // Deliberately no cancellation flag. This effect re-runs when auth arrives,
  // and `hydratedRef` makes that second run a no-op — so a per-run flag would
  // let the first run's cleanup cancel the only in-flight request and leave
  // `hydrating` stuck on forever. Settling unconditionally is safe: a setState
  // after unmount is a no-op in React 18+, and the store is global.
  useEffect(() => {
    if (hydratedRef.current) return;
    // Editing is driven by the URL; the custom-design fallback needs the user.
    if (!editingDesignId && !customerUser) return;
    hydratedRef.current = true;

    // An installer opening a customer's design has no customer auth cookies
    // at all — the customer-scoped fetch/profile calls below would just
    // 401. Load it through the installer-authenticated endpoint instead.
    if (editingDesignId && installerCustomerId) {
      void fetchInstallerDesignById(editingDesignId)
        .then((design) => {
          if (!design) return;
          const payload = designToProposalPayload(design);
          if (payload) dispatch(mergeProposalData(payload));
        })
        .catch(() => {
          // Non-fatal: fall back to the default proposal state.
        })
        .finally(() => setHydrating(false));
      return;
    }

    // Redux auth lives in sessionStorage, so a fresh tab or a direct link to
    // this page has no user even though the cookie still authenticates. Recover
    // it, or anything gated on being signed in — the save button, writing
    // contact changes back to the account — silently disappears.
    if (editingDesignId && !customerUser) {
      void fetchCustomerProfile().then((profile) => {
        if (profile) dispatch(setUser(profile));
      });
    }

    const load = editingDesignId
      ? fetchDesignById(editingDesignId)
      : fetchCustomDesign();

    void load
      .then((design) => {
        if (!design) return;
        const payload = designToProposalPayload(design);
        if (payload) dispatch(mergeProposalData(payload));
      })
      .catch(() => {
        // Non-fatal: fall back to the default proposal state.
      })
      .finally(() => setHydrating(false));
  }, [customerUser, dispatch, editingDesignId, installerCustomerId]);

  // Pre-fills the contact details an installer already collected when
  // registering this customer, so the (skipped) register step's data is
  // correct even though its own form never renders. Runs once per visit —
  // same reasoning as the editingDesignId hydration above.
  const installerPrefillRef = useRef(false);
  useEffect(() => {
    if (installerPrefillRef.current || !installerCustomerId) return;
    installerPrefillRef.current = true;

    const firstName = searchParams.get("firstName") ?? "";
    const lastName = searchParams.get("lastName") ?? "";
    const name = `${firstName} ${lastName}`.trim();
    const email = searchParams.get("email") ?? "";
    const phone = searchParams.get("phone") ?? "";
    const address = searchParams.get("address") ?? "";

    dispatch(
      mergeProposalData({
        customer: {
          ...(name ? { name } : {}),
          ...(email ? { email } : {}),
          ...(phone ? { phoneNumber: phone } : {}),
          ...(address ? { address } : {}),
        },
      }),
    );
  }, [dispatch, installerCustomerId, searchParams]);

  const pinnedProductIds = useMemo(
    () =>
      Object.values(proposal.equipment.items).flatMap((entries) =>
        entries.map((item) => item.productId),
      ),
    [proposal.equipment.items],
  );

  const pinnedProductIdsKey = pinnedProductIds.join(",");

  useEffect(() => {
    void dispatch(loadBuilderCatalogue(pinnedProductIds));
  }, [dispatch, pinnedProductIdsKey]);

  const [activeScreen, setActiveScreen] = useState<
    | "start"
    | "second"
    | "register"
    | "address"
    | "solarPanel"
    | "energy"
    | "items"
    | "proposal"
  >(
    // Update mode opens on the first data step: the marketing intro has nothing
    // to show someone who is here to change an existing design. A restored
    // draft resumes right where Finish was clicked from.
    initialDraft ? "proposal" : editingDesignId ? "register" : "start",
  );
  const [fillPercent, setFillPercent] = useState(
    initialDraft ? 100 : editingDesignId ? 30 : 10,
  );

  const registerStepRef = useRef<DesignsRegisterStepHandle>(null);
  const propertyStepRef = useRef<DesignsPropertyStepHandle>(null);
  const locationStepRef = useRef<DesignsLocationStepHandle>(null);
  const solarStepRef = useRef<DesignsSolarPanelStepHandle>(null);
  const energyStepRef = useRef<DesignsEnergyStepHandle>(null);
  const itemsStepRef = useRef<DesignsItemsStepHandle>(null);
  const proposalStepRef = useRef<DesignsProposalStepHandle>(null);
  const [finishing, setFinishing] = useState(false);

  const progressByScreen = {
    start: 10,
    second: 20,
    register: 30,
    address: 40,
    solarPanel: 50,
    energy: 70,
    items: 80,
    proposal: 100,
  } satisfies Record<
    | "start"
    | "second"
    | "register"
    | "address"
    | "solarPanel"
    | "energy"
    | "items"
    | "proposal",
    number
  >;

  const onNext = () => {
    // Last step: Finish persists the design instead of advancing further —
    // this replaces what used to be a separate "Save changes" button on the
    // Proposal step itself, which just duplicated what Finish should do.
    if (activeScreen === "proposal") {
      proposalStepRef.current?.save();
      return;
    }
    if (activeScreen === "register") {
      const register = registerStepRef.current?.getValues();
      const name = register?.name.trim() ?? "";
      const email = register?.email.trim() ?? "";
      const phoneDigits = (register?.phone ?? "").replace(/\D/g, "");
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!name || !email || !emailPattern.test(email) || phoneDigits.length < 8) {
        toast.error(
          "Please fill in your name, a valid email, and phone number to continue.",
        );
        return;
      }

      dispatch(
        mergeProposalData({
          customer: {
            name,
            email,
            phoneNumber: register?.phone ?? "",
          },
        }),
      );
    }
    if (activeScreen === "second") {
      const property = propertyStepRef.current?.getValues();
      if (property) {
        dispatch(
          mergeProposalData({
            customer: {
              property: property.propertyLabel,
            },
          }),
        );
      }
    }
    if (activeScreen === "address") {
      const loc = locationStepRef.current?.getValues();
      if (loc) {
        const pin: Partial<{
          mapLat: number;
          mapLng: number;
          mapParcelBoundsSw: { lat: number; lng: number };
          mapParcelBoundsNe: { lat: number; lng: number };
        }> = {
          ...(loc.location != null
            ? { mapLat: loc.location.lat, mapLng: loc.location.lng }
            : {}),
          ...(loc.parcelBounds != null
            ? {
                mapParcelBoundsSw: loc.parcelBounds.sw,
                mapParcelBoundsNe: loc.parcelBounds.ne,
              }
            : {}),
        };
        dispatch(
          mergeProposalData({
            customer: {
              address: loc.address || "42 Bondi Rd, Bondi, NSW 2026",
              ...pin,
            },
          }),
        );
      }
    }
    if (activeScreen === "solarPanel") {
      solarStepRef.current?.persistDesignToStore();
      const m = solarStepRef.current?.getMetrics();
      if (m) {
        dispatch(
          mergeProposalData({
            summary: {
              systemSize: m.systemSize,
              totalPanels: m.totalPanels,
            },
            equipment: {
              numberOfPanels: m.numberOfPanels,
              co2Offset: m.co2Offset,
            },
          }),
        );
      }
    }
    if (activeScreen === "energy") {
      const e = energyStepRef.current?.getValues();
      if (e) {
        dispatch(
          mergeProposalData({
            summary: {
              yearlySavings: e.yearlySavings,
              payback: e.payback,
            },
            pricing: {
              currentBill: e.currentBill,
              monthlySavings: e.monthlySavings,
              newBill: e.newBill,
              billPeriod: e.billPeriod,
            },
          }),
        );
      }
    }
    if (activeScreen === "items") {
      const itemsValues = itemsStepRef.current?.getValues();
      if (itemsValues) {
        const firstSolarPanel = itemsValues.items.solarPanel[0];
        const firstInverter = itemsValues.items.inverter[0];
        const firstBattery = itemsValues.items.battery[0];

        dispatch(
          mergeProposalData({
            equipment: {
              // The singular fields describe only the first item of their
              // category — kept for readers (PDF, summary rows) that only
              // need one representative product. `items` below is the real
              // source of truth for everything selected.
              solarPanelName:
                firstSolarPanel?.name || proposal.equipment.solarPanelName,
              solarPanelWatts:
                firstSolarPanel?.ratingLabel || proposal.equipment.solarPanelWatts,
              inverterName: firstInverter?.name || proposal.equipment.inverterName,
              inverterWatts:
                firstInverter?.ratingLabel || proposal.equipment.inverterWatts,
              batteryName: firstBattery?.name || proposal.equipment.batteryName,
              batteryWatts:
                firstBattery?.ratingLabel || proposal.equipment.batteryWatts,
              // Carried so the save can write real DesignProduct rows; the
              // display strings above cannot identify a catalogue product.
              solarPanelProductId: firstSolarPanel?.productId,
              batteryProductId: firstBattery?.productId,
              inverterProductId: firstInverter?.productId,
              items: itemsValues.items,
            },
          }),
        );
      }
    }

    setActiveScreen((prev) => {
      if (prev === "start") return "second";
      // An installer already has this customer's contact details on file —
      // skip straight past the step that would just re-collect them.
      if (prev === "second") return installerCustomerId ? "address" : "register";
      if (prev === "register") return "address";
      if (prev === "address") return "solarPanel";
      if (prev === "solarPanel") return "energy";
      if (prev === "energy") return "items";
      if (prev === "items") return "proposal";
      return prev;
    });
    setFillPercent((prev) => {
      if (prev === 10) return 20;
      if (prev === 20) return installerCustomerId ? 40 : 30;
      if (prev === 30) return 40;
      if (prev === 40) return 50;
      if (prev === 50) return 70;
      if (prev === 70) return 80;
      if (prev === 80) return 100;
      return prev;
    });
  };

  const onBack = () => {
    setActiveScreen((prev) => {
      const nextScreen =
        prev === "proposal"
          ? "items"
          : prev === "items"
            ? "energy"
            : prev === "energy"
              ? "solarPanel"
              : prev === "solarPanel"
                ? "address"
                : prev === "address"
                  ? installerCustomerId
                    ? "second"
                    : "register"
                  : prev === "register"
                    ? "second"
                    : prev === "second"
                      ? "start"
                      : prev;

      setFillPercent(progressByScreen[nextScreen]);
      return nextScreen;
    });
  };

  return (
    <section className="relative flex h-screen flex-col overflow-hidden">
      <DesignsHeroBackground />
      <DesignTopBar
        center={
          activeScreen === "proposal"
            ? {
                title: "Your solar proposal",
                subtitle: "Here's your personalized system design and pricing.",
              }
            : undefined
        }
      />

      {/*
        Two modes: anonymous visitors from the landing page create a new design,
        while a customer arriving from their design page updates that one.
      */}
      {/*
        Keyed off the URL only. Branching on `customerUser` here caused a
        hydration mismatch: auth is restored in a layout effect, so it is null in
        the server HTML and set on the client.
      */}
      {editingDesignId ? (
        <div className="relative z-10 mx-auto w-full max-w-[1446px] px-4 pt-3 sm:px-8 lg:px-[81px]">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border-[1.5px] border-solid border-design-accent-cyan bg-[rgba(255,255,255,0.08)] px-4 py-2.5">
            <p className="font-source-sans text-[14px] leading-[21px] text-white/80">
              Editing your saved design. Your details and equipment are filled in
              below — finish the steps and save to update it.
            </p>
            <Link
              href={
                installerCustomerId
                  ? "/installers/dashboard/home"
                  : "/customers/design"
              }
              className="font-source-sans text-[13px] font-medium uppercase tracking-[0.5px] text-white underline"
            >
              Cancel
            </Link>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 items-center overflow-y-auto">
        {hydrating ? (
          <p className="relative z-10 mx-auto px-4 font-source-sans text-[16px] text-white/80">
            Loading your design…
          </p>
        ) : activeScreen === "start" ? (
          <div className="relative z-10 mx-auto flex w-full max-w-[1446px] flex-col justify-center gap-6 px-4 py-2 sm:px-8 lg:gap-[29px] lg:px-[81px]">
            <div className="mx-auto grid w-full max-w-[1283px] grid-cols-1 gap-5 lg:grid-cols-[629fr_634fr] lg:items-stretch">
              <DesignsSavingsPromoCard />
              <DesignsHeroImagePanel />
            </div>
            <DesignsHeroTagline />
          </div>
        ) : activeScreen === "second" ? (
          <DesignsPropertyStepContent ref={propertyStepRef} />
        ) : activeScreen === "register" ? (
          <DesignsRegisterStepContent
            ref={registerStepRef}
            lockEmail={Boolean(editingDesignId)}
          />
        ) : activeScreen === "address" ? (
          <DesignsLocationStepContent ref={locationStepRef} />
        ) : activeScreen === "solarPanel" ? (
          <DesignsSolarPanelStepContent ref={solarStepRef} />
        ) : activeScreen === "energy" ? (
          <DesignsEnergyStepContent ref={energyStepRef} />
        ) : activeScreen === "items" ? (
          <DesignsItemsStepContent ref={itemsStepRef} />
        ) : activeScreen === "proposal" ? (
          <DesignsProposalStepContent
            ref={proposalStepRef}
            onSavingChange={setFinishing}
          />
        ) : (
          <></>
        )}
      </div>

      <DesignsHeroFooter
        onBack={onBack}
        onNext={onNext}
        showBack={activeScreen !== "start"}
        showNext={showNext}
        fillPercent={fillPercent}
        finishing={finishing}
      />
    </section>
  );
}
