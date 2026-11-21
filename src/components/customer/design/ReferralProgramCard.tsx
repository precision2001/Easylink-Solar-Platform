"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { CustomerSectionHeader } from "@/components/customer/CustomerSectionHeader";
import Icon from "@/components/ui/Icons";
import {
  buildReferralSignupUrl,
  formatReferralCurrency,
  inviteReferral,
  type ReferralOverview,
} from "@/lib/customers/referrals";

type Props = {
  overview: ReferralOverview | null;
  loading?: boolean;
  /** Called with the refreshed totals after a successful invite. */
  onInvited?: () => void;
};

export function ReferralProgramCard({
  overview,
  loading = false,
  onInvited,
}: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const reward = overview?.rewardAmount ?? 500;

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const result = await inviteReferral({
        email: trimmed,
        ...(name.trim() ? { name: name.trim() } : {}),
      });

      // Say what actually happened: the referral always counts, but the email
      // only goes out when a mail provider is configured.
      if (result.emailSent) {
        toast.success(`Invitation emailed to ${trimmed}.`);
      } else {
        toast.info(
          `Referral saved for ${trimmed}, but we could not email the invitation. Share your link instead.`,
        );
      }
      setEmail("");
      setName("");
      setFormOpen(false);
      onInvited?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not record that referral",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!overview?.referralCode) return;
    try {
      await navigator.clipboard.writeText(
        buildReferralSignupUrl(overview.referralCode),
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="customer-panel-bg customer-panel-border-dark flex flex-col overflow-hidden rounded-[10px] border">
      <CustomerSectionHeader
        variant="dark"
        title="Referral Program"
        meta={overview ? `Code ${overview.referralCode}` : undefined}
        icon={
          <Icon
            name="MyDesignGift"
            className="size-4 shrink-0 text-white"
            aria-hidden
          />
        }
      />
      <div className="flex flex-col gap-3 p-4">
        <div className="customer-avatar-gradient rounded-[10px] px-4 py-4 text-center">
          <p className="font-inter text-xl font-bold leading-[30px] text-white">
            {formatReferralCurrency(reward)}
          </p>
          <p
            className="mt-1 font-dm-sans text-[11px] font-normal leading-[16.5px] text-cream-200/70"
            style={{ fontVariationSettings: "'opsz' 9" }}
          >
            credit for every friend who goes solar
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-lg border customer-cream-card-border bg-cream-50 px-2 py-3 text-center">
            <p className="font-inter text-lg font-bold leading-[27px] text-warm-ink">
              {loading ? "—" : (overview?.sent ?? 0)}
            </p>
            <p
              className="mt-1 font-dm-sans text-[9px] font-normal uppercase leading-[13.5px] tracking-[0.3px] text-warm-gray"
              style={{ fontVariationSettings: "'opsz' 9" }}
            >
              Referrals Sent
            </p>
          </div>
          <div className="rounded-lg border customer-cream-card-border bg-cream-50 px-2 py-3 text-center">
            <p className="font-inter text-lg font-bold leading-[27px] text-success">
              {loading ? "—" : (overview?.converted ?? 0)}
            </p>
            <p
              className="mt-1 font-dm-sans text-[9px] font-normal uppercase leading-[13.5px] tracking-[0.3px] text-warm-gray"
              style={{ fontVariationSettings: "'opsz' 9" }}
            >
              Converted
            </p>
          </div>
          <div className="rounded-lg border customer-cream-card-border bg-cream-50 px-2 py-3 text-center">
            <p className="font-inter text-lg font-bold leading-[27px] text-orange-amber">
              {loading
                ? "—"
                : formatReferralCurrency(overview?.earned ?? 0)}
            </p>
            <p
              className="mt-1 font-dm-sans text-[9px] font-normal uppercase leading-[13.5px] tracking-[0.3px] text-warm-gray"
              style={{ fontVariationSettings: "'opsz' 9" }}
            >
              Earned
            </p>
          </div>
        </div>

        {/* Credit is only earned once the friend pays their deposit — say so
            rather than implying the invite alone pays out. */}
        <p
          className="font-dm-sans text-[10px] leading-[15px] customer-text-subtle"
          style={{ fontVariationSettings: "'opsz' 9" }}
        >
          Credit is applied once your friend pays their deposit.
        </p>

        {formOpen ? (
          <form className="flex flex-col gap-2" onSubmit={(e) => void handleInvite(e)}>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="friend@example.com"
              disabled={submitting}
              data-clarity-mask="true"
              className="h-[34px] rounded-lg border border-warm-border bg-cream-50 px-3 font-dm-sans text-[11px] text-warm-ink outline-none focus:border-brand-blue"
            />
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Their name (optional)"
              maxLength={120}
              disabled={submitting}
              data-clarity-mask="true"
              className="h-[34px] rounded-lg border border-warm-border bg-cream-50 px-3 font-dm-sans text-[11px] text-warm-ink outline-none focus:border-brand-blue"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                disabled={submitting}
                className="h-[34px] flex-1 rounded-lg border border-white/30 font-dm-sans text-[11px] font-semibold text-white disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="customer-gradient-accent-v h-[34px] flex-1 rounded-lg font-dm-sans text-[11px] font-bold text-warm-black disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              disabled={loading || !overview}
              className="customer-gradient-accent-v flex h-[34px] flex-1 items-center justify-center gap-2 rounded-lg font-dm-sans text-[11px] font-bold text-warm-black disabled:cursor-not-allowed disabled:opacity-60"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              <Icon
                name="BlogDetailShareLink"
                className="size-4 shrink-0"
                aria-hidden
              />
              Refer a Friend
            </button>
            <button
              type="button"
              onClick={() => void copyLink()}
              disabled={loading || !overview?.referralCode}
              className="inline-flex h-[34px] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-navy-800 px-4 font-dm-sans text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              <Icon name="Copy" className="size-4 shrink-0 text-white" aria-hidden />
              {copied ? "Copied" : "Copy Invite"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
