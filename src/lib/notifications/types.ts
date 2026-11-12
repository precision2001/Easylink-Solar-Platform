export type DashboardNotificationItem = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  /** null for notices about no single record (e.g. equipment validity). */
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
};
