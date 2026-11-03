"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Btn, Card, Field, inputCls, Modal, Pill } from "@/components/jobs/ui";
import { AiNotConnectedError } from "@/lib/ai-platform/client";
import { aud, dealTypeLabel, market, systemLine, type DealOrder, type ReadyDeal, type ReadySite } from "@/lib/ai-platform/market";
import { DealForm } from "./DealForm";
import { DEAL_STATUS, ORDER_STEPS } from "./InstallerReadyDeals";
import { SiteForm, type SiteInput } from "./SiteForm";

const SITE_STATUS: Record<string, ["neutral" | "good" | "warn" | "bad" | "info", string]> = {
  draft: ["neutral", "Draft"],
  review: ["warn", "To review"],
  live: ["info", "Live"],
  sold: ["good", "Sold"],
  withdrawn: ["neutral", "Withdrawn"],
};

function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (t: T) => void; tabs: [T, string][] }) {
  return (
    <div role="tablist" className="flex flex-wrap gap-1 border-b border-[#E3E8EF]">
      {tabs.map(([k, label]) => (
        <button key={k} role="tab" aria-selected={value === k} onClick={() => onChange(k)} className={`-mb-px border-b-2 px-3 py-2 text-[14px] font-semibold ${value === k ? "border-[#0B4A7A] text-[#0B4A7A]" : "border-transparent text-[#475569] hover:text-[#0F172A]"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Header({ title, intro, action }: { title: string; intro: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="m-0 text-[12px] font-bold uppercase tracking-[0.08em] text-[#0B4A7A]">EasyLink Marketplace</p>
        <h1 className="m-0 font-source-sans text-[26px] font-bold text-[#0F172A]">{title}</h1>
        <p className="m-0 max-w-[760px] text-[14px] text-[#475569]">{intro}</p>
      </div>
      {action}
    </div>
  );
}

/** Distributor portal → Ready Sites: create from a lead or blank, check installers' sites, publish, and see who bought. */
export function MasterReadySitesLive() {
  const [sites, setSites] = useState<ReadySite[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "offline" | "error">("loading");
  const [tab, setTab] = useState<"review" | "live" | "draft" | "sold" | "all">("review");
  const [editing, setEditing] = useState<ReadySite | "new" | null>(null);
  const [rejecting, setRejecting] = useState<ReadySite | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(
    () =>
      market
        .sites<ReadySite[]>("admin")
        .then((s) => (setSites(s), setState("ready")))
        .catch((e) => setState(e instanceof AiNotConnectedError ? "offline" : "error")),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (sites && tab === "review" && !sites.some((s) => s.status === "review")) setTab("live");
    // only on first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sites === null]);

  const shown = useMemo(() => (sites ?? []).filter((s) => tab === "all" || s.status === tab || (tab === "draft" && s.status === "withdrawn")), [sites, tab]);
  const count = (st: string) => (sites ?? []).filter((s) => s.status === st).length;
  const save = async (input: SiteInput, then: "save" | "publish" | "submit") => {
    setBusy(true);
    setError(null);
    try {
      const s = editing && editing !== "new" ? await market.updateSite("admin", editing.id, input) : await market.createSite("admin", input);
      if (then === "publish") await market.siteAction("admin", s.id, "publish");
      setEditing(null);
      setTab(then === "publish" ? "live" : "draft");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const act = async (s: ReadySite, action: string, input: Record<string, unknown> = {}) => {
    setError(null);
    try {
      await market.siteAction("admin", s.id, action, input);
      setRejecting(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (state === "offline") return <Card title="Ready Sites">The marketplace isn&apos;t connected yet (AI_PLATFORM_URL).</Card>;
  if (state === "error") return <Card title="Ready Sites">Couldn&apos;t load Ready Sites. Refresh to try again.</Card>;
  return (
    <div className="flex flex-col gap-4">
      <Header
        title="Ready Sites"
        intro="Customers ready to install, offered to installers for a fixed site fee. Create them from customers with no installer, check the ones installers pass on, and publish. The first installer to buy gets the job."
        action={<Btn onClick={() => (setError(null), setEditing("new"))}>New Ready Site</Btn>}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["To review", count("review")],
          ["Live", count("live")],
          ["Sold", count("sold")],
          ["Site fees from sales", aud((sites ?? []).filter((s) => s.status === "sold").reduce((t, s) => t + s.siteFee, 0))],
        ].map(([k, v]) => (
          <div key={String(k)} className="rounded-[12px] border border-[#E3E8EF] bg-white p-3">
            <p className="m-0 text-[12px] font-semibold text-[#475569]">{k}</p>
            <p className="m-0 font-source-sans text-[22px] font-bold text-[#0F172A]">{v}</p>
          </div>
        ))}
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          ["review", `To review (${count("review")})`],
          ["live", `Live (${count("live")})`],
          ["draft", `Drafts (${count("draft") + count("withdrawn")})`],
          ["sold", `Sold (${count("sold")})`],
          ["all", "All"],
        ]}
      />
      {error && <p className="m-0 rounded-[10px] bg-[#FEF2F2] p-3 text-[13.5px] text-[#991B1B]">{error}</p>}
      {state === "loading" && <p className="m-0 text-[14px] text-[#475569]">Loading…</p>}
      <div className="flex flex-col gap-2">
        {sites && !shown.length && <p className="m-0 text-[14px] text-[#475569]">Nothing here.</p>}
        {shown.map((s) => {
          const [tone, label] = SITE_STATUS[s.status] ?? ["neutral", s.status];
          return (
            <div key={s.id} className="flex flex-col gap-2 rounded-[12px] border border-[#E3E8EF] bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[14.5px] font-semibold text-[#0F172A]">
                  {s.ref} · {s.customer.name} · {s.suburb} {s.state} {s.postcode}
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <Pill>{s.createdBy.kind === "easylink" ? "EasyLink" : `From ${s.createdBy.name}`}</Pill>
                  <Pill tone={tone}>{label}</Pill>
                </span>
              </div>
              <span className="text-[12.5px] text-[#475569]">
                {systemLine(s.system)} · contract {aud(s.contractValue)} · site fee {aud(s.siteFee)} · {s.confirmed.payment ? `deposit ${aud(s.confirmed.depositPaid)} paid` : "no deposit"} · {s.confirmed.installation ? "installation confirmed" : "installation not confirmed"}
                {s.visibility.eliteHeadStartHours ? ` · Elite head start ${s.visibility.eliteHeadStartHours} h` : ""} · {s.views} views
              </span>
              {s.buyer && (
                <span className="text-[13px] text-[#166534]">
                  Bought by {s.buyer.name} on {new Date(s.buyer.at).toLocaleDateString("en-AU")} ·{" "}
                  <Link href={`/master/job-journeys/${encodeURIComponent(s.buyer.jobId)}`} className="font-semibold underline">
                    Open job
                  </Link>
                </span>
              )}
              {s.review?.note && <span className="text-[12.5px] text-[#92400E]">Note: {s.review.note}</span>}
              <div className="flex flex-wrap justify-end gap-2">
                {s.status !== "sold" && (
                  <Btn small kind="secondary" onClick={() => (setError(null), setEditing(s))}>
                    Edit
                  </Btn>
                )}
                {s.status === "review" && (
                  <>
                    <Btn small kind="danger" onClick={() => setRejecting(s)}>
                      Send back
                    </Btn>
                    <Btn small onClick={() => act(s, "approve")}>
                      Approve and publish
                    </Btn>
                  </>
                )}
                {["draft", "withdrawn"].includes(s.status) && (
                  <Btn small onClick={() => act(s, "publish")}>
                    Publish
                  </Btn>
                )}
                {s.status === "live" && (
                  <Btn small kind="danger" onClick={() => act(s, "withdraw")}>
                    Withdraw
                  </Btn>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {editing && (
        <Modal wide title={editing === "new" ? "New Ready Site" : `Edit ${editing.ref}`} onClose={() => setEditing(null)}>
          <SiteForm initial={editing === "new" ? undefined : editing} staff busy={busy} error={error} onSave={save} />
        </Modal>
      )}
      {rejecting && <ReasonModal title={`Send ${rejecting.ref} back`} onClose={() => setRejecting(null)} onSubmit={(reason) => act(rejecting, "reject", { reason })} />}
    </div>
  );
}

/** Distributor portal → Ready Deals: approve installers' deals, watch sales, and cancel or refund orders under the standard policy. */
export function MasterReadyDeals() {
  const [deals, setDeals] = useState<ReadyDeal[] | null>(null);
  const [orders, setOrders] = useState<DealOrder[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "offline" | "error">("loading");
  const [tab, setTab] = useState<"review" | "live" | "all" | "orders">("review");
  const [opened, setOpened] = useState<ReadyDeal | null>(null);
  const [rejecting, setRejecting] = useState<ReadyDeal | null>(null);
  const [cancelling, setCancelling] = useState<DealOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(
    () =>
      Promise.all([market.deals("admin"), market.orders("admin")])
        .then(([d, o]) => (setDeals(d), setOrders(o), setState("ready")))
        .catch((e) => setState(e instanceof AiNotConnectedError ? "offline" : "error")),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  const act = async (d: ReadyDeal, action: string, input: Record<string, unknown> = {}) => {
    setError(null);
    try {
      await market.dealAction("admin", d.id, action, input);
      setRejecting(null);
      setOpened(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const count = (st: string) => (deals ?? []).filter((d) => d.status === st).length;
  const shown = (deals ?? []).filter((d) => tab === "all" || d.status === tab);
  const revenue = (orders ?? []).filter((o) => o.status !== "cancelled" && o.status !== "refunded").reduce((t, o) => t + o.price, 0);

  if (state === "offline") return <Card title="Ready Deals">The marketplace isn&apos;t connected yet (AI_PLATFORM_URL).</Card>;
  if (state === "error") return <Card title="Ready Deals">Couldn&apos;t load Ready Deals. Refresh to try again.</Card>;
  return (
    <div className="flex flex-col gap-4">
      <Header title="Ready Deals" intro="Installers' fixed-price deals for the website. Every deal is checked here before it goes live: equipment and STCs, the price, and the postcodes covered. Customers pay 50% when they buy and 50% before installation." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["To approve", count("review")],
          ["Live", count("live")],
          ["Orders", (orders ?? []).length],
          ["Order value", aud(revenue)],
        ].map(([k, v]) => (
          <div key={String(k)} className="rounded-[12px] border border-[#E3E8EF] bg-white p-3">
            <p className="m-0 text-[12px] font-semibold text-[#475569]">{k}</p>
            <p className="m-0 font-source-sans text-[22px] font-bold text-[#0F172A]">{v}</p>
          </div>
        ))}
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          ["review", `To approve (${count("review")})`],
          ["live", `Live (${count("live")})`],
          ["all", `All (${(deals ?? []).length})`],
          ["orders", `Orders (${(orders ?? []).length})`],
        ]}
      />
      {error && <p className="m-0 rounded-[10px] bg-[#FEF2F2] p-3 text-[13.5px] text-[#991B1B]">{error}</p>}
      {state === "loading" && <p className="m-0 text-[14px] text-[#475569]">Loading…</p>}

      {tab !== "orders" && (
        <div className="flex flex-col gap-2">
          {deals && !shown.length && <p className="m-0 text-[14px] text-[#475569]">Nothing here.</p>}
          {shown.map((d) => {
            const [tone, label] = DEAL_STATUS[d.status] ?? ["neutral", d.status];
            return (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#E3E8EF] bg-white p-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[14.5px] font-semibold text-[#0F172A]">
                    {d.title} <span className="font-normal text-[#475569]">· {d.ref} · {d.installerName}</span>
                  </span>
                  <span className="text-[12.5px] text-[#475569]">
                    {dealTypeLabel(d.type)} · {systemLine(d.system, d.kw)} · {aud(d.price)} after {d.stcs.total} STCs · {d.serviceAreas} · sold {d.sold}/{d.quantity}
                  </span>
                  {d.warnings.length > 0 && <span className="text-[12.5px] text-[#92400E]">⚠ {d.warnings.join(" ")}</span>}
                </div>
                <span className="flex flex-wrap items-center gap-2">
                  <Pill tone={tone}>{label}</Pill>
                  <Btn small kind="secondary" onClick={() => setOpened(d)}>
                    {d.status === "review" ? "Check and approve" : "View"}
                  </Btn>
                  {d.status === "live" && (
                    <Btn small kind="secondary" onClick={() => act(d, "pause")}>
                      Pause
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
          {!orders.length && <p className="m-0 text-[14px] text-[#475569]">No orders yet.</p>}
          {orders.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-[#E3E8EF] bg-white p-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[14.5px] font-semibold text-[#0F172A]">
                  {o.ref} · {o.customer.name} · {o.customer.suburb} {o.customer.postcode}
                </span>
                <span className="text-[12.5px] text-[#475569]">
                  {o.dealRef} · {aud(o.price)} · ordered {new Date(o.createdAt).toLocaleDateString("en-AU")}
                  {o.cancel ? ` · ${o.cancel.reason}${o.cancel.refund ? `, refunded ${aud(o.cancel.refund)}` : ""}` : ""}
                </span>
              </div>
              <span className="flex flex-wrap items-center gap-2">
                {o.status === "cancelled" || o.status === "refunded" ? <Pill tone="bad">{o.status === "refunded" ? "Refunded" : "Cancelled"}</Pill> : <Pill tone="info">{o.stage}</Pill>}
                <Link href={`/master/job-journeys/${encodeURIComponent(o.jobId)}`} className="text-[13px] font-semibold text-[#0B4A7A] underline">
                  Open job
                </Link>
                {!["cancelled", "refunded"].includes(o.status) && ORDER_STEPS.indexOf(o.stage) < 4 && (
                  <Btn small kind="danger" onClick={() => setCancelling(o)}>
                    Cancel / refund
                  </Btn>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {opened && (
        <Modal wide title={`${opened.ref} · ${opened.installerName}`} onClose={() => setOpened(null)}>
          <div className="flex flex-col gap-3">
            <div className="pointer-events-none opacity-90">
              <DealForm portal="admin" initial={opened} busy error={null} onSave={() => undefined} />
            </div>
            {opened.status === "review" && (
              <div className="flex justify-end gap-2 border-t border-[#E3E8EF] pt-3">
                <Btn kind="danger" onClick={() => setRejecting(opened)}>
                  Send back
                </Btn>
                <Btn onClick={() => act(opened, "approve")}>Approve: make it live</Btn>
              </div>
            )}
          </div>
        </Modal>
      )}
      {rejecting && <ReasonModal title={`Send ${rejecting.ref} back to ${rejecting.installerName}`} onClose={() => setRejecting(null)} onSubmit={(reason) => act(rejecting, "reject", { reason })} />}
      {cancelling && <CancelModal o={cancelling} onClose={() => setCancelling(null)} onDone={() => (setCancelling(null), load())} />}
    </div>
  );
}

function ReasonModal({ title, onClose, onSubmit }: { title: string; onClose: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <Modal title={title} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Field label="What needs changing" hint="The installer sees this.">
          <textarea className={`${inputCls} min-h-[90px]`} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn kind="secondary" onClick={onClose}>
            Cancel
          </Btn>
          <Btn disabled={!reason.trim()} onClick={() => onSubmit(reason.trim())}>
            Send back
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function CancelModal({ o, onClose, onDone }: { o: DealOrder; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      await market.cancelOrder("admin", o.id, { reason, refund: refund === "" ? undefined : Number(refund) });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`Cancel ${o.ref}`} onClose={onClose}>
      <div className="flex flex-col gap-3 text-[13.5px] text-[#334155]">
        <ul className="m-0 flex flex-col gap-1 rounded-[10px] bg-[#F8FAFC] p-3 pl-7">
          <li>Within 10 business days of buying, or if the site can&apos;t be installed: full refund.</li>
          <li>After that, before installation: refund less costs already incurred, itemised.</li>
        </ul>
        <Field label="Reason (sent to the customer)">
          <textarea className={`${inputCls} min-h-[70px]`} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Field label="Refund amount" hint="Leave empty to refund everything paid.">
          <input className={inputCls} type="number" min={0} value={refund} onChange={(e) => setRefund(e.target.value)} />
        </Field>
        {error && <p className="m-0 rounded-[10px] bg-[#FEF2F2] p-3 text-[#991B1B]">{error}</p>}
        <div className="flex justify-end gap-2">
          <Btn kind="secondary" onClick={onClose}>
            Keep the order
          </Btn>
          <Btn kind="danger" disabled={busy || !reason.trim()} onClick={go}>
            Cancel and refund
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
