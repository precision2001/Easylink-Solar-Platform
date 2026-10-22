import type { Container } from "../container.js";
import type { Principal } from "../core/envelope.js";
import { JobService } from "../jobs/service.js";
import { MarketService } from "./service.js";

const staff: Principal = { kind: "staff", id: "usr_admin_1", roles: ["ADMIN"], on_behalf_of: null };
const sam: Principal = { kind: "installer", id: "usr_inst_1", roles: ["INSTALLER"], on_behalf_of: null };
const kim: Principal = { kind: "installer", id: "usr_inst_2", roles: ["INSTALLER"], on_behalf_of: null };

/** Demo Ready Sites, Ready Deals and one order, for local development. All names are invented. */
export async function seedMarket(c: Container) {
  const m = new MarketService(c, new JobService(c));
  const sys = (count: number, inv: number, hybrid: boolean, kwh?: number) => ({
    panels: { model: "AXITEC 440 W", watts: 440, count },
    inverter: { model: `${hybrid ? "FOXESS" : "Sungrow"} ${inv} kW${hybrid ? " hybrid" : ""}`, kw: inv, hybrid },
    battery: kwh ? { model: `${kwh} kWh stackable battery`, usableKwh: kwh } : undefined,
    extras: [],
  });
  const site = async (p: Principal, input: Record<string, unknown>, then: "publish" | "submit" | null) => {
    const s = await m.createSite(p, input);
    if (then === "publish") await m.siteAction(staff, s.id, "publish", {});
    if (then === "submit") await m.siteAction(p, s.id, "submit", { customerAgreed: true });
    return s;
  };
  await site(staff, { customer: { name: "Grace Liu", phone: "+61400000401", email: "grace@example.com", street: "21 Fern St" }, suburb: "Kellyville", state: "NSW", postcode: "2155", roof: "Tin", storeys: "Single", system: sys(15, 5, true, 10), contractValue: 21990, siteFee: 1500, confirmed: { payment: true, depositPaid: 2200, installation: true, windowFrom: "2026-11-09", windowTo: "2026-11-20" }, visibility: { area: "everyone", eliteHeadStartHours: 0 }, documents: [{ name: "Signed quote" }, { name: "Meter photo" }, { name: "Switchboard photo" }] }, "publish");
  await site(staff, { customer: { name: "Omar Haddad", phone: "+61400000402", street: "3 Lyra Pl" }, suburb: "Rouse Hill", state: "NSW", postcode: "2155", roof: "Tile", storeys: "Double", system: sys(23, 10, true, 20), contractValue: 32490, siteFee: 2200, confirmed: { payment: false, depositPaid: 0, installation: true, windowFrom: "2026-11-16", windowTo: "2026-11-27" }, visibility: { area: "everyone", eliteHeadStartHours: 24 }, documents: [{ name: "Site survey" }] }, "publish");
  await site(kim, { customer: { name: "Lucy Brennan", phone: "+61400000403", street: "9 Kurrajong Rd" }, suburb: "Hornsby", state: "NSW", postcode: "2077", roof: "Tin", storeys: "Single", system: sys(13, 5, false), contractValue: 8990, siteFee: 600, confirmed: { payment: true, depositPaid: 900, installation: false }, visibility: { area: "everyone", eliteHeadStartHours: 0 }, documents: [{ name: "Signed quote" }] }, "submit");

  const items = (count: number, inv: number, hybrid: boolean, kwh?: number) => [
    { category: "panel", model: "AXITEC 440 W panel", qty: count, watts: 440 },
    { category: "inverter", model: `${hybrid ? "FOXESS" : "Sungrow"} ${inv} kW${hybrid ? " hybrid" : ""} inverter`, qty: 1, kw: inv, hybrid },
    ...(kwh ? [{ category: "battery", model: `${kwh} kWh stackable battery`, qty: 1, usableKwh: kwh }] : []),
  ];
  const deal = async (p: Principal, input: Record<string, unknown>, then: "approve" | "submit" | null) => {
    const d = await m.createDeal(p, input);
    if (then) await m.dealAction(p, d.id, "submit", {});
    if (then === "approve") await m.dealAction(staff, d.id, "approve", {});
    return d;
  };
  const d1 = await deal(sam, { type: "solar_battery", title: "6.6 kW solar + 10 kWh battery, installed", description: "15 AXITEC 440 W panels, FOXESS 5 kW hybrid inverter and a 10 kWh battery. Standard installation on a single-storey tin or tile roof.", items: items(15, 5, true, 10), price: 14990, wasPrice: 16990, badge: "Spring deal", serviceAreas: "2145-2160, 2112-2122", quantity: 10, stockSource: "easylink", buildingTypes: ["house", "townhouse"], endsAt: "2026-12-24" }, "approve");
  await deal(sam, { type: "solar", title: "6.6 kW solar, installed", description: "15 AXITEC 440 W panels with a Sungrow 5 kW inverter.", items: items(15, 5, false), price: 4990, wasPrice: 5690, badge: "Best value", serviceAreas: "2145-2160", quantity: 20, stockSource: "own", buildingTypes: ["house"], endsAt: "2026-12-24" }, "approve");
  await deal(kim, { type: "battery", title: "Add a 10 kWh battery", items: [{ category: "inverter", model: "FOXESS 5 kW hybrid inverter", qty: 1, kw: 5, hybrid: true }, { category: "battery", model: "10 kWh stackable battery", qty: 1, usableKwh: 10 }], price: 6490, serviceAreas: "2070-2080, 2119-2121", quantity: 8, stockSource: "easylink", buildingTypes: ["house", "townhouse"] }, "submit");

  const order = await m.buyDeal(d1.id, { customer: { name: "Mei Chen", phone: "0412 345 678", email: "mei@example.com", street: "9 Banksia Ave", suburb: "Baulkham Hills", state: "NSW", postcode: "2153" }, owner: true, consent: true, terms: true, building: "house" });
  await m.payOrder(order.orderId, order.payToken);
}
