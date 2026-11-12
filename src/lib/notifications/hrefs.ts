export type NotificationPortal = "installer" | "customer" | "admin";

/** Equipment validity notices (CEC approved battery list): no entity, a page per portal. */
export const EQUIPMENT_VALIDITY = "EQUIPMENT_VALIDITY";

export function dashboardNotificationHref(
  portal: NotificationPortal,
  entityType: string | null,
  entityId: string | null,
  type?: string,
): string | null {
  if (type === EQUIPMENT_VALIDITY) {
    if (portal === "admin") return "/master/equipment-validity";
    if (portal === "installer") return "/installers/dashboard/equipment-validity";
    return null;
  }
  if (!entityType || !entityId) return null;
  const t = entityType.toUpperCase();
  if (portal === "admin") return null;
  if (portal === "installer") {
    if (t === "LEAD") {
      return `/installers/dashboard/home?leadId=${encodeURIComponent(entityId)}`;
    }
    if (t === "APPOINTMENT") {
      return `/installers/dashboard/schedule`;
    }
    return null;
  }
  if (t === "LEAD") {
    return `/customers/dashboard`;
  }
  if (t === "APPOINTMENT") {
    return `/customers/dashboard`;
  }
  return null;
}
