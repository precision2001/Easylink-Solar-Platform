import Image from "next/image";
import Link from "next/link";

const customerFeatures = [
  "AI-powered solar calculations",
  "Instant personalized quotes",
  "Verified installer network",
  "Transparent pricing",
  "Premium equipment options",
  "End-to-end support",
];

const installerFeatures = [
  "Quality pre-qualified leads",
  "Integrated CRM system",
  "Custom quote creation",
  "Marketing support",
  "Choose Ready Sites to install",
  "Competitive commission rates",
];

function CheckItem({ text, variant }: { text: string; variant: "cyan" | "yellow" }) {
  const bg = variant === "cyan" ? "bg-primary/20" : "bg-gold-2/20";
  const icon = variant === "cyan" ? "/images/home/check-cyan.svg" : "/images/home/check-yellow.svg";
  return (
    <div className="flex items-center gap-3">
      <div className={`flex size-5 shrink-0 items-center justify-center rounded-full ${bg}`}>
        <Image src={icon} alt="" width={12} height={12} />
      </div>
      <span className="font-[family-name:var(--font-source-sans)] text-sm text-text">{text}</span>
    </div>
  );
}

export function PlatformSection() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:py-[62px]">
      <div className="mx-auto max-w-[1216px]">
        {/* Heading */}
        <div className="mb-8 text-center lg:mb-[11px]">
          <h2 className="font-[family-name:var(--font-source-sans)] text-3xl font-bold leading-[48px] tracking-[-1.2px] text-ink sm:text-[48px]">
            Australia&apos;s Leading
            <br />
            <span className="bg-gradient-to-r from-primary to-brand-sky bg-clip-text text-transparent">
              Solar Platform
            </span>
          </h2>
          <p className="mt-0.5 font-[family-name:var(--font-source-sans)] text-base text-text sm:text-lg">
            Connecting customers and installers for seamless solar solutions
          </p>
          <p className="mx-auto mt-[11px] max-w-[753px] font-[family-name:var(--font-source-sans)] text-sm leading-[26px] text-text sm:text-base">
            Whether you&apos;re looking to go solar or you&apos;re an installer ready to grow your business, Easylink Solar is your trusted platform for quality solar energy solutions across Australia.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* For Customers */}
          <div className="flex flex-col items-center gap-[14px]">
            <Link
              href="/designs"
              className="rounded-xl px-8 py-3 text-base font-semibold text-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)]"
              style={{
                backgroundImage:
                  "linear-gradient(132deg, var(--color-brand-blue) 0%, var(--color-brand-teal) 100%)",
              }}
            >
              I Need Solar
            </Link>
            <div className="w-full rounded-2xl bg-white p-8 shadow-[0_8px_32px_-8px_rgba(17,28,39,0.12)]">
              <h3 className="font-[family-name:var(--font-source-sans)] text-2xl font-bold tracking-[-0.6px] text-ink">
                For Customers
              </h3>
              <p className="mt-5 font-[family-name:var(--font-source-sans)] text-base text-text">
                Get personalized solar quotes and connect with certified installers
              </p>
              <div className="mt-5 flex flex-col gap-3">
                {customerFeatures.map((f) => (
                  <CheckItem key={f} text={f} variant="cyan" />
                ))}
              </div>
            </div>
          </div>

          {/* For Installers */}
          <div className="flex flex-col items-center gap-[14px]">
            <Link
              href="/installers/landing"
              className="rounded-xl border-2 border-ink px-8 py-3 text-base font-semibold text-ink"
            >
              I&apos;m an Installer
            </Link>
            <div className="w-full rounded-2xl bg-white p-8 shadow-[0_8px_32px_-8px_rgba(17,28,39,0.12)]">
              <h3 className="font-[family-name:var(--font-source-sans)] text-2xl font-bold tracking-[-0.6px] text-ink">
                For Installers
              </h3>
              <p className="mt-5 font-[family-name:var(--font-source-sans)] text-base text-text">
                Grow your business with qualified leads and streamlined processes
              </p>
              <div className="mt-5 flex flex-col gap-3">
                {installerFeatures.map((f) => (
                  <CheckItem key={f} text={f} variant="yellow" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
