"use client";

import { useEffect } from "react";

/** The Designs page crashed: report it (path only, no query), and offer a reload. */
export default function DesignsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: window.location.pathname, message: error.message, stack: error.stack, digest: error.digest }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0B1A33] px-6 text-center text-white">
      <p className="font-source-sans text-[20px] font-semibold">Something went wrong loading the design.</p>
      <p className="max-w-[520px] font-inter text-[14px] text-white/70">It has been reported. Try again; if it keeps happening, go back and open the design again.</p>
      <div className="flex gap-3">
        <button type="button" onClick={() => reset()} className="rounded-xl bg-design-next px-5 py-2.5 font-source-sans font-semibold uppercase text-black">
          Try again
        </button>
        <button type="button" onClick={() => window.location.reload()} className="rounded-xl border border-white/40 px-5 py-2.5 font-source-sans font-semibold uppercase">
          Reload
        </button>
      </div>
    </div>
  );
}
