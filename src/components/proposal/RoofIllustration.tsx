/**
 * The customer's own roof, drawn flat from above (2D): every face shaded
 * by the way it faces, the hips and ridges, and each panel where the
 * designer placed it — in the style of the proposal design (navy, sun in
 * the north). Below the house: the battery on the wall and an electric car
 * charging from the sun. Vector, so it stays sharp at any size and in the PDF.
 */
import { BATTERY_SIZE, EV_SIZE, fitToBox, orientForBox, type Placed, type RoofDrawing } from "@/lib/proposal/roofGeometry";

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

/**
 * An electric car seen from above, drawn in metres (4.8 × 1.95) with its
 * nose at the house end (local −x) and the charge port on the nose corner.
 */
function Car() {
  const L = EV_SIZE.length;
  const W = EV_SIZE.width;
  const x0 = -L / 2;
  const y0 = -W / 2;
  return (
    <g>
      <rect x={x0 + 0.12} y={y0 + 0.14} width={L} height={W} rx={0.6} fill="#050A14" opacity="0.45" />
      {[0.2, 0.78].map((t) => (
        <g key={t}>
          <rect x={x0 + L * t - 0.36} y={y0 - 0.1} width={0.72} height={0.3} rx={0.08} fill="#0B0F17" />
          <rect x={x0 + L * t - 0.36} y={y0 + W - 0.2} width={0.72} height={0.3} rx={0.08} fill="#0B0F17" />
        </g>
      ))}
      <rect x={x0} y={y0} width={L} height={W} rx={0.62} fill="url(#ev-body)" stroke="#CBD5E1" strokeWidth={0.05} />
      <path d={`M${x0 + L * 0.26} ${y0 + W * 0.14} L${x0 + L * 0.38} ${y0 + W * 0.2} L${x0 + L * 0.38} ${y0 + W * 0.8} L${x0 + L * 0.26} ${y0 + W * 0.86} Q${x0 + L * 0.21} 0 ${x0 + L * 0.26} ${y0 + W * 0.14} Z`} fill="#0E1A2E" />
      <rect x={x0 + L * 0.4} y={y0 + W * 0.2} width={L * 0.32} height={W * 0.6} rx={W * 0.14} fill="#16243A" />
      <path d={`M${x0 + L * 0.74} ${y0 + W * 0.2} L${x0 + L * 0.84} ${y0 + W * 0.16} Q${x0 + L * 0.88} 0 ${x0 + L * 0.84} ${y0 + W * 0.84} L${x0 + L * 0.74} ${y0 + W * 0.8} Z`} fill="#0E1A2E" />
      <rect x={x0 + 0.08} y={y0 + W * 0.12} width={0.18} height={W * 0.18} rx={0.08} fill="#E0F2FE" />
      <rect x={x0 + 0.08} y={y0 + W * 0.7} width={0.18} height={W * 0.18} rx={0.08} fill="#E0F2FE" />
    </g>
  );
}

/** The paved patch under the car, a little bigger than the car (m). */
function rectDriveway(car: Placed): { x: number; y: number }[] {
  const a = (car.angleDeg * Math.PI) / 180;
  const L = EV_SIZE.length + 1.2;
  const W = EV_SIZE.width + 1.0;
  const ux = { x: Math.cos(a), y: Math.sin(a) };
  const uy = { x: -Math.sin(a), y: Math.cos(a) };
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => ({ x: car.x + (i * L * ux.x) / 2 + (j * W * uy.x) / 2, y: car.y + (i * L * ux.y) / 2 + (j * W * uy.y) / 2 }));
}

/** Screen transform for something placed in metres: centre, turn (y runs down on screen) and scale. */
function placeTransform(p: Placed, toPx: (q: { x: number; y: number }) => { x: number; y: number }, scale: number) {
  const c = toPx(p);
  return `translate(${c.x.toFixed(1)} ${c.y.toFixed(1)}) rotate(${(-p.angleDeg).toFixed(1)}) scale(${scale.toFixed(3)})`;
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
  // The car and battery only show where the driveway was found.
  const shown: RoofDrawing = { ...drawing, ev: ev ? drawing.ev : undefined, battery: battery && drawing.ev ? drawing.battery : undefined };
  // House, driveway and battery turned together to fill the frame (landscape
  // in a wide frame); the north arrow turns with them.
  const roof = orientForBox(shown, width - 2 * pad, height - 2 * pad);
  const { toPx, scale } = fitToBox(roof, width, height, pad);
  const path = (ring: { x: number; y: number }[]) =>
    ring.map((p, i) => {
      const q = toPx(p);
      return `${i === 0 ? "M" : "L"}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
    }).join(" ") + " Z";
  const sh = Math.max(3, 0.45 * scale);
  const cellLine = scale > 18;

  // Car nose (the house end) and the battery, in screen px, for the cable.
  const car = roof.ev;
  const batt = roof.battery;
  const nose = car
    ? toPx({ x: car.x - Math.cos((car.angleDeg * Math.PI) / 180) * (EV_SIZE.length / 2 - 0.3), y: car.y - Math.sin((car.angleDeg * Math.PI) / 180) * (EV_SIZE.length / 2 - 0.3) })
    : null;
  const battPx = batt ? toPx(batt) : null;
  const drivewayPts = car ? rectDriveway(car) : null;

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

      {/* Driveway under the car */}
      {drivewayPts ? <path d={path(drivewayPts)} fill="#3A4B64" opacity="0.75" /> : null}

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

      {/* Battery on the wall beside the car, full and glowing */}
      {batt ? (
        <g transform={placeTransform(batt, toPx, scale)}>
          <rect x={-BATTERY_SIZE.length / 2} y={-BATTERY_SIZE.width / 2} width={BATTERY_SIZE.length} height={BATTERY_SIZE.width} rx={0.08} fill="#E8EEF6" stroke="#FFFFFF" strokeWidth={0.05} />
          <rect x={-BATTERY_SIZE.length / 2 + 0.1} y={-0.1} width={(BATTERY_SIZE.length - 0.2) * 0.85} height={0.2} rx={0.05} fill="#FFD60A" filter="url(#glow)" />
        </g>
      ) : null}

      {/* The car in the driveway, charging from the battery */}
      {car && nose ? (
        <g>
          {battPx ? (
            <path
              d={`M${battPx.x.toFixed(1)} ${battPx.y.toFixed(1)} Q ${((battPx.x + nose.x) / 2 + 6).toFixed(1)} ${((battPx.y + nose.y) / 2 + 6).toFixed(1)} ${nose.x.toFixed(1)} ${nose.y.toFixed(1)}`}
              fill="none"
              stroke="#FFD60A"
              strokeWidth={2.5}
              strokeLinecap="round"
              filter="url(#glow)"
            />
          ) : null}
          <g transform={placeTransform(car, toPx, scale)}>
            <Car />
          </g>
          <Bolt x={toPx(car).x} y={toPx(car).y} r={Math.max(8, Math.min(13, scale * 0.45))} />
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
