import type { ReactNode } from "react";
import { CustomerSectionHeader } from "@/components/customer/CustomerSectionHeader";

type Props = {
  title: string;
  icon: ReactNode;
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function CustomerPanelCard({
  title,
  icon,
  headerAction,
  children,
  className = "",
}: Props) {
  return (
    <section
      className={`customer-cream-card-bg customer-cream-card-border flex h-full min-h-0 flex-col overflow-hidden rounded-[10px] border ${className}`}
    >
      <CustomerSectionHeader
        variant="cream"
        title={title}
        icon={icon}
        action={headerAction}
      />
      <div className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-5">
        {children}
      </div>
    </section>
  );
}
