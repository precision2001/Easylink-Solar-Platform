"use client";

import { useEffect, useState } from "react";
import { GeneratedScreen, type ScreenSpecView } from "@/components/ai/GeneratedScreen";
import { ai, AiNotConnectedError, timeAgo } from "@/lib/ai-platform/client";

/**
 * Ask for a screen in plain English; the AI composes it from approved portal
 * components, bound to data you are already allowed to see. Pin the useful
 * ones; they re-check your permissions every time they open.
 */
const EXAMPLES = [
  "New leads this week by status, with a table of the ones nobody has contacted",
  "Installs booked for the next 14 days and which still have no switchboard photo",
  "Customers in VIC with a proposal sent but no reply",
];

export function MasterAiScreens() {
  const [request, setRequest] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [current, setCurrent] = useState<{ id: string; title: string; spec: ScreenSpecView } | null>(null);
  const [saved, setSaved] = useState<{ id: string; title: string; spec: unknown; pinned: boolean; createdAt: string }[]>([]);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    ai.screens("admin")
      .then(setSaved)
      .catch((e) => e instanceof AiNotConnectedError && setOffline(true));
  }, []);

  const generate = async () => {
    setBusy(true);
    setErrors([]);
    try {
      const r = await ai.generateScreen("admin", request);
      setCurrent({ id: r.id, title: r.title, spec: r.spec as ScreenSpecView });
      setSaved((s) => [{ ...r, pinned: false, createdAt: new Date().toISOString() }, ...s]);
    } catch (e) {
      if (e instanceof AiNotConnectedError) setOffline(true);
      setErrors([e instanceof Error ? e.message : "Could not build that screen"]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          AI operations <span aria-hidden="true">/</span> <span className="font-semibold text-[#0F172A]">Build a screen</span>
        </nav>
      </header>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-8 py-6 pb-14">
        <form
          className="flex flex-col gap-2 rounded-[16px] border border-[#E3E8EF] bg-white p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (request.trim().length >= 5) void generate();
          }}
        >
          <label htmlFor="screen-req" className="font-source-sans text-[20px] font-bold text-[#0F172A]">
            What do you want to see?
          </label>
          <textarea
            id="screen-req"
            rows={2}
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder={EXAMPLES[0]}
            className="rounded-[10px] border border-[#CBD5E1] p-3 text-[14px]"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" disabled={busy || offline || request.trim().length < 5} className="h-10 rounded-[10px] bg-[#0B4A7A] px-5 text-[14px] font-bold text-white disabled:opacity-50">
              {busy ? "Building…" : "Build screen"}
            </button>
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => setRequest(ex)} className="rounded-full border border-[#CBD5E1] bg-white px-3 py-1 text-[12px] text-[#334155] hover:border-[#0B4A7A]">
                {ex}
              </button>
            ))}
          </div>
          {offline && <span className="text-[13px] text-[#92400E]">AI platform not connected: set AI_PLATFORM_URL on the web server.</span>}
          {errors.map((e) => (
            <span key={e} role="alert" className="text-[13px] text-[#991B1B]">
              {e}
            </span>
          ))}
        </form>

        {current && <GeneratedScreen spec={current.spec} portal="admin" />}

        {saved.length > 0 && (
          <section aria-label="Your screens" className="flex flex-col gap-1 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]">
            <h2 className="m-0 mb-1 text-[16px] font-bold text-[#0F172A]">Your screens</h2>
            {saved.map((s) => (
              <div key={s.id} className="flex items-center gap-2 border-b border-[#EEF2F6] py-2 text-[13px] last:border-0">
                <button type="button" onClick={() => setCurrent({ id: s.id, title: s.title, spec: s.spec as ScreenSpecView })} className="flex-grow text-left font-semibold text-[#0B4A7A] hover:underline">
                  {s.title}
                </button>
                <span className="text-[#5B6B80]">{timeAgo(s.createdAt)}</span>
                <button
                  type="button"
                  onClick={() => void ai.pinScreen("admin", s.id, !s.pinned).then(() => setSaved((all) => all.map((x) => (x.id === s.id ? { ...x, pinned: !x.pinned } : x))))}
                  className="h-7 rounded-full border border-[#CBD5E1] px-2.5 text-[12px] font-semibold"
                >
                  {s.pinned ? "Pinned" : "Pin"}
                </button>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
