"use client";

import { useMemo } from "react";
import { InstallerHeader } from "@/components/installer/dashboard/InstallerHeader";
import { InstallerEquipmentCatalog } from "@/components/installer/equipment/InstallerEquipmentCatalog";
import { MyOrders } from "@/components/cart/MyOrders";
import { useAppSelector } from "@/lib/store/hooks";

export default function InstallerEquipmentPage() {
  const user = useAppSelector((s) => s.installerAuth.user);

  const initials = useMemo(() => {
    const f = user?.firstName?.trim().charAt(0) ?? "";
    const l = user?.lastName?.trim().charAt(0) ?? "";
    return (f + l || "IN").toUpperCase().slice(0, 2);
  }, [user?.firstName, user?.lastName]);

  return (
    <div className="min-h-screen bg-surface-50">
      <InstallerHeader activeNav="equipment" userInitials={initials} />
      <main className="mx-auto w-full max-w-[1440px] px-4 py-5 md:px-5 lg:py-8">
        <InstallerEquipmentCatalog />
        <div className="mt-8 rounded-xl border border-warm-border bg-white p-4 shadow-sm">
          <MyOrders portal="installer" title="My equipment orders" />
        </div>
      </main>
    </div>
  );
}
