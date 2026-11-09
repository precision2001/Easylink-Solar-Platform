"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  signInSchema,
  signUpSchema,
  type SignInFormData,
  type SignUpFormData,
} from "@/lib/validations/auth";
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { useAppDispatch } from "@/lib/store/hooks";
import {
  setCustomerSession,
  setUser,
  type CustomerUser,
} from "@/lib/store/customerAuthSlice";
import { navigateWithSessionRefresh } from "@/lib/auth/app-router-navigation";
import { safeReturnTarget } from "@/lib/auth/return-path";
import {
  CUSTOMER_AUTH_PATH,
  CUSTOMER_HOME_PATH,
  SSO_ALLOWED_ORIGINS,
} from "@/lib/auth/portal-paths";
import {
  PORTAL_LINK_SENT_FALLBACK,
  postPortalLink,
} from "@/lib/customers/portal-link-client";
import { PortalIcon, type PortalIconName } from "@/components/customer/portal/PortalIcon";
import {
  AuthIcon,
  BrandLink,
  Field,
  Notice,
  PRIMARY_BUTTON,
  QUIET_BUTTON,
  RevealButton,
  Spinner,
  SunMotif,
  TEXT_LINK,
} from "@/components/customer/auth/AuthBits";

type Mode = "signin" | "signup";
type Method = "password" | "link";

/**
 * Any in-app page is a valid place to come back to — a signed-out Buy click on
 * the public `/products` catalogue is the common one — so this no longer
 * insists the origin was under `/customers`. Also allows a handoff back to
 * another Easylink site (e.g. easylinkplus.com), gated to an explicit
 * allowlist — see `isSafeExternalReturnUrl`.
 */
function safeCustomerFrom(from: string | null): string {
  return safeReturnTarget(
    from,
    CUSTOMER_AUTH_PATH,
    CUSTOMER_HOME_PATH,
    SSO_ALLOWED_ORIGINS,
  );
}

/**
 * True if this browser already has a valid customer session — checked as a
 * plain, side-effect-free fetch. Deliberately NOT `fetchCustomerProfile`
 * (which goes through `fetchWithCustomerSession`): a 401 here is the normal,
 * expected case for most visitors landing on this page, and that helper
 * treats a failed-refresh 401 as "log the user out and redirect to
 * /customers/auth" — which, run from this page, computes that redirect
 * without the `from` param (the auth page itself is excluded from
 * `isSafeReturnPath`) and silently wipes it before the visitor ever gets to
 * sign in.
 */
async function hasExistingCustomerSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/customers/profile", {
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Finishes signing in and sends the customer to `target`. An in-app path
 * navigates normally; a full URL means an SSO handoff to another Easylink
 * site — we trade the session for a one-time code first (never the real
 * access/refresh tokens) and hand that to the other site in the URL, which
 * exchanges it for its own short-lived access token server-side.
 */
async function completeReturn(target: string) {
  if (target.startsWith("/")) {
    navigateWithSessionRefresh(target);
    return;
  }

  try {
    const res = await fetch("/api/customers/sso/issue", {
      method: "POST",
      credentials: "include",
    });
    const json = (await res.json().catch(() => null)) as {
      data?: { code?: string };
    } | null;
    const code = json?.data?.code;

    if (!code) {
      // No code, no safe way to prove identity to the other site — land the
      // customer on the target anyway rather than stranding them here.
      window.location.href = target;
      return;
    }

    const url = new URL(target);
    url.searchParams.set("code", code);
    window.location.href = url.toString();
  } catch {
    window.location.href = target;
  }
}

/* -------------------------------------------------------------- layout */

const BENEFITS: { icon: PortalIconName; title: string; body: string }[] = [
  {
    icon: "design",
    title: "See your design and savings",
    body: "Your panel layout, battery, price after rebates and estimated yearly savings.",
  },
  {
    icon: "project",
    title: "Track your installation",
    body: "Every step from site visit to switch-on, updated as your job moves.",
  },
  {
    icon: "spark",
    title: "Ask EasyLink AI any time",
    body: "Plain answers about your design, rebates, payments and install date.",
  },
];

function BrandPanel() {
  return (
    <aside className="relative overflow-hidden bg-[#0B1A2E] text-white lg:sticky lg:top-0 lg:h-screen">
      {/* A sunrise low on the horizon; the one bold thing on this screen. */}
      <SunMotif className="absolute -right-12 -top-16 size-[140px] text-[#F68A0A] opacity-[0.18] lg:-bottom-44 lg:-right-40 lg:top-auto lg:size-[500px] lg:opacity-[0.16]" />

      <div className="relative flex flex-col gap-3 px-4 pb-5 pt-3 sm:px-6 lg:h-full lg:justify-between lg:gap-10 lg:px-12 lg:py-10 xl:px-16">
        <div className="lg:hidden">
          <BrandLink compact />
        </div>
        <div className="hidden lg:block">
          <BrandLink />
        </div>

        <div className="flex flex-col gap-8">
          <p className="m-0 max-w-[460px] font-source-sans text-[22px] font-extrabold leading-[1.2] tracking-[-0.01em] sm:text-[26px] lg:text-[40px] lg:leading-[1.12]">
            Your solar, from design to switch-on, in one place
          </p>

          <ul className="m-0 hidden max-w-[440px] list-none flex-col gap-5 p-0 lg:flex">
            {BENEFITS.map((b) => (
              <li key={b.title} className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-white/[0.08] text-[#FFE866]">
                  <PortalIcon name={b.icon} size={21} />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="text-[16px] font-bold text-white">{b.title}</span>
                  <span className="text-[14.5px] leading-[1.5] text-[#C9D6EA]">{b.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <span aria-hidden="true" className="hidden lg:block" />
      </div>
    </aside>
  );
}

function CardHeading({ title, intro }: { title: string; intro: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="m-0 font-source-sans text-[28px] font-extrabold leading-[1.15] tracking-[-0.01em] text-[#0F172A]">
        {title}
      </h1>
      <p className="m-0 text-[15px] leading-[1.5] text-[#475569]">{intro}</p>
    </div>
  );
}

function OrDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-[13px] font-medium text-[#5B6B80]" role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-[#E2E8F0]" />
      <span aria-hidden="true">{label}</span>
      <span className="h-px flex-1 bg-[#E2E8F0]" />
    </div>
  );
}

/* -------------------------------------------------------------- sign in */

const METHODS: { key: Method; label: string; icon: "key" | "mail" }[] = [
  { key: "password", label: "Password", icon: "key" },
  { key: "link", label: "Email me a link", icon: "mail" },
];

function MethodSwitch({ method, onChange }: { method: Method; onChange: (m: Method) => void }) {
  return (
    <div role="radiogroup" aria-label="How do you want to sign in?" className="grid grid-cols-2 gap-1 rounded-[14px] bg-[#EEF2F7] p-1">
      {METHODS.map((m) => {
        const on = m.key === method;
        return (
          <button
            key={m.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(m.key)}
            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-[11px] px-2 text-[14px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] ${
              on ? "bg-white text-[#0F172A] shadow-[0_1px_3px_rgba(15,23,42,0.12)]" : "text-[#475569] hover:text-[#0F172A]"
            }`}
          >
            <AuthIcon name={m.icon} size={17} className={on ? "text-[#F68A0A]" : ""} />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

type FormError = { message: string; suggested?: { label: string; url: string } | null };

/** Passwordless path: the same endpoint the /portal-link page uses to send a fresh link. */
function EmailLinkForm({ email, onEmailChange }: { email: string; onEmailChange: (v: string) => void }) {
  const [sending, setSending] = useState(false);
  const [fieldError, setFieldError] = useState<string>();
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState<string>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    const parsed = signInSchema.shape.email.safeParse(email.trim());
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Enter a valid email address");
      return;
    }
    setFieldError(undefined);
    setSending(true);
    try {
      const { ok, json } = await postPortalLink({ action: "request", email: parsed.data });
      if (!ok) {
        setError(json.message || "Couldn't send a link just now. Please try again.");
        return;
      }
      setSent(json.message || PORTAL_LINK_SENT_FALLBACK);
    } catch {
      setError("Could not reach the sign-in service. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <Notice tone="good" title="Check your email">
          {sent} The link signs you in once and opens your design.
        </Notice>
        <p className="m-0 text-[14px] leading-[1.5] text-[#475569]">
          Sent to <span className="font-semibold text-[#0F172A]">{email.trim()}</span>. Not there after a few minutes? Check your junk folder.
        </p>
        <button type="button" onClick={() => setSent(undefined)} className={QUIET_BUTTON}>
          <AuthIcon name="refresh" size={18} />
          Use a different email or resend
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <p className="m-0 text-[14px] leading-[1.5] text-[#475569]">
        No password needed. We&apos;ll email you a secure link that signs you straight in. Handy if you started with our online design tool.
      </p>
      <Field
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com.au"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        error={fieldError}
      />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <button type="submit" disabled={sending} className={PRIMARY_BUTTON}>
        {sending ? <Spinner /> : <AuthIcon name="mail" size={18} />}
        {sending ? "Sending your link…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}

function SignInForm({ onSwitchMode }: { onSwitchMode: () => void }) {
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [checkingExistingSession, setCheckingExistingSession] =
    useState(false);
  const [method, setMethod] = useState<Method>("password");
  const [linkEmail, setLinkEmail] = useState("");
  const [formError, setFormError] = useState<FormError | null>(null);

  // An SSO handoff (e.g. from easylinkplus.com's "Get Free Quote") should
  // skip straight past the login form if this browser is already signed in
  // here — that's the whole point of the redirect. Scoped to the external-
  // handoff case only, so a plain visit to /customers/auth while signed in
  // still shows the form as before.
  useEffect(() => {
    const from = searchParams.get("from");
    if (!from || from.startsWith("/")) return;
    const target = safeCustomerFrom(from);
    if (target.startsWith("/")) return; // not an allowlisted external target

    let cancelled = false;
    setCheckingExistingSession(true);
    void hasExistingCustomerSession()
      .then((signedIn) => {
        if (cancelled || !signedIn) return;
        void completeReturn(target);
      })
      .finally(() => {
        if (!cancelled) setCheckingExistingSession(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    register,
    handleSubmit,
    setError,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  /** Carry a typed email across, so switching method never means retyping it. */
  function changeMethod(next: Method) {
    if (next === method) return;
    if (next === "link") {
      const typed = getValues("email");
      if (typed) setLinkEmail(typed);
    } else if (linkEmail && !getValues("email")) {
      setValue("email", linkEmail);
    }
    setMethod(next);
  }

  const onSubmit = async (data: SignInFormData) => {
    setFormError(null);
    try {
      const response = await fetch("/api/customers/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ ...data, portal: "customer" }),
      });

      const result = (await response.json().catch(() => null)) as {
        message?: string;
        user?: CustomerUser;
        accessToken?: string;
        fieldErrors?: Partial<Record<keyof SignInFormData, string[]>>;
        portalMismatch?: {
          portal: string;
          role: string;
          suggested: { key: string; label: string; url: string } | null;
        };
      } | null;

      if (!response.ok) {
        if (result?.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            const firstMessage = messages?.[0];
            if (firstMessage) {
              setError(field as keyof SignInFormData, {
                type: "server",
                message: firstMessage,
              });
            }
          }
        }

        const mismatch = result?.portalMismatch;
        if (mismatch?.suggested) {
          const message =
            result?.message ??
            `Your account cannot sign in via the ${mismatch.portal} login portal.`;
          setFormError({ message, suggested: mismatch.suggested });
          toast.error(
            message + ` Click here to go to the ${mismatch.suggested.label} login.`,
            {
              autoClose: 8000,
              onClick: () => {
                navigateWithSessionRefresh(mismatch.suggested!.url);
              },
            },
          );
        } else {
          const message = result?.message ?? "Unable to sign you in. Please try again.";
          setFormError({ message });
          toast.error(message);
        }
        return;
      }

      toast.success(result?.message ?? "Signed in successfully.");

      if (result?.user && typeof result.accessToken === "string") {
        dispatch(
          setCustomerSession({
            user: result.user,
            accessToken: result.accessToken,
          }),
        );
      } else if (result?.user) {
        dispatch(setUser(result.user));
      }

      const target = safeCustomerFrom(searchParams.get("from"));
      void completeReturn(target);
    } catch {
      const message = "Unable to reach the login service. Please try again.";
      setFormError({ message });
      toast.error(message);
    }
  };

  if (checkingExistingSession) {
    return (
      <div role="status" className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-[15px] font-semibold text-[#475569]">
        <Spinner className="size-6 text-[#F68A0A]" />
        Signing you in…
      </div>
    );
  }

  const passwordField = register("password");

  return (
    <div className="flex flex-col gap-6">
      <CardHeading title="Sign in" intro="Welcome back. Pick how you'd like to sign in." />
      <MethodSwitch method={method} onChange={changeMethod} />

      {method === "link" ? (
        <EmailLinkForm email={linkEmail} onEmailChange={setLinkEmail} />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Field
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com.au"
            error={errors.email?.message}
            {...register("email")}
          />
          <Field
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            error={errors.password?.message}
            right={<RevealButton shown={showPassword} onToggle={() => setShowPassword((x) => !x)} />}
            {...passwordField}
          />

          <div className="-my-1 flex flex-wrap items-center justify-between gap-x-4">
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[14px] font-medium text-[#334155]">
              <input
                type="checkbox"
                {...register("remember")}
                className="size-[18px] rounded accent-[#0B1A2E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
              />
              Remember me
            </label>
            <Link href="/forgot-password?role=CUSTOMER" className={TEXT_LINK}>
              Forgot password?
            </Link>
          </div>

          {formError ? (
            <Notice tone="error">
              {formError.message}
              {formError.suggested ? (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={() => navigateWithSessionRefresh(formError.suggested!.url)}
                    className="font-bold text-[#1D4ED8] underline underline-offset-2"
                  >
                    Go to the {formError.suggested.label} login
                  </button>
                </>
              ) : null}
            </Notice>
          ) : null}

          <button type="submit" disabled={isSubmitting} className={PRIMARY_BUTTON}>
            {isSubmitting ? <Spinner /> : null}
            {isSubmitting ? "Signing in…" : "Sign in"}
            {isSubmitting ? null : <PortalIcon name="arrow" size={18} />}
          </button>
        </form>
      )}

      <OrDivider label="New to EasyLink?" />
      <button type="button" onClick={onSwitchMode} className={QUIET_BUTTON}>
        Create an account
      </button>
    </div>
  );
}

/* -------------------------------------------------------------- sign up */

function SignUpForm({ onSwitchMode }: { onSwitchMode: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  // `?ref=` arrives on links shared by existing customers, so the referrer gets
  // credit. Never rendered as a field — it just rides along with the signup.
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref")?.trim() || undefined;
  // `?from=` is the same return context the sign-in form honours — carried
  // into the verification email so clicking it can eventually complete an
  // SSO handoff (e.g. back to easylinkplus.com) instead of stranding the new
  // customer on a bare "email verified" page.
  const from = searchParams.get("from")?.trim() || undefined;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      password: "",
      address: "",
    },
  });

  const onSubmit = async (data: SignUpFormData) => {
    setFormError(null);
    try {
      const response = await fetch("/api/customers/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          ...data,
          ...(referralCode ? { referralCode } : {}),
          ...(from ? { from } : {}),
        }),
      });

      const result = (await response.json().catch(() => null)) as {
        message?: string;
        fieldErrors?: Partial<Record<keyof SignUpFormData, string[]>>;
      } | null;

      if (!response.ok) {
        if (result?.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            const firstMessage = messages?.[0];
            if (firstMessage) {
              setError(field as keyof SignUpFormData, {
                type: "server",
                message: firstMessage,
              });
            }
          }
        }

        const message = result?.message ?? "Unable to create your account right now.";
        setFormError(message);
        toast.error(message);
        return;
      }

      reset();

      // A return context (from the SSO handoff, or any other `?from=`/`?ref=`
      // caller) is only useful once the customer can actually sign in — new
      // accounts still need email verification first, so this can't skip
      // straight back there. Switching to sign-in keeps the same query string
      // (mode is local state, not a URL change), so once they verify and sign
      // in, the existing `from` handling completes the trip on its own.
      const hasReturnContext = Boolean(
        searchParams.get("from") || searchParams.get("ref"),
      );

      const message =
        result?.message ??
        (hasReturnContext
          ? "Account created — check your email to verify it, then sign in here to continue."
          : "Account created successfully. You can now sign in.");
      toast.success(message);

      if (hasReturnContext) {
        onSwitchMode();
      } else {
        setCreated(message);
      }
    } catch {
      const message = "Unable to reach the signup service. Please try again.";
      setFormError(message);
      toast.error(message);
    }
  };

  const passwordField = register("password");

  if (created) {
    return (
      <div className="flex flex-col gap-6">
        <CardHeading title="Account created" intro="Sign in to open your portal." />
        <Notice tone="good" title="Your account is ready">
          {created}
        </Notice>
        <button type="button" onClick={onSwitchMode} className={PRIMARY_BUTTON}>
          Go to sign in
          <PortalIcon name="arrow" size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <CardHeading
        title="Create your account"
        intro="Use the address where your solar will be installed, so your design and quote match your home."
      />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" autoComplete="given-name" error={errors.firstName?.message} {...register("firstName")} />
          <Field label="Last name" autoComplete="family-name" error={errors.lastName?.message} {...register("lastName")} />
        </div>
        <Field
          label="Mobile number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0412 345 678"
          error={errors.phone?.message}
          {...register("phone")}
        />
        <p className="-mt-2 text-[12.5px] leading-[18px] text-[#5B6B80]">
          We’ll text this number about your quote and installation, such as appointment times and payment links. No marketing. Reply STOP to opt out.
        </p>
        <Field
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com.au"
          error={errors.email?.message}
          {...register("email")}
        />
        <Field
          label="Password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          hint="At least 6 characters."
          error={errors.password?.message}
          right={<RevealButton shown={showPassword} onToggle={() => setShowPassword((x) => !x)} />}
          {...passwordField}
        />
        <Field
          label="Installation address"
          autoComplete="street-address"
          placeholder="12 Example Street, Parramatta NSW 2150"
          error={errors.address?.message}
          {...register("address")}
        />

        {formError ? <Notice tone="error">{formError}</Notice> : null}

        <button type="submit" disabled={isSubmitting} className={PRIMARY_BUTTON}>
          {isSubmitting ? <Spinner /> : null}
          {isSubmitting ? "Creating your account…" : "Create account"}
        </button>
        <p className="m-0 text-center text-[12.5px] leading-[1.5] text-warm-gray">
          By creating an account you agree to our{" "}
          <Link href="/terms" target="_blank" className="font-semibold underline">terms</Link> and{" "}
          <Link href="/privacy-policy" target="_blank" className="font-semibold underline">privacy policy</Link>.
        </p>
      </form>

      <OrDivider label="Already have an account?" />
      <button type="button" onClick={onSwitchMode} className={QUIET_BUTTON}>
        Sign in
      </button>
    </div>
  );
}

/* -------------------------------------------------------------- page */

export default function CustomerAuthPage() {
  const [mode, setMode] = useState<Mode>("signin");

  return (
    <main className="min-h-screen bg-[#F4F6FA] font-inter text-[#0F172A] lg:grid lg:grid-cols-[minmax(400px,5fr)_7fr]">
      <BrandPanel />

      <div className="flex flex-col items-center px-4 pb-12 pt-6 sm:px-6 sm:pt-10 lg:justify-center lg:py-12">
        <div className="flex w-full max-w-[480px] flex-col gap-4">
          <section className="rounded-[22px] border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-8">
            <Suspense
              fallback={
                <div role="status" className="flex min-h-[260px] items-center justify-center gap-3 text-[15px] text-[#475569]">
                  <Spinner className="size-5 text-[#F68A0A]" />
                  Loading…
                </div>
              }
            >
              {mode === "signin" ? (
                <SignInForm onSwitchMode={() => setMode("signup")} />
              ) : (
                <SignUpForm onSwitchMode={() => setMode("signin")} />
              )}
            </Suspense>
          </section>

          <p className="m-0 flex flex-wrap items-center justify-center gap-x-1.5 text-center text-[14px] text-[#475569]">
            Haven&apos;t designed your system yet?
            <Link href="/designs" className={`${TEXT_LINK} gap-1`}>
              Design my system
              <PortalIcon name="arrow" size={16} />
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
