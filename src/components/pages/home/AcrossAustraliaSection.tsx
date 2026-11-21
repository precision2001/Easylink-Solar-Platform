import Image from "next/image";


export function AcrossAustraliaSection() {
  return (
    <section className="bg-faint/30 px-4 py-16 sm:px-6 lg:py-[120px]">
      <div className="mx-auto flex max-w-[1250px] flex-col items-center gap-12 lg:flex-row lg:gap-[147px]">
        {/* Map */}
        <div className="relative w-full max-w-[519px] shrink-0">
          <Image
            src="/aus-map.svg"
            alt="Australia coverage map"
            width={519}
            height={519}
            className="h-auto w-full"
          />
        </div>

        {/* Content */}
        <div className="flex flex-col gap-7">
          <div className="flex flex-col gap-[27px]">
            <h2 className="font-[family-name:var(--font-source-sans)] text-3xl font-bold tracking-[-0.9px] text-ink sm:text-4xl">
              Across Australia
            </h2>
            <p className="max-w-[555px] font-[family-name:var(--font-source-sans)] text-base leading-7 text-text sm:text-lg">
              We are actively installing in all regions across the continent.
              From Perth to Sydney, Brisbane to Melbourne, our network of
              certified installers ensures quality solar solutions wherever you
              are.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
