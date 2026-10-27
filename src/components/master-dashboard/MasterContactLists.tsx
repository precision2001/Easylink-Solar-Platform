"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  ACCEPTED_FORMATS,
  CRM_BATTERY_KWH,
  CRM_LIMIT_PERCENT,
  FILTERS,
  type FilterKey,
  INTERESTS,
  STAGE_PROBABILITY,
  dealValue,
  fileStem,
  priceOptions,
} from "@/lib/contact-lists/calling";
import {
  IMPORT_BATCH,
  IMPORT_FIELD_OPTIONS,
  describeMapping,
  readContactFile,
  type ImportFile,
} from "@/lib/contact-lists/import-file";
import {
  OUTCOME_LABELS,
  OUTCOME_ORDER,
  formatAuNumber,
  useContactsApi,
  type ApiContact,
  type ContactOutcome,
  type ContactDiscovery,
  type ContactSummary,
  type ImportJob,
  type SavedFormat,
} from "@/hooks/useContactsApi";
import { money } from "@/lib/designer/simulation";

/**
 * Matches the Easylink Designer "Contact lists" mock (ContactListsBody.dc.html)
 * as Operations sees it — upload a spreadsheet, match its columns once, then
 * call from one cleaned database.
 *
 * Who may be called, the calling queue and the four options quoted on a call
 * live in @/lib/contact-lists/calling and are covered by tests; cold-calling a
 * number on the Do Not Call Register is an offence, so that rule is not
 * something to leave sitting in a render function.
 *
 * The contacts, counts, imports and saved formats are real: they come from the
 * `contacts` API, which owns the calling rules so the browser cannot disagree
 * with the server about who may be called. The call script, the four quoted
 * options and the automatic designer are still the mock's own sample content.
 */

const SUN = "#F68A0A";
const SUN_INK = "#3B1D00";
const NAVY = "#0B1A2E";
const INK = "#0F172A";
const MUTED = "#5B6B80";
const SLATE = "#475569";
const BODY = "#334155";
const BORDER = "#E3E8EF";
const GREEN = "#166534";
const RED = "#991B1B";
const AMBER = "#92400E";
const BLUE_INK = "#1E40AF";
const CREAM = "#FFF7E6";
const WHITE = "#FFFFFF";

const SUN_GRAD = `linear-gradient(90deg, #FFE866, ${SUN})`;
const HOT = `linear-gradient(135deg, #FFE866, ${SUN})`;

const SMALL_BTN =
  "min-h-[34px] cursor-pointer rounded-[9px] border border-[#CBD5E1] bg-white px-2.5 text-[12px] font-semibold";
const FIELD_BOX =
  "flex min-h-10 items-center rounded-[10px] border border-[#CBD5E1] bg-white px-2.5 text-[13px]";
const FIELD_LABEL = "flex flex-col gap-1 text-[12px] font-semibold";
const TH = "p-2 text-left font-semibold";
const TD = "border-t border-[#E3E8EF] px-2 py-1";
const EMPTY_CELL = "\u2014";

/** The fields the add-contact form collects, with their labels. */
const NEW_CONTACT_FIELDS: [keyof NewContact, string, string][] = [
  ["fullName", "Name", "Mia Thompson"],
  ["mobile", "Mobile", "0491 570 006"],
  ["landline", "Landline", "02 5550 0101"],
  ["email", "Email", "mia@example.com"],
  ["suburb", "Suburb", "Parramatta"],
  ["postcode", "Postcode", "2150"],
  ["state", "State", "NSW"],
];

interface NewContact {
  fullName: string;
  mobile: string;
  landline: string;
  email: string;
  suburb: string;
  postcode: string;
  state: string;
}

const EMPTY_NEW_CONTACT: NewContact = {
  fullName: "",
  mobile: "",
  landline: "",
  email: "",
  suburb: "",
  postcode: "",
  state: "",
};

/** What a follow-up can be, matching the mock's options. */
const FOLLOW_UP_KINDS = ["Site visit", "Call back", "Send a quote", "Nothing yet"] as const;
const PILL = "rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap";

const CRM_TABS: [string, string][] = [
  ["lead", "Lead"],
  ["disc", "Discovery"],
  ["sys", "System"],
  ["follow", "Follow-ups · 1"],
  ["notes", "Notes & history"],
  ["web", "Portal & website"],
];

const AUTO_STEPS = [
  "Customer & address",
  "Roof & panels",
  "Sponsored equipment",
  "4 options",
  "Profile & email",
];

const SPONSORED: [string, string, string, string][] = [
  ["Panels", "AXITEC AC-440TGB/108BBA · 440 W", "PNL-AX440", "All 4 options"],
  ["Inverter", "FOXESS 1K5-1P-HI-9.9 hybrid", "INV-FX99 · INV-S5 for Essential", "Battery-ready, AS4777.2:2020"],
  ["Battery", "10 kWh stackable · FOX ESS 32.61 kWh", "BAT-100S · BAT-FX4660", "Bill-Buster, Electrify-Ready, Maximum"],
  ["Heat pump", "Reclaim Energy Gen3 · 270 L", "HWP-RC270", "Electrify-Ready, Maximum"],
  ["EV charger", "myenergi zappi v2 · 7 kW", "EVC-ZAP7", "Electrify-Ready, Maximum"],
];

/**
 * The discovery questions, mapped onto the columns that store them. The
 * placeholders show the shape of a good answer without pretending we already
 * know it.
 */
const DISCOVERY_FIELDS: [keyof ContactDiscovery, string, string][] = [
  ["ownsProperty", "Owns the property", "Yes"],
  ["propertyType", "Property type", "House"],
  ["roof", "Roof", "Tile"],
  ["storeys", "Storeys", "1"],
  ["powerSupply", "Power supply", "Single phase"],
  ["quarterlyBill", "Power bill ($ per quarter)", "1150"],
  ["retailer", "Electricity retailer", "Origin"],
  ["existingSolarKw", "Existing solar (kW)", "None"],
  ["existingSolarAge", "Existing solar age (years)", "6"],
  ["hasBattery", "Has a battery", "No"],
  ["shading", "Shading", "Some"],
  ["electricVehicle", "Electric vehicle", "Planning one"],
  ["decisionMakers", "Decision makers on the call", "Partner to confirm"],
  ["timeframe", "Timeframe", "1\u20133 months"],
  ["payingBy", "Paying by", "Not sure"],
  ["bestTimeToCall", "Best time to call", "After 5 pm"],
];

const EMPTY_DISCOVERY: ContactDiscovery = {
  ownsProperty: null,
  propertyType: null,
  roof: null,
  storeys: null,
  powerSupply: null,
  quarterlyBill: null,
  retailer: null,
  existingSolarKw: null,
  existingSolarAge: null,
  hasBattery: null,
  shading: null,
  electricVehicle: null,
  decisionMakers: null,
  timeframe: null,
  payingBy: null,
  bestTimeToCall: null,
};

/** One discovery answer as text for its input. */
function discoveryValue(d: ContactDiscovery | null, key: keyof ContactDiscovery): string {
  const v = d?.[key];
  if (v === null || v === undefined) return "";
  return String(v);
}

const TIMELINE: [string, string][] = [
  ["14 Oct, 4:43 pm · Call · Interested", "Keen on a battery for evening use. Partner wants to see numbers."],
  ["14 Oct, 3:43 pm · Note", "Quarterly bill about $1,150. Wants to cut evening use."],
  ["13 Oct, 11:02 am · Call · No answer", "0491 570 006"],
];

const PORTAL_LINKS: [string, string][] = [
  ["Solar designer · see your savings", "https://www.easylinksolar.com.au/designs"],
  ["EasyLink Solar home page", "https://www.easylinksolar.com.au"],
  ["Installer sign-up", "https://www.easylinksolar.com.au/installers/auth"],
];

const ROOF_FACES: [string, number, number][] = [
  ["North", 22, 11],
  ["West", 16, 8],
];

/** The distributor company placeholder the mock uses in scripts and emails. */
const ORG = "[distributor company]";

/** Replaces one contact in the loaded page, leaving the rest alone. */
function mergeContact(prev: ApiContact[] | null, next: ApiContact): ApiContact[] | null {
  if (!prev) return prev;
  const i = prev.findIndex(c => c.id === next.id);
  if (i === -1) return [next, ...prev];
  const out = prev.slice();
  out[i] = next;
  return out;
}

/** How the booked callback time reads in the panel. */
function callbackLabel(): string {
  return new Date(callbackAt()).toLocaleString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** A callback booked for tomorrow evening, which is what the mock's row implies. */
function callbackAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(17, 30, 0, 0);
  return d.toISOString();
}

/** How the register state reads in the table's DNCR column. */
function dncrLabel(c: ApiContact): string {
  if (c.dncrMobile && c.dncrLandline) return "Mobile + landline";
  if (c.dncrMobile) return "Mobile";
  if (c.dncrLandline) return "Landline";
  return "Clear";
}

/** Outcomes that mean the call went well, which the mock tints green. */
const WARM_OUTCOMES: ContactOutcome[] = ["INTERESTED", "APPOINTMENT_BOOKED"];

export function MasterContactLists() {
  const api = useContactsApi();
  const options = useMemo(() => priceOptions(), []);

  const [tab, setTab] = useState<"db" | "import" | "formats">("db");
  const [step, setStep] = useState<"upload" | "map" | "done">("upload");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ContactOutcome | "">("");

  /** Server-held data: the table page, the tile counts and what is in flight. */
  const [contacts, setContacts] = useState<ApiContact[] | null>(null);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [summary, setSummary] = useState<ContactSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [callNotes, setCallNotes] = useState("");

  /** The file being imported, and how far through it we are. */
  const [file, setFile] = useState<ImportFile | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [matchedFormat, setMatchedFormat] = useState<string | null>(null);
  const [listName, setListName] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportJob | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [formats, setFormats] = useState<SavedFormat[] | null>(null);

  /** The "Add contact" form: closed until asked for. */
  const [adding, setAdding] = useState(false);
  const [newContact, setNewContact] = useState(EMPTY_NEW_CONTACT);
  const [addError, setAddError] = useState<string | null>(null);
  const [addingBusy, setAddingBusy] = useState(false);

  /** The discovery answers for the contact on screen. */
  const [discovery, setDiscovery] = useState<ContactDiscovery | null>(null);
  const [discoveryDirty, setDiscoveryDirty] = useState(false);
  const [discoverySaving, setDiscoverySaving] = useState(false);
  const [discoveryMsg, setDiscoveryMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [followUp, setFollowUp] = useState("Site visit");
  const [saved, setSaved] = useState("");
  const [queue, setQueue] = useState(false);
  const [crm, setCrm] = useState("lead");
  const [panels, setPanels] = useState(29);
  const [interests, setInterests] = useState<string[]>(["Solar", "Battery"]);
  const [auto, setAuto] = useState(0);
  const [preview, setPreview] = useState(1);
  const [captured, setCaptured] = useState(false);
  const [asked, setAsked] = useState(false);
  const [sent, setSent] = useState("");

  // Typing searches the whole database, so wait for a pause rather than firing
  // a query per keystroke against several hundred thousand rows.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const reloadSummary = useCallback(() => {
    api
      .fetchSummary()
      .then(setSummary)
      .catch((e: Error) => setLoadError(e.message));
  }, [api]);

  const reloadContacts = useCallback(() => {
    let live = true;
    api
      .fetchContacts({ search: query, filter, page, pageSize: 25 })
      .then(res => {
        if (!live) return;
        setContacts(res.contacts);
        setTotal(res.total);
        setPageCount(res.pageCount);
        setLoadError(null);
      })
      .catch((e: Error) => {
        if (live) setLoadError(e.message);
      });
    return () => {
      live = false;
    };
  }, [api, query, filter, page]);

  useEffect(() => reloadContacts(), [reloadContacts]);
  useEffect(() => reloadSummary(), [reloadSummary]);

  useEffect(() => {
    if (tab !== "formats" || formats !== null) return;
    api
      .fetchFormats()
      .then(setFormats)
      .catch((e: Error) => setLoadError(e.message));
  }, [tab, formats, api]);

  const rows = contacts ?? [];
  const selected = rows.find(r => r.id === currentId) ?? null;

  /**
   * The six fields the call panel reads, in the names its markup already uses,
   * so the panel did not have to be rewritten around the API's shape.
   */
  const contact = {
    name: selected?.fullName ?? "",
    email: selected?.email ?? "",
    suburb: selected?.suburb ?? "",
    postcode: selected?.postcode ?? "",
    list: selected?.listName ?? "",
    mobileText: formatAuNumber(
      selected?.dialNumber ?? selected?.mobile ?? null,
      selected?.mobileRaw,
    ),
  };

  const deal = dealValue(panels);
  const firstName = contact.name.split(" ")[0] ?? "";

  const n = (v: number) => v.toLocaleString("en-AU");

  const importResultTiles: [string, string][] = progress
    ? [
        ["Added", n(progress.addedRows)],
        ["Duplicates skipped", n(progress.duplicateRows)],
        ["Without a valid number", n(progress.noNumberRows)],
        ["Rows we could not read", n(progress.invalidRows)],
        ["Rows processed", n(progress.processedRows)],
      ]
    : [];
  const tiles: [string, string, string][] = summary
    ? [
        ["Contacts", n(summary.total), `${n(summary.lists)} ${summary.lists === 1 ? "list" : "lists"}`],
        [
          "Callable now",
          n(summary.callable),
          "Open now · weekdays 9 am–8 pm (NSW time)",
        ],
        ["On Do Not Call Register", n(summary.onRegister), "Blocked without consent"],
        ["Callbacks due", n(summary.callbacksDue), "Today or overdue"],
      ]
    : [
        ["Contacts", "—", "Loading"],
        ["Callable now", "—", "Open now · weekdays 9 am–8 pm (NSW time)"],
        ["On Do Not Call Register", "—", "Blocked without consent"],
        ["Callbacks due", "—", "Today or overdue"],
      ];

  /**
   * Starts at the first callable contact. The server picks it, because only the
   * server can see past the current page — the next person to call is often not
   * among the 25 rows on screen.
   */
  const startQueue = async () => {
    setSaved("");
    try {
      const first = await api.fetchNext();
      if (!first) {
        setSaved("No callable contacts in this list.");
        return;
      }
      setCurrentId(first.id);
      setContacts(prev => mergeContact(prev, first));
      setOutcome("");
      setQueue(true);
    } catch (e) {
      setSaved(e instanceof Error ? e.message : "Could not start the queue.");
    }
  };

  const [savingCall, setSavingCall] = useState(false);

  const saveCall = async () => {
    if (!selected) return;
    if (!outcome) {
      setSaved("Pick an outcome first.");
      return;
    }

    setSavingCall(true);
    try {
      const updated = await api.saveOutcome(selected.id, {
        outcome,
        notes: callNotes.trim() || null,
        followUpKind: followUp || null,
        // Only a callback has a due date; the others would leave a stale one.
        callbackDueAt: outcome === "CALL_BACK" ? callbackAt() : null,
      });
      setContacts(prev => mergeContact(prev, updated));
      reloadSummary();

      if (queue) {
        const next = await api.fetchNext(selected.id);
        if (next) {
          setCurrentId(next.id);
          setContacts(prev => mergeContact(prev, next));
          setOutcome("");
          setCallNotes("");
          setSaved(`Saved: ${OUTCOME_LABELS[outcome]}. Next contact loaded.`);
        } else {
          setSaved(`Saved: ${OUTCOME_LABELS[outcome]}. No one else to call.`);
        }
      } else {
        setSaved(`Saved: ${OUTCOME_LABELS[outcome]}.`);
      }
    } catch (e) {
      setSaved(e instanceof Error ? e.message : "Could not save the outcome.");
    } finally {
      setSavingCall(false);
    }
  };

  /**
   * Reads the chosen spreadsheet in the browser and asks the server what its
   * columns mean. Parsing here avoids sending a 50 MB file and reuses the
   * parser already built and tested for customer imports; the mapping still
   * comes from the server, which is what remembers saved formats.
   */
  const chooseFile = async (picked: File) => {
    setImportError(null);
    setProgress(null);
    try {
      const parsed = await readContactFile(picked);
      setFile(parsed);
      setListName(parsed.suggestedListName);

      const { mapping: guess, matchedFormat: hit } = await api.matchHeadings(parsed.headings);
      setMapping(guess);
      setMatchedFormat(hit?.name ?? null);
      setStep("map");
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Could not read that file.");
    }
  };

  /**
   * Sends the rows in batches, so a very large file is many modest requests
   * rather than one that cannot finish. Progress comes back from the server on
   * every batch, which is what the bar below reports.
   */
  const runImport = async () => {
    if (!file) return;
    setImporting(true);
    setImportError(null);

    try {
      const { importId } = await api.createImport({
        fileName: file.fileName,
        listName: listName.trim() || file.suggestedListName,
        mapping,
        totalRows: file.rows.length,
        rememberAs: listName.trim() || file.suggestedListName,
        headings: file.headings,
      });

      let job: ImportJob | null = null;
      for (let i = 0; i < file.rows.length; i += IMPORT_BATCH) {
        job = await api.sendImportRows(importId, file.rows.slice(i, i + IMPORT_BATCH));
        setProgress(job);
      }

      setProgress(await api.finishImport(importId));
      setStep("done");
      reloadSummary();
      reloadContacts();
      void api.fetchFormats().then(setFormats).catch(() => undefined);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "The import did not finish.");
    } finally {
      setImporting(false);
    }
  };

  /**
   * Loads the discovery answers when a contact is opened. Fetched per contact
   * rather than with the table: most contacts have none, and sixteen more
   * columns on every page of the list would be paid for on every search.
   */
  useEffect(() => {
    if (!currentId) {
      setDiscovery(null);
      setDiscoveryDirty(false);
      setDiscoveryMsg("");
      return;
    }
    let live = true;
    api
      .fetchDiscovery(currentId)
      .then((d) => {
        if (!live) return;
        setDiscovery(d ?? EMPTY_DISCOVERY);
        setDiscoveryDirty(false);
        setDiscoveryMsg("");
      })
      .catch(() => {
        if (live) setDiscovery(EMPTY_DISCOVERY);
      });
    return () => {
      live = false;
    };
  }, [currentId, api]);

  const saveDiscovery = async () => {
    if (!currentId || !discovery) return;
    setDiscoverySaving(true);
    setDiscoveryMsg("");
    try {
      const saved = await api.saveDiscovery(currentId, discovery);
      setDiscovery(saved);
      setDiscoveryDirty(false);
      setDiscoveryMsg("Saved.");
    } catch (e) {
      setDiscoveryMsg(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setDiscoverySaving(false);
    }
  };

  const copyNumber = async () => {
    const number = selected?.dialNumber ?? selected?.mobile ?? selected?.landline;
    if (!number) return;
    try {
      await navigator.clipboard.writeText(number);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the number is on screen to read.
      setCopied(false);
    }
  };

  const addContact = async () => {
    setAddingBusy(true);
    setAddError(null);
    try {
      const created = await api.createContact({
        fullName: newContact.fullName,
        mobile: newContact.mobile || null,
        landline: newContact.landline || null,
        email: newContact.email || null,
        suburb: newContact.suburb || null,
        postcode: newContact.postcode || null,
        state: newContact.state || null,
      });
      setContacts((prev) => mergeContact(prev, created));
      setNewContact(EMPTY_NEW_CONTACT);
      setAdding(false);
      reloadSummary();
      reloadContacts();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Could not add that contact.");
    } finally {
      setAddingBusy(false);
    }
  };

  /** Turns the contact into a pipeline lead — the mock's "Create lead" action. */
  const [converting, setConverting] = useState(false);
  const [convertMsg, setConvertMsg] = useState("");

  const convertToLead = async () => {
    if (!selected) return;
    setConverting(true);
    setConvertMsg("");
    try {
      const { lead, created } = await api.convertToLead(selected.id);
      setContacts(prev =>
        mergeContact(prev, { ...selected, leadId: lead.id }),
      );
      setConvertMsg(
        created
          ? `${lead.customerName} is now a lead in Quotes & Leads.`
          : `${lead.customerName} is already a lead.`,
      );
    } catch (e) {
      setConvertMsg(e instanceof Error ? e.message : "Could not create the lead.");
    } finally {
      setConverting(false);
    }
  };

  const sendAll = () => {
    if (!asked) {
      // The Spam Act needs consent before a marketing email, so the tick is
      // a hard gate rather than a reminder.
      setSent(
        "Tick that the customer asked for the options first. Unsolicited marketing emails need consent under the Spam Act.",
      );
      return;
    }
    setSent(
      `Customer profile created in the Customer Portal with 4 options and ${captured ? "4 roof images" : "roof layouts"}. Email sent to ${contact.email} at ${new Date().toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}, logged in Notes & history, stage moved to Proposal sent, follow-up call booked in 2 days.`,
    );
  };

  const previewOption = options[preview - 1] ?? options[0];
  const faces = ROOF_FACES.map(([n, max, cols], i) => {
    const before = ROOF_FACES.slice(0, i).reduce((a, [, m]) => a + m, 0);
    const used = Math.max(0, Math.min(previewOption.panels - before, max));
    return { n, max, cols, used };
  });

  const pillStyle = (on: boolean) => ({
    background: on ? NAVY : WHITE,
    color: on ? WHITE : BODY,
    border: `1px solid ${on ? NAVY : "#CBD5E1"}`,
  });

  const chipStyle = (on: boolean) => ({
    background: on ? CREAM : WHITE,
    border: `1px solid ${on ? SUN : BORDER}`,
  });

  return (
    <div className="flex min-h-full flex-col text-[#0F172A]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Communication <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Contact lists</span>
        </nav>
        <span
          title="Contacts, imports and saved formats are real; the call script and quoted options are not"
          className="cursor-help rounded-full bg-[#DCFCE7] px-2.5 py-[3px] text-[12px] font-bold text-[#166534]"
        >
          Live data
        </span>
      </header>

      <div className="flex w-full max-w-[1400px] flex-col gap-[18px] px-8 pb-14 pt-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-[1_1_320px]">
            <h1 className="m-0 font-source-sans text-[28px] font-bold">Contact lists</h1>
            <p className="mb-0 mt-1 max-w-[70ch] text-[13px]" style={{ color: MUTED }}>
              Upload any spreadsheet or CSV, match its columns once, then call from one cleaned,
              editable database. Lists here are your distributor team&rsquo;s, separate from your
              installers&rsquo;.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setTab("import");
              setStep("upload");
            }}
            className="min-h-11 cursor-pointer rounded-[10px] border-0 px-[18px] text-[14px] font-bold"
            style={{ background: SUN, color: SUN_INK }}
          >
            Upload a contact list
          </button>
        </div>

        {/* headline counts */}
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          {tiles.map(([l, v, s], i) => {
            const hot = i === 1;
            return (
              <div
                key={l}
                className="flex flex-col gap-0.5 rounded-[14px] px-4 py-3.5"
                style={
                  hot
                    ? { background: HOT, color: SUN_INK }
                    : { background: WHITE, border: `1px solid ${BORDER}`, color: INK }
                }
              >
                <span className="text-[12px] font-semibold">{l}</span>
                <span className="font-source-sans text-[28px] font-bold">{v}</span>
                <span className="text-[12px]">{s}</span>
              </div>
            );
          })}
        </div>

        {loadError ? (
          <p
            role="status"
            className="m-0 rounded-[10px] px-3 py-2 text-[13px] font-semibold"
            style={{ background: "#FEE2E2", color: RED }}
          >
            {loadError}
          </p>
        ) : null}

        {/* section tabs */}
        <div
          role="tablist"
          aria-label="Sections"
          className="flex flex-wrap gap-1"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          {(
            [
              ["db", "Calling database"],
              ["import", "Import a list"],
              ["formats", "Saved formats"],
            ] as ["db" | "import" | "formats", string][]
          ).map(([k, l]) => {
            const on = tab === k;
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(k)}
                className="min-h-11 cursor-pointer border-0 bg-none px-3.5 text-[14px] font-semibold"
                style={{ borderBottom: `3px solid ${on ? SUN : "transparent"}`, color: on ? INK : MUTED }}
              >
                {l}
              </button>
            );
          })}
        </div>

        {/* ---------------- calling database ---------------- */}
        {tab === "db" && (
          <div className="flex flex-wrap items-start gap-4">
            <section
              aria-label="Calling database"
              className="flex min-w-0 flex-[999_1_640px] flex-col gap-3 rounded-[14px] bg-white p-4"
              style={{ border: `1px solid ${BORDER}` }}
            >
              <div className="flex flex-wrap items-end gap-2.5">
                <label className={`${FIELD_LABEL} flex-[1_1_220px]`} style={{ color: BODY }}>
                  Search
                  <input
                    type="search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Name, number, email, suburb or postcode"
                    className="min-h-10 rounded-[10px] border border-[#CBD5E1] px-2.5 text-[14px] font-normal text-[#0F172A]"
                  />
                </label>
                <div role="group" aria-label="Show" className="flex flex-wrap gap-1">
                  {FILTERS.map(([k, l]) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={filter === k}
                      onClick={() => {
                        setFilter(k);
                        setPage(1);
                      }}
                      className="min-h-10 cursor-pointer rounded-full px-3 text-[12px] font-semibold"
                      style={pillStyle(filter === k)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="flex-grow text-[12px]" style={{ color: MUTED }}>
                  {contacts === null
                    ? "Loading contacts…"
                    : total === 0
                      ? "No contacts match"
                      : `${rows.length} of ${total.toLocaleString("en-AU")} contacts shown`}
                </span>
                {pageCount > 1 ? (
                  <span className="flex items-center gap-1.5 text-[12px]" style={{ color: MUTED }}>
                    <button
                      type="button"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className={`${SMALL_BTN} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      Previous
                    </button>
                    Page {page} of {pageCount}
                    <button
                      type="button"
                      onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                      disabled={page >= pageCount}
                      className={`${SMALL_BTN} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      Next
                    </button>
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setAdding((v) => !v);
                    setAddError(null);
                  }}
                  aria-expanded={adding}
                  className={`${SMALL_BTN} cursor-pointer`}
                >
                  {adding ? "Cancel" : "Add contact"}
                </button>
                <button type="button" title="Not built yet" className={`${SMALL_BTN} cursor-help`}>
                  Copy selected as CSV
                </button>
                <button
                  type="button"
                  onClick={startQueue}
                  className="min-h-[34px] cursor-pointer rounded-[9px] border-0 px-3 text-[12px] font-bold text-white"
                  style={{ background: NAVY }}
                >
                  Start calling queue
                </button>
              </div>

              {adding ? (
                <form
                  aria-label="Add a contact"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void addContact();
                  }}
                  className="flex flex-col gap-2.5 rounded-[12px] p-3"
                  style={{ border: `1px solid ${SUN}`, background: CREAM }}
                >
                  <div
                    className="grid gap-2.5"
                    style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}
                  >
                    {NEW_CONTACT_FIELDS.map(([key, label, placeholder]) => (
                      <label key={key} className={FIELD_LABEL} style={{ color: BODY }}>
                        {label}
                        <input
                          value={newContact[key]}
                          onChange={(e) =>
                            setNewContact((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          placeholder={placeholder}
                          required={key === "fullName"}
                          className="min-h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-2.5 text-[13px] font-normal"
                        />
                      </label>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="flex-grow text-[12px]" style={{ color: MUTED }}>
                      A mobile or landline is required &mdash; a contact with no number cannot be
                      called. New contacts go to a list called &ldquo;Added by hand&rdquo;.
                    </span>
                    <button
                      type="submit"
                      disabled={addingBusy || !newContact.fullName.trim()}
                      className="min-h-10 cursor-pointer rounded-[10px] border-0 px-3.5 text-[13px] font-bold disabled:cursor-not-allowed disabled:opacity-60"
                      style={{ background: SUN, color: SUN_INK }}
                    >
                      {addingBusy ? "Adding..." : "Save contact"}
                    </button>
                  </div>
                  {addError ? (
                    <span className="text-[12px] font-semibold" style={{ color: RED }}>
                      {addError}
                    </span>
                  ) : null}
                </form>
              ) : null}

              <div className="overflow-x-auto rounded-[12px]" style={{ border: `1px solid ${BORDER}` }}>
                <table className="w-full min-w-[900px] border-collapse text-[13px]">
                  <thead>
                    <tr style={{ background: "#F8FAFC", color: MUTED }}>
                      <th className={TH}>Name</th>
                      <th className={TH}>Mobile</th>
                      <th className={TH}>Landline</th>
                      <th className={TH}>Suburb</th>
                      <th className={TH}>Postcode</th>
                      <th className={TH}>DNCR</th>
                      <th className={TH}>Last outcome</th>
                      <th className={TH}>List</th>
                      <th className="p-2">
                        <span className="absolute left-[-9999px]">Call</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const label = dncrLabel(r);
                      const clear = label === "Clear";
                      const warm = r.lastOutcome
                        ? WARM_OUTCOMES.includes(r.lastOutcome)
                        : false;
                      return (
                        <tr key={r.id} style={{ background: currentId === r.id ? CREAM : "transparent" }}>
                          <td className={TD}>
                            <input
                              defaultValue={r.fullName}
                              aria-label="Name"
                              // Saved when the cell loses focus rather than on every
                              // keystroke: one write per edit, not one per character.
                              onBlur={(e) => {
                                const value = e.target.value.trim();
                                if (!value || value === r.fullName) return;
                                void api
                                  .updateContact(r.id, { fullName: value })
                                  .then((u) => setContacts((prev) => mergeContact(prev, u)))
                                  .catch((err: Error) => setLoadError(err.message));
                              }}
                              className="min-h-8 w-full min-w-[140px] rounded-md border border-transparent bg-transparent px-1.5 text-[13px]"
                            />
                          </td>
                          <td className={`${TD} font-mono text-[12px]`}>
                            {formatAuNumber(r.mobile, r.mobileRaw)}
                          </td>
                          <td className={`${TD} font-mono text-[12px]`}>
                            {formatAuNumber(r.landline, r.landlineRaw)}
                          </td>
                          <td className={TD}>{r.suburb ?? EMPTY_CELL}</td>
                          <td className={TD}>{r.postcode ?? EMPTY_CELL}</td>
                          <td className={TD}>
                            <span
                              className={PILL}
                              style={{
                                background: clear ? "transparent" : "#FEE2E2",
                                color: clear ? MUTED : RED,
                              }}
                            >
                              {label}
                            </span>
                          </td>
                          <td className={TD}>
                            <span
                              className={PILL}
                              style={{
                                background: !r.lastOutcome ? "transparent" : warm ? "#DCFCE7" : "#DBEAFE",
                                color: !r.lastOutcome ? MUTED : warm ? GREEN : BLUE_INK,
                              }}
                            >
                              {r.lastOutcome ? OUTCOME_LABELS[r.lastOutcome] : "Not called"}
                            </span>
                          </td>
                          <td className={`${TD} text-[12px]`} style={{ color: MUTED }}>
                            {r.listName ?? EMPTY_CELL}
                          </td>
                          <td className={TD}>
                            {r.callable ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setCurrentId(r.id);
                                  setOutcome("");
                                  setSaved("");
                                  setConvertMsg("");
                                  setCallNotes(r.notes ?? "");
                                  setQueue(false);
                                }}
                                className="min-h-[34px] cursor-pointer rounded-[9px] border-0 px-3 text-[12px] font-bold"
                                style={{ background: SUN, color: SUN_INK }}
                              >
                                Call
                              </button>
                            ) : (
                              <span
                                className={PILL}
                                title={r.blockedReason ?? undefined}
                                style={{ background: "#FEE2E2", color: RED }}
                              >
                                {r.blockedReason ?? "Blocked"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {contacts !== null && rows.length === 0 ? (
                      <tr>
                        <td className={`${TD} text-[13px]`} colSpan={9} style={{ color: MUTED }}>
                          {total === 0 && !query && filter === "all"
                            ? "No contacts yet. Import a list to start calling."
                            : "No contacts match this search or filter."}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <span className="text-[12px]" style={{ color: MUTED }}>
                Names are edited in place and saved when you leave the cell. Numbers and
                register flags are not editable here: a number is the contact&rsquo;s identity
                for deduplication, and a register flag is a fact about the register.
                Calling hours follow each contact&rsquo;s state: weekdays 9 am&ndash;8 pm, Saturdays
                9 am&ndash;5 pm, no Sundays or national public holidays.
              </span>
            </section>

            {/* ---------------- the call ---------------- */}
            {selected && (
              <aside
                aria-label="Call and CRM"
                className="flex flex-[1_1_100%] flex-col gap-3.5 rounded-[14px] bg-white p-4"
                style={{ border: `2px solid ${SUN}` }}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
                    <h2 className="m-0 font-source-sans text-[24px] font-bold">{contact.name}</h2>
                    <span className="text-[12px]" style={{ color: MUTED }}>
                      {contact.suburb} NSW {contact.postcode} · {contact.list}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <span className={PILL} style={{ background: "#DBEAFE", color: BLUE_INK }}>
                        Appointment
                      </span>
                      <span className={PILL} style={{ background: "#FEF3C7", color: AMBER }}>
                        New lead
                      </span>
                      {interests.map((t) => (
                        <span key={t} className={PILL} style={{ background: "#F1F5F9", color: BODY }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div
                    className="grid flex-[2_1_480px] overflow-hidden rounded-[12px]"
                    style={{ border: `1px solid ${BORDER}`, gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
                  >
                    {[
                      ["Sales probability", `${STAGE_PROBABILITY}%`],
                      ["Estimated revenue", money(deal.price)],
                      ["Weighted", money(deal.weighted)],
                      ["System", `${deal.kw} kW + ${CRM_BATTERY_KWH} kWh`],
                    ].map(([l, v]) => (
                      <div
                        key={l}
                        className="flex flex-col gap-0.5 px-3 py-2.5"
                        style={{ borderRight: `1px solid ${BORDER}` }}
                      >
                        <span
                          className="text-[11px] font-bold uppercase tracking-[0.05em]"
                          style={{ color: MUTED }}
                        >
                          {l}
                        </span>
                        <strong className="font-source-sans text-[22px]">{v}</strong>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAuto(1);
                      setSent("");
                    }}
                    className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border-0 px-[18px] font-bold tracking-[0.04em]"
                    style={{ background: SUN_GRAD, color: SUN_INK }}
                  >
                    SOLAR DESIGN
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentId(null);
                      setQueue(false);
                    }}
                    className={SMALL_BTN}
                  >
                    Close
                  </button>
                </div>

                {auto > 0 ? (
                  <section
                    aria-label="Automatic solar design"
                    className="flex flex-col gap-3.5 pt-3.5"
                    style={{ borderTop: `1px solid ${BORDER}` }}
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="m-0 flex-grow font-source-sans text-[20px] font-bold">
                        Solar Design · 4 options for {contact.name}
                      </h3>
                      <button type="button" onClick={() => setAuto(0)} className={SMALL_BTN}>
                        Back to the call
                      </button>
                    </div>
                    <ol
                      aria-label="Steps"
                      className="m-0 grid list-none gap-1.5 p-0"
                      style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}
                    >
                      {AUTO_STEPS.map((t, i) => {
                        const n = i + 1;
                        const on = n === auto;
                        const past = n < auto;
                        return (
                          <li key={t}>
                            <button
                              type="button"
                              onClick={() => setAuto(n)}
                              aria-current={on ? "step" : undefined}
                              className="flex w-full cursor-pointer flex-col gap-1.5 rounded-[10px] border-0 px-2.5 py-2 text-left"
                              style={{
                                background: on ? NAVY : "#F8FAFC",
                                color: on ? WHITE : past ? GREEN : SLATE,
                              }}
                            >
                              <span
                                className="h-1 rounded-full"
                                style={{ background: on ? SUN : past ? GREEN : "#E2E8F0" }}
                              />
                              <span className="text-[12px] font-bold">
                                {n} · {t}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ol>

                    {auto === 1 && (
                      <>
                        <p className="m-0 text-[13px]" style={{ color: MUTED }}>
                          Filled from this call record. Anything missing is filled with a sensible
                          default, marked{" "}
                          <span className={PILL} style={{ background: "#DBEAFE", color: BLUE_INK }}>
                            Assumed
                          </span>
                          , so you can confirm it with the customer.
                        </p>
                        <div
                          className="grid gap-2.5"
                          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
                        >
                          {(
                            [
                              ["Customer", contact.name, false],
                              ["Mobile", contact.mobileText, false],
                              ["Email", contact.email, false],
                              ["Street", "[street]", true],
                              ["Suburb", `${contact.suburb} NSW ${contact.postcode}`, false],
                              ["Network", "Endeavour Energy · single phase", true],
                              ["Property", "House · tile roof · 1 storey", true],
                              ["Power bill", "$1,150 a quarter", false],
                              ["Usage rate · feed-in", "37c · 5c per kWh", true],
                              ["Roof faces", "North and west", true],
                              ["Interested in", interests.join(", ") || "Solar", false],
                              ["Timeframe", "1–3 months", false],
                            ] as [string, string, boolean][]
                          ).map(([l, v, assumed]) => (
                            <label key={l} className={FIELD_LABEL} style={{ color: BODY }}>
                              {l}
                              <span className={`${FIELD_BOX} gap-1.5 font-normal`} style={{ color: INK }}>
                                <span className="flex-grow">{v}</span>
                                {assumed ? (
                                  <span className={PILL} style={{ background: "#DBEAFE", color: BLUE_INK }}>
                                    Assumed
                                  </span>
                                ) : null}
                              </span>
                            </label>
                          ))}
                        </div>
                        <p
                          className="m-0 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold"
                          style={{ background: "#FEF3C7", color: AMBER }}
                        >
                          Street number is missing from the list, so the roof is found from the
                          suburb and postcode for now. Ask for the street before the site visit.
                        </p>
                      </>
                    )}

                    {auto === 2 && (
                      <>
                        <div role="group" aria-label="Preview option" className="flex flex-wrap gap-1.5">
                          {options.map((o, i) => {
                            const on = preview === i + 1;
                            return (
                              <button
                                key={o.key}
                                type="button"
                                aria-pressed={on}
                                onClick={() => setPreview(i + 1)}
                                className="min-h-9 cursor-pointer rounded-full px-3 text-[12px] font-bold"
                                style={{ ...chipStyle(on), borderColor: on ? SUN : "#CBD5E1", color: INK }}
                              >
                                {o.n} · {o.panels} panels
                              </button>
                            );
                          })}
                        </div>
                        <div
                          role="img"
                          aria-label={`${previewOption.n}: ${previewOption.panels} panels on the north and west roof faces`}
                          className="relative flex min-h-[340px] items-center justify-center rounded-[14px] p-5"
                          style={{
                            backgroundColor: "#3D4A3A",
                            backgroundImage:
                              "linear-gradient(90deg, rgba(0,0,0,0.18) 2px, transparent 2px), linear-gradient(rgba(0,0,0,0.18) 2px, transparent 2px)",
                            backgroundSize: "120px 90px",
                          }}
                        >
                          <div
                            className="flex flex-wrap gap-1.5 rounded-md p-2.5"
                            style={{ border: "3px solid #FF4848", background: "#8A4B2A" }}
                          >
                            {faces.map((fc) => (
                              <div
                                key={fc.n}
                                className="flex flex-col items-center gap-1 rounded p-1.5"
                                style={{ background: "rgba(11,26,46,0.35)" }}
                              >
                                <div
                                  className="grid gap-[3px]"
                                  style={{ gridTemplateColumns: `repeat(${fc.cols}, 20px)` }}
                                >
                                  {Array.from({ length: fc.max }, (_, i) => (
                                    <span
                                      key={i}
                                      className="h-[30px] w-5 rounded-[2px]"
                                      style={{
                                        background: i < fc.used ? "#1976D2" : "rgba(255,255,255,0.08)",
                                        border: `1px solid ${NAVY}`,
                                      }}
                                    />
                                  ))}
                                </div>
                                <span className="text-[11px] font-semibold text-white">
                                  {fc.n} · {fc.used} of {fc.max}
                                </span>
                              </div>
                            ))}
                          </div>
                          <span
                            className="absolute bottom-2.5 left-3 rounded-md px-2 py-[3px] text-[11px]"
                            style={{ color: "#E2E8F0", background: "rgba(11,26,46,0.7)" }}
                          >
                            Satellite imagery · {contact.suburb} NSW {contact.postcode} · roof fits 38
                            × 440 W
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setCaptured(true)}
                            className={`${SMALL_BTN} min-h-10 px-3.5 text-[13px]`}
                          >
                            Capture roof images for the record
                          </button>
                          {captured ? (
                            <span role="status" className="text-[13px] font-semibold" style={{ color: GREEN }}>
                              4 layout images saved to the customer record · roof-layout-
                              {fileStem(contact.name)}-essential.png and 3 more
                            </span>
                          ) : null}
                        </div>
                      </>
                    )}

                    {auto === 3 && (
                      <>
                        <p className="m-0 text-[13px]" style={{ color: MUTED }}>
                          Sponsored equipment from the EasyLink catalogue. The same SKUs go into the
                          proposal, the installer&rsquo;s kit and the distributor&rsquo;s order.
                        </p>
                        <div
                          className="grid gap-2.5"
                          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
                        >
                          {SPONSORED.map(([k, m, sku, use]) => (
                            <div
                              key={k}
                              className="flex flex-col gap-1 rounded-[12px] p-3"
                              style={{ border: `2px solid ${SUN}` }}
                            >
                              <span className="flex items-center gap-1.5">
                                <strong className="flex-grow text-[13px]">{k}</strong>
                                <span className={PILL} style={{ background: "#FFB547", color: SUN_INK }}>
                                  Sponsored
                                </span>
                              </span>
                              <span className="text-[13px]">{m}</span>
                              <code className="text-[11px]" style={{ color: MUTED }}>
                                {sku}
                              </code>
                              <span className="text-[12px]" style={{ color: MUTED }}>
                                {use}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {auto === 4 && (
                      <>
                        <div
                          className="grid gap-2.5"
                          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}
                        >
                          {options.map((o) => (
                            <div
                              key={o.key}
                              className="flex flex-col gap-1.5 rounded-[14px] p-3.5"
                              style={{
                                border: `2px solid ${o.recommended ? SUN : BORDER}`,
                                background: o.recommended ? CREAM : WHITE,
                              }}
                            >
                              <span className="flex items-center gap-1.5">
                                <strong className="flex-grow text-[16px]">{o.n}</strong>
                                {o.recommended ? (
                                  <span className={PILL} style={{ background: "#DCFCE7", color: GREEN }}>
                                    Recommended
                                  </span>
                                ) : null}
                              </span>
                              <span className="text-[12px]" style={{ color: MUTED }}>
                                {o.d}
                              </span>
                              <strong className="font-source-sans text-[26px]">{money(o.price)}</strong>
                              <span className="text-[11px]" style={{ color: MUTED }}>
                                incl. installation &amp; GST, after STC rebates
                              </span>
                              {(
                                [
                                  ["Solar", `${o.kw} kW · ${o.panels} × AXITEC 440 W`],
                                  ["Inverter", o.inverter],
                                  ["Battery", o.battery ? `${o.battery} kWh · ${o.batterySku}` : "Battery-ready later"],
                                  [
                                    "EV charger · heat pump",
                                    `${o.ev ? "zappi 7 kW" : "—"} · ${o.heatPump ? "Reclaim 270 L" : "—"}`,
                                  ],
                                  ["Yearly savings", `≈ ${money(o.yearly)}`],
                                  ["Payback", `${o.payback.toFixed(1)} yrs (solar + battery)`],
                                ] as [string, string][]
                              ).map(([k, v]) => (
                                <span
                                  key={k}
                                  className="flex justify-between gap-2 pt-1 text-[12px]"
                                  style={{ borderTop: `1px dashed ${BORDER}` }}
                                >
                                  <span style={{ color: MUTED }}>{k}</span>
                                  <span className="text-right font-semibold">{v}</span>
                                </span>
                              ))}
                            </div>
                          ))}
                        </div>
                        <span className="text-[12px]" style={{ color: MUTED }}>
                          Savings from solar and battery at your $1,150 quarterly bill, 37c/kWh and
                          5c feed-in. EV fuel and hot-water savings come on top. Maximum is set at 29
                          panels. With the battery, the 9.9 kW inverter could take
                          up to 45 panels (200%) if the roof fits them.
                        </span>
                      </>
                    )}

                    {auto === 5 && (
                      <>
                        <div className="flex flex-wrap items-start gap-3.5">
                          <div
                            className="flex flex-[1_1_280px] flex-col gap-1.5 rounded-[14px] p-3.5"
                            style={{ border: `1px solid ${BORDER}` }}
                          >
                            <strong className="text-[14px]">Customer portal record</strong>
                            {(
                              [
                                ["Name", contact.name],
                                ["Email", contact.email],
                                ["Mobile", contact.mobileText],
                                ["Address", `[street], ${contact.suburb} NSW ${contact.postcode}`],
                                ["Portal login", sent ? "Invite sent" : "Invite on send"],
                                ["Design options", "4 · Bill-Buster recommended"],
                                ["Roof images", captured ? "4 saved" : "Not captured yet"],
                                ["Stage", sent ? "Proposal sent" : "Designing"],
                              ] as [string, string][]
                            ).map(([l, v]) => (
                              <span
                                key={l}
                                className="flex justify-between gap-2 pt-1 text-[13px]"
                                style={{ borderTop: `1px solid #EEF2F6` }}
                              >
                                <span style={{ color: MUTED }}>{l}</span>
                                <span className="text-right font-semibold">{v}</span>
                              </span>
                            ))}
                            {sent ? (
                              <span
                                title="Not built yet"
                                className="cursor-help text-[13px] font-semibold"
                                style={{ color: "#1565C0" }}
                              >
                                Open what the customer sees
                              </span>
                            ) : null}
                          </div>
                          <div
                            className="flex-[2_1_420px] overflow-hidden rounded-[14px]"
                            style={{ border: `1px solid ${BORDER}` }}
                          >
                            <div
                              className="flex flex-col gap-0.5 px-3.5 py-2.5 text-[12px]"
                              style={{ background: "#F8FAFC" }}
                            >
                              <span>
                                <strong>To:</strong> {contact.email}
                              </span>
                              <span>
                                <strong>From:</strong> {ORG} via EasyLink Solar
                              </span>
                              <span>
                                <strong>Subject:</strong> Your 4 solar and battery options, {firstName}
                              </span>
                            </div>
                            <div className="flex flex-col gap-2 p-3.5 text-[13px]">
                              <span>Hi {firstName},</span>
                              <span>
                                Thanks for your time on the phone today. Here are four options for
                                your home in {contact.suburb}, designed for your roof and your power
                                bill:
                              </span>
                              {options.map((o) => (
                                <span
                                  key={o.key}
                                  className="flex justify-between gap-2 pt-1"
                                  style={{ borderTop: `1px solid #EEF2F6` }}
                                >
                                  <strong>{o.n}</strong>
                                  <span>
                                    {o.kw} kW{o.battery ? ` + ${o.battery} kWh` : ""}
                                  </span>
                                  <strong>{money(o.price)}</strong>
                                </span>
                              ))}
                              <span
                                className="self-start rounded-[10px] px-4 py-2.5 font-bold tracking-[0.04em]"
                                style={{ background: SUN_GRAD, color: SUN_INK }}
                              >
                                VIEW MY 4 OPTIONS
                              </span>
                              <span className="text-[12px]" style={{ color: MUTED }}>
                                Your options, roof layouts and prices are saved in your EasyLink
                                customer portal. Prices are indicative until a free site check.
                                Unsubscribe from marketing emails at any time.
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={asked}
                            onClick={() => setAsked(!asked)}
                            className={`${SMALL_BTN} min-h-10 px-3.5 text-[13px]`}
                          >
                            {asked ? "✓ " : "☐ "}
                            The customer asked for these options on this call
                          </button>
                          <span className="flex-grow" />
                          <button
                            type="button"
                            onClick={sendAll}
                            className="min-h-11 cursor-pointer rounded-[10px] border-0 px-[18px] font-bold tracking-[0.04em]"
                            style={{ background: SUN_GRAD, color: SUN_INK }}
                          >
                            Create customer profile &amp; send email
                          </button>
                        </div>
                        {sent ? (
                          <p
                            role="status"
                            className="m-0 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold"
                            style={{
                              background: asked ? "#DCFCE7" : "#FEF3C7",
                              color: asked ? GREEN : AMBER,
                            }}
                          >
                            {sent}
                          </p>
                        ) : null}
                      </>
                    )}

                    <div className="flex gap-2.5 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
                      <button
                        type="button"
                        onClick={() => setAuto(Math.max(0, auto - 1))}
                        className={`${SMALL_BTN} min-h-10 px-3.5 text-[13px]`}
                      >
                        Back
                      </button>
                      <span className="flex-grow" />
                      {auto < 5 ? (
                        <button
                          type="button"
                          onClick={() => setAuto(Math.min(5, auto + 1))}
                          className="min-h-10 cursor-pointer rounded-[10px] border-0 px-[18px] font-bold tracking-[0.04em]"
                          style={{ background: SUN_GRAD, color: SUN_INK }}
                        >
                          {["", "Find the roof", "Choose equipment", "Build 4 options", "Create profile & email"][auto] ?? "Next"}
                        </button>
                      ) : null}
                    </div>
                  </section>
                ) : (
                  <div className="flex flex-wrap items-start gap-[18px]">
                    {/* dialler */}
                    <div className="flex max-w-[400px] flex-[1_1_320px] flex-col gap-2.5">
                      <p
                        className="m-0 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold"
                        style={{ background: "#DCFCE7", color: GREEN }}
                      >
                        OK to call · weekdays 9 am&ndash;8 pm in the contact&rsquo;s time zone
                      </p>
                      <span className="font-mono text-[26px] font-bold">{contact.mobileText}</span>
                      <div className="flex gap-2">
                        {/*
                          Hands the number to the Agent Dialer, which owns the
                          working call path (consent announcement, recording,
                          transcript). Dialling from here would be a second way
                          to place a call, and the one that skips all of that.
                        */}
                        <Link
                          href={`/master/dialer?number=${encodeURIComponent(
                            selected?.dialNumber ?? "",
                          )}`}
                          className="flex min-h-11 flex-1 items-center justify-center rounded-[10px] border-0 font-bold no-underline"
                          style={{ background: SUN, color: SUN_INK }}
                        >
                          Call on this device
                        </Link>
                        <button
                          type="button"
                          onClick={copyNumber}
                          className={`${SMALL_BTN} min-h-11 cursor-pointer`}
                        >
                          {copied ? "Copied" : "Copy number"}
                        </button>
                      </div>
                      <div
                        className="rounded-[10px] px-3 py-2.5 text-[13px]"
                        style={{ background: "#F8FAFC", color: BODY }}
                      >
                        <strong>Opening</strong>
                        <br />
                        &ldquo;Hi, it&rsquo;s [your name] from {ORG}. This call may be recorded for
                        quality and training. Is now a good time to talk about solar and battery
                        savings for your home?&rdquo;
                      </div>
                      <div
                        role="radiogroup"
                        aria-label="Outcome"
                        className="grid gap-1.5"
                        style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
                      >
                        {OUTCOME_ORDER.map((value) => {
                          const l = OUTCOME_LABELS[value];
                          const on = outcome === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              role="radio"
                              aria-checked={on}
                              onClick={() => setOutcome(value)}
                              className="min-h-10 cursor-pointer rounded-[9px] px-2.5 text-left text-[12px] font-semibold"
                              style={chipStyle(on)}
                            >
                              {l}
                            </button>
                          );
                        })}
                      </div>
                      <label className={FIELD_LABEL} style={{ color: BODY }}>
                        Call notes
                        <textarea
                          rows={2}
                          value={callNotes}
                          onChange={(e) => setCallNotes(e.target.value)}
                          placeholder="Saved against the contact"
                          className="rounded-[10px] border border-[#CBD5E1] px-2.5 py-2 text-[13px] font-normal"
                        />
                      </label>
                      <div className="flex gap-2">
                        <label className={`${FIELD_LABEL} flex-1`} style={{ color: BODY }}>
                          Follow-up
                          <select
                            value={followUp}
                            onChange={(e) => setFollowUp(e.target.value)}
                            className={`${FIELD_BOX} font-normal`}
                          >
                            {FOLLOW_UP_KINDS.map((k) => (
                              <option key={k}>{k}</option>
                            ))}
                          </select>
                        </label>
                        <label className={`${FIELD_LABEL} flex-1`} style={{ color: BODY }}>
                          When
                          <span className={`${FIELD_BOX} font-normal`}>
                            {outcome === "CALL_BACK"
                              ? callbackLabel()
                              : "Only for a callback"}
                          </span>
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={saveCall}
                        disabled={savingCall}
                        className="min-h-11 cursor-pointer rounded-[10px] border-0 font-bold disabled:cursor-not-allowed disabled:opacity-60"
                        style={{ background: SUN, color: SUN_INK }}
                      >
                        {savingCall
                          ? "Saving..."
                          : queue
                            ? "Save and next"
                            : "Save outcome"}
                      </button>
                      {saved ? (
                        <span
                          role="status"
                          className="text-[12px] font-semibold"
                          style={{ color: saved.startsWith("Pick") ? AMBER : GREEN }}
                        >
                          {saved}
                        </span>
                      ) : null}
                    </div>

                    {/* CRM */}
                    <div className="flex min-w-0 flex-[999_1_480px] flex-col gap-3">
                      <div
                        role="tablist"
                        aria-label="CRM sections"
                        className="flex flex-wrap gap-0.5"
                        style={{ borderBottom: `1px solid ${BORDER}` }}
                      >
                        {CRM_TABS.map(([k, l]) => {
                          const on = crm === k;
                          return (
                            <button
                              key={k}
                              type="button"
                              role="tab"
                              aria-selected={on}
                              onClick={() => setCrm(k)}
                              className="min-h-10 cursor-pointer border-0 bg-none px-3 text-[13px] font-semibold"
                              style={{
                                borderBottom: `3px solid ${on ? SUN : "transparent"}`,
                                color: on ? INK : MUTED,
                              }}
                            >
                              {l}
                            </button>
                          );
                        })}
                      </div>

                      {crm === "lead" && (
                        <>
                          <div
                            className="grid gap-2.5"
                            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
                          >
                            {(
                              [
                                ["Lead stage", "Appointment"],
                                ["Sales probability %", `${STAGE_PROBABILITY} (stage default)`],
                                ["Estimated revenue $", `${money(deal.price)} from the system`],
                                ["How they found us", "Purchased list"],
                                ["Referred by", "—"],
                                ["Owner", "Daniel Shaw"],
                              ] as [string, string][]
                            ).map(([l, v]) => (
                              <label key={l} className={FIELD_LABEL} style={{ color: BODY }}>
                                {l}
                                <span className={`${FIELD_BOX} font-normal`}>{v}</span>
                              </label>
                            ))}
                          </div>
                          <span className="text-[12px] font-semibold">Interested in</span>
                          <div className="flex flex-wrap gap-1.5">
                            {INTERESTS.map((l) => {
                              const on = interests.includes(l);
                              return (
                                <button
                                  key={l}
                                  type="button"
                                  aria-pressed={on}
                                  onClick={() =>
                                    setInterests(
                                      on ? interests.filter((x) => x !== l) : [...interests, l],
                                    )
                                  }
                                  className="min-h-9 cursor-pointer rounded-full px-3 text-[12px] font-semibold"
                                  style={chipStyle(on)}
                                >
                                  {l}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}

                      {crm === "disc" && (
                        <>
                          <div
                            className="grid gap-2.5"
                            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
                          >
                            {DISCOVERY_FIELDS.map(([key, label, placeholder]) => (
                              <label key={key} className={FIELD_LABEL} style={{ color: BODY }}>
                                {label}
                                <input
                                  value={discoveryValue(discovery, key)}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    setDiscovery((prev) => ({
                                      ...(prev ?? EMPTY_DISCOVERY),
                                      [key]:
                                        key === "quarterlyBill"
                                          ? raw.trim()
                                            ? Number(raw.replace(/[^0-9.]/g, ""))
                                            : null
                                          : raw,
                                    }));
                                    setDiscoveryDirty(true);
                                    setDiscoveryMsg("");
                                  }}
                                  placeholder={placeholder}
                                  inputMode={key === "quarterlyBill" ? "decimal" : undefined}
                                  className={`${FIELD_BOX} font-normal`}
                                />
                              </label>
                            ))}
                          </div>
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="flex-grow text-[12px]" style={{ color: MUTED }}>
                              Answers are saved against the contact, so they are still here on the
                              next call.
                            </span>
                            {discoveryMsg ? (
                              <span
                                role="status"
                                className="text-[12px] font-semibold"
                                style={{ color: discoveryMsg === "Saved." ? GREEN : RED }}
                              >
                                {discoveryMsg}
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={saveDiscovery}
                              disabled={discoverySaving || !discoveryDirty}
                              className="min-h-10 cursor-pointer rounded-[10px] border-0 px-3.5 text-[13px] font-bold disabled:cursor-not-allowed disabled:opacity-60"
                              style={{ background: SUN, color: SUN_INK }}
                            >
                              {discoverySaving ? "Saving..." : "Save discovery"}
                            </button>
                          </div>
                        </>
                      )}

                      {crm === "sys" && (
                        <>
                          <div
                            className="grid gap-2.5"
                            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
                          >
                            <label className={FIELD_LABEL} style={{ color: BODY }}>
                              Panels (AXITEC 440 W · PNL-AX440)
                              <span className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPanels(Math.max(1, panels - 1))}
                                  aria-label="Fewer panels"
                                  className={`${SMALL_BTN} min-h-10 w-10 px-0`}
                                >
                                  &minus;
                                </button>
                                <strong className="min-w-[32px] text-center">{panels}</strong>
                                <button
                                  type="button"
                                  onClick={() => setPanels(panels + 1)}
                                  aria-label="More panels"
                                  className={`${SMALL_BTN} min-h-10 w-10 px-0`}
                                >
                                  +
                                </button>
                              </span>
                            </label>
                            {(
                              [
                                ["Inverter", "FOXESS 1K5-1P-HI-9.9 hybrid · INV-FX99"],
                                ["Battery", "10 kWh stackable · BAT-100S × 2"],
                                ["Extras", "No EV charger · no heat pump"],
                              ] as [string, string][]
                            ).map(([l, v]) => (
                              <label key={l} className={FIELD_LABEL} style={{ color: BODY }}>
                                {l}
                                <span className={`${FIELD_BOX} font-normal`}>{v}</span>
                              </label>
                            ))}
                          </div>
                          <p className="m-0 text-[13px]">
                            <strong>{deal.kw} kW</strong> · panel : inverter {deal.ratio}% ·{" "}
                            {CRM_BATTERY_KWH} kWh battery · indicative {money(deal.price)} after STCs
                          </p>
                          {deal.oversized ? (
                            <p
                              className="m-0 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold"
                              style={{ background: "#FEE2E2", color: RED }}
                            >
                              Panel : inverter {deal.ratio}% is over the {CRM_LIMIT_PERCENT}%
                              limit with a battery. Use fewer panels or a bigger inverter.
                            </p>
                          ) : null}
                        </>
                      )}

                      {crm === "follow" && (
                        <>
                          {(
                            [
                              [
                                "Site visit · Fri 16 Oct, 5:30 pm",
                                "Partner home after 5 pm · Daniel Shaw",
                                "Due",
                                "#FEF3C7",
                                AMBER,
                              ],
                              [
                                "Send designer link · Tue 13 Oct",
                                "Sent the website designer link by SMS (consented)",
                                "Done",
                                "#DCFCE7",
                                GREEN,
                              ],
                            ] as [string, string, string, string, string][]
                          ).map(([t, n, s, bg, fg]) => (
                            <div
                              key={t}
                              className="flex flex-wrap items-center gap-2 py-2"
                              style={{ borderBottom: `1px solid #EEF2F6` }}
                            >
                              <span className="flex flex-[1_1_240px] flex-col">
                                <strong className="text-[13px]">{t}</strong>
                                <span className="text-[12px]" style={{ color: MUTED }}>
                                  {n}
                                </span>
                              </span>
                              <span className={PILL} style={{ background: bg, color: fg }}>
                                {s}
                              </span>
                              <button type="button" title="Not built yet" className={`${SMALL_BTN} cursor-help`}>
                                Mark done
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            title="Not built yet"
                            className={`${SMALL_BTN} min-h-10 cursor-help self-start`}
                          >
                            Add follow-up
                          </button>
                        </>
                      )}

                      {crm === "notes" && (
                        <>
                          <label className={FIELD_LABEL} style={{ color: BODY }}>
                            Add a note
                            <textarea
                              rows={2}
                              className="rounded-[10px] border border-[#CBD5E1] px-2.5 py-2 text-[13px] font-normal"
                            />
                          </label>
                          {TIMELINE.map(([t, b]) => (
                            <div
                              key={t}
                              className="flex flex-col gap-0.5 pl-2.5"
                              style={{ borderLeft: `3px solid #CBD5E1` }}
                            >
                              <strong className="text-[13px]">{t}</strong>
                              <span className="text-[13px]">{b}</span>
                            </div>
                          ))}
                        </>
                      )}

                      {crm === "web" && (
                        <>
                          <p
                            className="m-0 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold"
                            style={{ background: "#DBEAFE", color: BLUE_INK }}
                          >
                            Looks like an existing customer: Mia Thompson · Parramatta ·
                            Appointment. Link this call record to her?
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" title="Not built yet" className={`${SMALL_BTN} min-h-10 cursor-help`}>
                              Link to existing customer
                            </button>
                            <button
                              type="button"
                              onClick={convertToLead}
                              disabled={converting || Boolean(selected?.leadId)}
                              className="min-h-10 cursor-pointer rounded-[10px] border-0 px-3.5 font-bold disabled:cursor-not-allowed disabled:opacity-60"
                              style={{ background: SUN, color: SUN_INK }}
                            >
                              {selected?.leadId
                                ? "Already a lead"
                                : converting
                                  ? "Creating..."
                                  : "Create lead in Quotes & leads"}
                            </button>
                          </div>
                          {convertMsg ? (
                            <span
                              role="status"
                              className="text-[12px] font-semibold"
                              style={{ color: GREEN }}
                            >
                              {convertMsg}
                            </span>
                          ) : null}
                          <span className="text-[12px]" style={{ color: MUTED }}>
                            Adds them to Quotes &amp; leads. The design, proposal and job follow the
                            lead to the installer you assign.
                          </span>
                          {PORTAL_LINKS.map(([l, u]) => (
                            <div
                              key={u}
                              className="flex flex-wrap items-center gap-2 py-2"
                              style={{ borderBottom: `1px solid #EEF2F6` }}
                            >
                              <span className="flex flex-[1_1_240px] flex-col">
                                <strong className="text-[13px]">{l}</strong>
                                <code className="text-[12px]">{u}</code>
                              </span>
                              <button type="button" title="Not built yet" className={`${SMALL_BTN} cursor-help`}>
                                Copy link
                              </button>
                            </div>
                          ))}
                          <span className="text-[12px]" style={{ color: MUTED }}>
                            Only text a link if they agreed to SMS. Every SMS needs &ldquo;Reply STOP
                            to opt out&rdquo;.
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </aside>
            )}
          </div>
        )}

        {/* ---------------- import ---------------- */}
        {tab === "import" && (
          <section
            aria-label="Import a list"
            className="flex flex-col gap-3.5 rounded-[14px] bg-white p-4"
            style={{ border: `1px solid ${BORDER}` }}
          >
            {step === "upload" && (
              <div
                className="flex flex-col items-center gap-2 rounded-[14px] px-4 py-7 text-center"
                style={{ border: "2px dashed #CBD5E1", background: "#F8FAFC" }}
              >
                <h2 className="m-0 text-[16px] font-bold">Drop a contact list here</h2>
                <p className="m-0 text-[12px]" style={{ color: MUTED }}>
                  Any layout works. You match the columns next, and the matching is remembered for
                  lists in the same format.
                </p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {ACCEPTED_FORMATS.map((f) => (
                    <span key={f} className={PILL} style={{ background: "#F1F5F9", color: BODY }}>
                      {f}
                    </span>
                  ))}
                </div>
                <label
                  className="min-h-11 cursor-pointer rounded-[10px] px-[18px] py-3 font-bold"
                  style={{ background: SUN, color: SUN_INK }}
                >
                  Choose a file
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.txt,.ods"
                    className="hidden"
                    onChange={(e) => {
                      const picked = e.target.files?.[0];
                      e.target.value = "";
                      if (picked) void chooseFile(picked);
                    }}
                  />
                </label>
                <span className="text-[12px]" style={{ color: MUTED }}>
                  Large lists are read in the browser and imported in batches, so the tab needs to
                  stay open until it finishes.
                </span>
                {importError ? (
                  <span className="text-[12px] font-semibold" style={{ color: RED }}>
                    {importError}
                  </span>
                ) : null}
              </div>
            )}

            {step === "map" && (
              <>
                <div className="flex flex-wrap items-end gap-2.5">
                  <div className="flex-grow">
                    <h2 className="m-0 text-[16px] font-bold">Match columns</h2>
                    <span className="text-[12px]" style={{ color: MUTED }}>
                      {file
                        ? `${file.fileName} \u00b7 ${file.rows.length.toLocaleString("en-AU")} rows \u00b7 ${file.headings.length} columns \u00b7 heading row 1`
                        : "No file chosen"}
                      {matchedFormat ? ` \u00b7 matched the saved format "${matchedFormat}"` : ""}
                    </span>
                  </div>
                </div>
                <div
                  className="grid gap-2.5"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
                >
                  {(file?.headings ?? []).map((h) => {
                    const field = mapping[h] ?? "ignore";
                    const guessed = field !== "ignore";
                    return (
                      <div
                        key={h}
                        className="flex flex-col gap-1 rounded-[12px] p-2.5"
                        style={{ border: `1px solid ${guessed ? SUN : "#CBD5E1"}` }}
                      >
                        <strong className="text-[13px]">{h}</strong>
                        <select
                          value={field}
                          onChange={(e) =>
                            setMapping((prev) => ({ ...prev, [h]: e.target.value }))
                          }
                          className="rounded-lg px-2 py-1.5 text-[12px] font-semibold"
                          style={{ border: "1px solid #CBD5E1" }}
                        >
                          {IMPORT_FIELD_OPTIONS.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <span className="text-[11px]" style={{ color: MUTED }}>
                          {guessed ? "Matched by heading" : "Not imported"}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <label
                    className="flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-[12px] font-semibold"
                    style={{ border: "1px solid #CBD5E1" }}
                  >
                    List name
                    <input
                      value={listName}
                      onChange={(e) => setListName(e.target.value)}
                      className="min-w-[140px] border-0 text-[12px] font-semibold outline-none"
                    />
                  </label>
                  {["Duplicates: skip, keep the existing contact", "No valid number: leave out"].map(
                    (s) => (
                      <span
                        key={s}
                        className="rounded-[10px] px-2.5 py-2 text-[12px] font-semibold"
                        style={{ border: "1px solid #CBD5E1" }}
                      >
                        {s}
                      </span>
                    ),
                  )}
                  <span className="flex-grow" />
                  <button
                    type="button"
                    onClick={runImport}
                    disabled={importing || !file}
                    className="min-h-11 cursor-pointer rounded-[10px] border-0 px-[18px] font-bold disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ background: SUN, color: SUN_INK }}
                  >
                    {importing ? "Importing..." : "Import contacts"}
                  </button>
                </div>
                {progress ? (
                  <div className="flex flex-col gap-1">
                    <div className="h-2 overflow-hidden rounded-full" style={{ background: "#E2E8F0" }}>
                      <div
                        className="h-full rounded-full transition-[width]"
                        style={{ width: `${progress.percent}%`, background: SUN }}
                      />
                    </div>
                    <span className="text-[12px]" style={{ color: MUTED }}>
                      {progress.processedRows.toLocaleString("en-AU")} of{" "}
                      {progress.totalRows.toLocaleString("en-AU")} rows ·{" "}
                      {progress.addedRows.toLocaleString("en-AU")} added ·{" "}
                      {progress.duplicateRows.toLocaleString("en-AU")} duplicates skipped
                    </span>
                  </div>
                ) : null}
                {importError ? (
                  <span className="text-[12px] font-semibold" style={{ color: RED }}>
                    {importError}
                  </span>
                ) : null}
              </>
            )}

            {step === "done" && (
              <>
                <h2 className="m-0 text-[16px] font-bold">
                  &ldquo;{progress?.listName ?? listName}&rdquo; is in your calling database
                </h2>
                <div
                  className="grid gap-2.5"
                  style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
                >
                  {importResultTiles.map(([l, v]) => (
                    <div
                      key={l}
                      className="flex flex-col rounded-[12px] p-3"
                      style={{ border: `1px solid ${BORDER}` }}
                    >
                      <span className="text-[12px] font-semibold" style={{ color: MUTED }}>
                        {l}
                      </span>
                      <strong className="font-source-sans text-[24px]">{v}</strong>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTab("db");
                    setStep("upload");
                  }}
                  className="min-h-11 cursor-pointer self-start rounded-[10px] border-0 px-[18px] font-bold"
                  style={{ background: SUN, color: SUN_INK }}
                >
                  Open the calling database
                </button>
              </>
            )}
          </section>
        )}

        {/* ---------------- saved formats ---------------- */}
        {tab === "formats" && (
          <section
            aria-label="Saved formats"
            className="flex flex-col gap-2 rounded-[14px] bg-white p-4"
            style={{ border: `1px solid ${BORDER}` }}
          >
            <h2 className="m-0 text-[16px] font-bold">Saved formats</h2>
            <p className="m-0 text-[12px]" style={{ color: MUTED }}>
              A file whose headings match a saved format is matched automatically. You can still
              change it before importing.
            </p>
            {formats === null ? (
              <span className="text-[12px]" style={{ color: MUTED }}>
                Loading saved formats...
              </span>
            ) : formats.length === 0 ? (
              <span className="text-[13px]" style={{ color: MUTED }}>
                No formats saved yet. Importing a list remembers how its columns were matched.
              </span>
            ) : (
              formats.map((f) => (
                <div
                  key={f.id}
                  className="flex flex-wrap items-center gap-2.5 py-2.5"
                  style={{ borderTop: `1px solid #EEF2F6` }}
                >
                  <span className="flex flex-[1_1_300px] flex-col">
                    <strong>{f.name}</strong>
                    <span className="text-[12px]" style={{ color: MUTED }}>
                      {describeMapping(f.mapping)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      void api
                        .forgetFormat(f.id)
                        .then(() => setFormats((prev) => prev?.filter((x) => x.id !== f.id) ?? null))
                        .catch((e: Error) => setLoadError(e.message));
                    }}
                    className={`${SMALL_BTN} cursor-pointer`}
                    style={{ color: RED }}
                  >
                    Forget
                  </button>
                </div>
              ))
            )}
          </section>
        )}
      </div>
    </div>
  );
}
