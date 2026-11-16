type Props = {
  children: string;
};

export function StatusBadge({ children }: Props) {
  return (
    <span
      className="inline-flex items-center rounded-full bg-mint-soft px-2 py-0.5 font-dm-sans text-[9px] font-bold uppercase leading-[13.5px] text-success"
      style={{ fontVariationSettings: "'opsz' 14" }}
    >
      {children}
    </span>
  );
}
