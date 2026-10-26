"use client";

import { useState } from "react";
import { Btn, Field, inputCls, Modal, Pill } from "@/components/jobs/ui";
import { AU_STATES, callLists, csvToRows, type UploadResult } from "./api";

/**
 * Upload a CSV of people to call. Columns are matched by name (Name or First
 * name + Last name, Phone or Mobile, Email, Address, Suburb, State, Postcode,
 * Notes); each row matches an existing lead by phone or email or becomes a new
 * lead tagged with the list name.
 */
export function UploadCallList({ onClose, onDone }: { onClose: () => void; onDone: (r: UploadResult) => void }) {
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [file, setFile] = useState<{ fileName: string; rows: Record<string, string>[]; columns: string[]; ignored: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const read = async (f: File | undefined) => {
    setError(null);
    if (!f) return;
    if (f.size > 5_000_000) return setError("That file is over 5 MB. Split it into smaller lists.");
    const parsed = csvToRows(await f.text());
    if (!parsed.rows.length) return setError("No rows found. The first line should be the column names.");
    if (!parsed.columns.includes("phone") && !parsed.columns.includes("email")) {
      return setError("No Phone, Mobile or Email column found. Rename the column and try again.");
    }
    setFile({ fileName: f.name, ...parsed });
    if (!name) setName(f.name.replace(/\.csv$/i, ""));
  };

  const submit = async () => {
    if (!file) return;
    if (file.rows.length > 5000) return setError("Upload at most 5,000 rows at a time.");
    setBusy(true);
    setError(null);
    try {
      const r = await callLists.upload({ name: name.trim(), state: state || undefined, rows: file.rows });
      setResult(r);
      onDone(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Upload a call list" onClose={onClose}>
      {result ? (
        <div className="flex flex-col gap-3 text-[14px] text-[#334155]">
          <p className="m-0">
            <b>{result.entries}</b> {result.entries === 1 ? "person" : "people"} added to &ldquo;{result.name}&rdquo;: {result.created} new{" "}
            {result.created === 1 ? "lead" : "leads"}, {result.matched} already in the system
            {result.duplicates ? `, ${result.duplicates} duplicate ${result.duplicates === 1 ? "row" : "rows"} merged` : ""}.
          </p>
          {result.skipped.length > 0 && (
            <div className="rounded-[10px] bg-[#FEF3C7] p-3 text-[13px] text-[#92400E]">
              {result.skipped.length} {result.skipped.length === 1 ? "row was" : "rows were"} left out:{" "}
              {result.skipped.slice(0, 8).map((s) => `row ${s.row} (${s.reason.toLowerCase()})`).join(", ")}
              {result.skipped.length > 8 ? ", …" : ""}
            </div>
          )}
          <div className="flex justify-end">
            <Btn onClick={onClose}>Done</Btn>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="m-0 text-[13px] leading-[19px] text-[#475569]">
            A CSV file with a header row. Recognised columns: Name (or First name and Last name), Phone or Mobile, Email, Address, Suburb, State, Postcode, Notes.
            People already in the system are matched by phone or email, not added twice.
          </p>
          <Field label="CSV file">
            <input id="call-list-file" className={inputCls} type="file" accept=".csv,text/csv" onChange={(e) => void read(e.target.files?.[0])} />
          </Field>
          {file && (
            <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-[#334155]">
              <span>
                {file.rows.length} {file.rows.length === 1 ? "row" : "rows"} · using
              </span>
              {file.columns.map((c) => (
                <Pill key={c} tone="info">
                  {c}
                </Pill>
              ))}
              {file.ignored.length > 0 && <span className="text-[#64748B]">· ignoring {file.ignored.join(", ")}</span>}
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
            <Field label="List name">
              <input id="call-list-name" className={inputCls} maxLength={120} value={name} placeholder="e.g. Sydney expo October" onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="State (optional)">
              <select id="call-list-state" className={inputCls} value={state} onChange={(e) => setState(e.target.value)}>
                <option value="">Mixed</option>
                {AU_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {error && <p className="m-0 rounded-[10px] bg-[#FEF2F2] p-3 text-[13px] text-[#991B1B]">{error}</p>}
          <div className="flex justify-end gap-2">
            <Btn kind="secondary" onClick={onClose}>
              Cancel
            </Btn>
            <Btn disabled={!file || !name.trim() || busy} onClick={() => void submit()}>
              {busy ? "Uploading…" : file ? `Add ${file.rows.length} ${file.rows.length === 1 ? "person" : "people"}` : "Add to list"}
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}
