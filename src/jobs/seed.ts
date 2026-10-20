import type { Container } from "../container.js";
import type { Principal } from "../core/envelope.js";
import { JobService, newJob } from "./service.js";
import type { Job, Selection } from "./model.js";

/**
 * Demo jobs at different stages, built by running the real steps (so the demo
 * is also an end-to-end check of the journey). All names and numbers are invented.
 */
const P = (kind: Principal["kind"], id: string): Principal => ({ kind, id, roles: [], on_behalf_of: null });
export const DEMO = {
  staff: P("staff", "usr_admin_1"),
  sam: P("installer", "usr_inst_1"),
  daniel: P("customer", "usr_cust_1"),
  danielUser: { id: "usr_cust_1", email: "daniel@example.com", role: "CUSTOMER" },
};

const SELLER = { name: "Rivers Electrical (demo)", abn: "12 345 678 901", email: "accounts@riverselectrical.example", address: "4 Church St, Parramatta NSW 2150" };
const SELECTION = (kw: number, count: number, battery: Selection["battery"], price: number): Selection => ({
  designId: null,
  title: battery ? `Solar + ${battery.usableKwh} kWh battery` : "Solar only",
  kw,
  panels: { model: "Jinko Tiger Neo", count, watts: 440 },
  inverter: { model: battery ? "Sungrow SH5.0RS hybrid" : "Fronius Primo 5.0", kw: 5 },
  battery,
  accessories: battery ? [{ name: "Backup gateway", price: 1190 }] : [],
  price,
  annualOutputKwh: Math.round(kw * 1380),
  savingsPerYear: battery ? 2600 : 1650,
});

export async function seedJobs(c: Container) {
  const s = new JobService(c);
  const meta = { user: DEMO.danielUser };
  const run = (id: string, step: string, input: Record<string, unknown>, p: Principal) => s.act(id, step, input, p, p.kind === "customer" ? meta : {});
  const sign = async (id: string, signatureId: string, p: Principal, name: string) => {
    const r = (await run(id, "request_code", { signatureId }, p)) as { devCode?: string };
    await run(id, "sign", { signatureId, code: r.devCode, name }, p);
  };
  const prevMode = process.env.AI_MODE;
  process.env.AI_MODE = "local"; // dev codes and test card payments
  try {
    // A — Daniel: installed, final invoice and STC pack waiting for him, monitoring day 2.
    const a = newJob({
      leadId: "ld_0999",
      customerId: "cus_2001",
      customerName: "Daniel Okafor",
      customerEmail: "daniel@example.com",
      customerPhone: "+61400000301",
      seller: SELLER,
      site: { address: "7 Gum Tree Ct, Castle Hill NSW 2154", postcode: "2154", state: "NSW", lat: -33.7296, lng: 151.0053, phases: 1, zoneRating: 1.382, zoneConfirmed: true },
      selection: SELECTION(6.6, 15, { model: "Sungrow SBR128", usableKwh: 12.8 }, 17990),
      dnsp: "Endeavour Energy",
      at: "2026-09-22T03:00:00Z",
    });
    await s.save(a);
    const id = a.id;
    await run(id, "match", {}, DEMO.staff);
    await run(id, "accept_offer", {}, DEMO.sam);
    await run(id, "confirm_selection", { transcript: "Tell Sam I'm going ahead with the 6.6 kilowatt system, the 12.8 battery and the backup gateway." }, DEMO.daniel);
    await run(id, "request_photos", {}, DEMO.sam);
    for (const label of ["Meter", "Switchboard", "Roof from the street", "Inverter and battery location"]) await run(id, "upload_photo", { label, documentId: label === "Meter" ? "doc_1" : label === "Switchboard" ? "doc_2" : undefined }, DEMO.daniel);
    const acc = (await run(id, "accept_job", {}, DEMO.sam)) as { signatureId: string };
    await sign(id, acc.signatureId, DEMO.daniel, "Daniel Okafor");
    let invs = await s.invoices(id);
    await run(id, "send_invoice", { invoiceId: invs.find((i) => i.kind === "deposit")!.id }, DEMO.sam);
    await run(id, "pay_invoice", { invoiceId: invs.find((i) => i.kind === "deposit")!.id }, DEMO.daniel);
    const w = (await run(id, "propose_windows", { windows: [{ day1: "2026-10-15", day2: "2026-10-16" }, { day1: "2026-10-20", day2: "2026-10-21" }] }, DEMO.sam)) as { windows: Job["windows"] };
    await run(id, "pick_window", { windowId: w.windows[0]!.id }, DEMO.daniel);
    await run(id, "submit_connection", { reference: "EE-EG-284113" }, DEMO.sam);
    await run(id, "record_approval", { number: "EG-2026-55821", exportLimitKw: 5 }, DEMO.sam);
    await run(id, "request_bills", {}, DEMO.sam);
    await run(id, "upload_bill", { retailer: "Sunrise Power", nmi: "4310 0000 001", tariff: "Time of use", dailyKwh: 22, feedInCents: 5, period: "Jul–Sep 2026" }, DEMO.daniel);
    await run(id, "confirm_quote", {}, DEMO.sam);
    await run(id, "place_order", {}, DEMO.sam);
    await run(id, "pay_order", {}, DEMO.sam);
    await run(id, "book_delivery", { window: "Wed 14 Oct, 7 am – 11 am", carrier: "EasyLink truck" }, DEMO.sam);
    await run(id, "mark_delivered", { note: "8 pallets left in the carport, photo taken" }, DEMO.sam);
    await run(id, "check_in", { day: 1, lat: a.site.lat, lng: a.site.lng }, DEMO.sam);
    let j = (await s.get(id))!;
    for (const item of j.onsite.checklist) await run(id, "tick", { key: item.key }, DEMO.sam);
    for (const x of j.order.serials) await run(id, "scan_serial", { serial: x.serial }, DEMO.sam);
    await run(id, "check_in", { day: 2, lat: a.site.lat + 0.0002, lng: a.site.lng }, DEMO.sam);
    await run(id, "record_tests", { insulationMOhm: 180, vocPerString: [412, 409], iscPerString: [13.6, 13.5], earthOk: true, exportLimitKw: 5, csipTest: "passed" }, DEMO.sam);
    const done = (await run(id, "complete_install", {}, DEMO.sam)) as { signatureId: string };
    await sign(id, done.signatureId, DEMO.daniel, "Daniel Okafor");
    await run(id, "send_site_docs", {}, DEMO.sam);
    invs = await s.invoices(id);
    await run(id, "send_invoice", { invoiceId: invs.find((i) => i.kind === "final")!.id }, DEMO.sam);
    await run(id, "send_stc_pack", {}, DEMO.sam);
    await run(id, "link_monitoring", { provider: "Sungrow iSolarCloud" }, DEMO.sam);
    await run(id, "record_reading", { date: "2026-10-17", kwh: 31.4, expectedKwh: 30.2 }, DEMO.staff);
    await run(id, "record_reading", { date: "2026-10-18", kwh: 22.9, expectedKwh: 30.6, online: false }, DEMO.staff);

    // B — Tom: agreement signed, deposit invoice drafted for the installer to send.
    const b = newJob({
      leadId: "ld_1002",
      customerId: null,
      customerName: "Tom Becker",
      customerEmail: "tom@example.com",
      customerPhone: "+61400000202",
      seller: SELLER,
      site: { address: "4 Banksia Ave, Penrith NSW 2750", postcode: "2750", state: "NSW", lat: -33.7507, lng: 150.6877, phases: 1, zoneRating: 1.382, zoneConfirmed: true },
      selection: SELECTION(8.8, 20, null, 9890),
      dnsp: "Endeavour Energy",
      at: "2026-10-08T01:00:00Z",
    });
    await s.save(b);
    await run(b.id, "match", {}, DEMO.staff);
    await run(b.id, "accept_offer", {}, DEMO.sam);
    await run(b.id, "confirm_selection", {}, DEMO.staff);
    for (const label of ["Meter", "Switchboard"]) await run(b.id, "upload_photo", { label }, DEMO.staff);
    const bs = (await run(b.id, "accept_job", {}, DEMO.sam)) as { signatureId: string };
    await sign(b.id, bs.signatureId, DEMO.staff, "Tom Becker");

    // C — Priya: equipment delivered, installation tomorrow (the on-site checklist is ready).
    const cj = newJob({
      leadId: "ld_1001",
      customerId: null,
      customerName: "Priya Natarajan",
      customerEmail: "priya@example.com",
      customerPhone: "+61400000201",
      seller: SELLER,
      site: { address: "12 Wattle St, Blacktown NSW 2148", postcode: "2148", state: "NSW", lat: -33.771, lng: 150.9057, phases: 1, zoneRating: 1.382, zoneConfirmed: true },
      selection: SELECTION(6.6, 15, { model: "Sungrow SBR096", usableKwh: 9.6 }, 15990),
      dnsp: "Endeavour Energy",
      at: "2026-09-30T01:00:00Z",
    });
    await s.save(cj);
    for (const [step, input, p] of [
      ["match", {}, DEMO.staff],
      ["accept_offer", {}, DEMO.sam],
      ["confirm_selection", {}, DEMO.staff],
      ["upload_photo", { label: "Meter" }, DEMO.staff],
      ["upload_photo", { label: "Switchboard" }, DEMO.staff],
    ] as const)
      await run(cj.id, step, input, p);
    const cs = (await run(cj.id, "accept_job", {}, DEMO.sam)) as { signatureId: string };
    await sign(cj.id, cs.signatureId, DEMO.staff, "Priya Natarajan");
    const ci = (await s.invoices(cj.id)).find((i) => i.kind === "deposit")!;
    await run(cj.id, "send_invoice", { invoiceId: ci.id }, DEMO.sam);
    await run(cj.id, "record_payment", { invoiceId: ci.id, method: "EFT", ref: "CBA 22817" }, DEMO.staff);
    const cw = (await run(cj.id, "propose_windows", { windows: [{ day1: "2026-10-22", day2: "2026-10-23" }] }, DEMO.sam)) as { windows: Job["windows"] };
    await run(cj.id, "pick_window", { windowId: cw.windows[0]!.id }, DEMO.staff);
    await run(cj.id, "submit_connection", { reference: "EE-EG-284290" }, DEMO.sam);
    await run(cj.id, "record_approval", { number: "EG-2026-55902", exportLimitKw: 5 }, DEMO.sam);
    await run(cj.id, "upload_bill", { retailer: "Sunrise Power", tariff: "Flat", dailyKwh: 18, period: "Jul–Sep 2026" }, DEMO.staff);
    await run(cj.id, "confirm_quote", {}, DEMO.sam);
    await run(cj.id, "place_order", {}, DEMO.sam);
    await run(cj.id, "pay_order", {}, DEMO.sam);
    await run(cj.id, "book_delivery", { window: "Wed 21 Oct, 7 am – 11 am" }, DEMO.sam);
    await run(cj.id, "mark_delivered", { note: "Left in the garage as arranged" }, DEMO.sam);

    // D — Aisha: new design, offer waiting for Sam.
    const d = newJob({
      leadId: "ld_1004",
      customerId: null,
      customerName: "Aisha Rahman",
      customerEmail: "aisha@example.com",
      customerPhone: "+61400000204",
      seller: SELLER,
      site: { address: "19 Hezlett Rd, Kellyville NSW 2155", postcode: "2155", state: "NSW", lat: -33.6995, lng: 150.9603, phases: 1, zoneRating: 1.382, zoneConfirmed: true },
      selection: SELECTION(10.1, 23, { model: "Sungrow SBR160", usableKwh: 16 }, 22990),
      dnsp: "Endeavour Energy",
    });
    await s.save(d);
    await run(d.id, "match", {}, DEMO.staff);
  } finally {
    process.env.AI_MODE = prevMode;
  }
}
