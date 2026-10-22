"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Btn, Card, Modal, Pill } from "@/components/jobs/ui";
import { AiNotConnectedError } from "@/lib/ai-platform/client";
import { aud, dealTypeLabel, market, systemLine, type DealOrder, type ReadyDeal } from "@/lib/ai-platform/market";
import { DealForm, type DealInput } from "./DealForm";

export const DEAL_STATUS: Record<string, ["neutral" | "good" | "warn" | "bad" | "info", string]> = {
  draft: ["neutral", "Draft"],
  review: ["warn", "Waiting for EasyLink"],
  live: ["good", "Live"],
  paused: ["neutral", "Paused"],
  ended: ["neutral", "Ended"],
  rejected: ["bad", "Changes needed"],
};
export const ORDER_STEPS = ["Waiting for the 50% payment", "Call the customer", "Site checked", "Booked", "Installed", "Handed over"];

/** Installer portal → EasyLink Marketplace → Ready Deals: create deals, track their sales, and work each order. */
export function InstallerReadyDeals() {
  const [deals, setDeals] = useState<ReadyDeal[] | null>(null);
  const [orders, setOrders] = useState<DealOrder[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "offline" | "error">("loading");
  const [tab, setTab] = useState<"deals" | "orders">("deals");
  const [editing, setEditing] = useState<ReadyDeal | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actError, setActError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      Promise.all([market.deals("installer"), market.orders("installer")])
        .then(([d, o]) => (setDeals(d), setOrders(o), setState("ready")))
        .catch((e) => setState(e instanceof AiNotConnectedError ? "offline" : "error")),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);

  const save = async (input: DealInput, submit: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const d = editing && editing !== "new" ? await market.updateDeal("installer", editing.id, input) : await market.createDeal("installer", input);
      if (submit) await market.dealAction("installer", d.id, "submit");
      setEditing(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const act = async (d: ReadyDeal, action: string) => {
    setActError(null);
    try {
      await market.dealAction("installer", d.id, action);
      await load();
    } catch (e) {
      setActError((e as Error).message);
    }
  };

  if (state === "offline") return <Card title="Ready Deals">The marketplace isn&apos;t connected yet.</Card>;
  if (state === "error") return <Card title="Ready Deals">Couldn&apos;t load Ready Deals. Refresh to try again.</Card>;
  const live = deals?.filter((d) => d.status === "live").length ?? 0;
  const newOrders = orders?.filter((o) => o.stage === "Call the customer").length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="m-0 text-[12px] font-bold uppercase tracking-[0.08em] text-[#0B4A7A]">EasyLink Marketplace</p>
          <h1 className="m-0 font-source-sans text-[26px] font-bold text-[#0F172A]">Ready Deals</h1>
          <p className="m-0 text-[14px] text-[#475569]">
            Your fixed-price deals on easylinksolar.com.au/ready-deals. {live} live{newOrders ? ` · ${newOrders} new order${newOrders === 1 ? "" : "s"} to call` : ""}.
          </p>
        </div>
        <Btn onClick={() => (setError(null), setEditing("new"))}>Create a deal</Btn>
      </div>
      <div role="tablist" className="flex gap-1 border-b border-[#E3E8EF]">
        {(
          [
            ["deals", `My deals${deals ? ` (${deals.length})` : ""}`],
            ["orders", `Orders${orders ? ` (${orders.length})` : ""}`],
          ] as const
        ).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`-mb-px border-b-2 px-3 py-2 text-[14px] font-semibold ${tab === k ? "border-[#0B4A7A] text-[#0B4A7A]" : "border-transparent text-[#475569] hover:text-[#0F172A]"}`}>
            {label}
          </button>
        ))}
      </div>
      {state === "loading" && <p className="m-0 text-[14px] text-[#475569]">Loading…</p>}
      {actError && <p className="m-0 rounded-[10px] bg-[#FEF2F2] p-3 text-[13.5px] text-[#991B1B]">{actError}</p>}

      {tab === "deals" && deals && (
        <div className="flex flex-col gap-2">
          {!deals.length && <p className="m-0 text-[14px] text-[#475569]">No deals yet. Create one, and EasyLink checks it before it goes live.</p>}
          {deals.map((d) => {
            const [tone, label] = DEAL_STATUS[d.status] ?? ["neutral", d.status];
            return (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#E3E8EF] bg-white p-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[14.5px] font-semibold text-[#0F172A]">
                    {d.title || "Untitled"} <span className="font-normal text-[#475569]">· {d.ref} · {dealTypeLabel(d.type)}</span>
                  </span>
                  <span className="text-[12.5px] text-[#475569]">
                    {systemLine(d.system, d.kw)} · {aud(d.price)}
                    {d.wasPrice ? ` (was ${aud(d.wasPrice)})` : ""} · sold {d.sold} of {d.quantity} · {d.stockSource === "own" ? "own stock" : "EasyLink stock"}
                  </span>
                  {d.status === "rejected" && d.review?.note && <span className="text-[12.5px] text-[#991B1B]">EasyLink: {d.review.note}</span>}
                </div>
                <span className="flex flex-wrap items-center gap-2">
                  <Pill tone={tone}>{label}</Pill>
                  {["draft", "rejected", "paused"].includes(d.status) && (
                    <Btn small kind="secondary" onClick={() => (setError(null), setEditing(d))}>
                      Edit
                    </Btn>
                  )}
                  {["draft", "rejected"].includes(d.status) && (
                    <Btn small onClick={() => act(d, "submit")}>
                      Send for approval
                    </Btn>
                  )}
                  {d.status === "live" && (
                    <Btn small kind="secondary" onClick={() => act(d, "pause")}>
                      Pause
                    </Btn>
                  )}
                  {d.status === "paused" && (
                    <Btn small onClick={() => act(d, "resume")}>
                      Resume
                    </Btn>
                  )}
                  {["live", "paused"].includes(d.status) && (
                    <Btn small kind="danger" onClick={() => act(d, "end")}>
                      End
                    </Btn>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {tab === "orders" && orders && (
        <div className="flex flex-col gap-2">
          {!orders.length && <p className="m-0 text-[14px] text-[#475569]">When a customer buys one of your deals, their order shows here and in Jobs.</p>}
          {orders.map((o) => (
            <div key={o.id} className="flex flex-col gap-2 rounded-[12px] border border-[#E3E8EF] bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[14.5px] font-semibold text-[#0F172A]">
                  {o.ref} · {o.customer.name} · {o.customer.suburb} {o.customer.postcode}
                </span>
                <span className="flex items-center gap-2">
                  {o.status === "cancelled" || o.status === "refunded" ? <Pill tone="bad">{o.status === "refunded" ? "Refunded" : "Cancelled"}</Pill> : <Pill tone={o.stage === "Call the customer" ? "warn" : "info"}>{o.stage}</Pill>}
                  <Link href={`/installers/dashboard/jobs/${encodeURIComponent(o.jobId)}`} className="text-[13px] font-semibold text-[#0B4A7A] underline">
                    Open job
                  </Link>
                </span>
              </div>
              <span className="text-[12.5px] text-[#475569]">
                {o.dealRef} · {aud(o.price)} · {o.customer.phone} · {o.customer.email}
                {o.installDates ? ` · installing ${new Date(`${o.installDates.day1.slice(0, 10)}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}` : ""}
              </span>
              <ol className="m-0 flex list-none flex-wrap gap-1 p-0">
                {ORDER_STEPS.map((s, i) => {
                  const at = ORDER_STEPS.indexOf(o.stage);
                  return (
                    <li key={s} className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${i < at ? "bg-[#DCFCE7] text-[#166534]" : i === at ? "bg-[#0B4A7A] text-white" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                      {s}
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal wide title={editing === "new" ? "Create a Ready Deal" : `Edit ${editing.ref}`} onClose={() => setEditing(null)}>
          <DealForm portal="installer" initial={editing === "new" ? undefined : editing} busy={busy} error={error} onSave={save} />
        </Modal>
      )}
    </div>
  );
}
