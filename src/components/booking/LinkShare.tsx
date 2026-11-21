"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** A booking link with Copy, Open and a downloadable QR code. */
export function LinkShare({ link, qrName = "easylink-booking-qr.png" }: { link: string; qrName?: string }) {
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    QRCode.toDataURL(link, { margin: 1, width: 480, color: { dark: "#111C27", light: "#FFFFFF" } })
      .then((u) => live && setQr(u))
      .catch(() => live && setQr(null));
    return () => {
      live = false;
    };
  }, [link]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2.5">
        <div className="flex flex-wrap gap-2">
          <output className="flex min-h-11 min-w-0 flex-[1_1_260px] items-center overflow-x-auto rounded-[10px] border border-[#C8D3DF] bg-[#F8FAFC] px-3 font-mono text-[13px] whitespace-nowrap text-[#111C27]">
            {link}
          </output>
          <button
            type="button"
            onClick={() => void copy()}
            className="min-h-11 cursor-pointer rounded-[10px] border border-[#C8D3DF] bg-white px-4 text-[14px] font-semibold text-[#111C27] hover:bg-[#F2F9FC]"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-11 items-center rounded-[10px] border border-[#C8D3DF] px-4 text-[14px] font-semibold text-[#0369A1] no-underline hover:bg-[#F2F9FC]"
          >
            Open page
          </a>
        </div>
        <span className="sr-only" role="status">
          {copied ? "Link copied" : ""}
        </span>
      </div>
      {qr ? (
        <div className="flex flex-col items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code for the booking link" width={112} height={112} className="rounded-lg border border-[#E1E7EF]" />
          <a href={qr} download={qrName} className="text-[13px] font-semibold text-[#0369A1]">
            Download QR
          </a>
        </div>
      ) : null}
    </div>
  );
}

type Found = { id: string; name: string; area: string | null; link: string };

/** Search customers and copy one customer's personal booking link. */
export function LeadLinkFinder({ endpoint }: { endpoint: string }) {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Found[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const term = search.trim();
    const t = window.setTimeout(async () => {
      if (term.length < 2) {
        setRows(null);
        return;
      }
      try {
        const r = await fetch(`${endpoint}?search=${encodeURIComponent(term)}`, { cache: "no-store" });
        const j = (await r.json().catch(() => ({}))) as { data?: Found[]; message?: string };
        if (r.ok) {
          setRows(j.data ?? []);
          setError(null);
        } else setError(j.message || "Couldn't search.");
      } catch {
        setError("Couldn't reach EasyLink.");
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [search, endpoint]);

  async function copy(row: Found) {
    try {
      await navigator.clipboard.writeText(row.link);
      setCopied(row.id);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-[#304050]">
        Find a customer
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name, mobile or email"
          className="h-11 max-w-[420px] rounded-[10px] border border-[#C8D3DF] bg-white px-3 text-[15px] text-[#111C27] outline-none focus:border-[#0369A1]"
        />
      </label>
      {error ? (
        <p role="alert" className="m-0 text-[14px] text-red-700">
          {error}
        </p>
      ) : null}
      {rows && rows.length === 0 ? <p className="m-0 text-[14px] text-[#4B5B6E]">No customers found.</p> : null}
      {rows && rows.length > 0 ? (
        <ul className="m-0 flex list-none flex-col divide-y divide-[#E1E7EF] rounded-[10px] border border-[#E1E7EF] p-0">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
              <span className="flex flex-col">
                <span className="text-[15px] font-semibold text-[#111C27]">{r.name}</span>
                {r.area ? <span className="text-[13px] text-[#4B5B6E]">{r.area}</span> : null}
              </span>
              <button
                type="button"
                onClick={() => void copy(r)}
                className="min-h-10 cursor-pointer rounded-[10px] border border-[#C8D3DF] bg-white px-3 text-[14px] font-semibold text-[#0369A1] hover:bg-[#F2F9FC]"
              >
                {copied === r.id ? "Copied" : "Copy their link"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="m-0 text-[13px] text-[#4B5B6E]">A customer&apos;s own link greets them by name and attaches the booking to their record.</p>
    </div>
  );
}
