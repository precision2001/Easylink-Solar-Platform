"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
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
import { useAppDispatch } from "@/lib/store/hooks";
import {
  setInstallerSession,
  setInstallerUser,
  type InstallerUser,
} from "@/lib/store/installerAuthSlice";
import { navigateWithSessionRefresh } from "@/lib/auth/app-router-navigation";
import { DesignTopBar } from "@/components/modules/DesignTopBar";

type Mode = "signin" | "signup";

const INSTALLER_HOME = "/installers/dashboard/home";

function safeInstallerFrom(from: string | null): string {
  if (!from) return INSTALLER_HOME;
  if (!from.startsWith("/installers")) return INSTALLER_HOME;
  if (from.startsWith("/installers/auth")) return INSTALLER_HOME;
  return from;
}

function SignInForm({ onSwitchMode }: { onSwitchMode: () => void }) {
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const [showPassword, setShowPassword] = useState(false);

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
      const response = await fetch("/api/installers/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ ...data, portal: "installer" }),
      });

      const result = (await response.json().catch(() => null)) as {
        message?: string;
        user?: InstallerUser;
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
          setInstallerSession({
            user: result.user,
            accessToken: result.accessToken,
          }),
        );
      } else if (result?.user) {
        dispatch(setInstallerUser(result.user));
      }

      const target = safeInstallerFrom(searchParams.get("from"));
      navigateWithSessionRefresh(target);
    } catch {
      toast.error("Unable to reach the login service. Please try again.");
    }
  };

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
              Sign in to your installer account
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
              href="/forgot-password?role=INSTALLER"
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
      const response = await fetch("/api/installers/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(data),
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
      toast.success(
        result?.message ?? "Account created successfully. You can now sign in.",
      );
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
            Create installer account
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
            placeholder="0412 345 678"
            type="tel"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <p className="-mt-2 text-[12.5px] leading-[18px] text-[#5B6B80]">
            We’ll text this number about jobs, site visits and payments. No marketing. Reply STOP to opt out.
          </p>
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

          <p className="m-0 text-center text-[13px] leading-[1.5] text-slate-600">
            By signing up you agree to our{" "}
            <Link href="/terms" target="_blank" className="font-semibold underline">terms</Link> and{" "}
            <Link href="/privacy-policy" target="_blank" className="font-semibold underline">privacy policy</Link>, including how EasyLink uses AI.
          </p>

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

/** Bounces legacy `/installers/auth?portal=...` links to their new homes. */
function LegacyPortalRedirectGuard() {
  const params = useSearchParams();
  useEffect(() => {
    const raw = params.get("portal")?.toLowerCase();
    if (raw === "distributor") {
      window.location.replace("/master/auth");
    } else if (raw === "master" || raw === "admin") {
      window.location.replace("/admin/auth");
    } else if (raw === "customer") {
      window.location.replace("/customers/auth");
    }
  }, [params]);
  return null;
}

export default function InstallerAuthPage() {
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
            <LegacyPortalRedirectGuard />
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
