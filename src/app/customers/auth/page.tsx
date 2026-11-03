"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthCard } from "@/components/ui/auth/AuthCard";
import { AuthDivider } from "@/components/ui/auth/AuthDivider";
import { AuthField } from "@/components/ui/auth/AuthField";
import {
  AuthGhostButton,
  AuthPrimaryButton,
} from "@/components/ui/auth/AuthButtons";
import Icon from "@/components/ui/Icons";
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
import { DesignTopBar } from "../../../components/modules/DesignTopBar";

type Mode = "signin" | "signup";

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

function SignInForm({ onSwitchMode }: { onSwitchMode: () => void }) {
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [checkingExistingSession, setCheckingExistingSession] =
    useState(false);

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
    formState: { errors, isSubmitting },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  const onSubmit = async (data: SignInFormData) => {
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
          toast.error(
            (result?.message ??
              `Your account cannot sign in via the ${mismatch.portal} login portal.`) +
              ` Click here to go to the ${mismatch.suggested.label} login.`,
            {
              autoClose: 8000,
              onClick: () => {
                navigateWithSessionRefresh(mismatch.suggested!.url);
              },
            },
          );
        } else {
          toast.error(
            result?.message ?? "Unable to sign you in. Please try again.",
          );
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
      toast.error("Unable to reach the login service. Please try again.");
    }
  };

  if (checkingExistingSession) {
    return (
      <div className="flex min-h-[240px] w-full items-center justify-center px-[32px] py-[20px] font-source-sans text-[14px] text-(--color-auth-subtle-70)">
        Signing you in…
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center px-[32px] py-[20px]">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex w-[579px] max-w-full flex-col gap-[32px]"
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-[4px] pr-[64px]">
            <p className="font-source-sans text-[24px] font-bold leading-[36px] tracking-[0.5px] text-auth-title">
              Welcome Back
            </p>
            <p className="font-source-sans text-[14px] font-medium leading-[20px] tracking-[-0.1504px] text-(--color-auth-subtle-70)">
              Sign in to your customer account
            </p>
          </div>
          <div>
            <Image
              src="/images/solarDesignLogo.png"
              alt="Solar Design Logo"
              width={54}
              height={54}
            />
          </div>
        </div>

        <div className="flex flex-col gap-[10px]">
          <AuthField
            icon={<Icon name="User" />}
            placeholder="Email"
            inputClassName="text-[16px] tracking-[-0.3125px]"
            error={errors.email?.message}
            {...register("email")}
          />
          <AuthField
            icon={<Icon name="Lock" />}
            placeholder="Password"
            type={showPassword ? "text" : "password"}
            inputClassName="text-[16px] tracking-[-0.3125px]"
            error={errors.password?.message}
            right={
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((x) => !x)}
                className="text-auth-placeholder"
              >
                <Icon name="Eye" />
              </button>
            }
            {...register("password")}
          />

          <div className="flex h-[20px] items-center justify-between px-[4px]">
            <label className="flex items-center gap-[8px]">
              <input
                type="checkbox"
                {...register("remember")}
                className="size-[16px] accent-auth-outline"
              />
              <span className="font-source-sans text-[14px] font-medium leading-[20px] tracking-[-0.1504px] text-(--color-auth-subtle-70)">
                Remember me
              </span>
            </label>
            <Link
              href="/forgot-password?role=CUSTOMER"
              className="font-source-sans text-[14px] font-medium leading-[20px] tracking-[-0.1504px] text-(--color-auth-subtle-60) underline"
            >
              Forgot password?
            </Link>
          </div>

          <AuthPrimaryButton
            icon={<Icon name="ArrowRight" />}
            label={isSubmitting ? "Signing in..." : "Sign In"}
            borderVariant="gradient"
            type="submit"
          />

          <Link
            href="/portal-link"
            className="text-center font-source-sans text-[14px] font-medium leading-[20px] text-(--color-auth-subtle-60) underline"
          >
            No password? Email me a sign-in link
          </Link>

          <AuthDivider label="or" />

          <div className="flex justify-center">
            <AuthGhostButton
              label="Create an Account"
              width={187.235}
              onClick={onSwitchMode}
            />
          </div>
        </div>
      </form>
    </div>
  );
}

function SignUpForm({ onSwitchMode }: { onSwitchMode: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
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

        toast.error(
          result?.message ?? "Unable to create your account right now.",
        );
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

      toast.success(
        result?.message ??
          (hasReturnContext
            ? "Account created — check your email to verify it, then sign in here to continue."
            : "Account created successfully. You can now sign in."),
      );

      if (hasReturnContext) {
        onSwitchMode();
      }
    } catch {
      toast.error("Unable to reach the signup service. Please try again.");
    }
  };

  return (
    <div className="px-[32px] py-[20px]">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mx-auto flex w-[435px] max-w-full flex-col gap-[20px]"
      >
        <div className="flex flex-col gap-[4px] pr-[64px]">
          <p className="font-source-sans text-[24px] font-extrabold leading-[36px] tracking-[0.5px] text-auth-title">
            Create Account
          </p>
          <p className="font-source-sans text-[14px] font-bold leading-[20px] tracking-[-0.1504px] text-(--color-auth-subtle-70)">
            Fill in your details to get started
          </p>
        </div>

        <div className="flex flex-col gap-[12px]">
          <AuthField
            icon={<Icon name="User" />}
            placeholder="John"
            error={errors.firstName?.message}
            {...register("firstName")}
          />
          <AuthField
            icon={<Icon name="User" />}
            placeholder="Doe"
            error={errors.lastName?.message}
            {...register("lastName")}
          />
          <AuthField
            icon={<Icon name="Phone" />}
            placeholder="+1 234 567 8900"
            type="tel"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <AuthField
            icon={<Icon name="Mail" />}
            placeholder="john@example.com"
            type="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <AuthField
            icon={<Icon name="Lock" />}
            placeholder="Min 6 characters"
            type={showPassword ? "text" : "password"}
            error={errors.password?.message}
            right={
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((x) => !x)}
                className="text-auth-placeholder"
              >
                <Icon name="Eye" />
              </button>
            }
            {...register("password")}
          />
          <AuthField
            icon={<Icon name="Pin" />}
            placeholder="123 Main St"
            error={errors.address?.message}
            {...register("address")}
          />

          <AuthPrimaryButton
            icon={<Icon name="UserPlus" />}
            label={isSubmitting ? "Signing up..." : "Sign Up"}
            type="submit"
          />

          <AuthDivider label="already have an account?" />

          <div className="flex justify-center">
            <AuthGhostButton
              label="Login"
              width={178.535}
              onClick={onSwitchMode}
            />
          </div>
        </div>
      </form>
    </div>
  );
}

export default function CustomerAuthPage() {
  const [mode, setMode] = useState<Mode>("signin");

  const cardSize = useMemo(() => {
    if (mode === "signin") {
      return "w-[min(490px,calc(100%-40px))]";
    }
    return "w-[min(490px,calc(100%-40px))]";
  }, [mode]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-void">
      <div className="absolute inset-0">
        <Image
          src="/images/home/login-background.png"
          alt=""
          fill
          className="object-cover"
          priority
        />
      </div>
      <DesignTopBar />

      <div className="relative z-10 flex min-h-[calc(100vh-92px)] items-center justify-center px-5">
        <AuthCard className={cardSize}>
          <Suspense
            fallback={
              <div className="flex min-h-[240px] items-center justify-center px-[32px] py-[20px] font-source-sans text-[14px] text-(--color-auth-subtle-70)">
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
        </AuthCard>
      </div>
    </main>
  );
}
