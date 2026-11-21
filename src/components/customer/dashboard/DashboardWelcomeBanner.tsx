import Icon from "../../ui/Icons";

type Props = {
  /** Omitted until the profile loads; the greeting then reads "Welcome back!". */
  firstName?: string | null;
  /** E.g. "Your solar journey is 40% complete", or an empty-state hint. */
  progressLabel: string;
  stats: { label: string; value: string }[];
};

export function DashboardWelcomeBanner({
  firstName,
  progressLabel,
  stats,
}: Props) {
  const name = firstName?.trim();
  return (
    <section className="customer-welcome-banner flex w-full flex-col gap-4 rounded-[14px] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-warm-black/15 text-warm-black">
          <Icon name="Sun" className="size-6 text-warm-black" />
        </div>
        <div className="min-w-0">
          <h1 className="font-inter text-xl font-bold leading-[30px] tracking-[-0.45px] text-warm-black">
            {name ? `Welcome back, ${name}!` : "Welcome back!"}
          </h1>
          <p className="mt-0.5 font-inter text-xs font-normal leading-[18px] text-warm-black/65">
            {progressLabel}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-4 sm:justify-end md:gap-10">
        {stats.map((stat) => (
          <StatBlock key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>
    </section>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[88px] text-center sm:text-left">
      <p className="font-inter text-[10px] font-normal uppercase leading-[15px] tracking-[1.12px] text-warm-black/55">
        {label}
      </p>
      <p className="mt-1 font-inter text-sm font-bold leading-[21px] tracking-[-0.15px] text-warm-black">
        {value}
      </p>
    </div>
  );
}
