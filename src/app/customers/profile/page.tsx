"use client";

import { useCallback, useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "react-toastify";
import { askEasylinkAi } from "@/components/ai-chat/EasylinkAiChatbot";
import { CustomerPortalShell, PortalPageHeader } from "@/components/customer/portal/CustomerPortalShell";
import { PortalIcon } from "@/components/customer/portal/PortalIcon";
import { ButtonLink, EmptyNote, Panel, Skeleton } from "@/components/customer/portal/PortalParts";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { setUser, type CustomerUser } from "@/lib/store/customerAuthSlice";
import { fetchCustomerDocuments, formatDocumentSize, type CustomerDocument } from "@/lib/customers/documents";
import { documentKindLabel } from "@/lib/customers/document-kind";
import {
  fetchCustomerProfile,
  formatAccountDate,
  normalizePhone,
  updateCustomerProfile,
  type CustomerProfileUpdate,
} from "@/lib/customers/profile";

const inputClass =
  "h-12 w-full rounded-[12px] border border-[#CBD5E1] bg-white px-3.5 text-[15px] text-[#0F172A] placeholder:text-[#7A8AA0] focus-visible:border-[#0B1A2E] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0B1A2E]/10 disabled:bg-[#F4F6FA] disabled:text-[#475569]";

function Field({ label, hint, children, id }: { label: string; hint?: ReactNode; children: ReactNode; id: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[13.5px] font-semibold text-[#334155]">
        {label}
      </label>
      {children}
      {hint ? <p className="m-0 text-[12.5px] leading-[1.45] text-[#5B6B80]">{hint}</p> : null}
    </div>
  );
}

function SaveButton({ saving, disabled, children }: { saving: boolean; disabled: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={disabled || saving}
      className="inline-flex min-h-[46px] items-center justify-center rounded-[13px] bg-[#0B1A2E] px-[18px] text-[14.5px] font-bold text-white hover:bg-[#16304F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {saving ? "Saving…" : children}
    </button>
  );
}

function Row({ icon, label, children }: { icon: "lock" | "messages" | "shield"; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-[14px] bg-[#F4F6FA] p-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[#0B1A2E]">
        <PortalIcon name={icon} size={18} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[12.5px] text-[#5B6B80]">{label}</span>
        <div className="min-w-0 break-words text-[14.5px] font-semibold text-[#0F172A]">{children}</div>
      </div>
    </div>
  );
}

/** The one bold card: who this account is. */
function AccountSummary({
  className,
  user,
  fullName,
  accountCreated,
}: {
  className: string;
  user: CustomerUser | null;
  fullName: string;
  accountCreated: string | null;
}) {
  return (
    <section aria-label="Account summary" className={`relative flex-col gap-4 overflow-hidden rounded-[22px] bg-[#0B1A2E] p-6 text-white sm:p-7 ${className}`}>
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#FFE866] to-[#F68A0A] text-[19px] font-extrabold text-[#3B1D00]">
          {(user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "") || <PortalIcon name="profile" size={24} />}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="m-0 truncate font-source-sans text-[22px] font-extrabold leading-[1.2]">{fullName || "Your account"}</p>
          <p className="m-0 truncate text-[14px] text-[#C9D6EA]">{user?.email ?? ""}</p>
        </div>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[14px] text-[#D6E1F0]">
        <li className="flex items-center gap-2">
          <PortalIcon name="check" size={16} className="text-[#FFE866]" />
          EasyLink Solar customer account
        </li>
        {accountCreated ? (
          <li className="flex items-center gap-2">
            <PortalIcon name="calendar" size={16} className="text-[#FFE866]" />
            Joined {accountCreated}
          </li>
        ) : null}
      </ul>
      <div className="flex flex-wrap gap-2.5">
        <ButtonLink href="/customers/project" icon="arrow">
          Track my project
        </ButtonLink>
      </div>
    </section>
  );
}

export default function CustomerProfilePage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.customerAuth.user);
  const ids = useId();

  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState<string | null>(null);

  const [details, setDetails] = useState({ firstName: "", lastName: "", phone: "" });
  const [address, setAddress] = useState("");
  const [editingAddress, setEditingAddress] = useState(false);
  const [saving, setSaving] = useState<"details" | "address" | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Fill the forms when the profile arrives (or after a save updates it).
  useEffect(() => {
    if (!user) return;
    setDetails({ firstName: user.firstName ?? "", lastName: user.lastName ?? "", phone: user.phone ?? "" });
    setAddress(user.address ?? "");
  }, [user]);

  useEffect(() => {
    const controller = new AbortController();
    fetchCustomerDocuments({ signal: controller.signal })
      .then(setDocuments)
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setDocumentsError(e instanceof Error ? e.message : "Failed to load documents");
      })
      .finally(() => {
        if (!controller.signal.aborted) setDocumentsLoading(false);
      });
    return () => controller.abort();
  }, []);

  // The sign-in payload leaves out `createdAt`; one lookup fills it in.
  const needsCreatedAt = Boolean(user && !user.createdAt);
  useEffect(() => {
    if (!needsCreatedAt) return;
    let cancelled = false;
    void fetchCustomerProfile()
      .then((profile) => {
        if (cancelled || !profile?.createdAt || !user) return;
        dispatch(setUser({ ...user, createdAt: profile.createdAt }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // Only re-run when the need changes, not on every user object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsCreatedAt, dispatch]);

  const save = useCallback(
    async (update: CustomerProfileUpdate, which: "details" | "address") => {
      if (!user) return false;
      if (Object.keys(update).length === 0) return true;
      setSaving(which);
      const setErr = which === "details" ? setDetailsError : setAddressError;
      setErr(null);
      try {
        const saved = await updateCustomerProfile(update);
        dispatch(setUser({ ...user, ...saved }));
        toast.success(which === "details" ? "Your details are saved." : "Your address is saved.");
        return true;
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not save your changes");
        return false;
      } finally {
        setSaving(null);
      }
    },
    [dispatch, user],
  );

  const detailsUpdate: CustomerProfileUpdate = {};
  if (user) {
    if (details.firstName.trim() !== (user.firstName ?? "")) detailsUpdate.firstName = details.firstName.trim();
    if (details.lastName.trim() !== (user.lastName ?? "")) detailsUpdate.lastName = details.lastName.trim();
    const phone = normalizePhone(details.phone);
    if (phone !== (user.phone ?? "")) detailsUpdate.phone = phone;
  }
  const detailsDirty = Object.keys(detailsUpdate).length > 0;

  function submitDetails(e: FormEvent) {
    e.preventDefault();
    if (!details.firstName.trim()) {
      setDetailsError("Enter your first name.");
      return;
    }
    void save(detailsUpdate, "details");
  }

  async function submitAddress(e: FormEvent) {
    e.preventDefault();
    const next = address.trim();
    if (!next) {
      setAddressError("Enter your street address, suburb, state and postcode.");
      return;
    }
    if (await save(next === (user?.address ?? "") ? {} : { address: next }, "address")) setEditingAddress(false);
  }

  const savedAddress = user?.address?.trim() ?? "";
  const accountCreated = formatAccountDate(user?.createdAt);
  const fullName = [user?.firstName?.trim(), user?.lastName?.trim()].filter(Boolean).join(" ");

  const summaryProps = { user, fullName, accountCreated };

  return (
    <CustomerPortalShell active="profile">
      <PortalPageHeader
        eyebrow="My account"
        title={fullName ? `${fullName}'s account` : "Your account"}
        intro="Keep your contact details and address up to date so your installer can reach you and arrives at the right place."
      />

      {/* On phones the summary leads; on desktop it heads the side column. */}
      <AccountSummary className="flex lg:hidden" {...summaryProps} />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Your details" meta="We use these to contact you about your job">
            {!user ? (
              <Skeleton className="h-[220px]" />
            ) : (
              <form onSubmit={submitDetails} className="flex flex-col gap-4" noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id={`${ids}-fn`} label="First name">
                    <input
                      id={`${ids}-fn`}
                      autoComplete="given-name"
                      value={details.firstName}
                      onChange={(e) => setDetails((d) => ({ ...d, firstName: e.target.value }))}
                      className={inputClass}
                      required
                    />
                  </Field>
                  <Field id={`${ids}-ln`} label="Last name">
                    <input
                      id={`${ids}-ln`}
                      autoComplete="family-name"
                      value={details.lastName}
                      onChange={(e) => setDetails((d) => ({ ...d, lastName: e.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                  <Field id={`${ids}-ph`} label="Mobile number" hint="Your installer calls this number to book the site visit.">
                    <input
                      id={`${ids}-ph`}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="04xx xxx xxx"
                      value={details.phone}
                      onChange={(e) => setDetails((d) => ({ ...d, phone: e.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                  <Field id={`${ids}-em`} label="Email" hint="This is how you sign in, so it can't be changed here. Contact us to change it.">
                    <input id={`${ids}-em`} type="email" value={user.email} disabled readOnly className={inputClass} />
                  </Field>
                </div>
                {detailsError ? (
                  <p role="alert" className="m-0 rounded-[12px] bg-[#FEE2E2] px-3.5 py-2.5 text-[14px] text-[#991B1B]">
                    {detailsError}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-3">
                  <SaveButton saving={saving === "details"} disabled={!detailsDirty}>
                    Save my details
                  </SaveButton>
                  {!detailsDirty ? <span className="text-[13px] text-[#5B6B80]">No unsaved changes</span> : null}
                </div>
              </form>
            )}
          </Panel>

          <Panel title="Your property" meta="Where we design and install your system">
            {!user ? (
              <Skeleton className="h-[90px]" />
            ) : editingAddress || !savedAddress ? (
              <form onSubmit={(e) => void submitAddress(e)} className="flex flex-col gap-4" noValidate>
                {!savedAddress && !editingAddress ? (
                  <EmptyNote icon="home" title="No address saved yet">
                    Add your address so your design, rebates and site visit are based on the right home.
                  </EmptyNote>
                ) : null}
                <Field id={`${ids}-ad`} label="Street address" hint="Include suburb, state and postcode, for example 12 Wattle St, Parramatta NSW 2150.">
                  <input id={`${ids}-ad`} autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
                </Field>
                {addressError ? (
                  <p role="alert" className="m-0 rounded-[12px] bg-[#FEE2E2] px-3.5 py-2.5 text-[14px] text-[#991B1B]">
                    {addressError}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2.5">
                  <SaveButton saving={saving === "address"} disabled={!address.trim()}>
                    Save address
                  </SaveButton>
                  {editingAddress ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAddress(false);
                        setAddress(savedAddress);
                        setAddressError(null);
                      }}
                      className="inline-flex min-h-[46px] items-center rounded-[13px] border border-[#CBD5E1] bg-white px-[18px] text-[14.5px] font-bold text-[#0F172A] hover:border-[#64748B]"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3 rounded-[14px] bg-[#F4F6FA] p-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[#0B1A2E]">
                    <PortalIcon name="home" size={20} />
                  </span>
                  <p className="m-0 min-w-0 flex-1 break-words pt-2 text-[15px] font-semibold text-[#0F172A]">{savedAddress}</p>
                </div>
                <p className="m-0 text-[13.5px] leading-[1.5] text-[#475569]">If this is wrong, change it before your site visit so your installer comes to the right place.</p>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-[14px] font-semibold">
                  <button type="button" onClick={() => setEditingAddress(true)} className="flex min-h-[44px] items-center gap-1.5 text-[#1D4ED8] hover:underline">
                    <PortalIcon name="edit" size={15} />
                    Change address
                  </button>
                  <button
                    type="button"
                    onClick={() => askEasylinkAi(`What solar and battery rebates apply at my address, ${savedAddress}?`)}
                    className="flex min-h-[44px] items-center gap-1.5 text-[#1D4ED8] hover:underline"
                  >
                    <PortalIcon name="spark" size={15} />
                    Ask AI which rebates apply here
                  </button>
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Documents" meta={documents.length ? `${documents.length} shared with you` : undefined}>
            {documentsLoading ? (
              <Skeleton className="h-[120px]" />
            ) : documentsError ? (
              <p role="alert" className="m-0 rounded-[12px] bg-[#FEE2E2] px-3.5 py-2.5 text-[14px] text-[#991B1B]">
                We couldn&apos;t load your documents. {documentsError}
              </p>
            ) : documents.length === 0 ? (
              <EmptyNote icon="download" title="No documents yet">
                Documents your installer shares with you, such as certificates, test results and warranty papers, appear here to download.
              </EmptyNote>
            ) : (
              <ul className="m-0 flex list-none flex-col divide-y divide-[#E2E8F0] p-0">
                {documents.map((doc) => {
                  const added = formatAccountDate(doc.createdAt);
                  return (
                    <li key={doc.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#F4F6FA] text-[11px] font-bold text-[#0B1A2E]">
                        {documentKindLabel(doc) === "PDF" ? "PDF" : <PortalIcon name="download" size={18} className="text-[#5B6B80]" />}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-[14.5px] font-semibold text-[#0F172A]">{doc.fileName}</span>
                        <span className="text-[12.5px] text-[#5B6B80]">
                          {[documentKindLabel(doc), formatDocumentSize(doc.sizeBytes), added ? `Added ${added}` : null].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                      <a
                        href={doc.url}
                        download={doc.fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Download ${doc.fileName}`}
                        className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-[12px] border border-[#CBD5E1] bg-white px-3 text-[14px] font-bold text-[#0F172A] no-underline hover:border-[#64748B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] sm:px-4"
                      >
                        <PortalIcon name="download" size={17} />
                        <span className="hidden sm:inline">Download</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <AccountSummary className="hidden lg:flex" {...summaryProps} />

          <Panel title="Sign-in and security">
            <Row icon="messages" label="Email you sign in with">
              {user?.email ?? "—"}
              {user?.emailVerified ? (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#ECFDF3] px-2 py-0.5 align-middle text-[12px] font-bold text-[#15803D]">
                  <PortalIcon name="check" size={12} />
                  Verified
                </span>
              ) : null}
            </Row>
            <Row icon="lock" label="Password">
              <span className="font-normal text-[#475569]">We&apos;ll email you a secure link to set a new password.</span>
            </Row>
            <ButtonLink href="/forgot-password?role=CUSTOMER" variant="quiet" icon="arrow">
              Reset my password
            </ButtonLink>
          </Panel>

          <Panel title="Your data and privacy">
            <p className="m-0 text-[14px] leading-[1.55] text-[#475569]">
              EasyLink keeps your contact details, address, designs and job records to quote, install and support your system. You can ask for a copy of
              your information, ask us to correct it, or ask us to delete your account.
            </p>
            <a href="/contact-us" className="flex min-h-[44px] items-center gap-1.5 text-[14px] font-semibold text-[#1D4ED8] hover:underline">
              Contact us to request your data or deletion
              <PortalIcon name="arrow" size={15} />
            </a>
          </Panel>
        </div>
      </div>
    </CustomerPortalShell>
  );
}
