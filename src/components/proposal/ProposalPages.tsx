/**
 * The customer proposal: ten A4 pages (794 × 1123 px), from the design
 * approved on the EasyLink Proposal canvas.
 *
 * The same components draw the on-screen preview and, rasterised, the PDF —
 * so what the customer previews is what they download. Inline styles only:
 * html2canvas copies computed styles, and Tailwind classes would tie the PDF
 * to the site's stylesheet.
 *
 * Elements carrying `data-pdf-link` become clickable links in the PDF.
 */
import type { CSSProperties, ReactNode } from "react";

import {
  COMPANY,
  PREPARED_BY,
  formatAud,
  formatKwh,
  type ProposalDocument,
} from "@/lib/proposal/proposalDocument";

export const PAGE_W = 794;
export const PAGE_H = 1123;

export type ProposalImages = {
  logo: string | null;
  roof: string | null;
  portalQr: string | null;
  referralQr: string | null;
};

const C = {
  navy: "#0B1426",
  panel: "#13233C",
  sun: "#FFD60A",
  ink: "#0F172A",
  body: "#334155",
  muted: "#475569",
  mutedOnDark: "#C9D4E5",
  line: "#E2E8F0",
  soft: "#F1F5F9",
  softer: "#F8FAFC",
  border: "#CBD5E1",
};

const DISPLAY = "var(--font-source-sans), 'Source Sans 3', 'Source Sans Pro', Arial, sans-serif";
const BODY = "var(--font-inter), Inter, Arial, sans-serif";

const page = (dark: boolean): CSSProperties => ({
  width: PAGE_W,
  height: PAGE_H,
  boxSizing: "border-box",
  background: dark ? C.navy : "#FFFFFF",
  color: dark ? "#FFFFFF" : C.ink,
  fontFamily: BODY,
  display: "flex",
  flexDirection: "column",
  padding: "44px 56px 36px 56px",
  position: "relative",
  overflow: "hidden",
  flex: "0 0 auto",
});

const eyebrow = (dark = false): CSSProperties => ({
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  color: dark ? C.mutedOnDark : C.muted,
});

const h2 = (dark = false): CSSProperties => ({
  margin: "8px 0 0 0",
  fontFamily: DISPLAY,
  fontWeight: 900,
  fontSize: 44,
  lineHeight: 1.05,
  color: dark ? "#FFFFFF" : C.navy,
});

const h3: CSSProperties = {
  margin: 0,
  fontFamily: DISPLAY,
  fontWeight: 700,
  fontSize: 22,
  color: C.navy,
};

const big = (size: number, color?: string): CSSProperties => ({
  fontFamily: DISPLAY,
  fontWeight: 900,
  fontSize: size,
  lineHeight: 1.1,
  color,
});

const chip: CSSProperties = {
  background: C.soft,
  borderRadius: 999,
  padding: "7px 12px",
  fontSize: 13,
};

function Logo({ src, size }: { src: string | null; size: number }) {
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" style={{ width: size, height: size, display: "block" }} />;
}

function Header({ doc, images, dark = false }: { doc: ProposalDocument; images: ProposalImages; dark?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 18,
        borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.16)" : C.line}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Logo src={images.logo} size={30} />
        <b style={{ fontFamily: DISPLAY, fontSize: 17 }}>{COMPANY.name}</b>
      </div>
      <div style={{ fontSize: 12, color: dark ? C.mutedOnDark : C.muted }}>
        Proposal for {doc.firstName} · {doc.quoteRef}
      </div>
    </div>
  );
}

function Footer({ n, children, dark = false }: { n: number; children?: ReactNode; dark?: boolean }) {
  return (
    <div
      style={{
        marginTop: "auto",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 20,
        paddingTop: 16,
        borderTop: `1px solid ${dark ? "rgba(255,255,255,0.16)" : C.line}`,
        fontSize: 12,
        color: dark ? C.mutedOnDark : C.muted,
      }}
    >
      <span>{children}</span>
      <span>{n}</span>
    </div>
  );
}

function Qr({ src, size, label }: { src: string | null; size: number; label: string }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 4,
        boxSizing: "border-box",
        flex: "0 0 auto",
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} style={{ width: "100%", height: "100%", display: "block" }} />
      ) : null}
    </span>
  );
}

function RoofImage({ src, height, label }: { src: string | null; height: number; label: string }) {
  return (
    <div
      style={{
        borderRadius: 20,
        overflow: "hidden",
        background: "#1B2A3F",
        height,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        <span style={{ color: C.mutedOnDark, fontSize: 14 }}>Your roof, from your design</span>
      )}
    </div>
  );
}

function Tick() {
  return (
    <span
      style={{
        flex: "0 0 22px",
        height: 22,
        borderRadius: "50%",
        background: C.sun,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700,
        color: C.navy,
      }}
    >
      ✓
    </span>
  );
}

const years = (y: number | null) => (y == null ? "—" : `${y.toLocaleString("en-AU", { maximumFractionDigits: 1 })} years`);

/* 1 · Cover */
function Cover({ doc, images }: PageProps) {
  const third =
    doc.batteryKwh > 0
      ? { v: `${doc.batteryKwh} kWh`, l: "battery for the evening" }
      : { v: `${doc.panelCount}`, l: "panels on your roof" };
  return (
    <section style={{ ...page(true), padding: 0 }}>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -260,
          right: -220,
          width: 640,
          height: 640,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,214,10,0.38) 0%, rgba(246,138,10,0.16) 40%, rgba(11,20,38,0) 70%)",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "48px 56px 0 56px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Logo src={images.logo} size={44} />
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 22 }}>{COMPANY.name}</div>
        </div>
        <div style={{ fontSize: 13, color: C.mutedOnDark, textAlign: "right", lineHeight: 1.5 }}>
          Quote {doc.quoteRef}
          <br />
          Prepared {doc.preparedOn}
        </div>
      </div>

      <div style={{ padding: "52px 56px 0 56px", position: "relative" }}>
        <div
          style={{
            display: "inline-block",
            background: "rgba(255,214,10,0.14)",
            color: C.sun,
            borderRadius: 999,
            padding: "7px 14px",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          {doc.batteryKwh > 0 ? "Your solar + battery design" : "Your solar design"}
        </div>
        <h1 style={{ margin: "20px 0 0 0", fontFamily: DISPLAY, fontWeight: 900, fontSize: 56, lineHeight: 1.03, letterSpacing: -1 }}>
          {doc.firstName}, run your home on <span style={{ color: C.sun }}>free sunshine</span>. Get paid for the rest.
        </h1>
        <p style={{ margin: "16px 0 0 0", fontSize: 18, lineHeight: 1.5, color: C.mutedOnDark, maxWidth: 600 }}>
          Your bill drops from {formatAud(doc.billBefore)} to about {formatAud(doc.billAfter)} a {doc.billPeriodLabel}
          {doc.exportIncome > 0 ? `, and your spare power earns you ${formatAud(doc.exportIncome)} a year` : ""}.
          {doc.address ? ` Designed for ${doc.address}.` : ""}
        </p>
      </div>

      <div style={{ margin: "30px 56px 0 56px", position: "relative" }}>
        <RoofImage src={images.roof} height={400} label="Your roof with the panels placed" />
        <div style={{ position: "absolute", left: 18, bottom: 18, display: "flex", gap: 10 }}>
          <div style={{ background: "rgba(11,20,38,0.86)", borderRadius: 12, padding: "10px 14px", fontSize: 13, lineHeight: 1.35 }}>
            <b style={{ fontSize: 16, color: C.sun }}>{doc.panelCount} panels</b>
            <br />
            placed on your roof
          </div>
          <div style={{ background: "rgba(11,20,38,0.86)", borderRadius: 12, padding: "10px 14px", fontSize: 13, lineHeight: 1.35 }}>
            <b style={{ fontSize: 16, color: C.sun }}>{doc.systemKw} kW</b>
            <br />
            of solar
          </div>
        </div>
      </div>

      <div style={{ margin: "24px 56px 0 56px", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
        {[
          { v: `${formatAud(doc.yearlyGain)}`, l: "better off every year" },
          third,
          { v: years(doc.paybackYears), l: "to pay for itself" },
        ].map((s) => (
          <div key={s.l} style={{ background: C.panel, borderRadius: 16, padding: "16px 18px" }}>
            <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 30 }}>{s.v}</div>
            <div style={{ fontSize: 13, color: C.mutedOnDark, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "auto", padding: "0 56px 44px 56px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24 }}>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: C.mutedOnDark }}>
          Prepared by <b style={{ color: "#FFFFFF" }}>{PREPARED_BY.name}</b>
          <br />
          {PREPARED_BY.phone} · {PREPARED_BY.email}
        </div>
        <a
          href={doc.links.portalUrl}
          data-pdf-link={doc.links.portalUrl}
          style={{ display: "flex", alignItems: "center", gap: 14, background: C.sun, color: C.navy, textDecoration: "none", borderRadius: 16, padding: "10px 10px 10px 18px" }}
        >
          <span style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>
            Open your design
            <br />
            <span style={{ fontWeight: 500, fontSize: 12 }}>Scan or tap · change it any time</span>
          </span>
          <Qr src={images.portalQr} size={68} label="QR code to your design" />
        </a>
      </div>
    </section>
  );
}

/* 2 · Free energy */
function FreeEnergy({ doc, images }: PageProps) {
  return (
    <section style={page(false)}>
      <Header doc={doc} images={images} />
      <div style={{ ...eyebrow(), marginTop: 32 }}>Free energy</div>
      <h2 style={h2()}>Run your home on free sunshine. Get paid for the rest.</h2>

      <div style={{ marginTop: 24, background: C.navy, color: "#FFFFFF", borderRadius: 22, padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: C.mutedOnDark }}>Your roof makes each year</div>
            <div style={big(44, C.sun)}>{formatKwh(doc.generationKwh)}</div>
          </div>
          <div style={{ fontSize: 13, color: C.mutedOnDark, textAlign: "right", maxWidth: 220 }}>
            Free power from the sun. Nobody sends you a bill for it.
          </div>
        </div>
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px 18px" }}>
            <div style={{ ...eyebrow(true), fontSize: 12 }}>Used in your home</div>
            <div style={{ ...big(34), marginTop: 2 }}>{formatKwh(doc.usedAtHomeKwh)}</div>
            <div style={{ fontSize: 13, color: C.mutedOnDark }}>
              {doc.batteryKwh > 0 ? "straight from the panels by day, from the battery at night" : "straight from the panels while the sun is up"}
            </div>
            <div style={{ marginTop: 10, fontSize: 15 }}>
              You stop buying <b style={{ color: C.sun }}>{formatAud(doc.powerNotBought)}</b> of power
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px 18px" }}>
            <div style={{ ...eyebrow(true), fontSize: 12 }}>Sold to the grid</div>
            <div style={{ ...big(34), marginTop: 2 }}>{formatKwh(doc.exportedKwh)}</div>
            <div style={{ fontSize: 13, color: C.mutedOnDark }}>
              what the house{doc.batteryKwh > 0 ? " and battery" : ""} don&apos;t need
            </div>
            <div style={{ marginTop: 10, fontSize: 15 }}>
              You earn <b style={{ color: C.sun }}>{formatAud(doc.exportIncome)}</b> a year
            </div>
          </div>
        </div>
      </div>

      <h3 style={{ ...h3, margin: "24px 0 10px 0" }}>Free power runs all of this</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 13, fontWeight: 600 }}>
        {["Air conditioning", "Fridge and freezer", "Hot water", "Washer and dryer", "Dishwasher", "Oven and cooktop", "Pool pump", "TV, lights and wifi", "Electric car"].map((t) => (
          <span key={t} style={{ background: C.soft, borderRadius: 999, padding: "8px 13px" }}>
            {t}
          </span>
        ))}
      </div>

      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 20, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, color: C.muted }}>Your power bill, each {doc.billPeriodLabel}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 6 }}>
            <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 30, color: C.muted, textDecoration: "line-through" }}>{formatAud(doc.billBefore)}</span>
            <span aria-hidden="true" style={{ fontSize: 22, color: C.muted }}>→</span>
            <span style={big(44, C.navy)}>{formatAud(doc.billAfter)}</span>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: C.body, marginTop: 6 }}>
            Your export credits help pay the daily supply charge. No more bill shock.
          </div>
        </div>
        <div style={{ background: C.sun, color: C.navy, borderRadius: 20, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Your yearly gain</div>
          <div style={{ ...big(44), marginTop: 4 }}>{formatAud(doc.yearlyGain)}</div>
          <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 4 }}>
            {formatAud(doc.powerNotBought)} of power you no longer buy, plus {formatAud(doc.exportIncome)} of export income.
          </div>
        </div>
      </div>

      {doc.batteryKwh > 0 ? (
        <div style={{ marginTop: 14, background: C.soft, borderRadius: 16, padding: "14px 18px", fontSize: 13, lineHeight: 1.5, color: C.body }}>
          <b style={{ color: C.ink }}>Earn more with a virtual power plant.</b> Your battery can sell to the grid when prices spike, for extra income on top. Ask us how.
        </div>
      ) : null}

      <Footer n={2}>Export income at a 5c a kWh feed-in rate. Feed-in rates vary by retailer.</Footer>
    </section>
  );
}

/* 3 · At a glance */
function AtAGlance({ doc, images }: PageProps) {
  const tiles = [
    { dark: true, l: "You save each year", v: formatAud(doc.yearlyGain), s: `${formatAud(doc.powerNotBought)} less power bought + ${formatAud(doc.exportIncome)} export income` },
    { l: "Your price after rebates", v: doc.price != null ? formatAud(doc.price) : "—", s: "including GST and installation" },
    { l: "Pays for itself in", v: years(doc.paybackYears), s: doc.paybackYears != null ? `then keeps saving for ${Math.max(0, Math.round(25 - doc.paybackYears))}+ more` : "" },
    { l: "Free power used in your home", v: `${doc.selfPoweredPct}%`, s: "of everything your home uses" },
  ];
  const included = [
    doc.panelLine + ` · ${doc.systemKw} kW`,
    ...(doc.inverterLine ? [doc.inverterLine] : []),
    ...(doc.batteryLine ? [doc.batteryLine] : []),
    ...doc.equipment.filter((e) => e.category === "evCharger" || e.category === "heatPump").map((e) => `${e.title} (${e.detail})`),
    "Installation, network approval and switch-on",
    "App to watch your system live",
  ];
  return (
    <section style={page(false)}>
      <Header doc={doc} images={images} />
      <div style={{ ...eyebrow(), marginTop: 36 }}>At a glance</div>
      <h2 style={h2()}>Most of your power, from your own roof.</h2>

      <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
        {tiles.map((t) => (
          <div key={t.l} style={{ background: t.dark ? C.navy : C.soft, color: t.dark ? "#FFFFFF" : C.ink, borderRadius: 20, padding: "22px 24px" }}>
            <div style={{ fontSize: 13, color: t.dark ? C.mutedOnDark : C.muted }}>{t.l}</div>
            <div style={big(48, t.dark ? C.sun : undefined)}>{t.v}</div>
            <div style={{ fontSize: 13, color: t.dark ? C.mutedOnDark : C.muted }}>{t.s}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 30, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 28 }}>
        <div>
          <h3 style={{ ...h3, marginBottom: 12 }}>What&apos;s included</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14, lineHeight: 1.45 }}>
            {included.map((t) => (
              <div key={t} style={{ display: "flex", gap: 10 }}>
                <Tick />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 style={{ ...h3, marginBottom: 12 }}>Why this design</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14, lineHeight: 1.5, color: C.body }}>
            <p style={{ margin: 0 }}>
              <b style={{ color: C.ink }}>Sized to your bill.</b> Your {formatAud(doc.billBefore)} {doc.billPeriodLabel}ly bill points to about {Math.round(doc.consumptionKwh / 365)} kWh a day.
            </p>
            {doc.batteryKwh > 0 ? (
              <p style={{ margin: 0 }}>
                <b style={{ color: C.ink }}>Battery for the evening.</b> That&apos;s when peak rates hit. Your {doc.batteryKwh} kWh battery covers it.
              </p>
            ) : (
              <p style={{ margin: 0 }}>
                <b style={{ color: C.ink }}>Battery-ready.</b> Add a battery later to use your solar after dark.
              </p>
            )}
            <p style={{ margin: 0 }}>
              <b style={{ color: C.ink }}>Placed on your real roof.</b> Every panel is set out on your roof faces, clear of edges and vents.
            </p>
          </div>
        </div>
      </div>

      <Footer n={3}>Figures estimated from your bill and NSW tariffs. Final design confirmed at your site check.</Footer>
    </section>
  );
}

/* 4 · Your roof design */
function RoofDesign({ doc, images }: PageProps) {
  const rows: [string, string][] = [
    ["Panels", `${doc.panelCount}`],
    ["System size", `${doc.systemKw} kW`],
    ["Layout", doc.panelOrientation === "landscape" ? "Landscape" : "Portrait"],
    ...(doc.roofAreaM2 ? ([["Roof area traced", `${doc.roofAreaM2} m²`]] as [string, string][]) : []),
    ["Makes each year", formatKwh(doc.generationKwh)],
  ];
  return (
    <section style={page(false)}>
      <Header doc={doc} images={images} />
      <div style={{ ...eyebrow(), marginTop: 36 }}>Your roof design</div>
      <h2 style={h2()}>Every panel placed on your actual roof.</h2>
      <p style={{ margin: "12px 0 0 0", fontSize: 15, lineHeight: 1.55, color: C.body, maxWidth: 600 }}>
        We traced each face of your roof from close-up aerial images, then checked it against Google&apos;s 3D roof data.
      </p>

      <div style={{ marginTop: 24 }}>
        <RoofImage src={images.roof} height={470} label="Roof plan with the panels placed" />
      </div>

      <table style={{ marginTop: 22, width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
        <tbody>
          {rows.map(([k, v], i) => (
            <tr key={k}>
              <td style={{ padding: "10px 0", borderBottom: i < rows.length - 1 ? `1px solid ${C.line}` : "none", color: C.muted }}>{k}</td>
              <td style={{ padding: "10px 0", borderBottom: i < rows.length - 1 ? `1px solid ${C.line}` : "none", textAlign: "right", fontWeight: 700 }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        {["100 mm clear of every roof line", "Panels kept inside one face", "Clear of vents and whirlybirds", "Rows aligned"].map((t) => (
          <span key={t} style={chip}>
            {t}
          </span>
        ))}
      </div>

      <Footer n={4}>Final layout confirmed at your site check</Footer>
    </section>
  );
}

/* 5 · Your system */
function YourSystem({ doc, images }: PageProps) {
  const parts = [
    {
      label: "Solar panels",
      title: doc.panelLine,
      text: `Makes about ${formatKwh(doc.generationKwh)} a year${doc.batteryKwh > 0 ? ", enough to run your home and charge the battery" : ""}.`,
      tags: ["25-year performance", `${doc.systemKw} kW`],
    },
    ...(doc.inverterLine
      ? [
          {
            label: doc.batteryKwh > 0 ? "Hybrid inverter" : "Inverter",
            title: doc.inverterLine,
            text: doc.batteryKwh > 0 ? "Runs the panels and the battery together." : "Turns your panels' power into power your home uses. Battery-ready.",
            tags: [doc.phase === 3 ? "Three phase" : doc.phase === 1 ? "Single phase" : "Sized to your roof"],
          },
        ]
      : []),
    ...(doc.batteryLine
      ? [
          {
            label: "Battery",
            title: doc.batteryLine,
            text: "Stores your spare daytime solar for the evening peak. Add more later if you need it.",
            tags: ["Rebate eligible"],
          },
        ]
      : []),
    ...doc.equipment
      .filter((e) => e.category === "evCharger" || e.category === "heatPump")
      .map((e) => ({ label: e.label, title: e.title, text: e.category === "evCharger" ? "Charge your car from your own sunshine." : "Hot water heated with your own solar.", tags: [e.detail] })),
  ];
  return (
    <section style={page(false)}>
      <Header doc={doc} images={images} />
      <div style={{ ...eyebrow(), marginTop: 36 }}>Your system</div>
      <h2 style={h2()}>{parts.length === 2 ? "Two parts" : parts.length === 3 ? "Three parts" : "Every part"}, one smart system.</h2>

      <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 14 }}>
        {parts.slice(0, 4).map((p) => (
          <div key={p.label + p.title} style={{ background: C.softer, border: `1px solid ${C.line}`, borderRadius: 20, padding: "20px 22px" }}>
            <div style={{ ...eyebrow(), fontSize: 12 }}>{p.label}</div>
            <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 26, marginTop: 2 }}>{p.title}</div>
            <p style={{ margin: "6px 0 0 0", fontSize: 14, lineHeight: 1.5, color: C.body }}>{p.text}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 10, fontSize: 12, fontWeight: 600 }}>
              {p.tags.map((t, i) => (
                <span key={t} style={{ background: i === 0 ? C.navy : C.line, color: i === 0 ? "#FFFFFF" : C.ink, borderRadius: 999, padding: "5px 10px" }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 22, background: C.navy, color: "#FFFFFF", borderRadius: 20, padding: "20px 24px", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
        {[
          ["25 yrs", "panel performance"],
          ["10 yrs", "inverter"],
          [doc.batteryKwh > 0 ? "10 yrs" : "—", doc.batteryKwh > 0 ? "battery" : "add a battery any time"],
        ].map(([v, l]) => (
          <div key={l}>
            <div style={big(30, C.sun)}>{v}</div>
            <div style={{ fontSize: 12, color: C.mutedOnDark }}>{l}</div>
          </div>
        ))}
      </div>

      <Footer n={5}>Typical manufacturer warranties. Exact terms come with your installation documents.</Footer>
    </section>
  );
}

/* 6 · Your savings */
function Savings({ doc, images }: PageProps) {
  const maxBill = Math.max(doc.annualBillBefore, 1);
  const maxMonth = Math.max(1, ...doc.months.map((m) => Math.max(m.solarPerDay, m.usePerDay)));
  const maxCum = Math.max(1, ...doc.cumulative.map((c) => Math.abs(c.value)));
  return (
    <section style={page(false)}>
      <Header doc={doc} images={images} />
      <div style={{ ...eyebrow(), marginTop: 36 }}>Your savings</div>
      <h2 style={h2()}>
        {doc.savings25Years > 0 ? `${formatAud(doc.savings25Years)} back in your pocket over 25 years.` : "Your savings, year by year."}
      </h2>

      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
        <div style={{ background: C.soft, borderRadius: 20, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, color: C.muted }}>Your yearly power bill</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 22, height: 170, marginTop: 14 }}>
            {[
              { v: doc.annualBillBefore, l: "Today", c: "#94A3B8" },
              { v: doc.annualBillAfter, l: doc.batteryKwh > 0 ? "With solar + battery" : "With solar", c: C.sun },
            ].map((b) => (
              <div key={b.l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{formatAud(b.v)}</div>
                <div style={{ width: 76, height: Math.max(8, Math.round((b.v / maxBill) * 120)), borderRadius: "10px 10px 0 0", background: b.c }} />
                <div style={{ fontSize: 12, color: C.muted }}>{b.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: C.navy, color: "#FFFFFF", borderRadius: 20, padding: "20px 22px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, color: C.mutedOnDark }}>Your gain in year one</div>
            <div style={big(56, C.sun)}>{formatAud(doc.yearlyGain)}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, fontSize: 13, color: C.mutedOnDark }}>
            <div>
              <b style={{ display: "block", fontSize: 22, color: "#FFFFFF" }}>{formatAud(doc.powerNotBought)}</b>power you no longer buy
            </div>
            <div>
              <b style={{ display: "block", fontSize: 22, color: "#FFFFFF" }}>+{formatAud(doc.exportIncome)}</b>export income
            </div>
          </div>
        </div>
      </div>

      <h3 style={{ ...h3, margin: "26px 0 4px 0" }}>Sun made vs power used, each month</h3>
      <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.muted }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: C.sun }} />
          Solar made (kWh a day)
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: "#94A3B8" }} />
          Your home uses
        </span>
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 4, alignItems: "flex-end" }}>
        {doc.months.map((m) => (
          <div key={m.label} style={{ flex: "1 1 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ height: 150, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 3 }}>
              <div style={{ width: 14, borderRadius: "4px 4px 0 0", background: C.sun, height: Math.round((m.solarPerDay / maxMonth) * 150) }} />
              <div style={{ width: 14, borderRadius: "4px 4px 0 0", background: "#94A3B8", height: Math.round((m.usePerDay / maxMonth) * 150) }} />
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>{m.label}</div>
          </div>
        ))}
      </div>

      <h3 style={{ ...h3, margin: "24px 0 4px 0" }}>Savings add up</h3>
      <div style={{ fontSize: 12, color: C.muted }}>Your total gain after paying for the system</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 190, marginTop: 8 }}>
        {doc.cumulative.map((c) => (
          <div key={c.label} style={{ flex: "1 1 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{formatAud(c.value)}</div>
            <div
              style={{
                width: 56,
                height: Math.max(6, Math.round((Math.abs(c.value) / maxCum) * 140)),
                borderRadius: "8px 8px 0 0",
                background: c.value >= 0 ? C.sun : "#CBD5E1",
              }}
            />
            <div style={{ fontSize: 12, color: C.muted }}>{c.label}</div>
          </div>
        ))}
      </div>

      <Footer n={6}>Estimate from your bill, NSW tariffs and 3% yearly price rises. Your retailer&apos;s rates may differ.</Footer>
    </section>
  );
}

/* 7 · Day and night */
function DayNight({ doc, images }: PageProps) {
  const pill = (t: string, kind: "sun" | "white" | "ghost") => (
    <span
      style={{
        background: kind === "sun" ? C.sun : kind === "white" ? "#FFFFFF" : "rgba(255,255,255,0.16)",
        color: kind === "ghost" ? "#FFFFFF" : C.ink,
        borderRadius: 12,
        padding: "10px 12px",
      }}
    >
      {t}
    </span>
  );
  const arrow = <span aria-hidden="true" style={{ color: C.sun, fontSize: 20 }}>→</span>;
  const note = (t: string) => <span style={{ fontSize: 13, fontWeight: 500, color: C.mutedOnDark }}>{t}</span>;
  const hasBattery = doc.batteryKwh > 0;
  const rows: { time: string; sub: string; flow: ReactNode }[] = [
    {
      time: "7 am – 3 pm",
      sub: "Sun is up",
      flow: (
        <>
          {pill("Panels", "sun")}
          {arrow}
          {pill("Home", "white")}
          {hasBattery ? pill("Battery fills", "white") : null}
          {pill("Spare sold to grid · you earn", "ghost")}
        </>
      ),
    },
    {
      time: "3 – 9 pm",
      sub: "Peak prices",
      flow: hasBattery ? (
        <>
          {pill("Battery", "white")}
          {arrow}
          {pill("Home", "white")}
          {note("You skip the peak rate")}
        </>
      ) : (
        <>
          {pill("Grid", "white")}
          {arrow}
          {pill("Home", "white")}
          {note("A battery would cover this")}
        </>
      ),
    },
    {
      time: "9 pm – 7 am",
      sub: "Overnight",
      flow: (
        <>
          {pill(hasBattery ? "Battery, then grid" : "Grid", "white")}
          {arrow}
          {pill("Home", "white")}
          {note(hasBattery ? "Topped up from the grid only if needed" : "Usually the lowest-use part of the day")}
        </>
      ),
    },
  ];
  return (
    <section style={page(true)}>
      <Header doc={doc} images={images} dark />
      <div style={{ ...eyebrow(true), marginTop: 36 }}>A day in your home</div>
      <h2 style={h2(true)}>
        Sun by day. <span style={{ color: C.sun }}>{hasBattery ? "Battery by night." : "Battery-ready for night."}</span>
      </h2>

      <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 14 }}>
        {rows.map((r) => (
          <div key={r.time} style={{ display: "flex", gap: 20, alignItems: "center", background: "rgba(255,255,255,0.07)", borderRadius: 20, padding: "20px 22px" }}>
            <div style={{ flex: "0 0 132px" }}>
              <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 24, color: C.sun }}>{r.time}</div>
              <div style={{ fontSize: 13, color: C.mutedOnDark }}>{r.sub}</div>
            </div>
            <div style={{ flex: "1 1 auto", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>{r.flow}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
        <div style={{ background: C.sun, color: C.navy, borderRadius: 20, padding: "22px 24px" }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 26, lineHeight: 1.15 }}>
            {hasBattery ? "Backup for blackouts" : "Add a battery any time"}
          </div>
          <p style={{ margin: "8px 0 0 0", fontSize: 14, lineHeight: 1.5 }}>
            {hasBattery
              ? "Your battery can keep the fridge, lights and wifi running when the street goes dark. We set up backup at your install."
              : "Your system is battery-ready, so you can add one later and claim the federal battery discount."}
          </p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 20, padding: "22px 24px" }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 26, lineHeight: 1.15 }}>Watch it on your phone</div>
          <p style={{ margin: "8px 0 0 0", fontSize: 14, lineHeight: 1.5, color: C.mutedOnDark }}>
            See what your roof is making{hasBattery ? ", what's in the battery" : ""} and what you&apos;ve saved, live.
          </p>
        </div>
      </div>

      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
        {[
          [`${doc.co2TonnesYear} t`, "less CO₂ a year"],
          [`${doc.selfPoweredPct}%`, "of your home runs on free power"],
          [`${doc.co2Tonnes25} t`, "CO₂ avoided over 25 years"],
        ].map(([v, l]) => (
          <div key={l}>
            <div style={big(36, C.sun)}>{v}</div>
            <div style={{ fontSize: 13, color: C.mutedOnDark }}>{l}</div>
          </div>
        ))}
      </div>

      <Footer n={7} dark>
        Times follow typical NSW time-of-use periods. CO₂ at the NSW grid rate.
      </Footer>
    </section>
  );
}

/* 8 · Your options */
function Options({ doc, images }: PageProps) {
  return (
    <section style={page(false)}>
      <Header doc={doc} images={images} />
      <div style={{ ...eyebrow(), marginTop: 36 }}>Your options</div>
      <h2 style={h2()}>Pick the one that fits your home.</h2>

      {doc.options.length > 0 ? (
        <div style={{ marginTop: 34, display: "grid", gridTemplateColumns: `repeat(${doc.options.length}, minmax(0, 1fr))`, gap: 12, alignItems: "stretch" }}>
          {doc.options.map((o) => {
            const dark = o.isDesign;
            const mut = dark ? C.mutedOnDark : C.muted;
            return (
              <div
                key={o.key}
                style={{
                  background: dark ? C.navy : "#FFFFFF",
                  color: dark ? "#FFFFFF" : C.ink,
                  border: dark ? "none" : `1px solid ${C.border}`,
                  borderRadius: 20,
                  padding: "26px 18px 22px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  position: "relative",
                }}
              >
                {dark ? (
                  <div style={{ position: "absolute", top: -13, left: 18, background: C.sun, color: C.navy, borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 700 }}>
                    Your design
                  </div>
                ) : null}
                <div>
                  <div style={{ ...eyebrow(dark), fontSize: 12 }}>{o.label}</div>
                  <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 22, marginTop: 4 }}>{o.isDesign ? (o.batteryKwh > 0 ? "Power all evening" : "Start saving") : o.title}</div>
                </div>
                <div style={big(36, dark ? C.sun : undefined)}>{formatAud(o.price)}</div>
                <div style={{ fontSize: 13, lineHeight: 1.55, color: mut }}>
                  {doc.systemKw} kW solar
                  <br />
                  {o.batteryKwh > 0 ? `${o.batteryKwh} kWh battery` : "Battery-ready"}
                </div>
                <div style={{ borderTop: `1px solid ${dark ? "rgba(255,255,255,0.16)" : C.line}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                  {[
                    ["Saves a year", formatAud(o.yearlySavings)],
                    ["Payback", years(o.paybackYears)],
                    ["Free power at home", `${o.selfPoweredPct}%`],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: mut }}>{k}</span>
                      <b>{v}</b>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ marginTop: 28, background: C.soft, borderRadius: 20, padding: "22px 24px", fontSize: 15, lineHeight: 1.55, color: C.body }}>
          Ask us to price a bigger or smaller battery for your home. We&apos;ll update your design and send you a new proposal.
        </div>
      )}

      <div style={{ marginTop: 26, background: C.soft, borderRadius: 20, padding: "20px 24px", display: "flex", gap: 18, alignItems: "center" }}>
        <div style={{ flex: "0 0 52px", height: 52, borderRadius: 14, background: C.sun, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0B1426" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: C.body }}>
          <b style={{ color: C.ink }}>Change anything in your design.</b> Swap the battery size, add an EV charger or move panels, and the price updates on the spot.
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 13, lineHeight: 1.55, color: C.muted }}>
        All prices include GST, installation and the federal rebates (solar STCs and the Cheaper Home Batteries discount), which we claim for you.
      </div>

      <Footer n={8}>Prices held until {doc.validUntil}</Footer>
    </section>
  );
}

/* 9 · Price and next step */
function Investment({ doc, images }: PageProps) {
  const lines: { label: string; value: string; green?: boolean }[] = [];
  if (doc.priceBeforeRebates != null) {
    lines.push({ label: "Panels, inverter" + (doc.batteryKwh > 0 ? ", battery" : "") + " and installation", value: formatAud(doc.priceBeforeRebates) });
    for (const r of doc.rebateLines) lines.push({ label: r.label, value: `−${formatAud(r.value)}`, green: true });
  }
  return (
    <section style={page(false)}>
      <Header doc={doc} images={images} />
      <div style={{ ...eyebrow(), marginTop: 32 }}>Your price</div>
      <h2 style={h2()}>Clear price. No surprises.</h2>

      <table style={{ marginTop: 20, width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
        <tbody>
          {lines.map((l) => (
            <tr key={l.label}>
              <td style={{ padding: "12px 0", borderBottom: `1px solid ${C.line}` }}>{l.label}</td>
              <td style={{ padding: "12px 0", borderBottom: `1px solid ${C.line}`, textAlign: "right", color: l.green ? "#15803D" : undefined, fontWeight: l.green ? 600 : 400 }}>{l.value}</td>
            </tr>
          ))}
          <tr>
            <td style={{ padding: "16px 0 4px 0" }}>
              <b style={{ fontFamily: DISPLAY, fontSize: 24 }}>You pay</b>
              {doc.gst != null ? <div style={{ fontSize: 12, color: C.muted }}>includes {formatAud(doc.gst)} GST</div> : null}
            </td>
            <td style={{ padding: "16px 0 4px 0", textAlign: "right" }}>
              <b style={{ fontFamily: DISPLAY, fontSize: 40, color: C.navy }}>{doc.price != null ? formatAud(doc.price) : "Price at site check"}</b>
            </td>
          </tr>
        </tbody>
      </table>

      <a
        href={doc.links.portalUrl}
        data-pdf-link={doc.links.portalUrl}
        style={{ marginTop: 22, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: C.navy, color: "#FFFFFF", textDecoration: "none", borderRadius: 18, padding: "18px 18px 18px 24px" }}
      >
        <span>
          <b style={{ display: "block", fontSize: 21, fontFamily: DISPLAY }}>Book your free site check</b>
          <span style={{ display: "block", marginTop: 4, fontSize: 13, lineHeight: 1.45, color: C.mutedOnDark }}>
            Scan to pick a time. Your design, price and documents are waiting for you online.
          </span>
          <span style={{ display: "block", marginTop: 8, fontSize: 13, fontWeight: 700, color: C.sun }}>{doc.links.portalLabel}</span>
        </span>
        <Qr src={images.portalQr} size={96} label="QR code to book your site check" />
      </a>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
        <div style={{ background: C.soft, borderRadius: 16, padding: "16px 18px", fontSize: 12, lineHeight: 1.45, color: C.muted }}>
          <div style={{ fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>Price held until</div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 24, color: C.ink, marginTop: 2 }}>{doc.validUntil}</div>
          <div>Rebates as at {doc.rebatesAsAt}. We recheck them before install.</div>
        </div>
        <div style={{ background: C.soft, borderRadius: 16, padding: "16px 18px", fontSize: 12, lineHeight: 1.45, color: C.muted }}>
          <div style={{ fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>Prefer paper?</div>
          <div style={{ fontSize: 14, color: C.ink, marginTop: 6 }}>Sign the acceptance form with your installer at the site check.</div>
        </div>
      </div>

      <h3 style={{ ...h3, margin: "24px 0 14px 0" }}>What happens next</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
        {[
          ["Site check", "We check your roof and switchboard. About 30 minutes."],
          ["Approval", "We apply to your electricity network for you."],
          ["Install day", "One or two days with an accredited, insured crew."],
          ["Switch on", "We set up your app and show you around."],
        ].map(([t, b], i) => (
          <div key={t}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.sun, color: C.navy, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{i + 1}</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginTop: 8 }}>{t}</div>
            <div style={{ fontSize: 12, lineHeight: 1.45, color: C.muted, marginTop: 2 }}>{b}</div>
          </div>
        ))}
      </div>

      <Footer n={9}>Proposal {doc.quoteRef} · Indicative until confirmed in writing after your site check.</Footer>
    </section>
  );
}

/* 10 · Back cover */
function BackCover({ doc, images }: PageProps) {
  return (
    <section style={{ ...page(true), padding: 56 }}>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: -300,
          left: -200,
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,214,10,0.30) 0%, rgba(246,138,10,0.12) 40%, rgba(11,20,38,0) 70%)",
        }}
      />
      <div style={{ ...eyebrow(true), position: "relative" }}>Why homeowners choose us</div>
      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14, position: "relative" }}>
        {[
          ["One team, start to finish", "Design, approval, install and aftercare, with one person you can call."],
          ["Designed, not guessed", "Every panel placed on your real roof, every number from your real bill."],
          ["Looked after for years", "We watch your system and tell you if anything drops off."],
          ["Local to Sydney", "Our team is based in Lidcombe and installs across NSW."],
        ].map(([t, b]) => (
          <div key={t} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 20, padding: "20px 22px" }}>
            <b style={{ fontFamily: DISPLAY, fontSize: 22 }}>{t}</b>
            <p style={{ margin: "6px 0 0 0", fontSize: 14, lineHeight: 1.5, color: C.mutedOnDark }}>{b}</p>
          </div>
        ))}
      </div>

      <a
        href={doc.links.referralUrl}
        data-pdf-link={doc.links.referralUrl}
        style={{ marginTop: 30, background: C.sun, color: C.navy, textDecoration: "none", borderRadius: 24, padding: "28px 30px", position: "relative", display: "flex", alignItems: "center", gap: 24 }}
      >
        <div style={{ flex: "1 1 auto", minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase" }}>Know someone with a sunny roof?</div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 38, lineHeight: 1.05, marginTop: 8 }}>Share your design. They get their own in two minutes.</div>
          <p style={{ margin: "10px 0 0 0", fontSize: 15, lineHeight: 1.5 }}>Your friend scans this code{doc.links.referralCode ? ", already linked to you" : ""}.</p>
          {doc.links.referralCode ? (
            <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 10, border: `2px solid ${C.navy}`, borderRadius: 12, padding: "8px 14px", fontSize: 14 }}>
              <span>Your referral code</span>
              <b style={{ fontFamily: DISPLAY, fontSize: 22, letterSpacing: 1 }}>{doc.links.referralCode}</b>
            </div>
          ) : null}
        </div>
        <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700 }}>
          <Qr src={images.referralQr} size={116} label="QR code for a friend" />
          For a friend
        </div>
      </a>

      <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, position: "relative" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Logo src={images.logo} size={52} />
            <b style={{ fontFamily: DISPLAY, fontSize: 28 }}>{COMPANY.name}</b>
          </div>
          <div style={{ marginTop: 14, fontSize: 14, lineHeight: 1.7, color: C.mutedOnDark }}>
            {COMPANY.address}
            <br />
            {COMPANY.phone} · {COMPANY.email}
            <br />
            {COMPANY.web}
          </div>
        </div>
        <a
          href={doc.links.portalUrl}
          data-pdf-link={doc.links.portalUrl}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textDecoration: "none", color: "#FFFFFF", fontSize: 12, fontWeight: 600 }}
        >
          <Qr src={images.portalQr} size={100} label="QR code to your design" />
          Open your design
        </a>
      </div>
    </section>
  );
}

type PageProps = { doc: ProposalDocument; images: ProposalImages };

export const PROPOSAL_PAGES = [Cover, FreeEnergy, AtAGlance, RoofDesign, YourSystem, Savings, DayNight, Options, Investment, BackCover];

/** All ten pages, stacked, each marked `data-proposal-page` for the PDF renderer. */
export function ProposalPages({ doc, images, gap = 24 }: PageProps & { gap?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap }}>
      {PROPOSAL_PAGES.map((Page, i) => (
        <div key={i} data-proposal-page={i + 1} style={{ width: PAGE_W, height: PAGE_H, flex: "0 0 auto", boxShadow: "0 8px 30px rgba(15,23,42,0.12)" }}>
          <Page doc={doc} images={images} />
        </div>
      ))}
    </div>
  );
}
