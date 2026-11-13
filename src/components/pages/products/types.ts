export type SystemStepStatus = "required" | "current" | "optional";

export type SystemStep = {
  key: string;
  label: string;
  iconSrc: string;
};

export type SystemStepConnector = "requires" | "dotted";

export type ProductCategoryKey =
  | "batteries"
  | "solar-panels"
  | "inverters"
  | "ev-chargers"
  | "heat-pumps"
  | "portable-power";

export type ProductCategory = {
  key: ProductCategoryKey;
  label: string;
  iconSrc: string;
  count: number;
};

export type FilterChipDef =
  | { key: string; label: string; kind: "all" }
  | { key: string; label: string; kind: "segment"; segment: ProductSegment }
  | { key: string; label: string; kind: "band"; min?: number; max?: number };

export type ProductSegment = "residential" | "commercial";

export type ProductBadge = "Popular" | "Best Value" | "Best Seller" | "New";

export type ProductPhoto = {
  /** Full-bleed backdrop behind the cutout, e.g. an in-situ lifestyle shot. */
  background: string;
  /** Foreground product cutout, rendered centered over the backdrop. */
  image: string;
};

export type Product = {
  id: string;
  categoryKey: ProductCategoryKey;
  segment: ProductSegment;
  /** kWh for batteries/heat pumps, kW for inverters, W for solar panels, kW for EV chargers */
  specValue: number;
  badge?: ProductBadge;
  brand: string;
  name: string;
  /** Card title: brand + product name, its total size, and a secondary size line. */
  title?: { name: string; size: string; detail: string };
  model: string;
  rating: number;
  hasDatasheet?: boolean;
  /** Datasheet (PDF): EasyLink's stored copy, else the maker's link. */
  datasheetUrl?: string;
  /** Brand documents such as compatibility lists (PDF). */
  documents?: { title: string; url: string }[];
  /** Product photo from the image library (1000 px WebP) and its 400 px thumbnail. */
  imageUrl?: string;
  imageThumbUrl?: string;
  /** On the CEC approved list (panels, inverters, batteries). */
  cecApproved?: boolean;
  /** Price is an estimate, not from the supplier price book. */
  priceEstimate?: boolean;
  inStock?: boolean;
  features: string[];
  price: number;
  compareInitially?: boolean;
  photo?: ProductPhoto;
};
