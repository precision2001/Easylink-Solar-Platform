"use client";

import classNames from "classnames";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * This bot is mounted in the root layout, so anything it imports statically
 * lands in the bundle of *every* page. `react-markdown` (plus its unified /
 * remark / micromark tree) is only needed once a reply is on screen, which
 * can't happen before the panel is opened — so it loads then instead.
 */
const ChatMessageMarkdown = dynamic(
  () =>
    import("@/components/messages/ChatMessageMarkdown").then(
      (m) => m.ChatMessageMarkdown,
    ),
  { ssr: false },
);

/** Window event other components dispatch to open the assistant with a question. */
export const ASK_EVENT = "easylink-ai:ask";

/** Open the EasyLink AI panel, optionally sending a question straight away. */
export function askEasylinkAi(question?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: { question } }));
}

type ChatRole = "user" | "assistant";

type ChatTurn = { role: ChatRole; content: string };

const WELCOME: ChatTurn = {
  role: "assistant",
  content:
    "Hi — I'm the EasyLink AI. Ask me about solar quotes, installers, our platform, or our website design and development services.",
};

// Draggable floating bot: pixel position of the button's top-left corner,
// in viewport (`fixed`) coordinates. `null` means "use the default
// bottom-right corner" (plain CSS, no inline position).
type Pos = { x: number; y: number };

const BOT_SIZE = 80;
const VIEWPORT_MARGIN = 8;
const POSITION_STORAGE_KEY = "easylink-ai-bot-position";
const DRAG_THRESHOLD_PX = 6;

function clampPos(pos: Pos): Pos {
  if (typeof window === "undefined") return pos;
  const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - BOT_SIZE - VIEWPORT_MARGIN);
  const maxY = Math.max(VIEWPORT_MARGIN, window.innerHeight - BOT_SIZE - VIEWPORT_MARGIN);
  return {
    x: Math.min(Math.max(pos.x, VIEWPORT_MARGIN), maxX),
    y: Math.min(Math.max(pos.y, VIEWPORT_MARGIN), maxY),
  };
}

export function EasylinkAiChatbot() {
  const pathname = usePathname();
  // Full-screen flows with a Back/Next bar along the bottom: sit above it.
  const aboveFooter = pathname?.startsWith("/designs") ?? false;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Drag-to-move state for the floating bot button.
  const [pos, setPos] = useState<Pos | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startPosX: number;
    startPosY: number;
    moved: boolean;
  } | null>(null);
  const draggedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(POSITION_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Pos>;
      if (typeof parsed.x === "number" && typeof parsed.y === "number") {
        setPos(clampPos({ x: parsed.x, y: parsed.y }));
      }
    } catch {
      /* ignore malformed/blocked storage */
    }
  }, []);

  useEffect(() => {
    function onResize() {
      setPos((p) => (p ? clampPos(p) : p));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (open || e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPosX: pos?.x ?? rect.left,
      startPosY: pos?.y ?? rect.top,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startClientX;
    const dy = e.clientY - drag.startClientY;
    if (!drag.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      drag.moved = true;
      draggedRef.current = true;
      setDragging(true);
    }
    if (drag.moved) {
      setPos(clampPos({ x: drag.startPosX + dx, y: drag.startPosY + dy }));
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
    setDragging(false);
    if (drag.moved) {
      setPos((p) => {
        if (p) {
          try {
            localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(p));
          } catch {
            /* ignore blocked storage */
          }
        }
        return p;
      });
    }
  }

  function handleClick() {
    // A drag ends with a click event right behind it; swallow that one so
    // dropping the bot doesn't also toggle the chat open/closed.
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    setOpen((o) => !o);
  }

  function panelStyle(): React.CSSProperties | undefined {
    if (!pos || typeof window === "undefined") return undefined;
    const width = Math.min(window.innerWidth - 32, 400);
    const height = Math.min(window.innerHeight - 112, 560);
    const gap = 12;
    const openUpward = pos.y > window.innerHeight / 2;
    const top = openUpward
      ? Math.max(VIEWPORT_MARGIN, pos.y - gap - height)
      : Math.min(window.innerHeight - height - VIEWPORT_MARGIN, pos.y + BOT_SIZE + gap);
    const left = Math.min(
      Math.max(pos.x + BOT_SIZE / 2 - width / 2, VIEWPORT_MARGIN),
      window.innerWidth - width - VIEWPORT_MARGIN,
    );
    return { left, top, right: "auto", bottom: "auto", width, height };
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector("textarea")?.focus();
  }, [open]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  // Any screen can hand the assistant a question (the portal's "Ask EasyLink
  // AI" bar): it opens the panel and sends it as if typed here.
  const sendRef = useRef<(text: string) => void>(() => undefined);
  useEffect(() => {
    const onAsk = (e: Event) => {
      const q = (e as CustomEvent<{ question?: string }>).detail?.question?.trim();
      setOpen(true);
      if (q) sendRef.current(q);
    };
    window.addEventListener(ASK_EVENT, onAsk);
    return () => window.removeEventListener(ASK_EVENT, onAsk);
  }, []);

  async function send(override?: string) {
    const text = (override ?? input).trim();
    if (!text || busy) return;

    setError(null);
    if (override === undefined) setInput("");
    setBusy(true);

    const nextMessages: ChatTurn[] = [
      ...messages.filter((m) => m.content.length > 0),
      { role: "user", content: text },
    ];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(data.message ?? `Request failed (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") {
            copy[copy.length - 1] = { role: "assistant", content: full };
          }
          return copy;
        });
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Something went wrong. Try again.";
      setError(msg);
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === "assistant" && !last.content) {
          copy.pop();
        }
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  sendRef.current = (text: string) => void send(text);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close EasyLink assistant" : "Open EasyLink assistant"}
        aria-expanded={open}
        style={
          pos ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" } : undefined
        }
        className={classNames(
          "fixed z-[100] flex touch-none select-none items-center justify-center transition",
          !pos && (aboveFooter ? "bottom-28 right-4 sm:right-6" : "bottom-6 right-6"),
          open
            ? "size-14 bg-navy-800 text-white hover:bg-navy-900 shadow-lg rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
            : "cursor-grab active:cursor-grabbing",
          dragging && "ai-bot-dragging",
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
      >
        {open ? (
          <span className="font-inter text-2xl leading-none" aria-hidden>
            ×
          </span>
        ) : (
          <span className="relative flex items-center justify-center">
            <span className="ai-bot-glow" aria-hidden />
            <Image
              src="/images/easyLinkAI.png"
              alt="EasyLink AI"
              unoptimized
              width={80}
              height={80}
              draggable={false}
              className="ai-bot-bob relative"
            />
          </span>
        )}
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="EasyLink Solar assistant"
          style={panelStyle()}
          className="fixed bottom-24 right-6 z-[100] flex h-[min(560px,calc(100vh-7rem))] w-[min(100vw-2rem,400px)] flex-col overflow-hidden rounded-2xl border border-warm-border bg-cream-50 shadow-2xl"
        >
          <div className="border-b border-warm-border bg-navy-800 px-4 py-3">
            <p className="font-inter text-sm font-semibold text-white">
              EasyLink AI
            </p>
            <p className="font-inter mt-0.5 text-xs text-white/80">
              Answers use our FAQ. Not financial or legal advice.
            </p>
          </div>

          <div
            ref={listRef}
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3"
          >
            {messages.map((m, i) => (
              <div
                key={`${i}-${m.role}`}
                className={classNames(
                  "max-w-[95%] rounded-xl px-3 py-2 text-sm",
                  m.role === "user"
                    ? "ml-auto bg-brand-blue text-white"
                    : "mr-auto border border-warm-border bg-white text-navy-900",
                )}
              >
                {m.role === "assistant" ? (
                  m.content ? (
                    <ChatMessageMarkdown content={m.content} tone="incoming" />
                  ) : busy && i === messages.length - 1 ? (
                    <span className="font-inter text-warm-gray">Thinking…</span>
                  ) : null
                ) : (
                  <p className="font-inter whitespace-pre-wrap break-words">
                    {m.content}
                  </p>
                )}
              </div>
            ))}
          </div>

          {error ? (
            <p className="border-t border-red-200 bg-red-50 px-3 py-2 font-inter text-xs text-red-800">
              {error}
            </p>
          ) : null}

          <div className="border-t border-warm-border p-3">
            <div className="flex gap-2">
              <textarea
                rows={2}
                value={input}
                disabled={busy}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Ask about solar or web design…"
                className="font-inter max-h-28 min-h-[44px] flex-1 resize-y rounded-lg border border-warm-border bg-white px-3 py-2 text-sm text-navy-900 outline-none placeholder:text-warm-gray focus:border-brand-blue"
              />
              <button
                type="button"
                disabled={busy || !input.trim()}
                onClick={() => void send()}
                className="shrink-0 self-end rounded-lg bg-brand-blue px-4 py-2 font-inter text-sm font-medium text-white disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
