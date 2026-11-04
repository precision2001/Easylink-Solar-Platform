"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { askEasylinkAi } from "@/components/ai-chat/EasylinkAiChatbot";
import { MessageRichComposer } from "@/components/customer/messages/MessageRichComposer";
import { PortalIcon } from "@/components/customer/portal/PortalIcon";
import { ButtonLink, EmptyNote, Panel, Skeleton } from "@/components/customer/portal/PortalParts";
import { ChatMessageMarkdown } from "@/components/messages/ChatMessageMarkdown";
import { ChatThreadScrollPane } from "@/components/messages/ChatThreadScrollPane";
import { VideoCallHistoryRow } from "@/components/messages/VideoCallHistoryRow";
import { formatChatTimeLabel, useRealtimeChat } from "@/hooks/useRealtimeChat";
import { isVideoCallHistoryMessage } from "@/lib/chat/call-history-message";
import { initialsFromDisplayName } from "@/lib/customer/initialsFromName";
import { fetchWithCustomerSession } from "@/lib/customers/customer-fetch-client";
import { conversationTimeLabel, messagePreviewText } from "@/lib/customers/message-preview";
import type { CustomerUser } from "@/lib/store/customerAuthSlice";

/**
 * Customer messages in the redesigned portal. Uses the same realtime hook,
 * composer (uploads, calls) and LiveKit overlay as the shared
 * `PortalRealtimeMessagesPanel`; only the layout is customer-specific: a
 * conversation list beside the thread on desktop, list then thread on phones.
 */

// Loaded only while a call is live (it pulls in the LiveKit client).
const LiveKitCallOverlay = dynamic(() => import("@/components/messages/LiveKitCallOverlay").then((m) => m.LiveKitCallOverlay), { ssr: false });

const PRE_JOB_QUESTIONS = [
  "What happens after I accept my quote?",
  "How long until my installation is booked?",
  "What should I prepare for the site visit?",
];

function Initials({ name, tone }: { name: string; tone: "navy" | "sun" }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
        tone === "navy" ? "bg-[#0B1A2E] text-[#FFE866]" : "bg-[#FFF4D6] text-[#7A3E00]"
      }`}
    >
      {initialsFromDisplayName(name) || "?"}
    </span>
  );
}

export function NoConversationYet() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
      <Panel title="Your installer chat">
        <EmptyNote icon="messages" title="Your installer chat opens once your job is booked">
          When EasyLink books your installation, your accredited installer is linked to your account and a conversation with them appears here. You can send
          messages, photos of your switchboard or roof, and start a call.
        </EmptyNote>
        <p className="m-0 text-[14px] leading-[1.55] text-[#475569]">Have a question before then? EasyLink AI can answer most things straight away, or our team can help.</p>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => askEasylinkAi()}
            className="inline-flex min-h-[46px] items-center gap-2 rounded-[13px] bg-[#F68A0A] px-[18px] text-[14.5px] font-bold text-[#3B1D00] hover:bg-[#FF9A1F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
          >
            <PortalIcon name="spark" size={18} />
            Ask EasyLink AI
          </button>
          <ButtonLink href="/contact-us" variant="quiet" icon="arrow">
            Contact the EasyLink team
          </ButtonLink>
        </div>
      </Panel>

      <section aria-labelledby="ask-now" className="flex flex-col gap-4 rounded-[22px] bg-[#0B1A2E] p-6 text-white sm:p-7">
        <p className="m-0 flex items-center gap-2 text-[13px] font-bold text-[#FFE866]">
          <PortalIcon name="spark" size={16} />
          EasyLink AI, any time of day
        </p>
        <h2 id="ask-now" className="m-0 font-source-sans text-[24px] font-extrabold leading-[1.2]">
          Ask while you wait
        </h2>
        <div className="flex flex-col gap-2">
          {PRE_JOB_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => askEasylinkAi(q)}
              className="flex min-h-[46px] items-center gap-3 rounded-[12px] border border-[#3E5A80] px-3.5 text-left text-[14px] font-semibold text-white hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE866]"
            >
              <span className="flex-1">{q}</span>
              <PortalIcon name="arrow" size={16} className="text-[#FFE866]" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function displayName(u: CustomerUser | null) {
  const n = [u?.firstName?.trim(), u?.lastName?.trim()].filter(Boolean).join(" ");
  return n || "You";
}

export function CustomerMessagesView({ user }: { user: CustomerUser | null }) {
  const chat = useRealtimeChat("customer", fetchWithCustomerSession, user);
  // Phones show one pane at a time; desktop always shows both.
  const [phoneChoice, setPhonePane] = useState<"list" | "thread" | null>(null);
  const me = useMemo(() => displayName(user), [user]);

  if (chat.loadState === "loading") {
    return (
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Skeleton className="h-[220px]" />
        <Skeleton className="hidden h-[520px] lg:block" />
      </div>
    );
  }

  if (chat.loadState === "error") {
    return (
      <Panel>
        <EmptyNote icon="messages" title="We couldn't load your messages">
          {chat.loadError ?? "Something went wrong."} Check your connection and try again.
        </EmptyNote>
        <div>
          <button
            type="button"
            onClick={() => void chat.refresh()}
            className="inline-flex min-h-[46px] items-center rounded-[13px] border border-[#CBD5E1] bg-white px-[18px] text-[14.5px] font-bold text-[#0F172A] hover:border-[#64748B]"
          >
            Try again
          </button>
        </div>
      </Panel>
    );
  }

  if (chat.contacts.length === 0) return <NoConversationYet />;

  // With a single conversation, phones open straight into it.
  const phonePane = phoneChoice ?? (chat.contacts.length === 1 ? "thread" : "list");
  const activeId = chat.activePeerId ?? chat.contacts[0]?.id ?? "";
  const peerName = chat.activeContactName;
  const live = chat.wsState === "open";
  const scrollKey = `${activeId}:${chat.messages.length}:${chat.messages.at(-1)?.id ?? ""}`;
  const callLive = chat.voiceCall.callState !== "idle" && chat.voiceCall.callState !== "ended";

  return (
    <div className="grid min-h-0 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      {callLive ? (
        <LiveKitCallOverlay
          callState={chat.voiceCall.callState}
          peerName={peerName}
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

      {/* Conversation list */}
      <section
        aria-label="Conversations"
        className={`flex min-w-0 flex-col gap-2 self-start rounded-[20px] border border-[#E2E8F0] bg-white p-3 ${phonePane === "thread" ? "hidden lg:flex" : "flex"}`}
      >
        <h2 className="m-0 px-2 pb-1 pt-2 text-[15px] font-bold text-[#0F172A]">Conversations</h2>
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {chat.contacts.map((c) => {
            const on = c.id === activeId;
            const preview = messagePreviewText(c.lastMessage?.body);
            const fromMe = c.lastMessage?.senderId === chat.userId;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  aria-current={on ? "true" : undefined}
                  onClick={() => {
                    chat.setActivePeerId(c.id);
                    setPhonePane("thread");
                  }}
                  className={`flex min-h-[64px] w-full items-center gap-3 rounded-[14px] px-2.5 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] ${
                    on ? "bg-[#F4F6FA] lg:bg-[#FFF4D6]" : "hover:bg-[#F4F6FA]"
                  }`}
                >
                  <Initials name={c.displayName} tone="sun" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[14.5px] font-bold text-[#0F172A]">{c.displayName}</span>
                      <span className="shrink-0 text-[12px] text-[#5B6B80]">{conversationTimeLabel(c.lastMessage?.createdAt)}</span>
                    </span>
                    <span className="truncate text-[13px] text-[#5B6B80]">
                      {preview ? `${fromMe ? "You: " : ""}${preview}` : "Your installer. Say hello."}
                    </span>
                  </span>
                  <PortalIcon name="arrow" size={16} className="shrink-0 text-[#94A3B8] lg:hidden" />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-1 border-t border-[#E2E8F0] px-2 pt-3">
          <button
            type="button"
            onClick={() => askEasylinkAi()}
            className="flex min-h-[44px] w-full items-center gap-2 rounded-[12px] text-left text-[14px] font-semibold text-[#1D4ED8] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
          >
            <PortalIcon name="spark" size={16} />
            Need an answer now? Ask EasyLink AI
          </button>
        </div>
      </section>

      {/* Thread */}
      <section
        aria-label={`Conversation with ${peerName}`}
        className={`min-w-0 flex-col overflow-hidden rounded-[20px] border border-[#E2E8F0] bg-white ${phonePane === "list" ? "hidden lg:flex" : "flex"} h-[calc(100dvh-150px)] min-h-[460px] lg:h-[min(720px,calc(100dvh-220px))]`}
      >
        <header className="flex items-center gap-3 border-b border-[#E2E8F0] px-3 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => setPhonePane("list")}
            aria-label="Back to conversations"
            className="flex size-11 shrink-0 items-center justify-center rounded-[12px] text-[#0B1A2E] hover:bg-[#F4F6FA] lg:hidden"
          >
            <PortalIcon name="arrow" size={20} className="rotate-180" />
          </button>
          <Initials name={peerName} tone="sun" />
          <div className="flex min-w-0 flex-1 flex-col">
            <h2 className="m-0 truncate text-[16px] font-bold text-[#0F172A]">{peerName}</h2>
            <p className="m-0 flex items-center gap-1.5 text-[12.5px] text-[#5B6B80]">
              <span aria-hidden="true" className={`size-2 rounded-full ${live ? "bg-[#15803D]" : "bg-[#94A3B8]"}`} />
              {live ? "Your installer · new messages arrive live" : "Your installer · reconnecting…"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => askEasylinkAi(`Help me write a message to my installer, ${peerName}, about my solar installation.`)}
            className="hidden min-h-[44px] items-center gap-1.5 rounded-[12px] px-3 text-[13.5px] font-semibold text-[#1D4ED8] hover:bg-[#F4F6FA] sm:flex"
          >
            <PortalIcon name="spark" size={15} />
            Help me write
          </button>
        </header>

        <ChatThreadScrollPane scrollKey={scrollKey} className="bg-[#FAFBFD]">
          {!chat.conversationReady ? (
            <p className="m-0 py-6 text-center text-[14px] text-[#5B6B80]">Opening your conversation…</p>
          ) : chat.messages.length === 0 ? (
            <div className="mx-auto my-6 max-w-[420px]">
              <EmptyNote icon="messages" title={`Start the conversation with ${peerName}`}>
                Ask about timing, access to your roof or meter box, or send a photo of your switchboard. Your installer is notified when you write.
              </EmptyNote>
            </div>
          ) : (
            chat.messages.map((m) => {
              const mine = m.senderId === chat.userId;
              const time = formatChatTimeLabel(m.createdAt);
              if (isVideoCallHistoryMessage(m.body)) return <VideoCallHistoryRow key={m.id} body={m.body} timeLabel={time} />;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`flex max-w-[min(88%,34rem)] flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
                    <span className="px-1 text-[12px] text-[#5B6B80]">
                      <span className="font-semibold text-[#334155]">{mine ? me : peerName}</span> · {time}
                    </span>
                    <div
                      className={`rounded-[16px] px-3.5 py-2.5 text-[14.5px] leading-[1.5] ${
                        mine ? "rounded-br-[6px] bg-[#0B1A2E] text-white" : "rounded-bl-[6px] border border-[#E2E8F0] bg-white text-[#0F172A]"
                      }`}
                    >
                      <ChatMessageMarkdown content={m.body} tone={mine ? "outgoing" : "incoming"} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </ChatThreadScrollPane>

        <div className="shrink-0 border-t border-[#E2E8F0] px-3 pb-3 pt-3 sm:px-5 sm:pb-4">
          <MessageRichComposer
            appearance="portal"
            placeholder={`Write to ${peerName}…`}
            onSend={chat.sendText}
            sending={chat.sending}
            disabled={!chat.conversationReady}
            chatUploadBase="/api/customers"
            onStartCall={() => void chat.voiceCall.startCall()}
            callDisabled={!chat.conversationReady || !live || !chat.voiceCall.canStartCall}
            callInProgress={chat.voiceCall.callActive}
          />
        </div>
      </section>
    </div>
  );
}
