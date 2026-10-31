/**
 * The customer's own roof, drawn: every face shaded by the way it faces,
 * the hips and ridges, and each panel where the designer placed it —
 * in the style of the proposal design (navy roof, sun in the north).
 * Vector, so it stays sharp at any size and in the PDF.
 */
import { fitToBox, type RoofDrawing } from "@/lib/proposal/roofGeometry";

const mix = (a: number[], b: number[], t: number) =>
  `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;

const DARK_FACE = [46, 62, 87];
const LIGHT_FACE = [92, 113, 150];

export function RoofIllustration({ roof, width, height }: { roof: RoofDrawing; width: number; height: number }) {
  const { toPx, scale } = fitToBox(roof, width, height, Math.max(28, Math.min(width, height) * 0.08));
  const path = (ring: { x: number; y: number }[]) =>
    ring.map((p, i) => {
      const q = toPx(p);
      return `${i === 0 ? "M" : "L"}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
    }).join(" ") + " Z";
  // Shadow cast to the south-east, about 0.6 m, like a mid-morning sun.
  const sh = Math.max(4, 0.6 * scale);
  const cellLine = scale > 18;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Your roof with every panel where the design places it" style={{ display: "block" }}>
      <defs>
        <linearGradient id="roof-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1E2F47" />
          <stop offset="1" stopColor="#16243A" />
        </linearGradient>
        <linearGradient id="roof-panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1B2E52" />
          <stop offset="0.55" stopColor="#0E1E3A" />
          <stop offset="1" stopColor="#0A1630" />
        </linearGradient>
        <radialGradient id="roof-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF3B0" />
          <stop offset="0.55" stopColor="#FFD60A" />
          <stop offset="1" stopColor="#FFD60A" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={width} height={height} fill="url(#roof-ground)" />
      <circle cx={width - 70} cy={58} r={46} fill="url(#roof-sun)" />

      {/* House shadow */}
      <g transform={`translate(${sh} ${sh})`} opacity="0.45">
        {roof.faces.map((f, i) => (
          <path key={`s${i}`} d={path(f.ring)} fill="#070D18" />
        ))}
      </g>

      {/* Roof faces, lit from the north */}
      {roof.faces.map((f, i) => (
        <path key={`f${i}`} d={path(f.ring)} fill={mix(DARK_FACE, LIGHT_FACE, f.light)} stroke="#9FB2D0" strokeWidth={1.4} strokeLinejoin="round" />
      ))}

      {/* Panels */}
      {roof.panels.map((c, i) => {
        const q = c.map(toPx);
        const d = `M${q.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L")} Z`;
        // A line across the middle of the long side reads as the cell grid at small sizes.
        const mid1 = { x: (q[0].x + q[3].x) / 2, y: (q[0].y + q[3].y) / 2 };
        const mid2 = { x: (q[1].x + q[2].x) / 2, y: (q[1].y + q[2].y) / 2 };
        return (
          <g key={`p${i}`}>
            <path d={d} fill="url(#roof-panel)" stroke="#7FA2DA" strokeWidth={1.1} strokeLinejoin="round" />
            {cellLine ? <line x1={mid1.x} y1={mid1.y} x2={mid2.x} y2={mid2.y} stroke="#3B5A8C" strokeWidth={0.7} /> : null}
          </g>
        );
      })}

      {/* North arrow */}
      <g transform={`translate(${width - 40} ${height - 44})`}>
        <circle r="18" fill="#0B1426" stroke="#9FB2D0" strokeWidth="1" />
        <path d="M0 -12 L5 3 L0 0 L-5 3 Z" fill="#FFD60A" />
        <text x="0" y="14" textAnchor="middle" fontSize="9" fill="#FFFFFF" fontFamily="Arial, sans-serif">N</text>
      </g>
    </svg>
  );
}
