"use client";

import { forwardRef } from "react";

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "className" | "size"
> & {
  className?: string;
};

export const SolarMaintFormField = forwardRef<HTMLInputElement, Props>(
  function SolarMaintFormField({ className = "", ...rest }, ref) {
    return (
      <input
        ref={ref}
        {...rest}
        className={`h-[42px] w-full min-w-0 rounded-lg border border-sm-panel-border bg-sm-input-bg px-3 font-inter text-sm leading-5 tracking-[-0.154px] text-sm-heading outline-none placeholder:text-sm-placeholder focus-visible:ring-2 focus-visible:ring-sm-accent/35 disabled:cursor-not-allowed disabled:opacity-60 read-only:cursor-default ${className}`}
      />
    );
  },
);
