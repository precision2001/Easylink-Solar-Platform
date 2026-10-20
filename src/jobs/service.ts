import { createHash, randomInt } from "node:crypto";
import { Relations } from "../access/relations.js";
import type { Container } from "../container.js";
import { makeEvent, newId, type Principal, type RecordRef } from "../core/envelope.js";
import { isStaff } from "../policy/policy.js";
import { agreementHtml, installCompleteHtml, invoiceHtml, revisionHtml, STC_PRICE, stcAssignmentHtml } from "./docs.js";
import {
  invoiceTotals,
  MILESTONES,
  money,
  round2,
  type Invoice,
  type InvoiceLine,
  type Job,
  type MilestoneKey,
  type Offer,
  type Signature,
  type Who,
} from "./model.js";
import { batteryFactor, batteryStcs, deemingYears, solarStcs } from "./stc.js";

/**
 * The job journey service. One method per step in the EasyLink Job Journey
 * doc; each checks who may do it, changes the job, records milestones and
 * emits a `job.progressed` event (which becomes a History line for everyone
 * related). Money and signatures are always a person's action.
 */
export const PREREQS: Record<MilestoneKey, MilestoneKey[]> = {
  design_selected: [],
  installer_assigned: ["design_selected"],
  selection_confirmed: ["installer_assigned"],
  site_photos_ok: ["installer_assigned"],
  job_accepted: ["selection_confirmed", "site_photos_ok"],
  agreement_signed: ["job_accepted"],
  deposit_paid: ["agreement_signed"],
  install_date_set: ["deposit_paid"],
  connection_applied: ["job_accepted"],
  connection_approved: ["connection_applied"],
  bills_received: ["job_accepted"],
  quote_final: ["bills_received"],
  equipment_paid: ["quote_final", "deposit_paid"],
  delivered: ["equipment_paid", "install_date_set"],
  install_started: ["delivered", "connection_approved"],
  installed: ["install_started"],
  site_docs_sent: ["installed"],
  final_paid: ["installed"],
  stc_pack_signed: ["installed"],
  handover_sent: ["final_paid", "stc_pack_signed"],
  stc_lodged: ["stc_pack_signed"],
  monitoring_clear: ["installed"],
};

export const CHECKLIST: Job["onsite"]["checklist"] = [
  { key: "pre_roof", day: 1, label: "Roof before work", photo: true, done: false },
  { key: "pre_board", day: 1, label: "Switchboard and meter before work", photo: true, done: false },
  { key: "penetrations", day: 1, label: "Roof penetrations sealed", photo: true, done: false },
  { key: "rails", day: 1, label: "Rail fixings", photo: true, done: false },
  { key: "array", day: 1, label: "Array from two angles", photo: true, done: false },
  { key: "inverter", day: 2, label: "Inverter installed", photo: true, done: false },
  { key: "battery", day: 2, label: "Battery installed", photo: true, done: false },
  { key: "battery_labels", day: 2, label: "Battery safety labels", photo: true, done: false },
  { key: "isolators", day: 2, label: "Isolators and labels", photo: true, done: false },
  { key: "export_limit", day: 2, label: "Export limit setting", photo: true, done: false },
  { key: "signage", day: 2, label: "Emergency signage and shutdown procedure", photo: true, done: false },
  { key: "shutdown_shown", day: 2, label: "Shutdown shown to the customer", photo: false, done: false },
];

export class JobError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export type Viewer = { who: Who; id: string };
type Meta = { ip?: string; userAgent?: string; token?: string | null; user?: Record<string, unknown> };

const round4 = (n: number) => Math.round(n * 10000) / 10000;
const nowIso = () => new Date().toISOString();
const addDays = (iso: string, d: number) => new Date(Date.parse(iso) + d * 864e5).toISOString();
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const maskPhone = (p?: string) => (p ? `${p.slice(0, 4)} ••• ${p.slice(-3)}` : "the mobile on file");

export function viewerOf(p: Principal): Viewer {
  return { who: isStaff(p) || p.kind === "system" || p.kind === "agent" ? "staff" : p.kind === "installer" ? "installer" : "customer", id: p.id };
}

export function openMilestones(j: Job): MilestoneKey[] {
  return MILESTONES.filter((m) => !j.milestones[m.key] && PREREQS[m.key].every((k) => j.milestones[k])).map((m) => m.key);
}

export class JobService {
  constructor(private c: Container) {}

  // ---------- storage ----------
  async get(id: string): Promise<Job | undefined> {
    return (await this.c.store.getRecord("job", id)) as unknown as Job | undefined;
  }
  async save(j: Job) {
    j.updatedAt = nowIso();
    await this.c.store.putRecord("job", j as unknown as Record<string, unknown> & { id: string });
  }
  async invoices(jobId: string): Promise<Invoice[]> {
    return ((await this.c.store.listRecords("invoice")) as unknown as Invoice[]).filter((i) => i.jobId === jobId).sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  }
  async signatures(jobId: string): Promise<Signature[]> {
    return ((await this.c.store.listRecords("signature")) as unknown as Signature[]).filter((s) => s.jobId === jobId);
  }
  async offers(jobId?: string): Promise<Offer[]> {
    return ((await this.c.store.listRecords("offer")) as unknown as Offer[]).filter((o) => !jobId || o.jobId === jobId);
  }
  private async counter(name: string): Promise<number> {
    const cur = await this.c.store.getRecord("counter", name);
    const n = Number(cur?.n ?? 1000) + 1;
    await this.c.store.putRecord("counter", { id: name, n });
    return n;
  }

  // ---------- who may see / act ----------
  async canSee(j: Job, p: Principal, meta: Meta = {}): Promise<boolean> {
    const v = viewerOf(p);
    if (v.who === "staff") return true;
    if (v.who === "installer") return j.installerId === p.id || (await this.offers(j.id)).some((o) => o.installerId === p.id && o.status === "open");
    const scope = await this.c.relations.scope(p, meta.user ?? {}, meta.token ?? undefined);
    return (!!j.customerId && Relations.covers(scope, { type: "customer", id: j.customerId })) || Relations.covers(scope, { type: "lead", id: j.leadId });
  }

  async list(p: Principal, meta: Meta = {}): Promise<Job[]> {
    const all = (await this.c.store.listRecords("job")) as unknown as Job[];
    const out: Job[] = [];
    for (const j of all) if (await this.canSee(j, p, meta)) out.push(j);
    return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  /** The job as this viewer may see it, with their next steps. */
  async view(j: Job, p: Principal) {
    const v = viewerOf(p);
    const open = openMilestones(j);
    const invoices = (await this.invoices(j.id)).filter((i) => v.who !== "customer" || i.status !== "draft");
    const signatures = (await this.signatures(j.id)).map(({ html: _h, codeHash: _c, ...s }) => s);
    const offers = v.who === "staff" ? await this.offers(j.id) : v.who === "installer" ? (await this.offers(j.id)).filter((o) => o.installerId === p.id) : [];
    const base = { ...j };
    // An installer looking at an offer sees the suburb and the system, not who or exactly where, until they accept.
    if (v.who === "installer" && j.installerId !== p.id) {
      const suburb = j.site.address.split(",").slice(-1)[0]?.trim() ?? "";
      base.customerName = `Customer in ${suburb}`;
      base.customerEmail = undefined;
      base.customerPhone = undefined;
      base.site = { ...j.site, address: suburb, nmi: undefined, lat: Math.round(j.site.lat * 100) / 100, lng: Math.round(j.site.lng * 100) / 100 };
      base.bills = { items: [] };
      base.confirmation = undefined;
      base.photos = { items: j.photos.items.map((x) => ({ label: x.label, ok: x.ok })) };
    }
    if (v.who === "customer") {
      // The installer's equipment cost and the on-site working list stay with the installer.
      base.order = { ...j.order, lines: [], ref: undefined };
      base.monitoring = { ...j.monitoring, issues: j.monitoring.issues.filter((i) => i.status === "open") };
    }
    return {
      job: base,
      milestones: MILESTONES.map((m) => ({ ...m, done: !!j.milestones[m.key], at: j.milestones[m.key]?.at ?? null, open: open.includes(m.key) })),
      next: MILESTONES.filter((m) => open.includes(m.key) && (v.who === "staff" || m.who === v.who)).map((m) => ({ key: m.key, label: m.next, who: m.who })),
      waitingOn: MILESTONES.filter((m) => open.includes(m.key) && v.who !== "staff" && m.who !== v.who).map((m) => ({ key: m.key, label: m.label, who: m.who })),
      invoices,
      signatures,
      offers,
      stage: Math.max(1, ...MILESTONES.filter((m) => j.milestones[m.key]).map((m) => m.stage)),
      viewer: v.who,
      stcPrice: STC_PRICE,
    };
  }

  // ---------- recording ----------
  private async progress(j: Job, p: Principal, title: string, opts: { reach?: MilestoneKey[]; detail?: string; audience?: "related" | "staff"; kind?: string } = {}) {
    for (const k of opts.reach ?? []) if (!j.milestones[k]) j.milestones[k] = { at: nowIso(), by: p.id };
    await this.save(j);
    const links: RecordRef[] = j.customerId ? [{ type: "customer", id: j.customerId }] : [];
    if (j.installerId) links.push({ type: "user", id: j.installerId });
    const evt = makeEvent({
      type: "job.progressed",
      source: "jobs",
      principal: p,
      subject: { type: "lead", id: j.leadId },
      links,
      data: { title, detail: opts.detail ?? null, kind: opts.kind ?? "record", audience: opts.audience ?? "related", milestones: opts.reach ?? [] },
    });
    await this.c.store.recordEvent(evt);
    await this.c.bus.publish([evt]);
  }

  private async notify(j: Job, to: "customer" | "installer", text: string, p: Principal) {
    const phone = to === "customer" ? j.customerPhone : undefined;
    if (to === "customer" && phone) await this.c.messaging.sendSms({ to: phone, body: `EasyLink Solar: ${text}` }).catch(() => undefined);
    if (to === "installer" && j.installerId) {
      const u = await this.c.backend.get("user", j.installerId, { token: this.c.serviceToken }).catch(() => null);
      const ph = u?.data?.phone ? String(u.data.phone) : null;
      if (ph) await this.c.messaging.sendSms({ to: ph, body: `EasyLink: ${j.customerName} — ${text}` }).catch(() => undefined);
    }
    void p;
  }

  // ---------- invoices ----------
  async createInvoice(j: Job, p: Principal, input: { kind: Invoice["kind"]; lines: InvoiceLine[]; dueDays?: number; notes?: string; via: Invoice["createdVia"]; creditFor?: string }) {
    if (!input.lines.length) throw new JobError("Add at least one line.");
    const issue = nowIso();
    const n = await this.counter("invoice");
    const inv: Invoice = {
      id: newId("inv_"),
      number: `${input.kind === "credit" ? "ADJ" : "INV"}-${n}`,
      jobId: j.id,
      kind: input.kind,
      seller: j.seller,
      buyer: { name: j.customerName, address: j.site.address, email: j.customerEmail },
      lines: input.lines.map((l) => ({ description: l.description.slice(0, 200), qty: Number(l.qty), unitExGst: round4(Number(l.unitExGst)), gst: !!l.gst })),
      notes: input.notes?.slice(0, 1000),
      issueDate: issue,
      dueDate: addDays(issue, input.dueDays ?? 7),
      status: "draft",
      totals: invoiceTotals(input.lines),
      payments: [],
      creditFor: input.creditFor,
      createdBy: p.id,
      createdVia: input.via,
    };
    await this.c.store.putRecord("invoice", inv as unknown as Record<string, unknown> & { id: string });
    await this.progress(j, p, `${input.kind === "credit" ? "Adjustment note" : "Invoice"} ${inv.number} drafted (${money(inv.totals.total)})`, { audience: "staff", kind: "record" });
    return inv;
  }

  private depositLines(j: Job): InvoiceLine[] {
    const youPay = j.selection.price - (j.stc.solar + j.stc.battery) * STC_PRICE;
    const deposit = round2((j.selection.price * j.depositPercent) / 100);
    void youPay;
    return [{ description: `Deposit (${j.depositPercent}%) — ${j.selection.title}, ${j.site.address}`, qty: 1, unitExGst: round4(deposit / 1.1), gst: true }];
  }

  private finalLines(j: Job, paidSoFar: number): InvoiceLine[] {
    const stcs = j.stc.solar + j.stc.battery;
    return [
      { description: `${j.selection.title} — supply and installation, ${j.site.address}`, qty: 1, unitExGst: round4(j.selection.price / 1.1), gst: true },
      { description: `STC point-of-sale discount (${stcs} STCs at ${money(STC_PRICE)})`, qty: 1, unitExGst: -round4((stcs * STC_PRICE) / 1.1), gst: true },
      { description: "Less deposit received", qty: 1, unitExGst: -round4(paidSoFar / 1.1), gst: true },
    ];
  }

  // ---------- signatures ----------
  private async requestSignature(j: Job, kind: Signature["kind"], title: string, html: string, signer: Signature["signer"]) {
    const s: Signature = { id: newId("sig_"), jobId: j.id, kind, title, signer, html, hash: sha(html), status: "pending", attempts: 0, createdAt: nowIso() };
    await this.c.store.putRecord("signature", s as unknown as Record<string, unknown> & { id: string });
    return s;
  }

  async signatureHtml(id: string): Promise<{ s: Signature; html: string } | undefined> {
    const s = (await this.c.store.getRecord("signature", id)) as unknown as Signature | undefined;
    if (!s) return undefined;
    const { signedCopy } = await import("./docs.js");
    return { s, html: signedCopy(s) };
  }

  async invoiceDoc(id: string): Promise<{ inv: Invoice; html: string } | undefined> {
    const inv = (await this.c.store.getRecord("invoice", id)) as unknown as Invoice | undefined;
    return inv ? { inv, html: invoiceHtml(inv) } : undefined;
  }

  // ---------- matching ----------
  async rank(j: Job) {
    const r = await this.c.backend.list("user", { role: "INSTALLER" }, { token: this.c.serviceToken });
    const today = nowIso().slice(0, 10);
    const rows = ((r.data ?? []) as Record<string, unknown>[]).filter((u) => String(u.role ?? "").toUpperCase() === "INSTALLER");
    const tried = new Set((await this.offers(j.id)).map((o) => o.installerId));
    const out = rows.map((u) => {
      const lat = Number(u.lat ?? NaN);
      const lng = Number(u.lng ?? NaN);
      const distanceKm = Number.isFinite(lat) ? Math.round(haversine(j.site.lat, j.site.lng, lat, lng)) : 999;
      const reviews = Number(u.reviewCount ?? 0);
      const rating = Number(u.rating ?? 0);
      const shrunk = (rating * reviews + 4.5 * 5) / (reviews + 5);
      const reliability = Number(u.reliability ?? 0.8);
      const reasons: string[] = [];
      if (!u.saaExpiry || String(u.saaExpiry) < today) reasons.push("SAA accreditation not current");
      if (j.selection.battery && !u.batteryEndorsed) reasons.push("no battery endorsement");
      if (distanceKm > Number(u.serviceRadiusKm ?? 60)) reasons.push("outside service area");
      if (u.paused) reasons.push("paused");
      if (tried.has(String(u.id))) reasons.push("already offered");
      const score = Math.round((0.4 * (1 - Math.min(distanceKm, 100) / 100) + 0.35 * (shrunk / 5) + 0.25 * reliability) * 100);
      return { installerId: String(u.id), name: [u.firstName, u.lastName].filter(Boolean).join(" ") || String(u.id), distanceKm, rating: round2(shrunk), reviews, reliability, score, eligible: reasons.length === 0, reasons };
    });
    return out.sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);
  }

  private async offerNext(j: Job, p: Principal) {
    const best = (await this.rank(j)).find((c) => c.eligible);
    if (!best) {
      await this.c.actions.run({ name: "request_approval", input: { question: `No eligible installer accepted ${j.customerName}'s job. Please place it.`, about: { type: "lead", id: j.leadId } }, principal: { kind: "system", id: "jobs", roles: [], on_behalf_of: null } }).catch(() => undefined);
      await this.progress(j, p, "No installer available yet — EasyLink is placing the job", { audience: "staff" });
      return null;
    }
    const o: Offer = { id: newId("off_"), jobId: j.id, installerId: best.installerId, installerName: best.name, score: best.score, parts: { distanceKm: best.distanceKm, rating: best.rating, reliability: best.reliability }, status: "open", at: nowIso(), expiresAt: new Date(Date.now() + 4 * 3600e3).toISOString() };
    await this.c.store.putRecord("offer", o as unknown as Record<string, unknown> & { id: string });
    await this.progress(j, p, `Job offered to ${best.name}`, { detail: `${best.distanceKm} km away, rating ${best.rating}`, audience: "staff", kind: "assignment" });
    return o;
  }

  // ---------- the steps ----------
  async act(jobId: string, action: string, input: Record<string, unknown>, p: Principal, meta: Meta = {}) {
    const j = await this.get(jobId);
    if (!j) throw new JobError("Job not found", 404);
    if (!(await this.canSee(j, p, meta))) throw new JobError("Not your job", 403);
    const v = viewerOf(p);
    const need = (...who: Who[]) => {
      if (v.who === "staff") return;
      if (!who.includes(v.who)) throw new JobError("Not something you can do on this job", 403);
      if (v.who === "installer" && action !== "accept_offer" && action !== "decline_offer" && j.installerId !== p.id) throw new JobError("This job isn't assigned to you", 403);
    };
    const reached = (k: MilestoneKey) => !!j.milestones[k];
    const requires = (...ks: MilestoneKey[]) => {
      const miss = ks.filter((k) => !reached(k));
      if (miss.length) throw new JobError(`Not yet: first ${MILESTONES.find((m) => m.key === miss[0])!.label.toLowerCase()}.`, 409);
    };
    const s = (k: string) => String(input[k] ?? "").trim();

    switch (action) {
      // Stage 2 — matching
      case "match": {
        need("staff");
        return { offer: await this.offerNext(j, p), ranking: await this.rank(j) };
      }
      case "accept_offer":
      case "decline_offer": {
        need("installer");
        const o = (await this.offers(j.id)).find((x) => x.status === "open" && (v.who === "staff" || x.installerId === p.id));
        if (!o) throw new JobError("There is no open offer for you on this job.", 409);
        if (action === "decline_offer") {
          o.status = "declined";
          o.reason = s("reason") || "Declined";
          await this.c.store.putRecord("offer", o as unknown as Record<string, unknown> & { id: string });
          await this.progress(j, p, `${o.installerName} declined the job`, { detail: o.reason, audience: "staff", kind: "assignment" });
          await this.offerNext(j, p);
          return { ok: true };
        }
        o.status = "accepted";
        await this.c.store.putRecord("offer", o as unknown as Record<string, unknown> & { id: string });
        j.installerId = o.installerId;
        j.installerName = o.installerName;
        await this.c.relations
          .assign({ customerId: j.customerId, leadId: j.leadId, installerId: o.installerId, installerName: o.installerName, by: p.id, reason: `Matched: ${o.parts.distanceKm} km, rating ${o.parts.rating}`, replace: true, now: nowIso() })
          .catch(() => undefined);
        await this.c.backend.call("POST", `/leads/${encodeURIComponent(j.leadId)}/assign`, { installerId: o.installerId }, { token: this.c.serviceToken }).catch(() => undefined);
        await this.progress(j, p, `${o.installerName} is your installer`, { reach: ["installer_assigned"], kind: "assignment" });
        await this.notify(j, "customer", `${o.installerName} will install your system. You can message them from My Project.`, p);
        return { ok: true };
      }

      // Stage 3 — confirmation, photos, acceptance
      case "confirm_selection": {
        need("customer");
        requires("installer_assigned");
        const s0 = j.selection;
        j.confirmation = {
          transcript: s("transcript").slice(0, 2000) || "Confirmed in the portal",
          at: nowIso(),
          items: [`${s0.panels.count} × ${s0.panels.model}`, s0.inverter.model, ...(s0.battery ? [`${s0.battery.model} (${s0.battery.usableKwh} kWh)`] : []), ...s0.accessories.map((a) => a.name)],
        };
        await this.progress(j, p, "Customer confirmed the selection", { reach: ["selection_confirmed"], detail: j.confirmation.items.join(" · "), kind: "message" });
        await this.notify(j, "installer", "confirmed their selection. Review the photos and accept the job.", p);
        return { ok: true };
      }
      case "request_photos": {
        need("installer");
        j.photos.requestedAt = nowIso();
        await this.progress(j, p, "Site photos requested", { kind: "message" });
        await this.notify(j, "customer", "your installer needs photos of your meter and switchboard. Open My Project to send them.", p);
        return { ok: true };
      }
      case "upload_photo": {
        need("customer", "installer");
        const label = s("label");
        const item = j.photos.items.find((i) => i.label === label);
        if (!item) throw new JobError("Unknown photo");
        item.ok = true;
        item.documentId = s("documentId") || item.documentId;
        item.note = s("note") || item.note;
        const done = j.photos.items.filter((i) => i.label === "Meter" || i.label === "Switchboard").every((i) => i.ok);
        await this.progress(j, p, `Photo received: ${label}`, { reach: done ? ["site_photos_ok"] : [], kind: "file" });
        return { ok: true };
      }
      case "accept_job": {
        need("installer");
        requires("selection_confirmed", "site_photos_ok");
        const sig = await this.requestSignature(j, "agreement", "Quote and installation agreement", agreementHtml(j), { who: "customer", id: j.customerId ?? j.leadId, name: j.customerName, phone: j.customerPhone });
        await this.progress(j, p, `${j.installerName ?? "Installer"} accepted the job`, { reach: ["job_accepted"], kind: "assignment" });
        await this.notify(j, "customer", "your installer accepted the job. Please sign your agreement in My Project.", p);
        return { signatureId: sig.id };
      }

      // Signing (any document)
      case "request_code":
      case "sign": {
        const sig = (await this.c.store.getRecord("signature", s("signatureId"))) as unknown as Signature | undefined;
        if (!sig || sig.jobId !== j.id) throw new JobError("Document not found", 404);
        if (sig.status === "signed") throw new JobError("Already signed", 409);
        // The customer signs the install sign-off on the installer's phone on site, so the installer may hold the device;
        // the code still goes to the customer's mobile.
        const onSite = sig.kind === "install_complete" && v.who === "installer";
        if (v.who !== "staff" && sig.signer.who !== v.who && !onSite) throw new JobError("This document is for someone else to sign", 403);
        if (action === "request_code") {
          const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
          sig.codeHash = sha(`${sig.id}:${code}`);
          sig.codeExpires = new Date(Date.now() + 10 * 60e3).toISOString();
          sig.attempts = 0;
          await this.c.store.putRecord("signature", sig as unknown as Record<string, unknown> & { id: string });
          if (sig.signer.phone) await this.c.messaging.sendSms({ to: sig.signer.phone, body: `EasyLink Solar: your signing code is ${code}. It expires in 10 minutes. Don't share it.` });
          return { sentTo: maskPhone(sig.signer.phone), ...(process.env.AI_MODE === "local" ? { devCode: code } : {}) };
        }
        if (!sig.codeHash || !sig.codeExpires || sig.codeExpires < nowIso()) throw new JobError("The code has expired. Ask for a new one.", 409);
        if (sig.attempts >= 5) throw new JobError("Too many attempts. Ask for a new code.", 429);
        if (sha(`${sig.id}:${s("code")}`) !== sig.codeHash) {
          sig.attempts += 1;
          await this.c.store.putRecord("signature", sig as unknown as Record<string, unknown> & { id: string });
          throw new JobError("That code isn't right.", 400);
        }
        sig.status = "signed";
        sig.signedAt = nowIso();
        sig.codeHash = undefined;
        sig.audit = { name: s("name") || sig.signer.name, phone: maskPhone(sig.signer.phone), at: sig.signedAt, ip: meta.ip ?? "unknown", userAgent: (meta.userAgent ?? "").slice(0, 200), hash: sig.hash };
        await this.c.store.putRecord("signature", sig as unknown as Record<string, unknown> & { id: string });
        await this.afterSigned(j, sig, p);
        return { ok: true };
      }

      // Stage 4 — invoices, payment, dates
      case "create_invoice": {
        need("installer");
        const lines = (input.lines as InvoiceLine[] | undefined) ?? [];
        const kind = (s("kind") || "other") as Invoice["kind"];
        if (!["deposit", "final", "variation", "other"].includes(kind)) throw new JobError("Unknown invoice kind");
        const inv = await this.createInvoice(j, p, { kind, lines, dueDays: Number(input.dueDays ?? 7), notes: s("notes"), via: input.via === "ai" ? "ai" : "form" });
        return { invoice: inv };
      }
      case "draft_invoice": {
        need("installer");
        const kind = s("kind") as "deposit" | "final";
        const paid = (await this.invoices(j.id)).filter((i) => i.kind === "deposit").reduce((t, i) => t + i.payments.reduce((x, y) => x + y.amount, 0), 0);
        const lines = kind === "final" ? this.finalLines(j, paid) : this.depositLines(j);
        return { invoice: await this.createInvoice(j, p, { kind, lines, dueDays: kind === "final" ? 7 : 7, via: "auto" }) };
      }
      case "update_invoice": {
        need("installer");
        const inv = (await this.c.store.getRecord("invoice", s("invoiceId"))) as unknown as Invoice | undefined;
        if (!inv || inv.jobId !== j.id) throw new JobError("Invoice not found", 404);
        if (inv.status !== "draft") throw new JobError("A sent invoice can't be changed. Issue an adjustment note instead.", 409);
        if (Array.isArray(input.lines)) inv.lines = (input.lines as InvoiceLine[]).map((l) => ({ description: String(l.description).slice(0, 200), qty: Number(l.qty), unitExGst: round4(Number(l.unitExGst)), gst: !!l.gst }));
        if (input.notes !== undefined) inv.notes = s("notes");
        if (input.dueDays !== undefined) inv.dueDate = addDays(inv.issueDate, Number(input.dueDays));
        inv.totals = invoiceTotals(inv.lines);
        await this.c.store.putRecord("invoice", inv as unknown as Record<string, unknown> & { id: string });
        return { invoice: inv };
      }
      case "send_invoice": {
        need("installer");
        const inv = (await this.c.store.getRecord("invoice", s("invoiceId"))) as unknown as Invoice | undefined;
        if (!inv || inv.jobId !== j.id) throw new JobError("Invoice not found", 404);
        if (inv.status !== "draft") throw new JobError("Already sent", 409);
        inv.status = "sent";
        inv.sentAt = nowIso();
        await this.c.store.putRecord("invoice", inv as unknown as Record<string, unknown> & { id: string });
        if (j.customerEmail)
          await this.c.messaging.sendEmail({ to: j.customerEmail, subject: `Tax invoice ${inv.number} from ${j.seller.name}`, body: `Hi ${j.customerName.split(" ")[0]},\n\nYour ${inv.kind} invoice ${inv.number} for ${money(inv.totals.total)} is ready. View and pay it in My Project.\n\n${j.seller.name}` }).catch(() => undefined);
        await this.notify(j, "customer", `invoice ${inv.number} for ${money(inv.totals.total)} is ready to pay in My Project.`, p);
        await this.progress(j, p, `Invoice ${inv.number} sent (${money(inv.totals.total)})`, { kind: "message" });
        return { invoice: inv };
      }
      case "credit_invoice": {
        need("installer");
        const inv = (await this.c.store.getRecord("invoice", s("invoiceId"))) as unknown as Invoice | undefined;
        if (!inv || inv.jobId !== j.id || inv.status === "draft") throw new JobError("Only a sent invoice can be adjusted", 409);
        const note = await this.createInvoice(j, p, { kind: "credit", creditFor: inv.number, lines: inv.lines.map((l) => ({ ...l, unitExGst: -l.unitExGst })), notes: s("reason") || "Correction", via: "form" });
        return { invoice: note };
      }
      case "pay_invoice":
      case "record_payment": {
        if (action === "record_payment") need("staff");
        else need("customer");
        const inv = (await this.c.store.getRecord("invoice", s("invoiceId"))) as unknown as Invoice | undefined;
        if (!inv || inv.jobId !== j.id) throw new JobError("Invoice not found", 404);
        if (inv.status !== "sent") throw new JobError(inv.status === "paid" ? "Already paid" : "This invoice hasn't been sent yet", 409);
        if (action === "pay_invoice" && process.env.AI_MODE !== "local") {
          // Card payments go through Stripe Checkout; the webhook calls record_payment.
          const r = await this.c.backend.call<{ url?: string }>("POST", "/payments/checkout", { invoiceNumber: inv.number, amount: inv.totals.total, jobId: j.id }, { token: meta.token ?? "" });
          return { payUrl: r.data?.url ?? null };
        }
        const due = round2(inv.totals.total - inv.payments.reduce((t, x) => t + x.amount, 0));
        inv.payments.push({ at: nowIso(), amount: Number(input.amount ?? due), method: s("method") || (action === "pay_invoice" ? "Card (test)" : "EFT"), ref: s("ref") || newId("pay_").slice(-8) });
        if (inv.payments.reduce((t, x) => t + x.amount, 0) >= inv.totals.total - 0.01) {
          inv.status = "paid";
          inv.paidAt = nowIso();
        }
        await this.c.store.putRecord("invoice", inv as unknown as Record<string, unknown> & { id: string });
        const reach: MilestoneKey[] = inv.status === "paid" ? (inv.kind === "deposit" ? ["deposit_paid"] : inv.kind === "final" ? ["final_paid"] : []) : [];
        await this.progress(j, p, `Payment received for ${inv.number} (${money(inv.payments.at(-1)!.amount)})`, { reach, kind: "record" });
        await this.notify(j, "installer", `paid ${inv.number}.`, p);
        if (reach.includes("deposit_paid") && !j.windows.length) await this.offerWindows(j);
        return { invoice: inv };
      }
      case "propose_windows": {
        need("installer");
        const w = (input.windows as { day1: string; day2: string }[] | undefined) ?? [];
        if (w.length) j.windows = w.slice(0, 3).map((x) => ({ id: newId("win_"), day1: x.day1, day2: x.day2 }));
        else await this.offerWindows(j);
        await this.progress(j, p, "Installation dates offered", { kind: "booking" });
        return { windows: j.windows };
      }
      case "pick_window": {
        need("customer");
        requires("deposit_paid");
        const w = j.windows.find((x) => x.id === s("windowId"));
        if (!w) throw new JobError("Pick one of the offered dates");
        j.installDates = { day1: w.day1, day2: w.day2 };
        await this.progress(j, p, `Installation booked for ${fmtDay(w.day1)} and ${fmtDay(w.day2)}`, { reach: ["install_date_set"], kind: "booking" });
        await this.notify(j, "installer", `picked ${fmtDay(w.day1)}–${fmtDay(w.day2)} for installation.`, p);
        return { ok: true };
      }

      // Stage 5 — connection
      case "submit_connection": {
        need("installer");
        requires("job_accepted");
        if (!s("reference")) throw new JobError("Enter the DNSP's application reference");
        j.connection = { ...j.connection, status: "submitted", reference: s("reference"), submittedAt: nowIso() };
        await this.progress(j, p, `Connection application submitted to ${j.connection.dnsp}`, { reach: ["connection_applied"], detail: `Reference ${s("reference")}` });
        return { ok: true };
      }
      case "record_approval": {
        need("installer");
        requires("connection_applied");
        const limit = Number(input.exportLimitKw);
        if (!s("number") || !Number.isFinite(limit)) throw new JobError("Enter the approval number and export limit");
        j.connection = { ...j.connection, status: "approved", approval: { number: s("number"), exportLimitKw: limit, at: nowIso(), conditions: s("conditions") || undefined } };
        const lower = limit < j.selection.inverter.kw;
        await this.progress(j, p, `${j.connection.dnsp} approved the connection`, { reach: ["connection_approved"], detail: `Approval ${s("number")}, export limit ${limit} kW${lower ? " — lower than the inverter size; savings re-checked" : ""}` });
        return { ok: true };
      }

      // Stage 6 — bills, quote, order, delivery
      case "request_bills": {
        need("installer");
        j.bills.requestedAt = nowIso();
        await this.progress(j, p, "Energy bills requested", { kind: "message" });
        await this.notify(j, "customer", "please upload your last 2–4 energy bills in My Project.", p);
        return { ok: true };
      }
      case "upload_bill": {
        need("customer", "installer");
        const b = { retailer: s("retailer") || "Unknown retailer", nmi: s("nmi") || undefined, tariff: s("tariff") || "Flat", dailyKwh: Number(input.dailyKwh ?? 0), feedInCents: input.feedInCents != null ? Number(input.feedInCents) : undefined, period: s("period") || "" };
        j.bills.items.push(b);
        if (!j.retailer) j.retailer = { name: b.retailer };
        if (b.nmi && !j.site.nmi) j.site.nmi = b.nmi;
        // Savings re-run on real usage (simple model: self-use share of output at the bill's rate band).
        const yearly = b.dailyKwh * 365;
        j.bills.savingsBefore = j.selection.savingsPerYear;
        j.bills.savingsAfter = Math.round(Math.min(yearly, j.selection.annualOutputKwh) * (j.selection.battery ? 0.32 : 0.27));
        await this.progress(j, p, `Energy bill received (${b.retailer})`, { reach: ["bills_received"], detail: `${b.dailyKwh} kWh/day · ${b.tariff}`, kind: "file" });
        return { savingsBefore: j.bills.savingsBefore, savingsAfter: j.bills.savingsAfter };
      }
      case "confirm_quote": {
        need("installer");
        requires("bills_received");
        const changes = ((input.changes as string[] | undefined) ?? []).map((c) => String(c).slice(0, 200)).filter(Boolean);
        const newPrice = input.newPrice != null ? Number(input.newPrice) : j.selection.price;
        if (!changes.length && newPrice === j.selection.price) {
          await this.progress(j, p, "Quote confirmed — no changes after the bills", { reach: ["quote_final"] });
          return { ok: true };
        }
        const sig = await this.requestSignature(j, "quote_revision", `Quote revision ${j.quoteVersion + 1}`, revisionHtml(j, changes, newPrice), { who: "customer", id: j.customerId ?? j.leadId, name: j.customerName, phone: j.customerPhone });
        j.revisions.push({ version: j.quoteVersion + 1, at: nowIso(), changes, price: newPrice, status: "sent", signatureId: sig.id });
        await this.progress(j, p, `Quote revision ${j.quoteVersion + 1} sent for acceptance`, { detail: changes.join("; ") });
        await this.notify(j, "customer", "your quote changed after checking your bills. Please review and accept it in My Project.", p);
        return { signatureId: sig.id };
      }
      case "place_order": {
        need("installer");
        requires("quote_final");
        if (j.order.status !== "draft") throw new JobError("Already ordered", 409);
        j.order = { ...j.order, status: "placed", placedAt: nowIso(), ref: `SO-${await this.counter("order")}` };
        await this.progress(j, p, `Equipment ordered from the EasyLink warehouse (${j.order.ref})`, { audience: "related", kind: "record" });
        return { order: j.order };
      }
      case "pay_order": {
        need("installer");
        if (j.order.status !== "placed") throw new JobError("Place the order first", 409);
        j.order.status = "paid";
        j.order.paidAt = nowIso();
        // Serials are scanned into the order at picking; the warehouse system fills them in.
        if (!j.order.serials.length) j.order.serials = allocateSerials(j);
        await this.progress(j, p, "Equipment paid and being picked", { reach: ["equipment_paid"] });
        return { order: j.order };
      }
      case "book_delivery": {
        need("installer");
        requires("equipment_paid", "install_date_set");
        const window = s("window") || `${fmtDay(addDays(j.installDates!.day1, -1))}, 7 am – 11 am`;
        j.delivery = { status: "booked", carrier: s("carrier") || "EasyLink truck", window, bookedAt: nowIso() };
        await this.progress(j, p, `Delivery booked: ${window}`, { kind: "booking" });
        await this.notify(j, "customer", `your equipment arrives ${window}.`, p);
        return { delivery: j.delivery };
      }
      case "mark_delivered": {
        need("installer");
        if (j.delivery.status !== "booked") throw new JobError("Book the delivery first", 409);
        j.delivery = { ...j.delivery, status: "delivered", pod: { at: nowIso(), note: s("note") || "Delivered and signed for" } };
        await this.progress(j, p, "Equipment delivered", { reach: ["delivered"], detail: j.delivery.pod!.note, kind: "booking" });
        return { delivery: j.delivery };
      }

      // Stage 7 — on site
      case "check_in": {
        need("installer");
        requires("delivered", "connection_approved");
        const day = (Number(input.day) === 2 ? 2 : 1) as 1 | 2;
        if ((input.lat == null || input.lng == null) && v.who !== "staff") throw new JobError("Turn on location for this site so the check-in can be recorded.", 400);
        const lat = Number(input.lat ?? j.site.lat);
        const lng = Number(input.lng ?? j.site.lng);
        const km = haversine(lat, lng, j.site.lat, j.site.lng);
        if (km > 0.5) throw new JobError(`You're ${km.toFixed(1)} km from the site. Check in when you arrive.`, 409);
        j.onsite.checkins.push({ day, at: nowIso(), lat, lng });
        await this.progress(j, p, `${j.installerName ?? "Installer"} arrived (day ${day})`, { reach: day === 1 ? ["install_started"] : [], kind: "booking" });
        if (day === 1) await this.notify(j, "customer", `${j.installerName ?? "your installer"} has arrived.`, p);
        return { ok: true };
      }
      case "tick": {
        need("installer");
        const item = j.onsite.checklist.find((i) => i.key === s("key"));
        if (!item) throw new JobError("Unknown checklist item");
        item.done = input.done !== false;
        item.at = nowIso();
        await this.save(j);
        return { item };
      }
      case "scan_serial": {
        need("installer");
        const serial = s("serial").toUpperCase();
        if (!serial) throw new JobError("Scan or type a serial");
        if (j.onsite.scanned.some((x) => x.serial === serial)) throw new JobError("Already scanned", 409);
        const hit = j.order.serials.find((x) => x.serial === serial);
        const used = ((await this.c.store.listRecords("job")) as unknown as Job[]).some((o) => o.id !== j.id && o.onsite.scanned.some((x) => x.serial === serial));
        j.onsite.scanned.push({ kind: hit?.kind ?? ((s("kind") || "panel") as "panel"), serial, matched: !!hit && !used, at: nowIso() });
        await this.save(j);
        if (!hit) throw new JobError(`${serial} isn't on this job's order. Check the box or call the warehouse.`, 409);
        if (used) throw new JobError(`${serial} is already recorded on another job.`, 409);
        return { ok: true, scanned: j.onsite.scanned.length, expected: j.order.serials.length };
      }
      case "record_tests": {
        need("installer");
        const t = input as Record<string, unknown>;
        j.onsite.tests = {
          insulationMOhm: Number(t.insulationMOhm),
          vocPerString: ((t.vocPerString as number[] | undefined) ?? []).map(Number),
          iscPerString: ((t.iscPerString as number[] | undefined) ?? []).map(Number),
          earthOk: !!t.earthOk,
          exportLimitKw: Number(t.exportLimitKw ?? j.connection.approval?.exportLimitKw ?? 0),
          csipTest: (["passed", "failed", "not_required"].includes(String(t.csipTest)) ? t.csipTest : "not_required") as "passed",
          at: nowIso(),
        };
        if (j.connection.approval && j.onsite.tests.exportLimitKw > j.connection.approval.exportLimitKw) throw new JobError(`Export limit is above the approved ${j.connection.approval.exportLimitKw} kW`, 409);
        await this.save(j);
        return { tests: j.onsite.tests };
      }
      case "complete_install": {
        need("installer");
        requires("install_started");
        const missing = [
          ...j.onsite.checklist.filter((i) => !i.done).map((i) => i.label),
          ...(j.onsite.tests ? [] : ["Test results"]),
          ...(j.onsite.tests && j.onsite.tests.insulationMOhm < 1 ? ["Insulation resistance below 1 MΩ"] : []),
          ...(j.order.serials.length && j.order.serials.some((x) => !j.onsite.scanned.some((y) => y.serial === x.serial && y.matched)) ? [`${j.order.serials.filter((x) => !j.onsite.scanned.some((y) => y.serial === x.serial)).length} serials not scanned`] : []),
        ];
        if (missing.length) throw new JobError(`Still to do: ${missing.slice(0, 4).join(", ")}${missing.length > 4 ? "…" : ""}`, 409);
        const sig = await this.requestSignature(j, "install_complete", "Installation complete", installCompleteHtml(j), { who: "customer", id: j.customerId ?? j.leadId, name: j.customerName, phone: j.customerPhone });
        j.onsite.customerSignatureId = sig.id;
        await this.save(j);
        return { signatureId: sig.id };
      }
      case "send_site_docs": {
        need("installer");
        requires("installed");
        let status = "sent";
        if (j.customerId && meta.token) {
          const r = await this.c.actions
            .run({ name: "start_workflow", input: { workflow: "job_completion_pack", inputs: { about: { type: "customer", id: j.customerId } } }, principal: p, auth: { token: meta.token }, user: meta.user })
            .catch((e: Error) => ({ status: "failed", error: e.message }));
          status = String((r as { status?: string }).status ?? "sent");
        }
        await this.progress(j, p, "Site documents sent to the customer and retailer", { reach: ["site_docs_sent"], detail: status === "proposed" ? "First send to this retailer waits for an EasyLink OK" : undefined, kind: "message" });
        return { status };
      }

      // Stage 8 — STCs and handover
      case "send_stc_pack": {
        need("installer");
        requires("installed");
        this.computeStc(j);
        const fails = j.stc.checks.filter((c) => !c.ok);
        if (fails.length) {
          await this.save(j);
          throw new JobError(`Fix before sending: ${fails.map((f) => f.label).join(", ")}`, 409);
        }
        const sig = await this.requestSignature(j, "stc_assignment", "STC assignment form", stcAssignmentHtml(j), { who: "customer", id: j.customerId ?? j.leadId, name: j.customerName, phone: j.customerPhone });
        j.stc.status = "sent_for_signature";
        j.stc.signatureId = sig.id;
        await this.progress(j, p, "STC pack sent to the customer to sign", { detail: `${j.stc.solar + j.stc.battery} STCs`, kind: "message" });
        await this.notify(j, "customer", "please sign your STC assignment form in My Project.", p);
        return { signatureId: sig.id };
      }
      case "lodge_stc": {
        need("installer");
        requires("stc_pack_signed");
        j.stc.status = "lodged";
        j.stc.agentRef = s("agentRef") || `STC-${await this.counter("stc")}`;
        j.stc.lodgedAt = nowIso();
        await this.progress(j, p, `STCs lodged with the agent (${j.stc.agentRef})`, { reach: ["stc_lodged"], detail: "Validation usually takes 4–6 weeks" });
        return { agentRef: j.stc.agentRef };
      }
      case "send_handover": {
        need("installer");
        requires("final_paid", "stc_pack_signed");
        const sigs = (await this.signatures(j.id)).filter((x) => x.status === "signed");
        const invs = (await this.invoices(j.id)).filter((i) => i.status !== "draft");
        j.handover = {
          sentAt: nowIso(),
          documents: [
            ...sigs.map((x) => `${x.title} (signed)`),
            ...invs.map((i) => `${i.kind === "credit" ? "Adjustment note" : "Tax invoice"} ${i.number}`),
            "Manufacturer warranties with serials",
            "Workmanship warranty certificate",
            "Certificate of electrical safety",
            "Single-line diagram",
            "Commissioning and test results",
            "User manuals and shutdown procedure",
            "Maintenance schedule",
            "Monitoring app guide",
          ],
        };
        if (j.customerEmail)
          await this.c.messaging.sendEmail({ to: j.customerEmail, subject: "Your solar handover pack", body: `Hi ${j.customerName.split(" ")[0]},\n\nEverything for your new system is in My Project → Everything:\n\n- ${j.handover.documents.join("\n- ")}\n\n${j.seller.name}` }).catch(() => undefined);
        await this.progress(j, p, `Handover pack sent (${j.handover.documents.length} documents)`, { reach: ["handover_sent"], kind: "message" });
        return { handover: j.handover };
      }

      // Stage 9 — monitoring
      case "link_monitoring": {
        need("installer");
        j.monitoring.provider = s("provider") || j.monitoring.provider;
        j.monitoring.linkedAt = nowIso();
        await this.progress(j, p, `Monitoring linked (${j.monitoring.provider})`);
        return { ok: true };
      }
      case "record_reading": {
        need("staff");
        const d = { date: s("date") || nowIso().slice(0, 10), kwh: Number(input.kwh), expectedKwh: Number(input.expectedKwh), online: input.online !== false, faults: ((input.faults as string[] | undefined) ?? []).map(String) };
        j.monitoring.days = [...j.monitoring.days.filter((x) => x.date !== d.date), d].sort((a, b) => a.date.localeCompare(b.date));
        const issues = siteWatch(d);
        for (const t of issues) j.monitoring.issues.push({ at: nowIso(), text: t, status: "open" });
        const clear = j.monitoring.days.length >= 3 && j.monitoring.days.slice(-3).every((x) => !siteWatch(x).length) && !j.monitoring.issues.some((i) => i.status === "open");
        await this.progress(j, p, `Day ${j.monitoring.days.length}: ${d.kwh} kWh (${Math.round((d.kwh / Math.max(d.expectedKwh, 0.1)) * 100)}% of expected)${issues.length ? ` — ${issues.join("; ")}` : ""}`, {
          reach: clear ? ["monitoring_clear"] : [],
          kind: issues.length ? "warning" : "record",
        });
        if (clear) j.phase = "MAINTENANCE_AND_MONITORING";
        await this.save(j);
        return { issues };
      }
      case "resolve_issue": {
        need("installer");
        const i = Number(input.index);
        if (!j.monitoring.issues[i]) throw new JobError("Unknown issue");
        j.monitoring.issues[i].status = "fixed";
        await this.progress(j, p, `Fixed: ${j.monitoring.issues[i].text}`);
        return { ok: true };
      }
      default:
        throw new JobError(`Unknown step: ${action}`, 404);
    }
  }

  private async offerWindows(j: Job) {
    // Three two-day windows from 12 business days after the deposit (DNSP approval + delivery lead time).
    const out: Job["windows"] = [];
    let d = new Date(Date.now() + 12 * 864e5);
    while (out.length < 3) {
      const a = new Date(d);
      const b = new Date(d.getTime() + 864e5);
      if (a.getUTCDay() >= 1 && a.getUTCDay() <= 4) out.push({ id: newId("win_"), day1: a.toISOString().slice(0, 10), day2: b.toISOString().slice(0, 10) });
      d = new Date(d.getTime() + (a.getUTCDay() >= 1 && a.getUTCDay() <= 4 ? 7 : 1) * 864e5);
    }
    j.windows = out;
    await this.save(j);
  }

  computeStc(j: Job) {
    const date = j.onsite.completeAt ?? j.installDates?.day2 ?? nowIso();
    j.stc.deemingYears = deemingYears(date);
    j.stc.batteryFactor = batteryFactor(date);
    j.stc.solar = solarStcs(j.selection.kw, j.site.zoneRating, date);
    j.stc.battery = j.selection.battery ? batteryStcs(j.selection.battery.usableKwh, date) : 0;
    const scanned = (k: string) => j.onsite.scanned.filter((x) => x.kind === k && x.matched).length;
    const expected = (k: string) => j.order.serials.filter((x) => x.kind === k).length;
    j.stc.deadline = addDays(date, 365).slice(0, 10);
    j.stc.checks = [
      { label: "Every panel serial scanned on the product", ok: expected("panel") > 0 && scanned("panel") >= expected("panel"), detail: `${scanned("panel")} of ${expected("panel")}` },
      { label: "Inverter serial scanned", ok: scanned("inverter") >= expected("inverter") && expected("inverter") > 0 },
      ...(j.selection.battery ? [{ label: "Battery serial and safety labels", ok: scanned("battery") >= expected("battery") && !!j.onsite.checklist.find((i) => i.key === "battery_labels")?.done }] : []),
      { label: "Installer on-site photo, geotagged", ok: j.onsite.checkins.length > 0 },
      { label: "Customer signed installation complete", ok: !!j.milestones.installed },
      { label: "Zone rating confirmed for the postcode", ok: j.site.zoneConfirmed, detail: `${j.site.postcode}: ${j.site.zoneRating}` },
      { label: "Inside the 12-month creation window", ok: nowIso().slice(0, 10) <= j.stc.deadline, detail: `by ${j.stc.deadline}` },
    ];
    if (j.stc.status === "not_started") j.stc.status = "ready";
  }

  private async afterSigned(j: Job, sig: Signature, p: Principal) {
    switch (sig.kind) {
      case "agreement": {
        await this.progress(j, p, "Agreement signed", { reach: ["agreement_signed"], kind: "file" });
        // The deposit invoice is drafted for the installer to check and send.
        await this.createInvoice(j, { kind: "system", id: "jobs", roles: [], on_behalf_of: null }, { kind: "deposit", lines: this.depositLines(j), via: "auto" });
        await this.notify(j, "installer", "signed the agreement. The deposit invoice is ready to send.", p);
        break;
      }
      case "quote_revision": {
        const r = j.revisions.find((x) => x.signatureId === sig.id);
        if (r) {
          r.status = "accepted";
          j.selection.price = r.price;
          j.quoteVersion = r.version;
        }
        await this.progress(j, p, `Quote revision ${j.quoteVersion} accepted`, { reach: ["quote_final"], kind: "file" });
        break;
      }
      case "install_complete": {
        j.onsite.completeAt = nowIso();
        j.phase = "COMMISSIONING";
        this.computeStc(j);
        await this.progress(j, p, "Installation complete — signed by the customer", { reach: ["installed"], kind: "file" });
        const paid = (await this.invoices(j.id)).filter((i) => i.kind === "deposit").reduce((t, i) => t + i.payments.reduce((x, y) => x + y.amount, 0), 0);
        await this.createInvoice(j, { kind: "system", id: "jobs", roles: [], on_behalf_of: null }, { kind: "final", lines: this.finalLines(j, paid), via: "auto" });
        break;
      }
      case "stc_assignment": {
        j.stc.status = "signed";
        await this.progress(j, p, "STC assignment signed", { reach: ["stc_pack_signed"], kind: "file" });
        await this.notify(j, "installer", "signed the STC assignment. You can lodge it now.", p);
        break;
      }
    }
  }
}

export function siteWatch(d: { kwh: number; expectedKwh: number; online: boolean; faults: string[] }): string[] {
  const out: string[] = [];
  if (!d.online) out.push("Inverter offline for part of the day — check Wi-Fi");
  if (d.expectedKwh > 0 && d.kwh < 0.8 * d.expectedKwh) out.push(`Output ${Math.round((d.kwh / d.expectedKwh) * 100)}% of expected — check strings and shading`);
  for (const f of d.faults) out.push(`Fault: ${f}`);
  return out;
}

function haversine(a1: number, o1: number, a2: number, o2: number) {
  const r = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(r(a2 - a1) / 2) ** 2 + Math.cos(r(a1)) * Math.cos(r(a2)) * Math.sin(r(o2 - o1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "Australia/Sydney" });
}

function allocateSerials(j: Job): Job["order"]["serials"] {
  const base = j.id.replace(/[^A-Z0-9]/gi, "").slice(-4).toUpperCase();
  return [
    ...Array.from({ length: j.selection.panels.count }, (_, i) => ({ kind: "panel" as const, serial: `JKM${base}${String(i + 1).padStart(4, "0")}` })),
    { kind: "inverter" as const, serial: `INV${base}0001` },
    ...(j.selection.battery ? [{ kind: "battery" as const, serial: `BAT${base}0001` }] : []),
  ];
}

export function newJob(input: {
  leadId: string;
  customerId: string | null;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  seller: Job["seller"];
  site: Job["site"];
  selection: Job["selection"];
  dnsp: string;
  at?: string;
}): Job {
  const at = input.at ?? nowIso();
  const s = input.selection;
  return {
    id: input.leadId,
    leadId: input.leadId,
    customerId: input.customerId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    installerId: null,
    seller: input.seller,
    site: input.site,
    selection: s,
    quoteVersion: 1,
    revisions: [],
    milestones: { design_selected: { at, by: input.customerId ?? input.leadId } },
    photos: { items: ["Meter", "Switchboard", "Roof from the street", "Inverter and battery location"].map((label) => ({ label, ok: false })) },
    depositPercent: 10,
    windows: [],
    connection: { dnsp: input.dnsp, status: "draft" },
    bills: { items: [] },
    order: {
      status: "draft",
      lines: [
        { sku: "PNL", name: `${s.panels.model} ${s.panels.watts} W`, qty: s.panels.count, unit: 0 },
        { sku: "INV", name: s.inverter.model, qty: 1, unit: 0 },
        ...(s.battery ? [{ sku: "BAT", name: s.battery.model, qty: 1, unit: 0 }] : []),
        { sku: "MNT", name: "Rails, clamps and roof hooks (tin roof)", qty: 1, unit: 0 },
        { sku: "BOS", name: "Isolators, DC cable, conduit and labels", qty: 1, unit: 0 },
      ],
      serials: [],
    },
    delivery: { status: "none" },
    onsite: { checkins: [], checklist: CHECKLIST.filter((c) => s.battery || !c.key.startsWith("battery")).map((c) => ({ ...c })), scanned: [] },
    stc: { status: "not_started", solar: solarStcs(s.kw, input.site.zoneRating, at), battery: s.battery ? batteryStcs(s.battery.usableKwh, at) : 0, batteryFactor: batteryFactor(at), deemingYears: deemingYears(at), checks: [] },
    handover: { documents: [] },
    monitoring: { provider: s.inverter.model.split(" ")[0] ?? "Inverter cloud", days: [], issues: [] },
    phase: "DESIGN_AND_PERMISSIONS",
    createdAt: at,
    updatedAt: at,
  };
}
