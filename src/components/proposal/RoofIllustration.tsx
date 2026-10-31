/**
 * The customer's own roof, drawn flat from above (2D): every face shaded
 * by the way it faces, the hips and ridges, and each panel where the
 * designer placed it — in the style of the proposal design (navy, sun in
 * the north). Below the house: the battery on the wall and an electric car
 * charging from the sun. Vector, so it stays sharp at any size and in the PDF.
 */
import { fitToBox, orientForBox, type RoofDrawing } from "@/lib/proposal/roofGeometry";

const mix = (a: number[], b: number[], t: number) =>
  `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;

const DARK_FACE = [44, 60, 86];
const LIGHT_FACE = [110, 134, 174];

type Props = {
  roof: RoofDrawing;
  width: number;
  height: number;
  /** Draw the home battery on the wall (charging). */
  battery?: boolean;
  /** Draw an electric car charging in the driveway. */
  ev?: boolean;
};

/** An electric car seen from above, nose to the left, `len` px long. */
function Car({ x, y, len }: { x: number; y: number; len: number }) {
  const w = len * 0.46;
  const r = w * 0.32;
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={len / 2 + 3} cy={w / 2 + 4} rx={len / 2} ry={w / 2} fill="#050A14" opacity="0.45" />
      {/* Wheels */}
      {[0.2, 0.78].map((t) => (
        <g key={t}>
          <rect x={len * t - 7} y={-3} width={14} height={7} rx={2} fill="#0B0F17" />
          <rect x={len * t - 7} y={w - 4} width={14} height={7} rx={2} fill="#0B0F17" />
        </g>
      ))}
      <rect x={0} y={0} width={len} height={w} rx={r} fill="url(#ev-body)" stroke="#CBD5E1" strokeWidth={1} />
      {/* Windscreen, roof glass, rear window */}
      <path d={`M${len * 0.26} ${w * 0.14} L${len * 0.38} ${w * 0.2} L${len * 0.38} ${w * 0.8} L${len * 0.26} ${w * 0.86} Q${len * 0.21} ${w / 2} ${len * 0.26} ${w * 0.14} Z`} fill="#0E1A2E" />
      <rect x={len * 0.4} y={w * 0.2} width={len * 0.32} height={w * 0.6} rx={w * 0.14} fill="#16243A" />
      <path d={`M${len * 0.74} ${w * 0.2} L${len * 0.84} ${w * 0.16} Q${len * 0.88} ${w / 2} ${len * 0.84} ${w * 0.84} L${len * 0.74} ${w * 0.8} Z`} fill="#0E1A2E" />
      {/* Headlights */}
      <rect x={2} y={w * 0.12} width={4} height={w * 0.18} rx={2} fill="#E0F2FE" />
      <rect x={2} y={w * 0.7} width={4} height={w * 0.18} rx={2} fill="#E0F2FE" />
      {/* Charge port, on the side facing the house */}
      <circle cx={len * 0.86} cy={1.5} r={3} fill="#FFD60A" />
    </g>
  );
}

function Bolt({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill="#FFD60A" />
      <path d={`M${r * 0.15} ${-r * 0.62} L${-r * 0.42} ${r * 0.1} L${-r * 0.02} ${r * 0.1} L${-r * 0.18} ${r * 0.62} L${r * 0.42} ${-r * 0.12} L${r * 0.02} ${-r * 0.12} Z`} fill="#0B1426" />
    </g>
  );
}

export function RoofIllustration({ roof: drawing, width, height, battery = false, ev = false }: Props) {
  const pad = Math.max(24, Math.min(width, height) * 0.07);
  const extras = battery || ev;
  // The yard below the house, for the battery and the car.
  const yardH = extras ? Math.round(height * 0.27) : 0;
  const roofH = height - yardH;
  // Turned to fill its frame (landscape in a wide frame); the north arrow turns with it.
  const roof = orientForBox(drawing, width - 2 * pad, roofH - 2 * pad);
  const { toPx, scale } = fitToBox(roof, width, roofH, pad);
  const path = (ring: { x: number; y: number }[]) =>
    ring.map((p, i) => {
      const q = toPx(p);
      return `${i === 0 ? "M" : "L"}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
    }).join(" ") + " Z";
  const sh = Math.max(3, 0.45 * scale);
  const cellLine = scale > 18;

  // Where the house's wall (its lowest roof edge) meets the yard.
  const roofPx = roof.faces.flatMap((f) => f.ring.map(toPx));
  const wallY = Math.max(...roofPx.map((p) => p.y));
  const left = Math.min(...roofPx.map((p) => p.x));
  const right = Math.max(...roofPx.map((p) => p.x));
  const yardTop = Math.min(roofH, wallY + 10);
  const carLen = Math.min(150, width * 0.2);
  const carX = Math.min(width - carLen - 70, Math.max(left + (right - left) * 0.42, width * 0.42));
  const carY = yardTop + (height - yardTop) * 0.5 - (carLen * 0.46) / 2;
  const chargerX = carX + carLen * 0.86;
  const battX = Math.min(right - 40, Math.max(left + 20, carX - 70));

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
        <linearGradient id="ev-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F8FAFC" />
          <stop offset="0.5" stopColor="#E2E8F0" />
          <stop offset="1" stopColor="#94A3B8" />
        </linearGradient>
        <radialGradient id="roof-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF3B0" />
          <stop offset="0.55" stopColor="#FFD60A" />
          <stop offset="1" stopColor="#FFD60A" stopOpacity="0" />
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width={width} height={height} fill="url(#roof-ground)" />
      <circle cx={width - 70} cy={58} r={46} fill="url(#roof-sun)" />

      {extras ? (
        /* Driveway */
        <rect x={Math.max(0, carX - 40)} y={yardTop} width={Math.min(width, carLen + 120)} height={height - yardTop} fill="#2A3B55" opacity="0.7" />
      ) : null}

      {/* House shadow */}
      <g transform={`translate(${sh} ${sh})`} opacity="0.4">
        {roof.faces.map((f, i) => (
          <path key={`s${i}`} d={path(f.ring)} fill="#070D18" />
        ))}
      </g>

      {/* Roof faces, flat from above, lit from the north */}
      {roof.faces.map((f, i) => (
        <path key={`f${i}`} d={path(f.ring)} fill={mix(DARK_FACE, LIGHT_FACE, f.light)} stroke="#A9BCD8" strokeWidth={1.4} strokeLinejoin="round" />
      ))}

      {/* Panels */}
      {roof.panels.map((c, i) => {
        const q = c.map(toPx);
        const d = `M${q.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L")} Z`;
        const mid1 = { x: (q[0].x + q[3].x) / 2, y: (q[0].y + q[3].y) / 2 };
        const mid2 = { x: (q[1].x + q[2].x) / 2, y: (q[1].y + q[2].y) / 2 };
        return (
          <g key={`p${i}`}>
            <path d={d} fill="url(#roof-panel)" stroke="#7FA2DA" strokeWidth={1.1} strokeLinejoin="round" />
            {cellLine ? <line x1={mid1.x} y1={mid1.y} x2={mid2.x} y2={mid2.y} stroke="#3B5A8C" strokeWidth={0.7} /> : null}
          </g>
        );
      })}

      {/* Battery on the wall, full and glowing */}
      {battery ? (
        <g transform={`translate(${battX} ${wallY + 4})`}>
          <rect x={0} y={0} width={30} height={46} rx={6} fill="#E8EEF6" stroke="#FFFFFF" strokeWidth={1.5} />
          <rect x={6} y={8} width={18} height={32} rx={3} fill="#1E2F47" />
          <rect x={6} y={14} width={18} height={26} rx={3} fill="#FFD60A" filter="url(#glow)" />
          <path d="M16 18 L11 28 L15 28 L13 36 L19 25 L15 25 Z" fill="#0B1426" />
        </g>
      ) : null}

      {/* Wall charger and an electric car charging */}
      {ev ? (
        <g>
          <rect x={chargerX - 7} y={wallY + 4} width={14} height={20} rx={3} fill="#0B1426" stroke="#CBD5E1" strokeWidth={1} />
          <circle cx={chargerX} cy={wallY + 10} r={2.5} fill="#22C55E" />
          <path
            d={`M${chargerX} ${wallY + 24} C ${chargerX + 4} ${wallY + 40}, ${chargerX - 2} ${carY - 14}, ${chargerX} ${carY + 1}`}
            fill="none"
            stroke="#FFD60A"
            strokeWidth={2.5}
            strokeLinecap="round"
            filter="url(#glow)"
          />
          <Car x={carX} y={carY} len={carLen} />
          <Bolt x={carX + carLen * 0.55} y={carY + carLen * 0.23} r={11} />
        </g>
      ) : null}

      {/* North arrow */}
      <g transform={`translate(${width - 40} ${height - 44})`}>
        <circle r="18" fill="#0B1426" stroke="#9FB2D0" strokeWidth="1" />
        {/* Screen y runs down, so a counter-clockwise turn of the roof is a negative SVG rotation. */}
        <g transform={`rotate(${-roof.rotationDeg})`}>
          <path d="M0 -13 L5 2 L0 -1 L-5 2 Z" fill="#FFD60A" />
          <text x="0" y="12" textAnchor="middle" fontSize="8" fill="#FFFFFF" fontFamily="Arial, sans-serif">N</text>
        </g>
      </g>
    </svg>
  );
}
