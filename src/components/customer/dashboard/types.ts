export type TimelineStepState = "completed" | "current" | "upcoming";

export type TimelineStep = {
  id: string;
  title: string;
  /** Shown under title; omit or "—" for TBD */
  dateLabel: string | null;
  state: TimelineStepState;
};

export type DesignBadge = "approved" | "draft";

export type DesignOption = {
  id: string;
  title: string;
  badge: DesignBadge;
  kw: string;
  panels: string;
  price: string;
  savingsPerYr: string;
  outputKwh: string;
  imageSrc: string;
  /** e.g. "13.5 kWh battery · Fronius Primo 5.0" */
  equipment?: string;
  /** Price after the STC discount, formatted. */
  afterStc?: string;
};
