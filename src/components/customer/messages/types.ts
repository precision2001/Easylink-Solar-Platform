export type MessageThreadContact = {
  id: string;
  /** Shown in the switcher and thread header */
  displayName: string;
  /** Most recent message in this thread, for list previews. */
  lastMessage?: { body: string; createdAt: string; senderId: string } | null;
};

export type DemoChatMessage = {
  id: string;
  /** Logged-in user vs selected contact */
  role: "user" | "contact";
  body: string;
  timeLabel: string;
};
