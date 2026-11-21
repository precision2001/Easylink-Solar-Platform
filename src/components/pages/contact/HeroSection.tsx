import Image from "next/image";
import { Header } from "../../modules/LandingHero";

export function HeroSection() {
  return (
    <section className="relative min-h-[760px] overflow-hidden">
      <Header />
      <Image
        src="/images/hero-house.jpg"
        alt="Modern home with solar panels and EV charging"
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/45 to-slate-950/20" />

      <div className="relative z-10 mx-auto flex min-h-[760px] w-full max-w-7xl items-center px-4 pt-24 pb-14 sm:px-6 lg:pt-28">
        <div className="max-w-2xl text-white">
          <p className="mb-6 inline-flex rounded-full bg-yellow-400/20 px-4 py-1 text-sm font-semibold text-yellow-300">
            Future Secured
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            Advanced Solar Panels
            <br />
            for Modern Homes
          </h1>
          <p className="mt-5 max-w-xl text-base text-slate-100 sm:text-lg">
            Discover our range of high-performance solar panels designed to
            maximize efficiency and reliability for your solar energy system.
          </p>
        </div>
      </div>
    </section>
  );
}
