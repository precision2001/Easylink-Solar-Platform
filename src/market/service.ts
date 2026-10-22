import { randomBytes } from "node:crypto";
import type { Container } from "../container.js";
import { newId, type Principal } from "../core/envelope.js";
import { isStaff } from "../policy/policy.js";
import { JobError, newJob, type JobService } from "../jobs/service.js";
import { money, type Job } from "../jobs/model.js";
import { STC_PRICE } from "../jobs/docs.js";
import {
  checkSystem, inAreas, kwOf, MEMBERSHIP_LIVE_DEALS, REFUND_POLICY, siteEstimate, systemOf, validAreas, zoneFor,
  type DealItem, type DealOrder, type MarketSystem, type ReadyDeal, type ReadySite,
} from "./model.js";

const nowIso = () => new Date().toISOString();
const SYSTEM: Principal = { kind: "system", id: "marketplace", roles: [], on_behalf_of: null };
const str = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const num = (v: unknown) => (v === "" || v == null ? NaN : Number(v));

export class MarketService {
  constructor(private c: Container, private jobs: JobService) {}

  private svc() {
    return { token: this.c.serviceToken };
  }
  private async counter(name: string, start: number) {
    const cur = await this.c.store.getRecord("counter", name);
    const n = Number(cur?.n ?? start) + 1;
    await this.c.store.putRecord("counter", { id: name, n });
    return n;
  }
  /** Writes guarded by `rev`, so two people changing the same listing can't both win. */
  private async save<T extends { id: string; rev: number; updatedAt?: string }>(type: string, row: T): Promise<T> {
    const prev = row.rev;
    const next = { ...row, rev: prev + 1, updatedAt: nowIso() };
    if (!(await this.c.store.putRecordIfRev(type, next as unknown as Record<string, unknown> & { id: string; rev: number }, prev))) {
      throw new JobError("Someone else just changed this. Refresh and try again.", 409);
    }
    return next;
  }
  private async user(id: string) {
    const r = await this.c.backend.get("user", id, this.svc()).catch(() => null);
    return (r?.data ?? {}) as Record<string, unknown>;
  }
  private nameOf(u: Record<string, unknown>, fallback: string) {
    return String(u.companyName ?? u.businessName ?? ([u.firstName, u.lastName].filter(Boolean).join(" ") || fallback));
  }
  private membership(u: Record<string, unknown>) {
    return String(u.membership ?? u.membershipLevel ?? u.plan ?? "").toLowerCase();
  }
  private staff(p: Principal) {
    return isStaff(p) || p.kind === "system";
  }

  // ======================================================================
  // Ready Sites
  // ======================================================================
  async sites(p: Principal) {
    const all = (await this.c.store.listRecords("ready_site")) as unknown as ReadySite[];
    const sorted = all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (this.staff(p)) return sorted;
    if (p.kind !== "installer") return [];
    const me = await this.user(p.id);
    const elite = this.membership(me) === "elite";
    const mine = sorted.filter((s) => s.createdBy.id === p.id || s.buyer?.id === p.id);
    const forSale = sorted.filter((s) => s.status === "live" && s.createdBy.id !== p.id && this.visibleTo(s, me, elite));
    const areas = String(me.servicePostcodes ?? "");
    const inArea = (s: ReadySite) => (areas ? inAreas(areas, s.postcode) : true);
    return {
      forSale: forSale
        .map((s) => ({ ...this.publicSite(s), inArea: inArea(s), estimate: siteEstimate(s) }))
        .sort((a, b) => Number(b.inArea) - Number(a.inArea) || (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")),
      mine: mine.map((s) => (s.buyer?.id === p.id || s.createdBy.id === p.id ? s : this.publicSite(s))),
    };
  }

  private visibleTo(s: ReadySite, me: Record<string, unknown>, elite: boolean) {
    if (s.visibility.endsAt && s.visibility.endsAt < nowIso()) return false;
    const headStartEnds = Date.parse(s.publishedAt ?? s.createdAt) + s.visibility.eliteHeadStartHours * 3600e3;
    if (!elite && Date.now() < headStartEnds) return false;
    if (s.visibility.area === "service_area" && me.servicePostcodes && !inAreas(String(me.servicePostcodes), s.postcode)) return false;
    return true;
  }

  /** What anyone may see: suburb, system and money, never who or where exactly. */
  publicSite(s: ReadySite) {
    const c = checkSystem(s.system, s.state);
    return {
      id: s.id, ref: s.ref, status: s.status, suburb: s.suburb, state: s.state, postcode: s.postcode, roof: s.roof, storeys: s.storeys, phases: s.phases,
      system: s.system, kw: c.kw, stcs: c.stcs.total, confirmed: s.confirmed, contractValue: s.contractValue, siteFee: s.siteFee,
      documents: s.documents.map((d) => d.name), source: s.createdBy.kind, publishedAt: s.publishedAt, endsAt: s.visibility.endsAt,
      eliteHeadStartHours: s.visibility.eliteHeadStartHours, views: s.views, sold: s.status === "sold",
    };
  }

  async publicSites() {
    const all = (await this.c.store.listRecords("ready_site")) as unknown as ReadySite[];
    return all
      .filter((s) => s.status === "live" && (!s.visibility.endsAt || s.visibility.endsAt > nowIso()))
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
      .map((s) => this.publicSite(s));
  }

  private readSite(input: Record<string, unknown>, base?: ReadySite) {
    const sys = (input.system ?? base?.system ?? { extras: [] }) as MarketSystem;
    const conf = (input.confirmed ?? base?.confirmed ?? {}) as ReadySite["confirmed"];
    const vis = (input.visibility ?? base?.visibility ?? {}) as Partial<ReadySite["visibility"]>;
    const cust = (input.customer ?? base?.customer ?? {}) as ReadySite["customer"];
    const site: Omit<ReadySite, "id" | "ref" | "rev" | "status" | "createdBy" | "views" | "createdAt" | "updatedAt"> = {
      customer: { name: str(cust.name, 120), phone: str(cust.phone, 30) || undefined, email: str(cust.email, 120) || undefined, street: str(cust.street, 160) || undefined, customerId: str(cust.customerId, 80) || undefined, leadId: str(cust.leadId, 80) || undefined },
      suburb: str(input.suburb ?? base?.suburb, 60),
      state: str(input.state ?? base?.state ?? "NSW", 3).toUpperCase(),
      postcode: str(input.postcode ?? base?.postcode, 4),
      lat: Number.isFinite(num(input.lat)) ? num(input.lat) : base?.lat,
      lng: Number.isFinite(num(input.lng)) ? num(input.lng) : base?.lng,
      roof: str(input.roof ?? base?.roof, 40) || undefined,
      storeys: str(input.storeys ?? base?.storeys, 20) || undefined,
      phases: Number(input.phases ?? base?.phases) === 3 ? 3 : 1,
      system: { panels: sys.panels, inverter: sys.inverter, battery: sys.battery, extras: sys.extras ?? [] },
      confirmed: { payment: !!conf.payment, depositPaid: Math.max(0, Number(conf.depositPaid ?? 0)), installation: !!conf.installation, windowFrom: conf.windowFrom || undefined, windowTo: conf.windowTo || undefined },
      contractValue: Math.max(0, Number(input.contractValue ?? base?.contractValue ?? 0)),
      siteFee: Math.max(0, Number(input.siteFee ?? base?.siteFee ?? 0)),
      documents: ((input.documents ?? base?.documents ?? []) as ReadySite["documents"]).slice(0, 20).map((d) => ({ name: str(d.name, 120), fileId: d.fileId })),
      notes: str(input.notes ?? base?.notes, 1000) || undefined,
      visibility: { area: vis.area === "everyone" ? "everyone" : "service_area", eliteHeadStartHours: Math.min(72, Math.max(0, Number(vis.eliteHeadStartHours ?? 0))), endsAt: vis.endsAt || undefined },
    };
    return site;
  }

  /** What must be true before a site can be offered to installers. */
  private siteProblems(s: Omit<ReadySite, "id" | "ref" | "rev" | "status" | "createdBy" | "views" | "createdAt" | "updatedAt">) {
    const out: string[] = [];
    if (!s.customer.name) out.push("Add the customer's name.");
    if (!s.suburb || !/^\d{4}$/.test(s.postcode)) out.push("Add the suburb and a four-digit postcode.");
    if (!s.confirmed.payment && !s.confirmed.installation) out.push("Confirm payment, installation, or both.");
    if (s.confirmed.payment && !(s.confirmed.depositPaid > 0)) out.push("Enter the deposit already paid.");
    if (!(s.contractValue > 0)) out.push("Enter the customer's contract value.");
    if (!kwOf(s.system) && !s.system.battery) out.push("Describe the system.");
    out.push(...checkSystem(s.system, s.state).errors);
    return out;
  }

  async createSite(p: Principal, input: Record<string, unknown>) {
    if (!this.staff(p) && p.kind !== "installer") throw new JobError("Only EasyLink and installers create Ready Sites", 403);
    const u = this.staff(p) ? {} : await this.user(p.id);
    const n = await this.counter("ready_site", 2040);
    const s: ReadySite = {
      id: newId("rs_"),
      ref: `RS-${n}`,
      rev: 0,
      status: "draft",
      createdBy: this.staff(p) ? { kind: "easylink", id: p.id, name: "EasyLink" } : { kind: "installer", id: p.id, name: this.nameOf(u, "Installer") },
      ...this.readSite(input),
      views: 0,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    return this.save<ReadySite>("ready_site", s);
  }

  private async site(id: string) {
    const s = (await this.c.store.getRecord("ready_site", id)) as unknown as ReadySite | undefined;
    if (!s) throw new JobError("Ready Site not found", 404);
    return s;
  }

  async updateSite(p: Principal, id: string, input: Record<string, unknown>) {
    const s = await this.site(id);
    const owner = s.createdBy.id === p.id;
    if (!this.staff(p) && !owner) throw new JobError("Not your Ready Site", 403);
    if (s.status === "sold") throw new JobError("This site has been sold", 409);
    if (!this.staff(p) && !["draft", "review"].includes(s.status)) throw new JobError("Withdraw it first to make changes", 409);
    return this.save<ReadySite>("ready_site", { ...s, ...this.readSite(input, s), status: !this.staff(p) && s.status === "review" ? "draft" : s.status });
  }

  /**
   * EasyLink publishes directly. An installer's site goes to EasyLink to check first
   * (spec, price and that the customer agreed to be passed on).
   */
  async siteAction(p: Principal, id: string, action: string, input: Record<string, unknown>) {
    const s = await this.site(id);
    const owner = s.createdBy.id === p.id;
    switch (action) {
      case "submit": {
        if (!owner) throw new JobError("Not your Ready Site", 403);
        if (s.status !== "draft") throw new JobError("Only a draft can be sent for review", 409);
        const problems = this.siteProblems(s);
        if (problems.length) throw new JobError(problems.join(" "), 400);
        if (input.customerAgreed !== true) throw new JobError("Confirm the customer agreed to another installer doing the work", 400);
        const saved = await this.save<ReadySite>("ready_site", { ...s, status: "review" });
        await this.c.messaging.sendEmail({ to: process.env.STAFF_EMAIL ?? "sales@easylinksolar.com.au", subject: `Ready Site ${s.ref} to review`, body: `${s.createdBy.name} wants to pass on a customer in ${s.suburb} ${s.postcode} for ${money(s.siteFee)}. Review it in the Distributor portal → Ready Sites.` }).catch(() => undefined);
        return saved;
      }
      case "publish":
      case "approve": {
        if (!this.staff(p)) throw new JobError("EasyLink publishes Ready Sites", 403);
        if (!["draft", "review", "withdrawn"].includes(s.status)) throw new JobError("This site can't be published now", 409);
        const problems = this.siteProblems(s);
        if (problems.length) throw new JobError(problems.join(" "), 400);
        const saved = await this.save<ReadySite>("ready_site", { ...s, status: "live", publishedAt: nowIso(), review: { by: p.id, at: nowIso(), note: str(input.note, 300) || undefined } });
        if (s.createdBy.kind === "installer") await this.emailUser(s.createdBy.id, `Ready Site ${s.ref} is live`, `Your Ready Site in ${s.suburb} is now offered to installers. We'll tell you when it sells.`);
        return saved;
      }
      case "reject": {
        if (!this.staff(p)) throw new JobError("Staff only", 403);
        if (s.status !== "review") throw new JobError("Only a site in review can be sent back", 409);
        const note = str(input.reason, 500);
        if (!note) throw new JobError("Say what needs changing", 400);
        const saved = await this.save<ReadySite>("ready_site", { ...s, status: "draft", review: { by: p.id, at: nowIso(), note } });
        await this.emailUser(s.createdBy.id, `Ready Site ${s.ref} needs changes`, `EasyLink sent your Ready Site back: ${note}`);
        return saved;
      }
      case "withdraw": {
        if (!this.staff(p) && !owner) throw new JobError("Not your Ready Site", 403);
        if (s.status === "sold") throw new JobError("This site has been sold", 409);
        return this.save<ReadySite>("ready_site", { ...s, status: "withdrawn" });
      }
      case "view": {
        // Counted when an installer opens the details.
        return this.save<ReadySite>("ready_site", { ...s, views: s.views + 1 });
      }
      case "buy":
        return this.buySite(p, s, input);
      default:
        throw new JobError("Unknown action", 400);
    }
  }

  /** First come, first served: the rev check means only one installer can win. */
  private async buySite(p: Principal, s: ReadySite, input: Record<string, unknown>) {
    if (p.kind !== "installer") throw new JobError("Only installers buy Ready Sites", 403);
    if (s.createdBy.id === p.id) throw new JobError("This is your own Ready Site", 409);
    if (s.status !== "live") throw new JobError(s.status === "sold" ? "Another installer bought this site first." : "This site isn't for sale now.", 409);
    const me = await this.user(p.id);
    if (!this.visibleTo(s, me, this.membership(me) === "elite")) throw new JobError("This site isn't offered to you yet.", 403);
    if (input.agree !== true) throw new JobError("Agree to the Ready Site terms (you install at the agreed price and pay the site fee)", 400);
    const today = nowIso().slice(0, 10);
    if (me.saaExpiry && String(me.saaExpiry) < today) throw new JobError("Your SAA accreditation has expired. Update it in My account first.", 403);
    if (s.system.battery && me.batteryEndorsed === false) throw new JobError("This site has a battery and your account has no battery endorsement.", 403);
    const name = this.nameOf(me, "Installer");
    const jobId = s.customer.leadId || `rs_${s.ref.toLowerCase()}`;
    const sold: ReadySite = { ...s, status: "sold", buyer: { id: p.id, name, at: nowIso(), jobId } };
    if (!(await this.c.store.putRecordIfRev("ready_site", { ...sold, rev: s.rev + 1, updatedAt: nowIso() } as unknown as Record<string, unknown> & { id: string; rev: number }, s.rev))) {
      throw new JobError("Another installer bought this site first.", 409);
    }

    // The customer becomes a job for the buyer, already assigned.
    const c = checkSystem(s.system, s.state);
    const existing = await this.jobs.get(jobId);
    const j: Job =
      existing ??
      newJob({
        leadId: jobId,
        customerId: s.customer.customerId ?? null,
        customerName: s.customer.name,
        customerEmail: s.customer.email,
        customerPhone: s.customer.phone,
        seller: { name, abn: String(me.abn ?? "") || undefined, email: String(me.email ?? "") || undefined, phone: String(me.phone ?? "") || undefined },
        site: { address: [s.customer.street, `${s.suburb} ${s.state} ${s.postcode}`].filter(Boolean).join(", "), postcode: s.postcode, state: s.state, lat: s.lat ?? 0, lng: s.lng ?? 0, phases: s.phases ?? 1, zoneRating: zoneFor(s.state), zoneConfirmed: false },
        selection: this.selection(s.system, s.contractValue, `Ready Site ${s.ref}`),
        dnsp: "",
      });
    j.installerId = p.id;
    j.installerName = name;
    j.source = { kind: "ready_site", ref: s.ref };
    j.seller = { ...j.seller, name };
    await this.jobs.save(j);
    const reach: ("installer_assigned" | "selection_confirmed" | "deposit_paid" | "agreement_signed")[] = ["installer_assigned"];
    await this.jobs.record(j, SYSTEM, `${name} bought Ready Site ${s.ref}`, { reach, detail: `${c.kw} kW${s.system.battery ? ` + ${s.system.battery.usableKwh} kWh` : ""}, contract ${money(s.contractValue)}, site fee ${money(s.siteFee)}`, kind: "record" });
    if (s.confirmed.payment && s.confirmed.depositPaid > 0) {
      await this.jobs.record(j, SYSTEM, `Deposit of ${money(s.confirmed.depositPaid)} already paid (held for the job)`, { kind: "record" });
    }
    await this.jobs.tell(j, "customer", `${name} will install your system. They'll be in touch to confirm the details, and you can message them from My Project.`, SYSTEM);
    await this.c.store.putRecord("market_charge", { id: newId("mc_"), kind: "ready_site_fee", ref: s.ref, installerId: p.id, amount: s.siteFee, status: "due", payTo: s.createdBy.kind === "installer" ? `EasyLink, then ${s.createdBy.name} less EasyLink's fee` : "EasyLink", at: nowIso() });
    if (s.createdBy.kind === "installer") await this.emailUser(s.createdBy.id, `Ready Site ${s.ref} sold`, `${name} bought your Ready Site in ${s.suburb}. The customer has moved to them.`);
    await this.emailUser(p.id, `You bought Ready Site ${s.ref}`, `The customer in ${s.suburb} is now in your Customers and My jobs. Site fee ${money(s.siteFee)} is due to EasyLink.`);
    return { site: { ...sold, rev: s.rev + 1 }, jobId };
  }

  private selection(sys: MarketSystem, priceBeforeStc: number, title: string): Job["selection"] {
    const kw = kwOf(sys);
    return {
      designId: null,
      title,
      kw,
      panels: { model: sys.panels?.model ?? "No panels", count: sys.panels?.count ?? 0, watts: sys.panels?.watts ?? 0 },
      inverter: { model: sys.inverter?.model ?? "No inverter", kw: sys.inverter?.kw ?? 0 },
      battery: sys.battery ? { model: sys.battery.model, usableKwh: sys.battery.usableKwh } : null,
      accessories: sys.extras.map((e) => ({ name: e.qty > 1 ? `${e.name} × ${e.qty}` : e.name, price: 0 })),
      price: priceBeforeStc,
      annualOutputKwh: Math.round(kw * 1400),
      savingsPerYear: 0,
    } as Job["selection"];
  }

  private async emailUser(userId: string, subject: string, body: string) {
    const u = await this.user(userId);
    if (u.email) await this.c.messaging.sendEmail({ to: String(u.email), subject, body: `${body}\n\nEasyLink Solar` }).catch(() => undefined);
  }

  // ======================================================================
  // Ready Deals
  // ======================================================================
  private readDeal(input: Record<string, unknown>, base?: ReadyDeal) {
    const items = ((input.items ?? base?.items ?? []) as DealItem[]).slice(0, 20).map((i) => ({
      category: (["panel", "inverter", "battery", "ev_charger", "heat_pump", "portable", "other"].includes(i.category) ? i.category : "other") as DealItem["category"],
      model: str(i.model, 120),
      qty: Math.max(1, Math.min(200, Math.round(Number(i.qty) || 1))),
      watts: i.watts ? Number(i.watts) : undefined,
      kw: i.kw ? Number(i.kw) : undefined,
      hybrid: i.hybrid ? true : undefined,
      usableKwh: i.usableKwh ? Number(i.usableKwh) : undefined,
    }));
    const types = ["single", "bundle", "solar", "battery", "solar_battery", "everything"];
    const buildings = ((input.buildingTypes ?? base?.buildingTypes ?? ["house"]) as string[]).filter((b) => ["house", "townhouse", "unit", "business"].includes(b)) as ReadyDeal["buildingTypes"];
    return {
      type: (types.includes(String(input.type)) ? input.type : base?.type ?? "solar") as ReadyDeal["type"],
      title: str(input.title ?? base?.title, 90),
      description: str(input.description ?? base?.description, 1200) || undefined,
      items,
      buildingTypes: buildings.length ? buildings : ["house"],
      price: Math.max(0, Number(input.price ?? base?.price ?? 0)),
      wasPrice: Number(input.wasPrice ?? base?.wasPrice) > 0 ? Number(input.wasPrice ?? base?.wasPrice) : undefined,
      badge: str(input.badge ?? base?.badge, 24) || undefined,
      stockSource: (input.stockSource ?? base?.stockSource) === "own" ? "own" : "easylink",
      serviceAreas: str(input.serviceAreas ?? base?.serviceAreas, 400),
      quantity: Math.max(1, Math.min(500, Math.round(Number(input.quantity ?? base?.quantity ?? 10)))),
      endsAt: str(input.endsAt ?? base?.endsAt, 30) || undefined,
    } satisfies Partial<ReadyDeal>;
  }

  private dealProblems(d: Pick<ReadyDeal, "title" | "items" | "price" | "serviceAreas" | "quantity" | "wasPrice" | "endsAt">) {
    const out: string[] = [];
    if (!d.title) out.push("Give the deal a title.");
    if (!d.items.length || d.items.some((i) => !i.model)) out.push("Add the equipment.");
    if (!(d.price > 0)) out.push("Set the price.");
    if (d.wasPrice && d.wasPrice <= d.price) out.push("The was-price must be higher than the price.");
    if (!validAreas(d.serviceAreas)) out.push('List the postcodes you install in, e.g. "2145-2155, 2112".');
    if (d.endsAt && d.endsAt < nowIso().slice(0, 10)) out.push("The end date has passed.");
    out.push(...checkSystem(systemOf(d.items)).errors);
    return out;
  }

  /** The deal as the checks see it: system, STCs, suggested price floor and warnings. */
  dealCheck(input: Record<string, unknown>) {
    const d = this.readDeal(input);
    const sys = systemOf(d.items);
    const c = checkSystem(sys);
    return { system: sys, kw: c.kw, stcs: c.stcs, warnings: c.warnings, problems: this.dealProblems(d) };
  }

  async deals(p: Principal) {
    const all = ((await this.c.store.listRecords("ready_deal")) as unknown as ReadyDeal[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (this.staff(p)) return all.map((d) => this.withChecks(d));
    if (p.kind === "installer") return all.filter((d) => d.installerId === p.id).map((d) => this.withChecks(d));
    return [];
  }

  private withChecks(d: ReadyDeal) {
    const sys = systemOf(d.items);
    const c = checkSystem(sys);
    return { ...d, system: sys, kw: c.kw, stcs: c.stcs, warnings: c.warnings, remaining: Math.max(0, d.quantity - d.sold) };
  }

  /** The website: live deals, filtered. A postcode shows only deals from installers who service it. */
  async publicDeals(f: { postcode?: string; type?: string; building?: string; maxPrice?: number; minKw?: number }) {
    const all = (await this.c.store.listRecords("ready_deal")) as unknown as ReadyDeal[];
    const today = nowIso().slice(0, 10);
    return all
      .filter((d) => d.status === "live" && d.sold < d.quantity && (!d.endsAt || d.endsAt >= today))
      .filter((d) => !f.postcode || inAreas(d.serviceAreas, f.postcode))
      .filter((d) => !f.type || f.type === "all" || d.type === f.type || (f.type === "solar_battery" && d.type === "everything"))
      .filter((d) => !f.building || d.buildingTypes.includes(f.building as ReadyDeal["buildingTypes"][number]))
      .filter((d) => !f.maxPrice || d.price <= f.maxPrice)
      .map((d) => this.publicDeal(d))
      .filter((d) => !f.minKw || d.kw >= f.minKw)
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  }

  publicDeal(d: ReadyDeal) {
    const w = this.withChecks(d);
    return {
      id: d.id, ref: d.ref, type: d.type, title: d.title, description: d.description, installerName: d.installerName, items: d.items,
      system: w.system, kw: w.kw, stcs: w.stcs.total, stcValue: w.stcs.value, price: d.price, wasPrice: d.wasPrice, badge: d.badge,
      buildingTypes: d.buildingTypes, serviceAreas: d.serviceAreas, remaining: w.remaining, endsAt: d.endsAt, publishedAt: d.publishedAt,
      deposit: Math.round(d.price * 50) / 100, refundPolicy: REFUND_POLICY,
    };
  }

  async createDeal(p: Principal, input: Record<string, unknown>) {
    if (p.kind !== "installer" && !this.staff(p)) throw new JobError("Installers create Ready Deals", 403);
    const installerId = this.staff(p) ? str(input.installerId, 80) : p.id;
    if (!installerId) throw new JobError("Choose the installer", 400);
    const u = await this.user(installerId);
    const n = await this.counter("ready_deal", 1090);
    const d: ReadyDeal = { id: newId("rd_"), ref: `RD-${n}`, rev: 0, status: "draft", installerId, installerName: this.nameOf(u, "Installer"), ...this.readDeal(input), sold: 0, views: 0, createdAt: nowIso(), updatedAt: nowIso() };
    return this.withChecks(await this.save<ReadyDeal>("ready_deal", d));
  }

  private async deal(id: string) {
    const d = (await this.c.store.getRecord("ready_deal", id)) as unknown as ReadyDeal | undefined;
    if (!d) throw new JobError("Ready Deal not found", 404);
    return d;
  }

  async updateDeal(p: Principal, id: string, input: Record<string, unknown>) {
    const d = await this.deal(id);
    if (!this.staff(p) && d.installerId !== p.id) throw new JobError("Not your deal", 403);
    if (!["draft", "rejected", "paused"].includes(d.status) && !this.staff(p)) throw new JobError("Pause the deal to change it; changes go back to EasyLink to approve", 409);
    const next = { ...d, ...this.readDeal(input, d) };
    // Price or equipment changes on an approved deal need approving again.
    if (!this.staff(p) && d.status === "paused" && (next.price !== d.price || JSON.stringify(next.items) !== JSON.stringify(d.items))) next.status = "draft";
    if (d.status === "rejected") next.status = "draft";
    return this.withChecks(await this.save<ReadyDeal>("ready_deal", next));
  }

  async dealAction(p: Principal, id: string, action: string, input: Record<string, unknown>) {
    const d = await this.deal(id);
    const owner = d.installerId === p.id;
    switch (action) {
      case "submit": {
        if (!owner && !this.staff(p)) throw new JobError("Not your deal", 403);
        if (!["draft", "rejected"].includes(d.status)) throw new JobError("Only a draft can be sent to EasyLink", 409);
        const problems = this.dealProblems(d);
        if (problems.length) throw new JobError(problems.join(" "), 400);
        const saved = await this.save<ReadyDeal>("ready_deal", { ...d, status: "review" });
        await this.c.messaging.sendEmail({ to: process.env.STAFF_EMAIL ?? "sales@easylinksolar.com.au", subject: `Ready Deal ${d.ref} to approve`, body: `${d.installerName} submitted "${d.title}" at ${money(d.price)}. Approve it in the Distributor portal → Ready Deals.` }).catch(() => undefined);
        return this.withChecks(saved);
      }
      case "approve": {
        if (!this.staff(p)) throw new JobError("EasyLink approves Ready Deals", 403);
        if (d.status !== "review") throw new JobError("Only a deal waiting for approval can be approved", 409);
        const problems = this.dealProblems(d);
        if (problems.length) throw new JobError(problems.join(" "), 400);
        const u = await this.user(d.installerId);
        const limit = MEMBERSHIP_LIVE_DEALS[this.membership(u)];
        const live = ((await this.c.store.listRecords("ready_deal")) as unknown as ReadyDeal[]).filter((x) => x.installerId === d.installerId && x.status === "live").length;
        if (limit !== undefined && live >= limit) throw new JobError(`${d.installerName} already has ${live} live deals, the most their ${this.membership(u)} membership allows.`, 409);
        const saved = await this.save<ReadyDeal>("ready_deal", { ...d, status: "live", publishedAt: d.publishedAt ?? nowIso(), review: { by: p.id, at: nowIso(), note: str(input.note, 300) || undefined } });
        await this.emailUser(d.installerId, `Ready Deal ${d.ref} approved`, `"${d.title}" is live on easylinksolar.com.au/ready-deals.`);
        return this.withChecks(saved);
      }
      case "reject": {
        if (!this.staff(p)) throw new JobError("Staff only", 403);
        if (d.status !== "review") throw new JobError("Only a deal waiting for approval can be sent back", 409);
        const note = str(input.reason, 500);
        if (!note) throw new JobError("Say what needs changing", 400);
        const saved = await this.save<ReadyDeal>("ready_deal", { ...d, status: "rejected", review: { by: p.id, at: nowIso(), note } });
        await this.emailUser(d.installerId, `Ready Deal ${d.ref} needs changes`, `EasyLink sent "${d.title}" back: ${note}`);
        return this.withChecks(saved);
      }
      case "pause":
      case "resume":
      case "end": {
        if (!owner && !this.staff(p)) throw new JobError("Not your deal", 403);
        const to = action === "pause" ? "paused" : action === "end" ? "ended" : "live";
        if (action === "resume" && d.status !== "paused") throw new JobError("Only a paused deal can be resumed", 409);
        if (action === "pause" && d.status !== "live") throw new JobError("Only a live deal can be paused", 409);
        return this.withChecks(await this.save<ReadyDeal>("ready_deal", { ...d, status: to }));
      }
      default:
        throw new JobError("Unknown action", 400);
    }
  }

  /**
   * Buy Now on the website. The customer becomes the installer's customer with a
   * job already assigned, and owes 50% now (the deposit invoice) and 50% before
   * installation starts.
   */
  async buyDeal(dealId: string, input: Record<string, unknown>) {
    const d = await this.deal(dealId);
    const today = nowIso().slice(0, 10);
    if (d.status !== "live" || (d.endsAt && d.endsAt < today)) throw new JobError("This deal has ended.", 409);
    if (d.sold >= d.quantity) throw new JobError("This deal has sold out.", 409);
    const cu = (input.customer ?? {}) as Record<string, unknown>;
    const customer = {
      name: str(cu.name, 120), phone: str(cu.phone, 30), email: str(cu.email, 120).toLowerCase(), street: str(cu.street, 160),
      suburb: str(cu.suburb, 60), state: str(cu.state ?? "NSW", 3).toUpperCase(), postcode: str(cu.postcode, 4),
    };
    const problems: string[] = [];
    if (customer.name.length < 2) problems.push("Enter your name.");
    if (!/^(\+?61|0)4\d{8}$/.test(customer.phone.replace(/[\s()-]/g, ""))) problems.push("Enter an Australian mobile number.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customer.email)) problems.push("Enter your email.");
    if (!customer.street || !customer.suburb || !/^\d{4}$/.test(customer.postcode)) problems.push("Enter the installation address.");
    if (/^\d{4}$/.test(customer.postcode) && !inAreas(d.serviceAreas, customer.postcode)) problems.push(`${d.installerName} doesn't install in ${customer.postcode}. Search deals for your postcode.`);
    if (input.owner !== true) problems.push("Confirm you own the property (or have the owner's permission).");
    if (input.consent !== true) problems.push("Agree to be contacted about your order.");
    if (input.terms !== true) problems.push("Accept the terms and refund policy.");
    if (problems.length) throw new JobError(problems.join(" "), 400);

    // Take one from stock first, so the last one can't be sold twice.
    const sold = { ...d, sold: d.sold + 1, rev: d.rev + 1, updatedAt: nowIso() };
    if (!(await this.c.store.putRecordIfRev("ready_deal", sold as unknown as Record<string, unknown> & { id: string; rev: number }, d.rev))) throw new JobError("Lots of people are buying this deal right now. Try again.", 409);

    // The customer: in the backend when it can (portal login, owned by the installer), otherwise kept here.
    const created = await this.c.backend
      .create("customer", { firstName: customer.name.split(" ")[0], lastName: customer.name.split(" ").slice(1).join(" "), email: customer.email, phone: customer.phone, address: `${customer.street}, ${customer.suburb} ${customer.state} ${customer.postcode}`, installerId: d.installerId, source: "READY_DEAL" }, this.svc())
      .catch(() => null);
    const customerId = created?.ok && created.data?.id ? String(created.data.id) : newId("cus_");
    const n = await this.counter("deal_order", 5000);
    const ref = `DO-${n}`;
    const sys = systemOf(d.items);
    const c = checkSystem(sys, customer.state);
    const u = await this.user(d.installerId);
    const j = newJob({
      leadId: `rd_${ref.toLowerCase()}`,
      customerId,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone.replace(/[\s()-]/g, "").replace(/^0/, "+61"),
      seller: { name: d.installerName, abn: String(u.abn ?? "") || undefined, email: String(u.email ?? "") || undefined, phone: String(u.phone ?? "") || undefined },
      site: { address: `${customer.street}, ${customer.suburb} ${customer.state} ${customer.postcode}`, postcode: customer.postcode, state: customer.state, lat: 0, lng: 0, phases: 1, zoneRating: zoneFor(customer.state), zoneConfirmed: false },
      // The job price is before the STC discount, so "you pay" equals the deal price.
      selection: this.selection(sys, d.price + c.stcs.value, `${d.title} (Ready Deal ${d.ref})`),
      dnsp: "",
    });
    j.installerId = d.installerId;
    j.installerName = d.installerName;
    j.source = { kind: "ready_deal", ref: d.ref };
    j.payPlan = "half_before_install";
    j.depositPercent = 50;
    j.confirmation = { transcript: `Bought Ready Deal ${d.ref} "${d.title}" on easylinksolar.com.au, accepting the terms and refund policy.`, at: nowIso(), items: d.items.map((i) => `${i.qty} × ${i.model}`) };
    await this.jobs.save(j);
    await this.jobs.record(j, SYSTEM, `${customer.name} bought Ready Deal ${d.ref}`, { reach: ["installer_assigned", "selection_confirmed"], detail: `${d.title}, ${money(d.price)} after STCs`, kind: "record" });
    const inv = await this.jobs.depositInvoice(j, SYSTEM);
    inv.status = "sent";
    inv.sentAt = nowIso();
    await this.c.store.putRecord("invoice", inv as unknown as Record<string, unknown> & { id: string });

    const order: DealOrder = {
      id: newId("do_"), ref, dealId: d.id, dealRef: d.ref, installerId: d.installerId, jobId: j.id,
      customer: { ...customer, customerId }, building: str(input.building, 20) || "house", owner: true, consentAt: nowIso(), termsAt: nowIso(),
      price: d.price, depositInvoiceId: inv.id, payToken: randomBytes(18).toString("base64url"), status: "deposit_due", createdAt: nowIso(),
    };
    await this.c.store.putRecord("deal_order", order as unknown as Record<string, unknown> & { id: string });
    const portal = process.env.PORTAL_BASE_URL ?? "https://www.easylinksolar.com.au";
    await this.c.messaging
      .sendEmail({
        to: customer.email,
        subject: `Your EasyLink order ${ref}: ${d.title}`,
        body: `Hi ${customer.name.split(" ")[0]},\n\nThanks for buying "${d.title}" from ${d.installerName}.\n\nPrice after STCs: ${money(d.price)}\nNow (50%): ${money(inv.totals.total)} — invoice ${inv.number}\nBefore installation (50%): the balance, invoiced once your dates are set.\n\nWhat happens next: ${d.installerName} calls you, checks your site (photos or a visit), then you sign the agreement and pick your installation dates.\n\nRefunds:\n- ${REFUND_POLICY.join("\n- ")}\n\nYour order and payments: ${portal}/customers/project\n\nEasyLink Solar`,
      })
      .catch(() => undefined);
    await this.jobs.tell(j, "installer", `bought your Ready Deal ${d.ref} (${d.title}). Call them to arrange the site check.`, SYSTEM);
    if (sold.sold >= d.quantity) await this.emailUser(d.installerId, `Ready Deal ${d.ref} sold out`, `All ${d.quantity} of "${d.title}" have sold.`);
    return { orderRef: ref, orderId: order.id, payToken: order.payToken, jobId: j.id, deposit: { invoiceId: inv.id, number: inv.number, amount: inv.totals.total }, balance: Math.round((d.price - inv.totals.total) * 100) / 100, refundPolicy: REFUND_POLICY };
  }

  /** The website pays the 50% for a buyer who hasn't signed in yet (the token came back from Buy Now). */
  async payOrder(orderId: string, token: string) {
    const o = (await this.c.store.getRecord("deal_order", orderId)) as unknown as DealOrder | undefined;
    if (!o || !token || o.payToken !== token) throw new JobError("Order not found", 404);
    const p: Principal = { kind: "customer", id: o.customer.customerId, roles: ["CUSTOMER"], on_behalf_of: null };
    const r = (await this.jobs.act(o.jobId, "pay_invoice", { invoiceId: o.depositInvoiceId }, p, { ip: "website", userAgent: "ready-deals", token: this.c.serviceToken, user: { id: o.customer.customerId, customerId: o.customer.customerId, email: o.customer.email } })) as { payUrl?: string | null; invoice?: { status: string } };
    if (r.invoice?.status === "paid") await this.c.store.putRecord("deal_order", { ...o, status: "active" } as unknown as Record<string, unknown> & { id: string });
    return { payUrl: r.payUrl ?? null, paid: r.invoice?.status === "paid" };
  }

  async orders(p: Principal) {
    const all = ((await this.c.store.listRecords("deal_order")) as unknown as DealOrder[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const mine = this.staff(p) ? all : p.kind === "installer" ? all.filter((o) => o.installerId === p.id) : [];
    return Promise.all(
      mine.map(async ({ payToken: _t, ...o }) => {
        const j = await this.jobs.get(o.jobId);
        const done = Object.keys(j?.milestones ?? {});
        return { ...o, stage: this.orderStage(j), milestones: done, installDates: j?.installDates ?? null };
      }),
    );
  }

  /** Call → site check → book → install → handover, from the job's milestones. */
  private orderStage(j?: Job) {
    if (!j) return "Unknown";
    const m = j.milestones;
    if (m.handover_sent) return "Handed over";
    if (m.installed) return "Installed";
    if (m.install_date_set) return "Booked";
    if (m.job_accepted) return "Site checked";
    if (m.deposit_paid) return "Call the customer";
    return "Waiting for the 50% payment";
  }

  /** EasyLink cancels an order under its refund policy: the deal gets its unit back and a credit note is issued for what's refunded. */
  async cancelOrder(p: Principal, orderId: string, input: Record<string, unknown>) {
    if (!this.staff(p)) throw new JobError("EasyLink handles cancellations and refunds", 403);
    const o = (await this.c.store.getRecord("deal_order", orderId)) as unknown as DealOrder | undefined;
    if (!o) throw new JobError("Order not found", 404);
    if (o.status === "cancelled" || o.status === "refunded") throw new JobError("Already cancelled", 409);
    const reason = str(input.reason, 500);
    if (!reason) throw new JobError("Give the reason", 400);
    const j = await this.jobs.get(o.jobId);
    if (j?.milestones.install_started) throw new JobError("Installation has started; handle this as a variation or complaint instead.", 409);
    const invoices = j ? await this.jobs.invoices(j.id) : [];
    const paid = invoices.reduce((t, i) => t + i.payments.reduce((x, y) => x + y.amount, 0), 0);
    const refund = Math.min(paid, Math.max(0, input.refund === undefined ? paid : Number(input.refund)));
    const next: DealOrder = { ...o, status: refund > 0 ? "refunded" : "cancelled", cancel: { at: nowIso(), by: p.id, reason, refund } };
    await this.c.store.putRecord("deal_order", next as unknown as Record<string, unknown> & { id: string });
    const d = await this.deal(o.dealId).catch(() => null);
    if (d && d.sold > 0) await this.save<ReadyDeal>("ready_deal", { ...d, sold: d.sold - 1 });
    if (j) {
      await this.jobs.record(j, p, `Order ${o.ref} cancelled${refund ? `, refund ${money(refund)}` : ""}`, { detail: reason, kind: "record" });
      const paidInv = invoices.find((i) => i.payments.length);
      if (refund > 0 && paidInv) await this.jobs.act(j.id, "credit_invoice", { invoiceId: paidInv.id, reason: `Refund: ${reason}` }, p, {}).catch(() => undefined);
    }
    await this.c.messaging.sendEmail({ to: o.customer.email, subject: `Order ${o.ref} cancelled`, body: `Hi ${o.customer.name.split(" ")[0]},\n\nYour order ${o.ref} has been cancelled: ${reason}.${refund ? `\nWe're refunding ${money(refund)} to your original payment method within 10 business days.` : ""}\n\nEasyLink Solar` }).catch(() => undefined);
    return next;
  }

  /** For the customer portal: their Ready Deal order, if their job came from one. */
  async orderForJob(jobId: string) {
    const o = ((await this.c.store.listRecords("deal_order")) as unknown as DealOrder[]).find((x) => x.jobId === jobId);
    if (!o) return null;
    const j = await this.jobs.get(jobId);
    const { payToken: _t, ...rest } = o;
    return { ...rest, stage: this.orderStage(j), refundPolicy: REFUND_POLICY, stcPrice: STC_PRICE };
  }
}
