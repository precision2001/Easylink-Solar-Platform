"use client";

export function PlatformStepItem({
  index,
  title,
  description,
  contentWidth,
}: {
  index: number;
  title: string;
  description: string;
  contentWidth?: number;
}) {
  return (
    <div className="flex gap-[16px] items-start">
      <div className="bg-gold-2 relative rounded-full w-[32px] h-[32px] shrink-0 flex items-center justify-center">
        <span className="font-bold font-source-sans text-[14px] text-ink leading-[20px]">
          {index}
        </span>
      </div>
      <div
        className="flex flex-col gap-[10px] items-start"
        style={contentWidth ? { width: `${contentWidth}px` } : undefined}
      >
        <h3 className="font-source-sans text-[18px] font-bold tracking-[-0.4px] text-ink leading-[24px]">
          {title}
        </h3>
        <p className="font-source-sans text-[16px] leading-[26px] text-text whitespace-pre-line">
          {description}
        </p>
      </div>
    </div>
  );
}

