"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  createPartnerSite,
  deactivatePartnerSite,
  fetchPartnerSites,
  updatePartnerSite,
  type InstallerPartnerSite,
} from "@/lib/installers/partner-sites";
import {
  EMPTY_DRAFT,
  PartnerSiteForm,
  draftFromSite,
  parseOrigins,
  type PartnerSiteDraft,
} from "@/components/installer/partner-site/PartnerSiteForm";
import { PartnerSiteCard } from "@/components/installer/partner-site/PartnerSiteCard";

/**
 * "Designer on my website" — the installer's own Platform Designer, hosted by
 * EasyLink and branded as theirs.
 *
 * Every row on this screen is real: the sites, colours and allowed addresses
 * come from the installer's own records, and the snippets are the live ones.
 *
 * The one thing shown but not editable is white label. Whether the page
 * carries "Powered by EasyLink Solar" follows the installer's plan, which
 * EasyLink sets, so it is reported as a fact rather than offered as a switch
 * the installer could flip for themselves.
 */

const INK = "#0F172A";
const MUTED = "#5B6B80";
const SLATE = "#475569";
const BORDER = "#E3E8EF";
const BORDER_2 = "#CBD5E1";
const SUN = "#F68A0A";
const SUN_INK = "#3B1D00";

type Editing =
  | { mode: "none" }
  | { mode: "create" }
  | { mode: "edit"; id: string };

/** Only the fields that changed are sent, so an untouched colour is not re-saved. */
function changedFields(
  draft: PartnerSiteDraft,
  site: InstallerPartnerSite,
): Record<string, unknown> {
  const before = draftFromSite(site);
  const out: Record<string, unknown> = {};

  if (draft.companyName.trim() !== before.companyName) {
    out.companyName = draft.companyName.trim();
  }
  if (draft.origins.trim() !== before.origins.trim()) {
    out.allowedOrigins = parseOrigins(draft.origins);
  }
  if (draft.brandPrimary.trim() !== before.brandPrimary) {
    out.brandPrimary = draft.brandPrimary.trim();
  }
  if (draft.brandOnPrimary.trim() !== before.brandOnPrimary) {
    out.brandOnPrimary = draft.brandOnPrimary.trim();
  }
  // These three can be removed, and the backend tells them apart by value:
  // an absent field means "leave alone", `null` means "take it off". So a
  // box the installer cleared has to send null, not an empty string.
  if (draft.brandAccent.trim() !== before.brandAccent) {
    out.brandAccent = draft.brandAccent.trim() || null;
  }
  if (draft.websiteUrl.trim() !== before.websiteUrl) {
    out.websiteUrl = draft.websiteUrl.trim() || null;
  }
  if (draft.logoUrl.trim() !== before.logoUrl) {
    out.logoUrl = draft.logoUrl.trim() || null;
  }
  return out;
}

export function InstallerPartnerSites() {
  const [sites, setSites] = useState<InstallerPartnerSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Editing>({ mode: "none" });
  const [draft, setDraft] = useState<PartnerSiteDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const rows = await fetchPartnerSites({ signal });
      setSites(rows);
      setLoadError(null);
    } catch (e) {
      if (signal?.aborted) return;
      setLoadError(e instanceof Error ? e.message : "Failed to load your sites");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const startCreate = () => {
    setDraft(EMPTY_DRAFT);
    setFormError(null);
    setEditing({ mode: "create" });
  };

  const startEdit = (site: InstallerPartnerSite) => {
    setDraft(draftFromSite(site));
    setFormError(null);
    setEditing({ mode: "edit", id: site.id });
  };

  const closeForm = () => {
    setEditing({ mode: "none" });
    setFormError(null);
  };

  const submit = async () => {
    setSaving(true);
    setFormError(null);
    try {
      if (editing.mode === "create") {
        const created = await createPartnerSite({
          key: draft.key.trim().toLowerCase(),
          companyName: draft.companyName.trim(),
          allowedOrigins: parseOrigins(draft.origins),
          websiteUrl: draft.websiteUrl.trim() || undefined,
          brandPrimary: draft.brandPrimary.trim() || undefined,
          brandOnPrimary: draft.brandOnPrimary.trim() || undefined,
          brandAccent: draft.brandAccent.trim() || undefined,
          logoUrl: draft.logoUrl.trim() || undefined,
        });
        setSites((prev) => [created, ...prev]);
        closeForm();
        return;
      }

      if (editing.mode === "edit") {
        const site = sites.find((s) => s.id === editing.id);
        if (!site) {
          setFormError("That site is no longer there. Reload the page.");
          return;
        }
        const patch = changedFields(draft, site);
        if (Object.keys(patch).length === 0) {
          closeForm();
          return;
        }
        const saved = await updatePartnerSite(site.id, patch);
        // Replaced with what the backend stored, not with the draft: it
        // normalises the addresses, so the saved row is the truth.
        setSites((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
        closeForm();
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (site: InstallerPartnerSite) => {
    setTogglingId(site.id);
    try {
      const saved = site.active
        ? await deactivatePartnerSite(site.id)
        : await updatePartnerSite(site.id, { active: true });
      setSites((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to change the site");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6FA]" style={{ color: INK }}>
      <header
        className="flex flex-wrap items-center gap-3 bg-white px-4 py-3.5 sm:px-7"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        <nav aria-label="Breadcrumb" className="grow text-[13px]" style={{ color: MUTED }}>
          <Link
            href="/installers/dashboard/overview"
            prefetch={false}
            className="no-underline hover:text-[#0F172A]"
            style={{ color: MUTED }}
          >
            Installer Account
          </Link>{" "}
          <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold" style={{ color: INK }}>
            Designer on my website
          </span>
        </nav>
      </header>

      <div className="flex w-full max-w-[1100px] flex-col gap-[18px] px-4 pt-6 pb-14 sm:px-7">
        <div className="flex flex-wrap items-end gap-3.5">
          <div className="grow">
            <h1 className="m-0 font-source-sans text-[28px] font-bold">
              Designer on my website
            </h1>
            <p className="mt-1 mb-0 max-w-[720px] text-[13px]" style={{ color: MUTED }}>
              Put the Platform Designer on your own site, in your own colours.
              Visitors design their system there, and every design arrives in
              your EasyLink account as a lead assigned to you.
            </p>
          </div>
          {editing.mode === "none" ? (
            <button
              type="button"
              onClick={startCreate}
              className="flex h-11 items-center rounded-[10px] border-none px-5 text-[14px] font-bold"
              style={{ background: SUN, color: SUN_INK }}
            >
              New partner site
            </button>
          ) : null}
        </div>

        {editing.mode !== "none" ? (
          <PartnerSiteForm
            draft={draft}
            onChange={setDraft}
            onSubmit={submit}
            onCancel={closeForm}
            mode={editing.mode}
            busy={saving}
            error={formError}
          />
        ) : null}

        {loadError ? (
          <p
            role="alert"
            className="m-0 rounded-[10px] p-3 text-[13px]"
            style={{ background: "#FEF2F2", color: "#991B1B" }}
          >
            {loadError}
          </p>
        ) : null}

        {loading ? (
          <p className="m-0 text-[13px]" style={{ color: MUTED }}>
            Loading your sites…
          </p>
        ) : sites.length === 0 && editing.mode === "none" ? (
          <EmptyState onCreate={startCreate} />
        ) : (
          sites.map((site) => (
            <PartnerSiteCard
              key={site.id}
              site={site}
              onEdit={() => startEdit(site)}
              onToggleActive={() => void toggleActive(site)}
              busy={togglingId === site.id}
            />
          ))
        )}

        <section
          aria-label="How it works"
          className="flex flex-col gap-2.5 rounded-2xl bg-white p-[18px]"
          style={{ border: `1px solid ${BORDER}` }}
        >
          <h2 className="m-0 font-source-sans text-[18px] font-bold">
            How it works
          </h2>
          <ol
            className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-[13px]"
            style={{ color: SLATE }}
          >
            <li>
              You set your company name, colours and the website addresses the
              designer is allowed to appear on.
            </li>
            <li>
              We host the page. You add a link or paste the embed snippet into
              your own site — no hosting or developer needed on your side,
              though your developer can use the snippet if you have one.
            </li>
            <li>
              A visitor designs their system on your page. The design is saved
              with your site attached.
            </li>
            <li>
              It arrives in your account as a lead assigned to you, under
              Customers. Nothing changes about how you work it from there.
            </li>
          </ol>
          <p className="m-0 text-[12px]" style={{ color: MUTED }}>
            Only the addresses you list can show your designer, so the same
            snippet pasted on another company&rsquo;s site will not load.
          </p>
        </section>
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <section
      className="flex flex-col items-start gap-3 rounded-2xl bg-white p-7"
      style={{ border: `1px dashed ${BORDER_2}` }}
    >
      <h2 className="m-0 font-source-sans text-[20px] font-bold">
        No partner site yet
      </h2>
      <p className="m-0 max-w-[560px] text-[13px]" style={{ color: MUTED }}>
        Set one up and you will get a branded page plus a snippet to paste into
        your website. Designs made there come to you as leads.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="flex h-11 items-center rounded-[10px] border-none px-5 text-[14px] font-bold"
        style={{ background: SUN, color: SUN_INK }}
      >
        Set up my partner site
      </button>
    </section>
  );
}
