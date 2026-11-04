"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icons";
import {
  createAdQuoteCheckout,
  fetchAdQuoteTiers,
  type AdQuotePaymentMethod,
  type AdQuoteTierId,
  type AdQuoteTiers,
} from "@/lib/public/adQuoteCheckout";
import { renderGoogleSignInButton } from "@/lib/public/googleIdentity";

type Props = {
  tierId: AdQuoteTierId;
  tierName: string;
  priceLabel: string;
  onClose: () => void;
};

type PayOption = Exclude<AdQuotePaymentMethod, "auto">;

const PAY_OPTIONS: {
  id: PayOption;
  label: string;
  blurb: string;
}[] = [
  { id: "card", label: "Card", blurb: "Pay in full — Visa, Mastercard, Amex" },
  { id: "afterpay", label: "Afterpay", blurb: "4 interest-free instalments" },
  { id: "zip", label: "Zip", blurb: "Own it now, pay later" },
];

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/**
 * "Sign in with Google, then straight to Stripe" — no account, no password.
 * The Google button itself hands us a signed ID token; we send that straight
 * to the backend, which verifies it and creates the Checkout session.
 *
 * Afterpay and Zip are DIRECT integrations on Easylink's own merchant
 * accounts, so choosing either redirects to that provider's site rather than
 * to Stripe. Each is offered only for packages inside that provider's
 * order-value limits, which the backend reports (this site holds price
 * *labels*, not the real amounts).
 */
export function PricingCheckoutModal({ tierId, tierName, priceLabel, onClose }: Props) {
  const buttonHostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [method, setMethod] = useState<PayOption>("card");
  const [tiers, setTiers] = useState<AdQuoteTiers | null>(null);

  // The Google button's callback is registered once and never re-registered
  // (re-rendering it would flicker and lose the iframe), so it reads the
  // current choice through a ref rather than a stale closure.
  const methodRef = useRef<PayOption>(method);
  useEffect(() => {
    methodRef.current = method;
  }, [method]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitting]);

  // Failing to load this is not fatal — it only means the Afterpay option
  // stays hidden and the card flow works exactly as it did before.
  useEffect(() => {
    let active = true;
    void fetchAdQuoteTiers()
      .then((data) => {
        if (active) setTiers(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const host = buttonHostRef.current;
    if (!host) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

    void renderGoogleSignInButton(host, clientId, (idToken) => {
      setSubmitting(true);
      setError(null);
      void createAdQuoteCheckout({
        tierId,
        googleIdToken: idToken,
        paymentMethod: methodRef.current,
      })
        .then((session) => {
          window.location.assign(session.checkoutUrl);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Could not start checkout");
          setSubmitting(false);
        });
    }).catch((err: unknown) => {
      setError(
        err instanceof Error ? err.message : "Could not load Google sign-in",
      );
    });
  }, [tierId]);

  const tier = tiers?.tiers.find((t) => t.id === tierId) ?? null;
  const afterpayAvailable = tier?.afterpayEligible ?? false;
  const zipAvailable = tier?.zipEligible ?? false;
  const limits = tiers?.afterpayLimits ?? null;
  const zipLimits = tiers?.zipLimits ?? null;
  const currency = tiers?.currency ?? "AUD";

  // Only meaningful once the tiers have loaded — before that we show nothing
  // rather than guess at why an option is missing.
  const unavailableNote = (
    name: string,
    range: { min: number; max: number } | null,
  ): string | null =>
    range
      ? `${name} is available on orders between ${formatMoney(
          range.min,
          currency,
        )} and ${formatMoney(range.max, currency)}, so it can't be used for this package.`
      : null;

  // Both notes can apply at once, so they are collected rather than
  // short-circuited: a buyer told only about Afterpay would be left
  // wondering where Zip went.
  const notes = tier
    ? [
        afterpayAvailable ? null : unavailableNote("Afterpay", limits),
        zipAvailable ? null : unavailableNote("Zip", zipLimits),
      ].filter((note): note is string => note !== null)
    : [];

  const options = PAY_OPTIONS.filter((option) => {
    if (option.id === "afterpay") return afterpayAvailable;
    if (option.id === "zip") return zipAvailable;
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 px-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0"
        onClick={() => {
          if (!submitting) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pricing-checkout-title"
        className="relative z-1 w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="pricing-checkout-title"
              className="font-outfit text-lg font-bold text-svc-ink"
            >
              {tierName}
            </h2>
            <p className="mt-0.5 font-dm-sans text-sm text-svc-muted">{priceLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-svc-muted hover:bg-svc-accent-soft disabled:opacity-50"
          >
            <Icon name="X" className="size-4" />
          </button>
        </div>

        {options.length > 1 ? (
          <fieldset className="mt-5" disabled={submitting}>
            <legend className="font-dm-sans text-sm font-semibold text-svc-ink">
              How would you like to pay?
            </legend>
            <div
              role="radiogroup"
              aria-label="Payment method"
              className="mt-2.5 flex flex-col gap-2"
            >
              {options.map((option) => {
                const selected = method === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setMethod(option.id)}
                    className={`flex items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left transition disabled:opacity-50 ${
                      selected
                        ? "border-svc-accent bg-svc-accent-soft"
                        : "border-svc-border-soft bg-white hover:border-svc-accent"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        selected
                          ? "border-svc-accent bg-svc-accent text-white"
                          : "border-svc-border-soft"
                      }`}
                    >
                      {selected ? (
                        <Icon name="Check" className="size-3 text-current" />
                      ) : null}
                    </span>
                    <span className="flex flex-col">
                      <span className="font-outfit text-sm font-semibold text-svc-ink">
                        {option.label}
                      </span>
                      <span className="font-dm-sans text-[13px] leading-5 text-svc-muted">
                        {option.blurb}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        {notes.map((note) => (
          <p
            key={note}
            className="mt-3 font-inter text-[13px] leading-5 text-svc-muted"
          >
            {note}
          </p>
        ))}

        <p className="mt-4 font-dm-sans text-sm leading-6 text-svc-body">
          Sign in with Google to confirm who to send the receipt and project
          updates to, then you&apos;ll go straight to
          {method === "afterpay"
            ? " Afterpay to approve your four instalments."
            : method === "zip"
              ? " Zip to approve your payment plan."
              : " Stripe's secure checkout to pay."}
        </p>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-dm-sans text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col items-center gap-3">
          <div ref={buttonHostRef} />
          {submitting ? (
            <p className="font-dm-sans text-sm text-svc-muted">
              {method === "afterpay"
                ? "Redirecting to Afterpay…"
                : method === "zip"
                  ? "Redirecting to Zip…"
                  : "Redirecting to Stripe secure checkout…"}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
