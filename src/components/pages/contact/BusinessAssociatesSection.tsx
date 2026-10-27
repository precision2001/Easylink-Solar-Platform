import Image from "next/image";
import logoIcon from "@/components/ui/Icons/bluettiLogo.svg";

/**
 * The panel, inverter and battery brands we supply and install. Logos are
 * uniform 268x123 PNGs with a baked-in white background (no alpha), so every
 * tile can share one box and the row stays optically even without per-logo
 * nudging. The tile is pure white to match that artwork - see .ba-logo-tile.
 */
const ASSOCIATES = [
  { name: "SolarEdge", file: "solaredge" },
  { name: "SAJ", file: "saj" },
  { name: "Risen Energy", file: "risen" },
  { name: "Midea", file: "midea" },
  { name: "KSTAR", file: "kstar" },
  { name: "JA Solar", file: "ja-solar" },
  { name: "GoodWe", file: "goodwe" },
  { name: "Fox ESS", file: "fox-ess" },
  { name: "Emerald", file: "emerald" },
  { name: "EGing PV", file: "eging-pv" },
  { name: "Dyness", file: "dyness" },
  { name: "Canadian Solar", file: "canadian-solar" },
  { name: "ASE Technology", file: "ase-technology" },
  { name: "Anker", file: "anker" },
  { name: "AlphaESS", file: "alpha-ess" },
  { name: "AE Solar", file: "ae-solar" },
  { name: "Tindo Solar", file: "tindo" },
  { name: "Tongwei", file: "tongwei" },
  { name: "Trina Solar", file: "trina-solar" },
  { name: "Titan Solar", file: "titan-solar" },
  { name: "Sungrow", file: "sungrow" },
  { name: "Tesla", file: "tesla" },
  { name: "AXITEC Solar", file: "axitec" },
  { name: "UZ Energy", file: "uz-energy" },
] as const;

/** Native size of every supplied logo file. */
const LOGO_W = 268;
const LOGO_H = 123;

export function BusinessAssociatesSection() {
  return (
    <section>
      <div className="w-full">
        <div className="relative min-h-[414px] overflow-hidden px-6 md:px-[90px]">
          <Image
            src="/images/partner-station.png"
            alt=""
            aria-hidden="true"
            fill
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-linear-to-r from-slate-950/90 via-blue-950/85 to-blue-900/60" />
          <div className="relative z-10 mx-auto grid min-h-[414px] max-w-7xl items-center gap-8 py-7 md:grid-cols-[minmax(220px,0.8fr)_3fr]">
            <div>
              <p className="text-base text-cyan-300">Business Associates</p>
              <h2 className="text-[24px] font-bold">
                BLUETTI Officaial Distributor
              </h2>
              <div className="mt-8 inline-flex items-center py-2">
                <Image src={logoIcon} alt="BLUETTI" width={260} height={62} />
              </div>
            </div>

            <div
              className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]"
              aria-label="Brands we supply and install"
            >
              <div className="ba-logo-track flex w-max gap-4">
                {/* Two identical tracks: the marquee translates -50%, so the
                    second one takes over seamlessly as the first leaves. */}
                {Array.from({ length: 2 }).map((_, trackIdx) => (
                  <div
                    key={trackIdx}
                    aria-hidden={trackIdx === 1}
                    className="grid grid-flow-col grid-rows-3 gap-4"
                  >
                    {ASSOCIATES.map(({ name, file }) => (
                      <div
                        key={name}
                        className="ba-logo-tile flex w-[196px] items-center justify-center overflow-hidden rounded-xl px-5 py-3"
                        style={{ aspectRatio: "196/88" }}
                      >
                        <Image
                          src={`/images/associates/${file}.png`}
                          alt={trackIdx === 0 ? name : ""}
                          title={trackIdx === 0 ? name : undefined}
                          width={LOGO_W}
                          height={LOGO_H}
                          sizes="196px"
                          className="h-auto max-h-full w-full object-contain"
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden">
          <video
            className="h-auto w-full object-cover"
            src="/videos/solarWall.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
        </div>
      </div>
    </section>
  );
}
