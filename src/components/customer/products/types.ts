export type SolarProductCategory =
  | "panel"
  | "inverter"
  | "battery"
  | "ev-charger"
  | "heat-pump"
  | "portable-power";

export type SolarProduct = {
  id: string;
  category: SolarProductCategory;
  name: string;
  rating: number;
  reviewCount: number;
  price: string;
  bestSeller?: boolean;
  brand?: string;
  /** Product photo thumbnail from the image library, when there is one. */
  imageUrl?: string;
};

export type DesignSummaryItem = {
  id: string;
  name: string;
  detail: string;
  icon: "sun" | "cpu";
};
