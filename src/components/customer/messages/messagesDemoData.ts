import type { DemoChatMessage, MessageThreadContact } from "./types";

export const MESSAGE_THREAD_CONTACTS: MessageThreadContact[] = [
  { id: "solarmax", displayName: "SolarMax Pro (Installer)" },
  { id: "easylink", displayName: "Easylink Solar (HQ)" },
];

/** Oldest first — demo copy aligned with [Figma Messages](https://www.figma.com/design/1nV16sphzoxO15Zg8tfIDz/Final-Designs?node-id=3-18825). */
export const DEMO_MESSAGES_BY_CONTACT: Record<string, DemoChatMessage[]> = {
  easylink: [
    {
      id: "m1",
      role: "contact",
      timeLabel: "3 hours ago",
      body: "Welcome to the Easylink Solar family! Your installer SolarMax Pro has been assigned to your project. Feel free to reach out if you have any questions.",
    },
    {
      id: "m2",
      role: "user",
      timeLabel: "1 hour ago",
      body: "Thanks! I'll make sure the driveway is clear. Is there anything else I need to prepare?",
    },
  ],
  solarmax: [
    {
      id: "s1",
      role: "contact",
      timeLabel: "Yesterday",
      body: "Hi — we're scheduling your site survey. Reply with a preferred morning or afternoon.",
    },
  ],
};
