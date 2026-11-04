import Image from "next/image";
import Link from "next/link";
import rightArrow from "@/components/ui/Icons/rightArrow.svg";

export function DesignSystemSection() {
  return (
    <section>
      <div className="w-full">
        <div className="relative overflow-hidden min-h-[450px] sm:px-6">
          <div className="absolute inset-y-0 right-0 w-full">
            <Image
              src="/images/design-chip.png"
              alt="Circuit board chip background"
              fill
              className="object-cover opacity-90"
            />
          </div>
          <div className="relative z-10 flex min-h-[450px] max-w-7xl mx-auto items-center">
            <div className="flex flex-col items-center">
              <h3 className="max-w-xl text-4xl font-bold tracking-tight text-white">
                Design your system
              </h3>
              <p className="mt-4 text-base text-slate-200 max-w-[363px] text-center">
                Get a customized solar and battery configuration tailored to
                your specific energy needs.
              </p>
              <Link
                href="/designs"
                className="flex items-center gap-2 cursor-pointer mt-8 rounded-xl bg-linear-to-r from-fuchsia-500 to-red-400 px-2 py-3 text-sm font-semibold text-white"
              >
                <Image
                  src="/images/solarDesignLogo.png"
                  alt="Solar Design"
                  width={37}
                  height={37}
                />
                Solar Design
                <Image
                  src={rightArrow}
                  alt="Right Arrow"
                  width={17}
                  height={17}
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
