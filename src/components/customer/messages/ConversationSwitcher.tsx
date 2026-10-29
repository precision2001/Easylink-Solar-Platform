"use client";

import { CustomerAvatar } from "@/components/customer/CustomerAvatar";
import { initialsFromDisplayName } from "@/lib/customer/initialsFromName";
import type { MessageThreadContact } from "./types";

type Props = {
  label?: string;
  contacts: MessageThreadContact[];
  activeId: string;
  onSelect: (id: string) => void;
};

export function ConversationSwitcher({
  label = "Messaging:",
  contacts,
  activeId,
  onSelect,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
      <p
        className="shrink-0 font-dm-sans text-xs font-normal leading-[18px] customer-text-muted"
        style={{ fontVariationSettings: "'opsz' 9" }}
      >
        {label}
      </p>
      <div className="customer-cream-card-bg customer-cream-card-border flex min-w-0 flex-1 flex-wrap gap-1 rounded-lg border p-1 sm:max-w-xl">
        {contacts.map((c) => {
          const active = c.id === activeId;
          const initials = initialsFromDisplayName(c.displayName);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              title={
                c.lastMessage
                  ? `${c.displayName}: ${c.lastMessage.body}`
                  : c.displayName
              }
              className={`flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors sm:flex-initial sm:px-3 ${
                active
                  ? "customer-chip-active"
                  : "text-warm-gray hover:bg-black/[0.04]"
              }`}
            >
              <CustomerAvatar
                initialsOverride={initials}
                size="xs"
                variant={active ? "gradient" : "navy"}
                aria-label=""
              />
              <span
                className="truncate font-dm-sans text-[11px] font-semibold leading-[16.5px]"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                {c.displayName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
