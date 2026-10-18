"use client";

import { useEffect, useState } from "react";

type ReadyLead = {
  id: string;
  name: string;
  address: string | null;
  summary: string;
};

type OfferOut = {
  id: string;
  leadName: string;
  leadSummary: string;
  sentTo: string[];
  expiresAt: string;
};

type InstallerMatch = {
  id: string;
  name: string;
  matchedServiceArea: boolean;
  warnings: string[];
};

function formatExpiry(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return "Expired";
  const hours = Math.floor(diffMs / 3_600_000);
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
  if (hours > 0) return `Expires in ${hours}h ${minutes}m`;
  return `Expires in ${minutes}m`;
}

export function MasterDispatch() {
  const [ready, setReady] = useState<ReadyLead[] | null>(null);
  const [offers, setOffers] = useState<OfferOut[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedLead, setSelectedLead] = useState<ReadyLead | null>(null);
  const [matches, setMatches] = useState<InstallerMatch[] | null>(null);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  const [suggestedDate, setSuggestedDate] = useState("");
  const [responseWindowHours, setResponseWindowHours] = useState(24);
  const [payoutAmount, setPayoutAmount] = useState("");

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentNotice, setSentNotice] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const loadLists = () => {
    setListError(null);
    Promise.all([
      fetch("/api/admin/dispatch/ready").then((r) => r.json()),
      fetch("/api/admin/dispatch/offers").then((r) => r.json()),
    ])
      .then(([readyJson, offersJson]) => {
        if (!readyJson.success) throw new Error(readyJson.message ?? "Failed to load ready leads");
        if (!offersJson.success) throw new Error(offersJson.message ?? "Failed to load offers");
        setReady(readyJson.data ?? []);
        setOffers(offersJson.data ?? []);
      })
      .catch((err) => setListError(err instanceof Error ? err.message : "Failed to load dispatch data"));
  };

  useEffect(loadLists, []);

  const selectLead = (lead: ReadyLead) => {
    setSelectedLead(lead);
    setMatches(null);
    setMatchesError(null);
    setPicked({});
    setSentNotice(null);
    setSendError(null);

    fetch(`/api/admin/dispatch/leads/${lead.id}/matches`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) throw new Error(json.message ?? "Failed to load matches");
        setMatches(json.data ?? []);
      })
      .catch((err) =>
        setMatchesError(err instanceof Error ? err.message : "Failed to load matches"),
      );
  };

  const pickedIds = Object.entries(picked)
    .filter(([, v]) => v)
    .map(([id]) => id);

  const sendOffer = () => {
    if (!selectedLead || pickedIds.length === 0) return;
    setSending(true);
    setSendError(null);
    fetch("/api/admin/dispatch/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: selectedLead.id,
        installerIds: pickedIds,
        suggestedDate: suggestedDate.trim() || undefined,
        responseWindowHours,
        payoutAmount: payoutAmount.trim() ? Number(payoutAmount) : undefined,
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) throw new Error(json.message ?? "Failed to send offer");
        setSentNotice(`Offer sent to ${pickedIds.length} installer(s).`);
        setSelectedLead(null);
        setMatches(null);
        setPicked({});
        loadLists();
      })
      .catch((err) => setSendError(err instanceof Error ? err.message : "Failed to send offer"))
      .finally(() => setSending(false));
  };

  const assignCrew = (installerId: string) => {
    if (!selectedLead) return;
    setAssigningId(installerId);
    setSendError(null);
    fetch(`/api/admin/dispatch/leads/${selectedLead.id}/assign-crew`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ installerId }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) throw new Error(json.message ?? "Failed to assign");
        setSentNotice("Lead assigned directly.");
        setSelectedLead(null);
        setMatches(null);
        setPicked({});
        loadLists();
      })
      .catch((err) => setSendError(err instanceof Error ? err.message : "Failed to assign"))
      .finally(() => setAssigningId(null));
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Installer network <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Dispatch</span>
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-[18px] px-8 py-6 pb-14">
        <div>
          <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
            Dispatch to installers
          </h1>
          <p className="mt-1 max-w-[70ch] text-[13px] leading-[20px] text-[#5B6B80]">
            Send a won lead to matched installers. The first to accept gets
            it — or assign your own crew directly. Installer service areas
            and accreditation warnings are real; there&apos;s no automated
            offer-expiry escalation, SMS/push delivery, or AI ranking behind
            this yet.
          </p>
        </div>

        {listError ? (
          <p
            role="alert"
            className="rounded-[10px] border border-red-300 bg-red-50 px-3 py-2 text-[13px] text-red-700"
          >
            {listError}
          </p>
        ) : null}
        {sentNotice ? (
          <p
            role="status"
            className="rounded-[10px] border border-green-300 bg-green-50 px-3 py-2 text-[13px] font-semibold text-green-700"
          >
            {sentNotice}
          </p>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div className="flex flex-col gap-4">
            <section
              aria-label="Ready to dispatch"
              className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
            >
              <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Ready to dispatch</h2>
              {ready === null ? (
                <p className="text-[13px] text-[#5B6B80]">Loading…</p>
              ) : ready.length === 0 ? (
                <p className="text-[13px] text-[#5B6B80]">
                  No won leads waiting on dispatch right now.
                </p>
              ) : (
                ready.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => selectLead(lead)}
                    className={`flex items-center gap-2.5 rounded-[10px] p-2.5 text-left transition ${
                      selectedLead?.id === lead.id ? "bg-[#FFF7E6]" : "hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <span className="flex flex-grow flex-col">
                      <strong className="text-[14px] text-[#0F172A]">{lead.name}</strong>
                      <span className="text-[12px] text-[#5B6B80]">
                        {lead.address ?? "No address on file"} · {lead.summary}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </section>

            <section
              aria-label="Offers out"
              className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
            >
              <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Offers out</h2>
              {offers === null ? (
                <p className="text-[13px] text-[#5B6B80]">Loading…</p>
              ) : offers.length === 0 ? (
                <p className="text-[13px] text-[#5B6B80]">No offers currently out.</p>
              ) : (
                offers.map((offer) => (
                  <div
                    key={offer.id}
                    className="flex flex-col gap-1 border-b border-[#EEF2F6] py-2.5 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <strong className="flex-grow text-[14px] text-[#0F172A]">
                        {offer.leadName}
                      </strong>
                      <span className="text-[12px] font-bold text-[#B45309]">
                        {formatExpiry(offer.expiresAt)}
                      </span>
                    </div>
                    <span className="text-[12px] text-[#475569]">
                      Sent to {offer.sentTo.join(", ") || "—"}
                    </span>
                  </div>
                ))
              )}
              <span className="text-[12px] text-[#475569]">
                No automated re-escalation to further installers yet if nobody
                responds — that needs a background job, not built here.
              </span>
            </section>
          </div>

          <section
            aria-label="Match installers"
            className="flex flex-col gap-3.5 rounded-[14px] border border-[#E3E8EF] bg-white p-5"
          >
            {!selectedLead ? (
              <p className="text-[13px] text-[#5B6B80]">
                Select a lead from &ldquo;Ready to dispatch&rdquo; to match it
                with installers.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="m-0 flex-grow text-[20px] font-bold text-[#0F172A]">
                    {selectedLead.name}
                  </h2>
                </div>
                <span className="text-[14px] text-[#334155]">
                  {selectedLead.address ?? "No address on file"} · {selectedLead.summary}
                </span>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="suggested-date" className="text-[12px] font-semibold text-[#475569]">
                      Suggested date
                    </label>
                    <input
                      id="suggested-date"
                      type="date"
                      value={suggestedDate}
                      onChange={(e) => setSuggestedDate(e.target.value)}
                      className="h-10 rounded-[10px] border border-[#CBD5E1] px-2.5 text-[13px]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="response-window" className="text-[12px] font-semibold text-[#475569]">
                      Respond within
                    </label>
                    <select
                      id="response-window"
                      value={responseWindowHours}
                      onChange={(e) => setResponseWindowHours(Number(e.target.value))}
                      className="h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-2.5 text-[13px]"
                    >
                      <option value={4}>4 hours</option>
                      <option value={24}>24 hours</option>
                      <option value={48}>48 hours</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="payout" className="text-[12px] font-semibold text-[#475569]">
                      Installer payout ($)
                    </label>
                    <input
                      id="payout"
                      type="number"
                      min={0}
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      placeholder="Optional"
                      className="h-10 rounded-[10px] border border-[#CBD5E1] px-2.5 text-[13px]"
                    />
                  </div>
                </div>

                <h3 className="m-0 mt-1 text-[14px] font-bold text-[#0F172A]">
                  Matched installers · pick up to 3
                </h3>

                {matchesError ? (
                  <p role="alert" className="text-[13px] text-red-700">
                    {matchesError}
                  </p>
                ) : matches === null ? (
                  <p className="text-[13px] text-[#5B6B80]">Loading…</p>
                ) : matches.length === 0 ? (
                  <p className="text-[13px] text-[#5B6B80]">No installers on file yet.</p>
                ) : (
                  matches.map((m) => {
                    const checked = !!picked[m.id];
                    const atLimit = pickedIds.length >= 3 && !checked;
                    return (
                      <div
                        key={m.id}
                        className={`flex items-start gap-3 rounded-[12px] border p-3 ${
                          checked ? "border-[#F68A0A] bg-[#FFF7E6]" : "border-[#E3E8EF] bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={atLimit}
                          onChange={() =>
                            setPicked((prev) => ({ ...prev, [m.id]: !prev[m.id] }))
                          }
                          className="mt-0.5 size-5 accent-[#F68A0A]"
                          aria-label={`Include ${m.name} in the offer`}
                        />
                        <div className="flex flex-grow flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-[14px] text-[#0F172A]">{m.name}</strong>
                            <span className="text-[12px] text-[#5B6B80]">
                              {m.matchedServiceArea
                                ? "Covers this area"
                                : "No matching service area on file"}
                            </span>
                          </div>
                          {m.warnings.map((w) => (
                            <span key={w} className="text-[12px] font-semibold text-[#92400E]">
                              {w}
                            </span>
                          ))}
                        </div>
                        <button
                          type="button"
                          disabled={assigningId === m.id}
                          onClick={() => assignCrew(m.id)}
                          className="h-8 shrink-0 rounded-[8px] border border-[#CBD5E1] px-2.5 text-[12px] font-semibold text-[#0F172A] hover:bg-[#F8FAFC] disabled:opacity-50"
                        >
                          {assigningId === m.id ? "Assigning…" : "Assign directly"}
                        </button>
                      </div>
                    );
                  })
                )}

                {sendError ? (
                  <p role="alert" className="text-[13px] text-red-700">
                    {sendError}
                  </p>
                ) : null}

                <button
                  type="button"
                  disabled={pickedIds.length === 0 || sending}
                  onClick={sendOffer}
                  className="h-11 rounded-[10px] bg-[#F68A0A] px-5 text-[14px] font-bold text-[#3B1D00] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? "Sending…" : `Send offer to ${pickedIds.length || ""}`.trim()}
                </button>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
