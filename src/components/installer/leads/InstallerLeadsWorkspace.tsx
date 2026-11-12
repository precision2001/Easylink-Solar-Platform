"use client";

import Link from "next/link";
import { customerRecordHref } from "@/components/contact-centre/api";
import classNames from "classnames";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePollingResource } from "@/hooks/usePollingResource";
import {
  assignInstallerLead,
  fetchAssignableUsersForLeads,
  fetchInstallerLeadDetail,
  fetchInstallerLeads,
  formatPersonName,
  INSTALLER_LEAD_STATUSES,
  invalidateInstallerLeadsListCache,
  type InstallerLeadStatus,
  type InstallerLeadSummary,
  patchInstallerLead,
  type AssignableUser,
} from "@/lib/installers/leads";
import { useAppSelector } from "@/lib/store/hooks";

const PAGE_SIZE = 15;
const SEARCH_DEBOUNCE_MS = 400;

function useDebouncedValue<T>(value: T, delay: number): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={classNames(
        "inline-flex max-w-full truncate rounded-md px-2 py-0.5 font-dm-sans text-[10px] font-bold uppercase tracking-wide",
        status === "WON" || status === "QUALIFIED"
          ? "bg-amber-200/80 text-warm-black"
          : "bg-sky-100 text-slate-800",
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function InstallerLeadsWorkspace() {
  const role = useAppSelector((s) => s.installerAuth.user?.role);
  const currentUserId = useAppSelector((s) => s.installerAuth.user?.id);
  const isAdmin = role === "ADMIN";

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<InstallerLeadStatus | "">(
    "",
  );
  const [searchInput, setSearchInput] = useState("");
  const searchDebounced = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const [assignedToFilter, setAssignedToFilter] = useState("");

  const [list, setList] = useState<InstallerLeadSummary[]>([]);
  const [listMeta, setListMeta] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InstallerLeadSummary | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [assignees, setAssignees] = useState<AssignableUser[]>([]);
  const [notesDraft, setNotesDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<InstallerLeadStatus | "">("");
  const [assignDraft, setAssignDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const listParamsRef = useRef({
    page,
    limit: PAGE_SIZE,
    status: statusFilter || undefined,
    search: searchDebounced || undefined,
    assignedToId: isAdmin ? assignedToFilter || undefined : undefined,
  });
  listParamsRef.current = {
    page,
    limit: PAGE_SIZE,
    status: statusFilter || undefined,
    search: searchDebounced || undefined,
    assignedToId: isAdmin ? assignedToFilter || undefined : undefined,
  };

  const loadSeqRef = useRef(0);

  const refreshList = useCallback(
    async (opts?: {
      silent?: boolean;
      signal?: AbortSignal;
      force?: boolean;
    }) => {
      const loadSeq = ++loadSeqRef.current;
      const isStale = () => loadSeq !== loadSeqRef.current;

      const silent = opts?.silent ?? false;
      const params = listParamsRef.current;
      if (opts?.force) {
        invalidateInstallerLeadsListCache(params);
      }
      if (!silent) {
        setListLoading(true);
      }
      setListError(null);
      try {
        const result = await fetchInstallerLeads(params, {
          signal: opts?.signal,
        });
        if (isStale()) return;
        setList(result.leads);
        setListMeta(
          result.meta
            ? {
                page: result.meta.page,
                limit: result.meta.limit,
                total: result.meta.total,
                totalPages: result.meta.totalPages,
              }
            : null,
        );
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (isStale()) return;
        setListError(e instanceof Error ? e.message : "Could not load leads");
        setList([]);
        setListMeta(null);
      } finally {
        if (!isStale() && !silent) setListLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    void refreshList({ signal: controller.signal });
    return () => {
      controller.abort();
    };
  }, [
    page,
    statusFilter,
    searchDebounced,
    assignedToFilter,
    isAdmin,
    refreshList,
  ]);

  usePollingResource(
    useCallback(
      async (signal) => {
        await refreshList({ silent: true, signal });
      },
      [refreshList],
    ),
    { skipInitialTick: true, refetchOnWindowFocus: false },
  );

  useEffect(() => {
    if (!selectedId || listLoading) return;
    if (!list.some((l) => l.id === selectedId)) {
      setSelectedId(null);
    }
  }, [list, listLoading, selectedId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const users = await fetchAssignableUsersForLeads();
        if (!cancelled) setAssignees(users);
      } catch {
        if (!cancelled) setAssignees([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    void (async () => {
      try {
        const d = await fetchInstallerLeadDetail(selectedId);
        if (cancelled) return;
        setDetail(d);
        setNotesDraft(d.notes ?? "");
        setStatusDraft(
          INSTALLER_LEAD_STATUSES.includes(d.status as InstallerLeadStatus)
            ? (d.status as InstallerLeadStatus)
            : "NEW",
        );
        setAssignDraft(d.assignedToId ?? d.assignedTo?.id ?? "");
      } catch (e) {
        if (!cancelled) {
          setDetailError(
            e instanceof Error ? e.message : "Could not load lead details",
          );
          setDetail(null);
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const totalPages = listMeta?.totalPages ?? 1;

  const assigneeOptions = useMemo(() => {
    const map = new Map<string, AssignableUser>();
    for (const u of assignees) map.set(u.id, u);
    return Array.from(map.values()).sort((a, b) =>
      formatPersonName(a).localeCompare(formatPersonName(b)),
    );
  }, [assignees]);

  const handleSaveLead = async () => {
    if (!selectedId || !detail) return;
    setSaving(true);
    setDetailError(null);
    try {
      const status =
        statusDraft && INSTALLER_LEAD_STATUSES.includes(statusDraft)
          ? statusDraft
          : undefined;
      await patchInstallerLead(selectedId, {
        ...(status ? { status } : {}),
        notes: notesDraft,
      });
      await refreshList({ force: true });
      const fresh = await fetchInstallerLeadDetail(selectedId);
      setDetail(fresh);
      setNotesDraft(fresh.notes ?? "");
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedId || !assignDraft) return;
    setAssigning(true);
    setDetailError(null);
    try {
      await assignInstallerLead(selectedId, assignDraft);
      await refreshList({ force: true });
      const fresh = await fetchInstallerLeadDetail(selectedId);
      setDetail(fresh);
      setAssignDraft(fresh.assignedToId ?? fresh.assignedTo?.id ?? "");
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Assign failed");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <section
      className="rounded-[11px] border border-warm-border bg-white shadow-sm"
      aria-label="Leads"
    >
      <div className="border-b border-warm-border bg-cream-50 px-4 py-3 md:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-inter text-base font-bold uppercase tracking-wide text-warm-ink">
              Leads
            </h2>
            <p className="mt-1 font-dm-sans text-xs text-warm-gray">
              Filter and manage assigned leads. Changes sync to the server after
              you save.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshList({ force: true })}
            disabled={listLoading}
            className="shrink-0 rounded-md border border-warm-border bg-white px-2 py-1 font-dm-sans text-[10px] font-semibold text-navy-800 shadow-sm hover:bg-cream-50 disabled:opacity-50"
            aria-label="Refresh leads list"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-b border-warm-border bg-white px-4 py-3 md:flex-row md:flex-wrap md:items-end md:gap-3 md:px-5">
        <label className="flex min-w-[140px] flex-1 flex-col gap-1 font-dm-sans text-xs font-medium text-warm-ink">
          Status
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(
                (e.target.value as InstallerLeadStatus | "") || "",
              );
            }}
            className="h-10 rounded-lg border border-warm-border bg-white px-2 text-sm text-warm-ink outline-none focus:border-brand-blue"
          >
            <option value="">All statuses</option>
            {INSTALLER_LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[180px] flex-2 flex-col gap-1 font-dm-sans text-xs font-medium text-warm-ink">
          Search
          <input
            type="search"
            value={searchInput}
            onChange={(e) => {
              setPage(1);
              setSearchInput(e.target.value);
            }}
            placeholder="Name, email, address…"
            autoComplete="off"
            className="h-10 rounded-lg border border-warm-border bg-white px-3 text-sm text-warm-ink outline-none placeholder:text-warm-gray/70 focus:border-brand-blue"
          />
        </label>

        {isAdmin ? (
          <label className="flex min-w-[180px] flex-1 flex-col gap-1 font-dm-sans text-xs font-medium text-warm-ink">
            Assigned to
            <select
              value={assignedToFilter}
              onChange={(e) => {
                setPage(1);
                setAssignedToFilter(e.target.value);
              }}
              className="h-10 rounded-lg border border-warm-border bg-white px-2 text-sm text-warm-ink outline-none focus:border-brand-blue"
            >
              <option value="">Everyone</option>
              {assigneeOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {formatPersonName(u)} ({u.role})
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {listError ? (
        <div
          className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-dm-sans text-sm text-red-800 md:mx-5"
          role="alert"
        >
          {listError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
        <div className="min-w-0 overflow-x-auto border-warm-border lg:border-r">
          {listLoading ? (
            <p className="px-4 py-8 text-center font-dm-sans text-sm text-warm-gray">
              Loading leads…
            </p>
          ) : list.length === 0 ? (
            <p className="px-4 py-8 text-center font-dm-sans text-sm text-warm-gray">
              No leads match your filters.
            </p>
          ) : (
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead>
                <tr className="border-b border-warm-border bg-cream-50 font-dm-sans text-[11px] font-bold uppercase tracking-wide text-warm-gray">
                  <th className="px-3 py-2 md:px-4">Customer</th>
                  <th className="px-3 py-2 md:px-4">Status</th>
                  <th className="hidden px-3 py-2 sm:table-cell md:px-4">
                    Assigned
                  </th>
                  <th className="hidden px-3 py-2 lg:table-cell md:px-4">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => {
                  const selected = row.id === selectedId;
                  return (
                    <tr
                      key={row.id}
                      className={classNames(
                        "cursor-pointer border-b border-warm-border/80 font-dm-sans text-sm transition-colors",
                        selected ? "bg-sky-wash/80" : "hover:bg-cream-50/90",
                      )}
                      onClick={() => setSelectedId(row.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedId(row.id);
                        }
                      }}
                      tabIndex={0}
                      aria-label={`Lead ${row.customerName}, ${row.status}`}
                    >
                      <td className="max-w-[200px] px-3 py-2.5 md:px-4">
                        <span className="block truncate font-medium text-warm-ink">
                          {row.customerName}
                        </span>
                        {row.customerEmail ? (
                          <span className="mt-0.5 block truncate text-xs text-warm-gray">
                            {row.customerEmail}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 md:px-4">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="hidden px-3 py-2.5 sm:table-cell md:px-4">
                        <span className="text-xs text-warm-ink">
                          {row.assignedTo
                            ? formatPersonName(row.assignedTo)
                            : "—"}
                        </span>
                      </td>
                      <td className="hidden px-3 py-2.5 text-xs text-warm-gray lg:table-cell md:px-4">
                        {row.updatedAt
                          ? formatDistanceToNow(new Date(row.updatedAt), {
                              addSuffix: true,
                            })
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {listMeta && totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-warm-border px-4 py-3 font-dm-sans text-xs text-warm-ink">
              <span>
                Page {listMeta.page} of {totalPages} ({listMeta.total} total)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || listLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-warm-border bg-white px-3 py-1.5 font-medium hover:bg-cream-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || listLoading}
                  onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
                  className="rounded-lg border border-warm-border bg-white px-3 py-1.5 font-medium hover:bg-cream-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="min-w-0 border-t border-warm-border bg-cream-50/50 p-4 lg:border-t-0">
          {!selectedId ? (
            <p className="font-dm-sans text-sm text-warm-gray">
              Select a lead to view details, update status and notes, or
              reassign.
            </p>
          ) : detailLoading ? (
            <p className="font-dm-sans text-sm text-warm-gray">
              Loading details…
            </p>
          ) : detailError && !detail ? (
            <p className="font-dm-sans text-sm text-red-700" role="alert">
              {detailError}
            </p>
          ) : detail ? (
            <div className="flex flex-col gap-4">
              <div>
                <h3
                  className="font-inter text-lg font-bold text-warm-ink"
                  data-clarity-mask="true"
                >
                  {detail.customerName}
                </h3>
                <Link
                  href={customerRecordHref("installers", detail.id)}
                  className="mt-1 inline-block font-inter text-sm font-semibold text-[#1565C0] no-underline hover:underline"
                >
                  Open customer record →
                </Link>
                {detail.customerEmail ? (
                  <p
                    className="mt-1 font-dm-sans text-sm text-warm-gray"
                    data-clarity-mask="true"
                  >
                    {detail.customerEmail}
                  </p>
                ) : null}
                {detail.address ? (
                  <p
                    className="mt-1 font-dm-sans text-sm text-warm-ink"
                    data-clarity-mask="true"
                  >
                    {detail.address}
                  </p>
                ) : null}
              </div>

              {detailError ? (
                <p
                  className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 font-dm-sans text-xs text-amber-900"
                  role="status"
                >
                  {detailError}
                </p>
              ) : null}

              <label className="flex flex-col gap-1 font-dm-sans text-xs font-medium text-warm-ink">
                Status
                <select
                  value={statusDraft}
                  onChange={(e) =>
                    setStatusDraft(e.target.value as InstallerLeadStatus)
                  }
                  className="h-10 rounded-lg border border-warm-border bg-white px-2 text-sm"
                >
                  {INSTALLER_LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 font-dm-sans text-xs font-medium text-warm-ink">
                Notes
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  rows={5}
                  className="resize-y rounded-lg border border-warm-border bg-white p-2 text-sm text-warm-ink outline-none focus:border-brand-blue"
                />
              </label>

              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveLead()}
                className="h-10 rounded-lg bg-linear-to-b from-yellow-lemon to-orange-amber font-dm-sans text-sm font-semibold text-warm-black shadow-sm hover:opacity-95 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save status & notes"}
              </button>

              <div className="border-t border-warm-border pt-4">
                <p className="font-dm-sans text-xs font-semibold uppercase tracking-wide text-warm-gray">
                  Assign / reassign
                </p>
                <label className="mt-2 flex flex-col gap-1 font-dm-sans text-xs font-medium text-warm-ink">
                  Assignee
                  <select
                    value={assignDraft}
                    onChange={(e) => setAssignDraft(e.target.value)}
                    className="h-10 rounded-lg border border-warm-border bg-white px-2 text-sm"
                  >
                    <option value="">Select user…</option>
                    {assigneeOptions.map((u) => (
                      <option key={u.id} value={u.id}>
                        {formatPersonName(u)} ({u.role})
                        {u.id === currentUserId ? " — you" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={assigning || !assignDraft}
                  onClick={() => void handleAssign()}
                  className="mt-2 h-9 w-full rounded-lg border border-warm-border bg-white font-dm-sans text-sm font-medium text-warm-ink hover:bg-cream-50 disabled:opacity-50"
                >
                  {assigning ? "Updating…" : "Apply assignment"}
                </button>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
