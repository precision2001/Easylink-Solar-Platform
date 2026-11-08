"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { fetchCustomerProfile } from "@/lib/customers/profile";
import { setUser } from "@/lib/store/customerAuthSlice";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";

/**
 * Refills the signed-in customer in Redux when only the session survives.
 *
 * The user object is persisted in `sessionStorage`, which is scoped to one tab
 * and dies with it, while `customer_access_token` / `customer_refresh_token`
 * are httpOnly cookies that outlive the tab. Open the portal in a new tab (or
 * reopen it after closing one) and you land on a perfectly valid session with
 * `customerAuth.user === null` — which is what renders the header avatar as
 * "??" and the title as "My Dashboard" instead of the customer's name.
 *
 * The cookies are the real source of truth, so we ask the profile endpoint who
 * we are whenever the store has no user. Runs once per mount and only while the
 * user is missing, so a hydrated store costs nothing.
 */
export function useHydrateCustomerUser(): void {
  const dispatch = useAppDispatch();
  const hasUser = useAppSelector((s) => s.customerAuth.user !== null);
  const pathname = usePathname();

  useEffect(() => {
    if (hasUser) return;
    // The sign-in screen has no session yet. Asking there would 401, fail the
    // refresh, and bounce the visitor through a pointless logout redirect.
    if (pathname?.startsWith("/customers/auth")) return;

    let cancelled = false;
    void fetchCustomerProfile()
      .then((profile) => {
        if (!cancelled && profile) dispatch(setUser(profile));
      })
      // A failure here is already handled by fetchWithCustomerSession, which
      // redirects to sign-in when the refresh token is dead too. Anything else
      // (offline, backend down) should leave the page usable rather than throw.
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [dispatch, hasUser, pathname]);
}
