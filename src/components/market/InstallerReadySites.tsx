"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Btn, Card, Field, inputCls, Modal, Pill } from "@/components/jobs/ui";
import { AiNotConnectedError } from "@/lib/ai-platform/client";
import { aud, market, systemLine, type PublicSite, type ReadySite } from "@/lib/ai-platform/market";
import { SiteForm, type SiteInput } from "./SiteForm";

type Data = { forSale: PublicSite[]; mine: ReadySite[] };
const STATUS: Record<string, ["neutral" | "good" | "warn" | "bad" | "info", string]> = {
  draft: ["neutral", "Draft"],
  review: ["warn", "With EasyLink"],
  live: ["info", "For sale"],
  sold: ["good", "Sold"],
  withdrawn: ["neutral", "Withdrawn"],
};

/** Installer portal → EasyLink Marketplace → Ready Sites: buy sites in your areas, or pass on customers you can't install. */
export function InstallerReadySites({ meId }: { meId?: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "offline" | "error">("loading");
  const [tab, setTab] = useState<"forSale" | "mine">("forSale");
  const [open, setOpen] = useState<PublicSite | null>(null);
  const [editing, setEditing] = useState<ReadySite | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bought, setBought] = useState<{ ref: string; jobId: string } | null>(null);

  const load = useCallback(
    () =>
      market
        .sites<Data>("installer")
        .then((d) => (setData(d), setState("ready")))
        .catch((e) => setState(e instanceof AiNotConnectedError ? "offline" : "error")),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);

  const inArea = data?.forSale.filter((s) => s.inArea).length ?? 0;
  const save = async (input: SiteInput, then: "save" | "publish" | "submit", extra?: { customerAgreed?: boolean }) => {
    setBusy(true);
    setError(null);
    try {
      const s = editing && editing !== "new" ? await market.updateSite("installer", editing.id, input) : await market.createSite("installer", input);
      if (then === "submit") await market.siteAction("installer", s.id, "submit", extra ?? {});
      setEditing(null);
      setTab("mine");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (state === "offline") return <Card title="Ready Sites">The marketplace isn&apos;t connected yet.</Card>;
  if (state === "error") return <Card title="Ready Sites">Couldn&apos;t load Ready Sites. Refresh to try again.</Card>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="m-0 text-[12px] font-bold uppercase tracking-[0.08em] text-[#0B4A7A]">EasyLink Marketplace</p>
          <h1 className="m-0 font-source-sans text-[26px] font-bold text-[#0F172A]">Ready Sites</h1>
          <p className="m-0 text-[14px] text-[#475569]">Customers ready to install. The first installer to buy gets the customer, deposit and documents as a job.</p>
        </div>
        <Btn onClick={() => (setError(null), setEditing("new"))}>Pass on a customer</Btn>
      </div>

      {inArea > 0 && tab === "forSale" && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-[#A7E3BD] bg-[#F0FDF4] p-4">
          <span className="text-[14.5px] font-semibold text-[#14532D]">
            {inArea} Ready Site{inArea === 1 ? "" : "s"} in your service areas
          </span>
          <span className="text-[13px] text-[#166534]">Shown first below</span>
        </div>
      )}

      <div role="tablist" className="flex gap-1 border-b border-[#E3E8EF]">
        {(
          [
            ["forSale", `For sale${data ? ` (${data.forSale.length})` : ""}`],
            ["mine", `Mine${data ? ` (${data.mine.length})` : ""}`],
          ] as const
        ).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`-mb-px border-b-2 px-3 py-2 text-[14px] font-semibold ${tab === k ? "border-[#0B4A7A] text-[#0B4A7A]" : "border-transparent text-[#475569] hover:text-[#0F172A]"}`}>
            {label}
          </button>
        ))}
      </div>

      {state === "loading" && <p className="m-0 text-[14px] text-[#475569]">Loading…</p>}

      {tab === "forSale" && data && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {!data.forSale.length && <p className="m-0 text-[14px] text-[#475569]">Nothing for sale right now. New sites in your areas show here first.</p>}
          {data.forSale.map((s) => (
            <Card
              key={s.id}
              tone={s.inArea ? "good" : undefined}
              title={`${s.suburb} ${s.postcode}`}
              aside={
                <span className="flex gap-1">
                  {s.inArea && <Pill tone="good">In your area</Pill>}
                  <Pill>{s.ref}</Pill>
                </span>
              }
            >
              <p className="m-0 text-[13.5px] text-[#334155]">{systemLine(s.system, s.kw)}</p>
              <div className="flex flex-wrap gap-1.5">
                {s.confirmed.payment && <Pill tone="good">Deposit paid {aud(s.confirmed.depositPaid)}</Pill>}
                {s.confirmed.installation && <Pill tone="info">Installation confirmed</Pill>}
                {s.source === "installer" && <Pill>From another installer</Pill>}
              </div>
              <dl className="m-0 grid grid-cols-3 gap-2 text-[12.5px]">
                <div>
                  <dt className="text-[#475569]">Contract</dt>
                  <dd className="m-0 text-[16px] font-bold">{aud(s.contractValue)}</dd>
                </div>
                <div>
                  <dt className="text-[#475569]">Site fee</dt>
                  <dd className="m-0 text-[16px] font-bold">{aud(s.siteFee)}</dd>
                </div>
                <div>
                  <dt className="text-[#475569]">Est. margin</dt>
                  <dd className={`m-0 text-[16px] font-bold ${(s.estimate?.margin ?? 0) < 0 ? "text-[#991B1B]" : "text-[#166534]"}`}>{aud(s.estimate?.margin ?? 0)}</dd>
                </div>
              </dl>
              <div className="flex justify-end">
                <Btn
                  onClick={() => {
                    setError(null);
                    setOpen(s);
                    void market.siteAction("installer", s.id, "view").catch(() => undefined);
                  }}
                >
                  View and buy
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "mine" && data && (
        <div className="flex flex-col gap-2">
          {!data.mine.length && <p className="m-0 text-[14px] text-[#475569]">Sites you&apos;ve bought or passed on show here.</p>}
          {data.mine.map((s) => {
            const [tone, label] = STATUS[s.status] ?? ["neutral", s.status];
            const iBought = !!s.buyer && s.buyer.id === meId;
            const mineToSell = s.createdBy.id === meId;
            return (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-[#E3E8EF] bg-white p-3">
                <div className="flex min-w-0 flex-col">
                  <span className="text-[14.5px] font-semibold text-[#0F172A]">
                    {s.ref} · {s.customer?.name ?? ""} · {s.suburb} {s.postcode}
                  </span>
                  <span className="text-[12.5px] text-[#475569]">
                    {systemLine(s.system)} · contract {aud(s.contractValue)} · fee {aud(s.siteFee)}
                    {s.review?.note && s.status === "draft" ? ` · EasyLink: ${s.review.note}` : ""}
                  </span>
                </div>
                <span className="flex flex-wrap items-center gap-2">
                  <Pill tone={iBought ? "good" : tone}>{iBought ? "Bought" : label}</Pill>
                  {s.buyer?.jobId && (
                    <Link className="text-[13px] font-semibold text-[#0B4A7A] underline" href={`/installers/dashboard/jobs/${encodeURIComponent(s.buyer.jobId)}`}>
                      Open job
                    </Link>
                  )}
                  {["draft", "review"].includes(s.status) && mineToSell && (
                    <Btn small kind="secondary" onClick={() => (setError(null), setEditing(s))}>
                      Edit
                    </Btn>
                  )}
                  {["draft", "review", "live"].includes(s.status) && mineToSell && (
                    <Btn small kind="danger" onClick={() => market.siteAction("installer", s.id, "withdraw").then(load)}>
                      Withdraw
                    </Btn>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {open && <BuySite s={open} onClose={() => setOpen(null)} onBought={(jobId) => (setBought({ ref: open.ref, jobId }), setOpen(null), load())} />}
      {bought && (
        <Modal title="Ready Site bought" onClose={() => setBought(null)}>
          <div className="flex flex-col gap-3 text-[14.5px] text-[#0F172A]">
            <p className="m-0">{bought.ref} is yours. The customer is now in your Customers and Jobs, and we&apos;ve told them you&apos;ll be in touch.</p>
            <Link href={`/installers/dashboard/jobs/${encodeURIComponent(bought.jobId)}`} className="w-fit rounded-[10px] bg-[#0B4A7A] px-4 py-2 text-[14px] font-semibold text-white">
              Open the job
            </Link>
          </div>
        </Modal>
      )}
      {editing && (
        <Modal wide title={editing === "new" ? "Pass on a customer as a Ready Site" : `Edit ${editing.ref}`} onClose={() => setEditing(null)}>
          <p className="mb-3 mt-0 text-[13.5px] text-[#475569]">For customers you can&apos;t install yourself. EasyLink checks the spec and price, then offers it to other installers; you&apos;re paid the site fee less EasyLink&apos;s commission when it sells.</p>
          <SiteForm initial={editing === "new" ? undefined : editing} staff={false} busy={busy} error={error} onSave={save} />
        </Modal>
      )}
    </div>
  );
}

function BuySite({ s, onClose, onBought }: { s: PublicSite; onClose: () => void; onBought: (jobId: string) => void }) {
  const e = s.estimate;
  const [kit, setKit] = useState(e?.kit ?? 0);
  const [labour, setLabour] = useState(e?.labour ?? 0);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const margin = Math.round((e?.contractExGst ?? 0) - kit - labour - (e?.siteFeeExGst ?? 0));
  const buy = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await market.siteAction<{ jobId: string }>("installer", s.id, "buy", { agree: true });
      onBought(r.jobId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal wide title={`${s.ref} · ${s.suburb} ${s.state} ${s.postcode}`} onClose={onClose}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2 text-[14px] text-[#334155]">
          <p className="m-0 font-semibold text-[#0F172A]">{systemLine(s.system, s.kw)}</p>
          <p className="m-0">{[s.roof && `${s.roof} roof`, s.storeys, s.phases === 3 ? "Three-phase" : "Single-phase"].filter(Boolean).join(" · ")}</p>
          {s.confirmed.payment && <p className="m-0">Deposit already paid: {aud(s.confirmed.depositPaid)} (moves to your job)</p>}
          {s.confirmed.installation && (
            <p className="m-0">
              Installation confirmed{s.confirmed.windowFrom ? ` for ${day(s.confirmed.windowFrom)}${s.confirmed.windowTo ? ` to ${day(s.confirmed.windowTo)}` : ""}` : ""}
            </p>
          )}
          {s.documents.length > 0 && <p className="m-0">Documents: {s.documents.join(", ")}</p>}
          <p className="m-0 text-[12.5px] text-[#475569]">You see the customer&apos;s name and contact details once you&apos;ve bought the site.</p>
        </div>
        <div className="flex flex-col gap-2 rounded-[12px] bg-[#F8FAFC] p-3 text-[13.5px]">
          <p className="m-0 font-bold text-[#0F172A]">Your numbers (ex GST)</p>
          <Row k="Customer contract" v={aud(e?.contractExGst ?? 0)} />
          <Field label="Your kit cost">
            <input className={inputCls} type="number" value={kit} onChange={(x) => setKit(Number(x.target.value) || 0)} />
          </Field>
          <Field label="Your labour">
            <input className={inputCls} type="number" value={labour} onChange={(x) => setLabour(Number(x.target.value) || 0)} />
          </Field>
          <Row k="Site fee" v={`−${aud(e?.siteFeeExGst ?? 0)}`} />
          <Row k="Estimated margin" v={aud(margin)} strong bad={margin < 0} />
          <p className="m-0 text-[12px] text-[#475569]">{e?.note}</p>
        </div>
      </div>
      <label className="mt-4 flex items-start gap-2 text-[13.5px] text-[#0F172A]">
        <input type="checkbox" className="mt-0.5" checked={agree} onChange={(x) => setAgree(x.target.checked)} />
        I&apos;ll install this system at the agreed price and pay the {aud(s.siteFee)} site fee (incl. GST) to EasyLink.
      </label>
      {error && <p className="mb-0 mt-3 rounded-[10px] bg-[#FEF2F2] p-3 text-[13.5px] text-[#991B1B]">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Btn kind="secondary" onClick={onClose}>
          Not now
        </Btn>
        <Btn disabled={!agree || busy} onClick={buy}>
          {busy ? "Buying…" : `Buy for ${aud(s.siteFee)}`}
        </Btn>
      </div>
    </Modal>
  );
}

const day = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });

function Row({ k, v, strong, bad }: { k: string; v: string; strong?: boolean; bad?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "border-t border-[#E3E8EF] pt-2 font-bold" : ""}`}>
      <span className="text-[#475569]">{k}</span>
      <span className={bad ? "text-[#991B1B]" : "text-[#0F172A]"}>{v}</span>
    </div>
  );
}
