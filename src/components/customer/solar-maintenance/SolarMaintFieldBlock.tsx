"use client";

export function SolarMaintFieldBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="font-inter text-sm font-semibold leading-5 tracking-[-0.154px] text-sm-heading">
        {label}
      </p>
      {children}
    </div>
  );
}
