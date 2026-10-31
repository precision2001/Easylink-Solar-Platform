import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { SolarPanel } from "@/types/solar";
import type { RootState } from "./store";

/** Serializable roof outline + generated layout for the solar step (restore after Back). */
export type DesignProposalSolarDesign = {
  pinLat: number;
  pinLng: number;
  savedRoofs: { lat: number; lng: number }[][];
  generatedPanels: SolarPanel[] | null;
  polygonTotalAreaM2: number | null;
  panelCountInput: string;
  /** PNG data URL from html2canvas on Save — for proposals / PDFs */
  mapScreenshotDataUrl: string | null;
  /** The single orientation every panel in the design uses. Older saved designs omit it (treated as portrait). */
  panelOrientation?: "PORTRAIT" | "LANDSCAPE";
  /** Panel size the layout was packed with (Google Solar API). Older designs omit it. */
  panelDimensions?: { heightM: number; widthM: number };
  /** The roof faces the panels were packed on (outline, slope, direction), for drawing the roof in proposals. */
  roofFaces?: { ring: { lat: number; lng: number }[]; pitchDeg?: number; azimuthDeg?: number }[];
};

export type DesignProposalSummary = {
  systemSize: string;
  totalPanels: string;
  yearlySavings: string;
  payback: string;
};

export type DesignProposalCustomer = {
  name: string;
  email: string;
  phoneNumber: string;
  /**
   * The register step's unticked-by-default marketing box (reminder emails
   * and texts under the Spam Act). Undefined until the step is submitted.
   */
  marketingConsent?: boolean;
  address: string;
  property: string;
  /** Pin from the location step map (decimal degrees). Used by the solar-panel step map. */
  mapLat?: number;
  mapLng?: number;
  /**
   * Google Geocoding's tight per-premise `bounds` box, when the ROOFTOP
   * geocode returns one — narrower than the building, roughly the parcel.
   * Used to clip an oversized footprint match on attached/terrace buildings,
   * where the footprint dataset returns one polygon for the whole shared
   * roofline rather than per-address. Absent for most addresses (Google
   * only returns `bounds` for some premises) — nothing to clip against then.
   */
  mapParcelBoundsSw?: { lat: number; lng: number };
  mapParcelBoundsNe?: { lat: number; lng: number };
};

/** Every category the items step can add products to, in card order. */
export type EquipmentCategoryKey =
  | "solarPanel"
  | "battery"
  | "inverter"
  | "evCharger"
  | "heatPump";

export const EQUIPMENT_CATEGORY_KEYS: readonly EquipmentCategoryKey[] = [
  "solarPanel",
  "inverter",
  "battery",
  "evCharger",
  "heatPump",
];

/** One product a customer added to a category — the items step can add several per category. */
export type EquipmentItem = {
  productId: string;
  brand: string;
  name: string;
  quantity: number;
  /** "630 W" / "7.6 kWh" / "7.6 kW" — whatever unit that category's spec uses. */
  ratingLabel: string;
};

export type EquipmentItemsByCategory = Record<
  EquipmentCategoryKey,
  EquipmentItem[]
>;

export function emptyEquipmentItems(): EquipmentItemsByCategory {
  return {
    solarPanel: [],
    battery: [],
    inverter: [],
    evCharger: [],
    heatPump: [],
  };
}

export type DesignProposalEquipment = {
  solarPanelName: string;
  solarPanelWatts: string;
  inverterName: string;
  inverterWatts: string;
  batteryName: string;
  batteryWatts: string;
  numberOfPanels: string;
  co2Offset: string;
  /**
   * Catalogue ids for the chosen kit. Carried so the save can write real
   * DesignProduct rows — the display strings above cannot identify a product.
   * Empty when the customer has not picked from the catalogue.
   *
   * These singular ids describe only the FIRST item of their category — the
   * source of truth for "everything selected" is `items` below. They're kept
   * so PDF/summary reads that only need one representative product per
   * category don't need to change.
   */
  solarPanelProductId?: string;
  inverterProductId?: string;
  batteryProductId?: string;
  /** Every product added per category, including multiples. */
  items: EquipmentItemsByCategory;
  /** Proposal-step panel tier / battery capacity picks — see lib/designs/proposalOptions.ts. */
  panelTierId?: string;
  batteryCapacityId?: string;
  /**
   * Energy step's continuous battery sizing (kWh) — independent of the
   * proposal step's discrete `batteryCapacityId` catalogue picks, but kept
   * on the same slice so both steps' choices persist together.
   */
  batteryCapacityKwh?: number;
  /** Energy step's dispatch strategy for the battery. */
  batteryMode?: "self-consumption" | "export";
  /** Energy step's "system age" slider (years since install) used to preview degradation. */
  systemAgeYears?: number;
  /** Usable battery of the customer's electric car (kWh), for the EV-ready battery size. */
  evBatteryKwh?: number;
};

/**
 * Old saved designs' `wizardData` predates `items` entirely (singular fields
 * only, no EV Charger/Heat Pump). Synthesizes single-entry arrays from those
 * legacy fields so every reader downstream can assume `items` is always
 * fully-shaped, never undefined.
 */
export function legacyEquipmentToItems(
  equipment: Partial<DesignProposalEquipment> | undefined,
): EquipmentItemsByCategory {
  if (equipment?.items) return equipment.items;

  const items = emptyEquipmentItems();
  if (equipment?.solarPanelProductId) {
    items.solarPanel = [
      {
        productId: equipment.solarPanelProductId,
        brand: equipment.solarPanelName ?? "",
        name: equipment.solarPanelName ?? "",
        quantity: 1,
        ratingLabel: equipment.solarPanelWatts ?? "",
      },
    ];
  }
  if (equipment?.inverterProductId) {
    items.inverter = [
      {
        productId: equipment.inverterProductId,
        brand: equipment.inverterName ?? "",
        name: equipment.inverterName ?? "",
        quantity: 1,
        ratingLabel: equipment.inverterWatts ?? "",
      },
    ];
  }
  if (equipment?.batteryProductId) {
    items.battery = [
      {
        productId: equipment.batteryProductId,
        brand: equipment.batteryName ?? "",
        name: equipment.batteryName ?? "",
        quantity: 1,
        ratingLabel: equipment.batteryWatts ?? "",
      },
    ];
  }
  return items;
}

/** How the user expresses their grid bill amount on the energy step (stored alongside monthly-normalized figures). */
export type DesignBillPeriod = "month" | "quarter" | "year";

export type DesignProposalPricing = {
  totalSystemPrice: string;
  monthlySavings: string;
  currentBill: string;
  newBill: string;
  billPeriod: DesignBillPeriod;
  /**
   * `totalSystemPrice` before the proposal step's panel tier / battery
   * add-ons. Captured the first time the proposal step loads so those
   * selectors can adjust the total without compounding on re-selection.
   */
  equipmentBasePrice?: string;
  /**
   * Grid import rate ($/kWh), editable on the energy step. Undefined until
   * the user edits it — consumers fall back to `GRID_RATE_PER_KWH`
   * (energySimulation.ts) so existing designs keep their current behaviour.
   */
  gridRatePerKwh?: number;
};

export type DesignProposalState = {
  summary: DesignProposalSummary;
  customer: DesignProposalCustomer;
  equipment: DesignProposalEquipment;
  pricing: DesignProposalPricing;
  solarDesign: DesignProposalSolarDesign | null;
};

export type DesignProposalPayload = {
  summary?: Partial<DesignProposalSummary>;
  customer?: Partial<DesignProposalCustomer>;
  // `items` merges per-category (see mergeProposalData), so a payload only
  // needs to name the categories it's actually changing.
  equipment?: Partial<Omit<DesignProposalEquipment, "items">> & {
    items?: Partial<EquipmentItemsByCategory>;
  };
  pricing?: Partial<DesignProposalPricing>;
  solarDesign?: DesignProposalSolarDesign | null;
};

export const DESIGN_PROPOSAL_DEFAULTS: DesignProposalState = {
  summary: {
    systemSize: "6.6 kW",
    totalPanels: "16",
    yearlySavings: "$1,580",
    payback: "7.1 yrs",
  },
  customer: {
    // Real Redux initial state for a brand-new design — must start empty,
    // not the register step's placeholder-hint copy (DESIGNS_REGISTER_STEP.
    // defaultValues), which is display-only text and was never meant to be
    // used as actual data.
    name: "",
    email: "",
    phoneNumber: "",
    address: "42 Bondi Rd, Bondi, NSW 2026",
    property: "Residential",
  },
  equipment: {
    solarPanelName: "TRINA",
    solarPanelWatts: "630 W",
    inverterName: "BLUETTI",
    inverterWatts: "7.6 kW",
    batteryName: "BLUETTI",
    batteryWatts: "7.6 kW",
    numberOfPanels: "16",
    co2Offset: "7.2 tonnes/year",
    items: emptyEquipmentItems(),
  },
  pricing: {
    totalSystemPrice: "$11,200",
    monthlySavings: "$132",
    currentBill: "$200",
    newBill: "$368",
    billPeriod: "quarter",
  },
  solarDesign: null,
};

const designProposalSlice = createSlice({
  name: "designProposal",
  initialState: DESIGN_PROPOSAL_DEFAULTS,
  reducers: {
    mergeProposalData: (state, action: PayloadAction<DesignProposalPayload>) => {
      if (action.payload.summary) {
        state.summary = { ...state.summary, ...action.payload.summary };
      }
      if (action.payload.customer) {
        state.customer = { ...state.customer, ...action.payload.customer };
      }
      if (action.payload.equipment) {
        state.equipment = {
          ...state.equipment,
          ...action.payload.equipment,
          // Per-category merge: a payload that sets `items.battery` replaces
          // only that category's array, leaving other categories untouched.
          items: {
            ...state.equipment.items,
            ...action.payload.equipment.items,
          },
        };
      }
      if (action.payload.pricing) {
        state.pricing = { ...state.pricing, ...action.payload.pricing };
      }
      if (action.payload.solarDesign !== undefined) {
        state.solarDesign = action.payload.solarDesign;
      }
    },
    resetProposalData: () => DESIGN_PROPOSAL_DEFAULTS,
  },
});

export const { mergeProposalData, resetProposalData } =
  designProposalSlice.actions;
export const selectDesignProposal = (state: RootState) => state.designProposal;
export default designProposalSlice.reducer;
