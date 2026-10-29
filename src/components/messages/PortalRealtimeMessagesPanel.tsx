"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { ConversationSwitcher } from "@/components/customer/messages/ConversationSwitcher";
import { ChatThreadHeader } from "@/components/customer/messages/ChatThreadHeader";
import { MessageRichComposer } from "@/components/customer/messages/MessageRichComposer";
import { ChatThreadMessageRow } from "@/components/customer/messages/ChatThreadMessageRow";
import { ChatThreadScrollPane } from "@/components/messages/ChatThreadScrollPane";

/**
 * The overlay drags in the whole LiveKit client (several hundred KB) and
 * renders nothing at all unless a call is live, so it is fetched when one
 * starts rather than on every visit to the messages page.
 */
const LiveKitCallOverlay = dynamic(
  () =>
    import("@/components/messages/LiveKitCallOverlay").then(
      (m) => m.LiveKitCallOverlay,
    ),
  { ssr: false },
);
import type { CustomerUser } from "@/lib/store/customerAuthSlice";
import { CustomerAvatar } from "@/components/customer/CustomerAvatar";
import { initialsFromDisplayName } from "@/lib/customer/initialsFromName";
import {
  formatChatTimeLabel,
  useRealtimeChat,
} from "@/hooks/useRealtimeChat";

type Props = {
  portal: "customer" | "installer";
  sessionFetch: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>;
  user: CustomerUser | null;
  /**
   * Told which peer is active, so a page rendering context alongside the
   * thread doesn't have to open a second `useRealtimeChat` — that would mean
   * a duplicate WebSocket and a second LiveKit signaling path.
   */
  onActiveContactChange?: (contact: { id: string; name: string } | null) => void;
};

function displayName(u: CustomerUser | null) {
  if (!u) return "You";
  const f = u.firstName.trim();
  const l = u.lastName.trim();
  if (f && l) return `${f} ${l}`;
  return f || l || "You";
}

export function PortalRealtimeMessagesPanel({
  portal,
  sessionFetch,
  user,
  onActiveContactChange,
}: Props) {
  const chat = useRealtimeChat(portal, sessionFetch, user);

  const userDisplayName = useMemo(() => displayName(user), [user]);

  const activeContactId = chat.activePeerId ?? chat.contacts[0]?.id ?? null;
  const activeContactLabel = chat.activeContactName;

  useEffect(() => {
    onActiveContactChange?.(
      activeContactId ? { id: activeContactId, name: activeContactLabel } : null,
    );
  }, [activeContactId, activeContactLabel, onActiveContactChange]);

  const threadHeading = useMemo(
    () =>
      `Conversation with ${chat.activeContactName.replace(/\s*\([^)]*\)\s*$/, "").trim()}`.toUpperCase(),
    [chat.activeContactName],
  );

  const emptyHint =
    portal === "customer"
      ? "No installers are linked to your projects yet. When a lead is assigned to an installer, you can chat here."
      : "No customers are linked to your assigned leads yet.";

  if (chat.loadState === "loading") {
    return (
      <div className="customer-cream-card-bg customer-cream-card-border rounded-[10px] border px-4 py-8 text-center font-dm-sans text-sm text-warm-gray">
        Loading messages…
      </div>
    );
  }

  if (chat.loadState === "error") {
    return (
      <div className="customer-cream-card-bg customer-cream-card-border rounded-[10px] border px-4 py-8 text-center font-dm-sans text-sm text-red-600">
        {chat.loadError ?? "Could not load messages."}
      </div>
    );
  }

  if (chat.contacts.length === 0) {
    return (
      <div className="customer-cream-card-bg customer-cream-card-border rounded-[10px] border px-4 py-8 text-center font-dm-sans text-sm text-warm-gray">
        {emptyHint}
      </div>
    );
  }

  const activeTabId = chat.activePeerId ?? chat.contacts[0]?.id ?? "";

  const threadScrollKey = `${activeTabId}:${chat.messages.length}:${chat.messages.at(-1)?.id ?? ""}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Same condition the overlay itself short-circuits on, lifted up here
          so the lazy chunk isn't requested while there's no call. */}
      {chat.voiceCall.callState !== "idle" &&
      chat.voiceCall.callState !== "ended" ? (
      <LiveKitCallOverlay
        callState={chat.voiceCall.callState}
        peerName={chat.activeContactName}
        error={chat.voiceCall.error}
        cameraEnabled={chat.voiceCall.cameraEnabled}
        micEnabled={chat.voiceCall.micEnabled}
        hasVideoDevice={chat.voiceCall.hasVideoDevice}
        liveKitToken={chat.voiceCall.credentials?.token ?? null}
        liveKitUrl={chat.voiceCall.credentials?.url ?? null}
        onAnswer={() => void chat.voiceCall.answerCall()}
        onReject={chat.voiceCall.rejectCall}
        onHangUp={chat.voiceCall.hangUp}
        onToggleCamera={() => void chat.voiceCall.toggleCamera()}
        onToggleMic={chat.voiceCall.toggleMic}
        onRoomConnected={chat.voiceCall.onRoomConnected}
        onRoomDisconnected={chat.voiceCall.onRoomDisconnected}
        onRoomError={chat.voiceCall.onRoomError}
        onMediaWarning={chat.voiceCall.onMediaWarning}
        onPeerJoined={chat.voiceCall.onPeerJoined}
        registerMediaControls={chat.voiceCall.registerMediaControls}
      />
      ) : null}
      <ConversationSwitcher
        contacts={chat.contacts}
        activeId={activeTabId}
        onSelect={chat.setActivePeerId}
      />

      <section className="customer-cream-card-bg customer-cream-card-border flex min-h-[16rem] max-h-[min(28rem,calc(100dvh-11rem))] flex-1 flex-col overflow-hidden rounded-[10px] border sm:max-h-[min(32rem,calc(100dvh-11rem))]">
        <ChatThreadHeader
          title={threadHeading}
          online={chat.wsState === "open"}
        />

        <ChatThreadScrollPane scrollKey={threadScrollKey}>
          {!chat.conversationReady ? (
            <p className="text-center font-dm-sans text-xs text-warm-gray">
              Starting conversation…
            </p>
          ) : (
            chat.messages.map((m) => {
              const isUser = m.senderId === chat.userId;
              const peerName = chat.activeContactName;
              return (
                <ChatThreadMessageRow
                  key={m.id}
                  direction={isUser ? "outgoing" : "incoming"}
                  senderName={isUser ? userDisplayName : peerName}
                  timeLabel={formatChatTimeLabel(m.createdAt)}
                  body={m.body}
                  avatar={
                    isUser ? (
                      <CustomerAvatar
                        firstName={user?.firstName ?? ""}
                        lastName={user?.lastName ?? ""}
                        size="sm"
                        variant="navy"
                      />
                    ) : (
                      <CustomerAvatar
                        initialsOverride={initialsFromDisplayName(peerName)}
                        size="sm"
                        variant="orange"
                      />
                    )
                  }
                />
              );
            })
          )}
        </ChatThreadScrollPane>

        <div className="shrink-0 border-t customer-cream-card-border px-4 pb-4 pt-3">
          <MessageRichComposer
            onSend={chat.sendText}
            sending={chat.sending}
            disabled={!chat.conversationReady}
            chatUploadBase={
              portal === "customer" ? "/api/customers" : "/api/installers"
            }
            onStartCall={() => void chat.voiceCall.startCall()}
            callDisabled={
              !chat.conversationReady ||
              chat.wsState !== "open" ||
              !chat.voiceCall.canStartCall
            }
            callInProgress={chat.voiceCall.callActive}
          />
        </div>
      </section>
    </div>
  );
}
