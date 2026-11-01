"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { toast } from "react-toastify";
import Icon from "@/components/ui/Icons";
import {
  insertAttachmentMarkdown,
  insertImageMarkdown,
  insertLink,
  insertText,
  toggleBold,
  toggleItalic,
  type EditResult,
} from "@/lib/messages/textareaFormat";
import { compressImageForUpload } from "@/lib/images/compress-browser";

const QUICK_EMOJIS = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😅",
  "😂",
  "🙂",
  "😉",
  "😊",
  "😍",
  "🤔",
  "😢",
  "😭",
  "😡",
  "👍",
  "👎",
  "👏",
  "🙏",
  "🔥",
  "✨",
  "💯",
  "❤️",
  "☀️",
  "⚡",
  "📎",
  "📷",
  "✅",
  "❌",
  "⭐",
  "🎉",
  "💬",
  "📞",
] as const;

function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

type Props = {
  placeholder?: string;
  onSend?: (text: string) => void | Promise<void>;
  sending?: boolean;
  disabled?: boolean;
  /** Base path for `/chat/upload`, e.g. `/api/customers` or `/api/installers`. */
  chatUploadBase?: string;
  onStartCall?: () => void;
  callDisabled?: boolean;
  callInProgress?: boolean;
};

export function MessageRichComposer({
  placeholder = "Type your message...",
  onSend,
  sending = false,
  disabled = false,
  chatUploadBase,
  onStartCall,
  callDisabled = false,
  callInProgress = false,
}: Props) {
  const [draft, setDraft] = useState("");
  const words = useMemo(() => countWords(draft), [draft]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const emojiAnchorRef = useRef<HTMLButtonElement>(null);
  const emojiPanelRef = useRef<HTMLDivElement>(null);

  const [emojiOpen, setEmojiOpen] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);

  const applyEdit = useCallback((edit: EditResult) => {
    const el = textareaRef.current;
    flushSync(() => {
      setDraft(edit.value);
    });
    if (!el) return;
    requestAnimationFrame(() => {
      el.focus();
      if (edit.selection) {
        el.setSelectionRange(edit.selection.start, edit.selection.end);
      } else {
        el.setSelectionRange(edit.caret, edit.caret);
      }
    });
  }, []);

  const readSelection = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return null;
    return {
      value: el.value,
      start: el.selectionStart,
      end: el.selectionEnd,
    };
  }, []);

  const handleBold = useCallback(() => {
    const sel = readSelection();
    if (!sel) return;
    applyEdit(toggleBold(sel.value, sel.start, sel.end));
  }, [applyEdit, readSelection]);

  const handleItalic = useCallback(() => {
    const sel = readSelection();
    if (!sel) return;
    applyEdit(toggleItalic(sel.value, sel.start, sel.end));
  }, [applyEdit, readSelection]);

  const handleLink = useCallback(() => {
    const sel = readSelection();
    if (!sel) return;
    const url = window.prompt("Paste link URL:");
    if (url == null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("Please enter a URL.");
      return;
    }
    applyEdit(insertLink(sel.value, sel.start, sel.end, trimmed));
  }, [applyEdit, readSelection]);

  const uploadFile = useCallback(
    async (file: File, kind: "image" | "attachment") => {
      if (!chatUploadBase) {
        toast.error("Upload is not available.");
        return;
      }
      setUploadBusy(true);
      try {
        const form = new FormData();
        // Images are shrunk before upload (lib/images/policy.ts); other files untouched.
        const upload = await compressImageForUpload(file);
        form.append("file", upload, upload.name);
        form.append("kind", kind === "attachment" ? "attachment" : "image");

        const res = await fetch(`${chatUploadBase}/chat/upload`, {
          method: "POST",
          body: form,
          credentials: "include",
        });

        const payload = (await res.json().catch(() => null)) as {
          message?: string;
          url?: string;
          filename?: string;
        } | null;

        if (!res.ok) {
          toast.error(payload?.message ?? "Upload failed.");
          return;
        }

        const url = payload?.url;
        if (!url) {
          toast.error("Upload did not return a URL.");
          return;
        }

        const sel = readSelection();
        if (!sel) return;

        const filename = payload?.filename ?? file.name;

        const edit =
          kind === "image"
            ? insertImageMarkdown(
                sel.value,
                sel.start,
                sel.end,
                url,
                filename.replace(/\.[^/.]+$/, "") || "image",
              )
            : insertAttachmentMarkdown(sel.value, sel.start, sel.end, url, filename);

        applyEdit(edit);
      } catch {
        toast.error("Could not upload file.");
      } finally {
        setUploadBusy(false);
      }
    },
    [applyEdit, chatUploadBase, readSelection],
  );

  const onPickImage = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (file) void uploadFile(file, "image");
    },
    [uploadFile],
  );

  const onPickAttachment = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (file) void uploadFile(file, "attachment");
    },
    [uploadFile],
  );

  const insertEmoji = useCallback(
    (emoji: string) => {
      const sel = readSelection();
      if (!sel) return;
      applyEdit(insertText(sel.value, sel.start, sel.end, emoji));
      setEmojiOpen(false);
    },
    [applyEdit, readSelection],
  );

  useEffect(() => {
    if (!emojiOpen) return;

    function onDocMouseDown(ev: MouseEvent) {
      const t = ev.target as Node;
      if (
        emojiPanelRef.current?.contains(t) ||
        emojiAnchorRef.current?.contains(t)
      ) {
        return;
      }
      setEmojiOpen(false);
    }

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [emojiOpen]);

  const toolsDisabled = disabled || sending || uploadBusy;

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text || disabled || sending) return;
    void Promise.resolve(onSend?.(text)).then(() => {
      setDraft("");
    });
  }, [draft, disabled, onSend, sending]);

  return (
    <div className="flex flex-col gap-3 border-t border-warm-border pt-3">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        className="sr-only"
        tabIndex={-1}
        onChange={onPickImage}
      />
      <input
        ref={attachInputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        onChange={onPickAttachment}
      />

      <label className="sr-only" htmlFor="customer-message-input">
        Message
      </label>
      <textarea
        ref={textareaRef}
        id="customer-message-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        rows={3}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-[76px] w-full resize-y rounded-lg border border-warm-border bg-white p-3 font-dm-sans text-sm font-normal leading-[21px] text-warm-ink placeholder:text-warm-gray/50 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ fontVariationSettings: "'opsz' 9" }}
      />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            aria-label="Bold"
            title="Bold"
            disabled={toolsDisabled}
            onClick={handleBold}
            className="flex size-[22px] items-center justify-center rounded text-warm-gray hover:bg-black/4 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="Bold" className="size-3" />
          </button>
          <button
            type="button"
            aria-label="Italic"
            title="Italic"
            disabled={toolsDisabled}
            onClick={handleItalic}
            className="flex size-[22px] items-center justify-center rounded text-warm-gray hover:bg-black/4 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="Italic" className="size-3" />
          </button>
          <button
            type="button"
            aria-label="Insert link"
            title="Link"
            disabled={toolsDisabled}
            onClick={handleLink}
            className="flex size-[22px] items-center justify-center rounded text-warm-gray hover:bg-black/4 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="Link" className="size-3" />
          </button>
          <button
            type="button"
            aria-label="Insert image"
            title="Image"
            disabled={toolsDisabled || !chatUploadBase}
            onClick={() => imageInputRef.current?.click()}
            className="flex size-[22px] items-center justify-center rounded text-warm-gray hover:bg-black/4 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="Image" className="size-3" />
          </button>
          <button
            type="button"
            aria-label="Attach file"
            title="Attachment"
            disabled={toolsDisabled || !chatUploadBase}
            onClick={() => attachInputRef.current?.click()}
            className="flex size-[22px] items-center justify-center rounded text-warm-gray hover:bg-black/4 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="Attach" className="size-3" />
          </button>
          <div className="relative">
            <button
              ref={emojiAnchorRef}
              type="button"
              aria-label="Insert emoji"
              aria-expanded={emojiOpen}
              title="Emoji"
              disabled={toolsDisabled}
              onClick={() => setEmojiOpen((o) => !o)}
              className="flex size-[22px] items-center justify-center rounded text-warm-gray hover:bg-black/4 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="Emoji" className="size-3" />
            </button>
            {emojiOpen ? (
              <div
                ref={emojiPanelRef}
                className="absolute bottom-full left-0 z-50 mb-2 w-[min(100vw-2rem,18rem)] rounded-lg border border-warm-border bg-white p-2 shadow-lg"
                role="listbox"
                aria-label="Emoji"
              >
                <div className="grid grid-cols-8 gap-1">
                  {QUICK_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      className="flex size-8 items-center justify-center rounded text-lg hover:bg-black/5"
                      onClick={() => insertEmoji(em)}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <span
            className="font-dm-sans text-[11px] font-normal leading-[16.5px] text-warm-gray"
            style={{ fontVariationSettings: "'opsz' 9" }}
          >
            {words} words
          </span>
          <button
            type="button"
            disabled={disabled || sending || !draft.trim()}
            onClick={handleSend}
            className="inline-flex h-7 min-w-[76px] items-center justify-center gap-2 rounded-lg font-dm-sans text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              fontVariationSettings: "'opsz' 14",
              backgroundImage:
                "linear-gradient(162deg, rgb(32, 148, 243) 2.36%, rgb(23, 207, 207) 97.64%)",
            }}
          >
            <Icon name="Send" className="size-3" />
            Send
          </button>
          <button
            type="button"
            disabled={disabled || callDisabled || callInProgress}
            onClick={() => onStartCall?.()}
            className="inline-flex h-7 min-w-[76px] items-center justify-center gap-1 rounded-lg border border-warm-border bg-white px-3 font-dm-sans text-[11px] font-medium text-warm-ink hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            <Icon name="Phone" className="size-3" />
            {callInProgress ? "In call" : "Phone"}
          </button>
        </div>
      </div>
    </div>
  );
}
