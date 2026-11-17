import { PlatformStepItem } from "@/components/ui/PlatformStepItem";
import { SolarDesignCtaButton } from "@/components/ui/SolarDesignCtaButton";

const steps = [
  {
    index: 1,
    title: "Non-binding offer in just a few clicks",
    description:
      "Instantly discover your roof's solar potential—see how much a solar system will\ncost and the savings you can expect. Our AI will measure your roof and suggest\nthe system that's right for you.",
    contentWidth: 528.15,
  },
  {
    index: 2,
    title: "No waiting. No surprises.",
    description:
      "You will get free professional quote for your exact building. If you like it, you\ncan proceed to installation with one of our verified installers. If you see that\nsolar is not right fit for you, no worries.",
    contentWidth: 501,
  },
  {
    index: 3,
    title: "No spam. Just helpful conversations with our experts.",
    description:
      "Our solar experts can help you apply for available rebates so you get the best\npossible price on your new system.",
    contentWidth: 512.31,
  },
  {
    index: 4,
    title: "Excitement starts",
    description:
      "Once you place your order with us, excitement start, so we will not to keep you\nwaiting. We handle everything from planning to installation and on average,\nyour PV system will be installed on your roof in 25 days.",
    contentWidth: 521.296,
  },
] as const;

export function CustomerPlatformSection() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:py-[62px]">
      <div className="mx-auto max-w-[1216px]">
        <div className="flex flex-col lg:flex-row lg:gap-[43px] lg:items-center">
          {/* Left Column */}
          <div className="flex flex-col gap-[52px] items-start w-full lg:w-[567.25px]">
            <div className="flex flex-col gap-[34px] items-start w-full">
              <div className="flex flex-col gap-[24px] items-center justify-center w-full">
                <div className="flex flex-col font-bold h-[36px] justify-center leading-0 text-ink text-[30px] text-center tracking-[-0.75px] w-full font-source-sans">
                  <p className="leading-[36px]">Design your System</p>
                </div>
                <SolarDesignCtaButton />
              </div>

              <div className="flex flex-col font-bold h-[107px] justify-center leading-[48px] text-ink text-[48px] text-center tracking-[-1.2px] w-full font-source-sans">
                <p className="mb-0 leading-[48px]">Australia&apos;s Leading</p>
                <p className="mb-0 bg-clip-text bg-linear-to-r from-brand-cyan to-brand-sky text-transparent leading-[48px]">
                  Solar Platform
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-[27px] items-start text-text w-full">
              <div className="flex flex-col h-[28px] justify-center text-[18px] w-full font-source-sans">
                <p className="mb-0 leading-[28px]">
                  Connecting customers and installers for seamless solar
                  solutions
                </p>
              </div>
              <p className="mx-auto max-w-[753px] text-center font-source-sans text-[16px] leading-[26px] text-text">
                Whether you&apos;re looking to go solar or you&apos;re an
                installer ready to grow your business, Easylink Solar is your
                trusted platform for quality solar energy solutions across
                Australia.
              </p>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-[28px] items-start w-full lg:w-[661px]">
            {steps.map((s) => (
              <PlatformStepItem
                key={s.index}
                index={s.index}
                title={s.title}
                description={s.description}
                contentWidth={s.contentWidth}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
