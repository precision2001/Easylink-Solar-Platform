/** Shapes returned by GET /technical/lead/:leadId (backend technical.service). */

export type Phase = 1 | 3;
export type DeviceKind = "pv" | "inverter" | "battery" | "inverterBattery" | "evCharger" | "heatPump" | "zappi" | "eddi" | "libbi" | "harvi";
export type Device = {
  id: string;
  kind: DeviceKind;
  label: string;
  detail: string;
  quantity: number;
  phase: Phase | null;
  kw: number | null;
  kwh: number | null;
  coupling?: "DC" | "INTEGRATED" | "AC";
};
export type CircuitStatus = "READY" | "CHECK" | "TBC" | "CONFIRMED";
export type Circuit = {
  id: string;
  circuit: string;
  deviceId: string | null;
  phases: string;
  breaker: string | null;
  rcd: string;
  cable: string | null;
  standard: string;
  basis: "FIXED" | "CALCULATED" | "MANUAL";
  note: string | null;
  calculatedBreaker: string | null;
  calculatedCable: string | null;
  status: CircuitStatus;
};
export type Port = { deviceId: string; port: string; connectsTo: string; protection: string; cable: string };
export type CtRow = { id: string; component: string; count: number; type: string; input: string; routing: string; viaHarvi: boolean };
export type Check = { id: string; label: string; standard: string };
export type Warning = { level: "warn" | "info"; text: string };

export type Pack = {
  jobType: string;
  jobTypeLabel: string;
  phase: Phase;
  phaseAssumed: boolean;
  phaseLabel: string;
  source: { kind: "QUOTE" | "DESIGN" | "NONE"; label: string | null; at: string | null };
  summary: {
    systemKw: number | null;
    panelCount: number | null;
    panelModel: string | null;
    inverterModel: string | null;
    inverterKw: number | null;
    batteryModel: string | null;
    batteryKwh: number | null;
    dcAcRatioPct: number | null;
    exportLimitKw: number;
    monitoringApp: string;
  };
  devices: Device[];
  circuits: Circuit[];
  ports: Port[];
  cts: CtRow[];
  ctTotals: { ctClamps: number; harvi: number };
  checks: Check[];
  app: { name: string; flows: string[]; modes: string[]; notes: string[] };
  bom: { item: string; role: string; qty: number }[];
  warnings: Warning[];
  standards: string[];
  status: {
    sections: { key: string; label: string; ready: boolean }[];
    readyPct: number;
    tbc: number;
    toCheck: number;
    checksDone: number;
    checksTotal: number;
    signedOff: boolean;
    warnings: number;
  };
};

export type Inputs = {
  circuits: Record<string, { breaker?: string; cable?: string }>;
  checks: Record<string, boolean>;
  notes: string;
  signOff: { electrician: string; licence: string; at: string; byId: string } | null;
};

export type TechnicalData = {
  lead: { id: string; name: string; address: string | null; installer: string | null };
  pack: Pack;
  inputs: Inputs;
  reviewedAt: string | null;
  updatedAt: string | null;
  viewer: "staff" | "installer";
};

export type TechnicalPatch = {
  circuits?: Record<string, { breaker?: string; cable?: string }>;
  checks?: Record<string, boolean>;
  notes?: string;
  signOff?: { electrician: string; licence: string } | null;
  reviewed?: boolean;
};
