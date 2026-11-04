"use client";

import { useState, type FormEvent } from "react";
import { toast } from "react-toastify";
import { PortalIcon } from "@/components/customer/portal/PortalIcon";
import { EmptyNote, Skeleton } from "@/components/customer/portal/PortalParts";
import {
  buildReferralSignupUrl,
  formatReferralCurrency,
  inviteReferral,
  socialShareUrl,
  type ReferralOverview,
} from "@/lib/customers/referrals";

const NETWORKS = [
  { key: "facebook", label: "Facebook" },
  { key: "twitter", label: "X" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "email", label: "Email" },
] as const;

const SHARE_MESSAGE = "I just designed my solar system with EasyLink. Take a look at my savings.";

const btn =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] px-4 text-[14px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] disabled:cursor-not-allowed disabled:opacity-55";
const input =
  "h-11 w-full rounded-[12px] border border-[#CBD5E1] bg-white px-3.5 text-[14.5px] text-[#0F172A] placeholder:text-[#7A8AA0] focus-visible:border-[#0B1A2E] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0B1A2E]/10";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Share and earn: the public link to this design (which carries the referral
 * code) and the referral programme, with the reward amount from the API.
 */
export function ShareAndEarnPanel({
  shareUrl,
  shareLoading,
  canShareDesign,
  overview,
  loading,
  onInvited,
}: {
  shareUrl: string | null;
  shareLoading: boolean;
  /** False before the customer has a design: only the referral half shows. */
  canShareDesign: boolean;
  overview: ReferralOverview | null;
  loading: boolean;
  onInvited: () => void;
}) {
  const [copied, setCopied] = useState<"share" | "invite" | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function flash(which: "share" | "invite") {
    setCopied(which);
    window.setTimeout(() => setCopied(null), 2000);
  }

  function share(network: (typeof NETWORKS)[number]["key"]) {
    if (!shareUrl) return;
    const target = socialShareUrl(network, shareUrl, SHARE_MESSAGE);
    if (network === "email") {
      window.location.assign(target);
      return;
    }
    window.open(target, "_blank", "noopener,noreferrer,width=640,height=640");
  }

  async function invite(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const result = await inviteReferral({ email: trimmed, ...(name.trim() ? { name: name.trim() } : {}) });
      // The referral always counts; the email only goes out when mail is configured.
      if (result.emailSent) toast.success(`Invitation emailed to ${trimmed}.`);
      else toast.info(`Referral saved for ${trimmed}, but we couldn't email the invitation. Share your link instead.`);
      setEmail("");
      setName("");
      onInvited();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record that referral");
    } finally {
      setSubmitting(false);
    }
  }

  const reward = overview && overview.rewardAmount > 0 ? formatReferralCurrency(overview.rewardAmount) : null;

  return (
    <section id="share" aria-labelledby="share-title" className="flex scroll-mt-24 flex-col gap-5 rounded-[20px] border border-[#E2E8F0] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="share-title" className="m-0 font-source-sans text-[24px] font-extrabold text-[#0F172A]">
            Share and earn
          </h2>
          <p className="m-0 max-w-[620px] text-[14.5px] leading-[1.5] text-[#475569]">
            {reward
              ? `${canShareDesign ? "Show friends your design. " : ""}When someone you refer goes solar with EasyLink, you get ${reward} credit.`
              : canShareDesign
                ? "Show friends and family your design and help them save too."
                : "Tell friends and family about EasyLink and help them save too."}
          </p>
        </div>
        {overview?.referralCode ? (
          <span className="rounded-full bg-[#F4F6FA] px-3 py-1.5 text-[13px] font-semibold text-[#475569]">
            Your code <span className="font-bold text-[#0F172A]">{overview.referralCode}</span>
          </span>
        ) : null}
      </div>

      <div className={`grid gap-5 ${canShareDesign ? "lg:grid-cols-2" : ""}`}>
        {/* Share this design */}
        {canShareDesign ? (
        <div className="flex flex-col gap-3">
          <h3 className="m-0 text-[15px] font-bold text-[#0F172A]">Share your design</h3>
          <p className="m-0 text-[13.5px] leading-[1.5] text-[#5B6B80]">The link shows your system size and savings. It never shows your address or price.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="share-link" className="sr-only">
              Your share link
            </label>
            <input
              id="share-link"
              readOnly
              value={shareLoading ? "Preparing your link…" : (shareUrl ?? "Share link unavailable right now")}
              onFocus={(e) => e.currentTarget.select()}
              className={`${input} min-w-0 flex-1 bg-[#F8FAFC] text-[13.5px] text-[#475569]`}
            />
            <button
              type="button"
              disabled={!shareUrl}
              onClick={async () => shareUrl && (await copyText(shareUrl)) && flash("share")}
              className={`${btn} bg-[#0B1A2E] text-white hover:bg-[#16304F]`}
            >
              <PortalIcon name={copied === "share" ? "check" : "share"} size={17} />
              {copied === "share" ? "Copied" : "Copy link"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {NETWORKS.map((n) => (
              <button
                key={n.key}
                type="button"
                disabled={!shareUrl}
                onClick={() => share(n.key)}
                aria-label={`Share on ${n.label}`}
                className={`${btn} border border-[#CBD5E1] bg-white text-[#0F172A] hover:border-[#64748B]`}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>
        ) : null}

        {/* Referral programme */}
        <div className="flex flex-col gap-3 rounded-[16px] bg-[#F4F6FA] p-4 sm:p-5">
          <h3 className="m-0 flex items-center gap-2 text-[15px] font-bold text-[#0F172A]">
            <PortalIcon name="dollar" size={17} className="text-[#F68A0A]" />
            Refer a friend
          </h3>
          {loading ? (
            <Skeleton className="h-[170px] bg-[#E2E8F0]" />
          ) : !overview ? (
            <EmptyNote icon="profile" title="Referral details aren't available right now">
              {canShareDesign ? "Try again later, or share your design link in the meantime." : "Try again later."}
            </EmptyNote>
          ) : (
            <>
              <dl className="m-0 grid grid-cols-3 gap-2">
                {[
                  ["Invited", String(overview.sent)],
                  ["Went solar", String(overview.converted)],
                  ["Earned", formatReferralCurrency(overview.earned)],
                ].map(([k, v]) => (
                  <div key={k} className="flex min-w-0 flex-col gap-0.5 rounded-[12px] bg-white px-3 py-2.5">
                    <dt className="text-[12.5px] text-[#5B6B80]">{k}</dt>
                    <dd className={`m-0 truncate text-[19px] font-bold tabular-nums ${k === "Earned" && overview.earned > 0 ? "text-[#15803D]" : "text-[#0F172A]"}`}>{v}</dd>
                  </div>
                ))}
              </dl>
              <form onSubmit={(e) => void invite(e)} className="flex flex-col gap-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label htmlFor="ref-email" className="sr-only">
                      Friend&rsquo;s email
                    </label>
                    <input id="ref-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Friend's email" disabled={submitting} data-clarity-mask="true" autoComplete="off" className={input} />
                  </div>
                  <div>
                    <label htmlFor="ref-name" className="sr-only">
                      Friend&rsquo;s name (optional)
                    </label>
                    <input id="ref-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Their name (optional)" maxLength={120} disabled={submitting} data-clarity-mask="true" autoComplete="off" className={input} />
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="submit" disabled={submitting || !email.trim()} className={`${btn} flex-1 bg-[#F68A0A] text-[#3B1D00] hover:bg-[#FF9A1F]`}>
                    <PortalIcon name="send" size={17} />
                    {submitting ? "Sending…" : "Send invitation"}
                  </button>
                  <button
                    type="button"
                    disabled={!overview.referralCode}
                    onClick={async () => (await copyText(buildReferralSignupUrl(overview.referralCode))) && flash("invite")}
                    className={`${btn} border border-[#CBD5E1] bg-white text-[#0F172A] hover:border-[#64748B]`}
                  >
                    <PortalIcon name={copied === "invite" ? "check" : "share"} size={17} />
                    {copied === "invite" ? "Copied" : "Copy invite link"}
                  </button>
                </div>
              </form>
              <p className="m-0 text-[12.5px] leading-[1.5] text-[#5B6B80]">Credit is applied once your friend pays their deposit.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
