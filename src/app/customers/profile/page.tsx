"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { CustomerAvatar } from "@/components/customer/CustomerAvatar";
import { CustomerDashboardHeader } from "@/components/customer/dashboard/CustomerDashboardHeader";
import { CustomerEditProfileModal } from "@/components/customer/profile/CustomerEditProfileModal";
import { CustomerPanelCard } from "@/components/customer/profile/CustomerPanelCard";
import { ProfileContactField } from "@/components/customer/profile/ProfileContactField";
import { ProfileDocumentRow } from "@/components/customer/profile/ProfileDocumentRow";
import { ProfileEntityRow } from "@/components/customer/profile/ProfileEntityRow";
import { StatusBadge } from "@/components/customer/profile/StatusBadge";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { setUser } from "@/lib/store/customerAuthSlice";
import Icon from "@/components/ui/Icons";
import {
  fetchCustomerDocuments,
  formatDocumentSize,
  type CustomerDocument,
} from "@/lib/customers/documents";
import {
  fetchCustomerProfile,
  formatAccountDate,
  profileDiff,
  updateCustomerProfile,
} from "@/lib/customers/profile";

export default function CustomerProfilePage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.customerAuth.user);

  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchCustomerDocuments({ signal: controller.signal })
      .then(setDocuments)
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setDocumentsError(
          e instanceof Error ? e.message : "Failed to load documents",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setDocumentsLoading(false);
      });

    return () => controller.abort();
  }, []);

  // No full profile fetch here on purpose: the customer layout's
  // `useHydrateCustomerUser` already fills the store whenever it's empty, so
  // doing it again here just fired a second identical request on every visit.
  // The one exception is `createdAt`: the sign-in payload leaves it out, so a
  // user who arrived through sign-in needs one lookup to show "Account created".
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

  const accountCreated = formatAccountDate(user?.createdAt);

  const displayName = useMemo(() => {
    const fn = user?.firstName?.trim();
    const ln = user?.lastName?.trim();
    if (fn && ln) return `${fn} ${ln}`;
    if (fn) return fn;
    if (ln) return ln;
    return user ? "Your profile" : "Loading…";
  }, [user]);

  const email = user?.email ?? "—";
  const phone = user?.phone?.trim() || (user ? "Not provided" : "—");
  const address = user?.address?.trim() || (user ? "Not provided" : "—");

  const editInitial = useMemo(
    () => ({
      name:
        [user?.firstName?.trim(), user?.lastName?.trim()]
          .filter(Boolean)
          .join(" "),
      phone: user?.phone?.trim() ?? "",
      address: user?.address?.trim() ?? "",
      email: user?.email ?? "",
    }),
    [user],
  );

  const handleSaveProfile = useCallback(
    async (values: { name: string; phone: string; address: string }) => {
      if (!user || savingProfile) return;
      setSavingProfile(true);
      setSaveError(null);
      try {
        const update = profileDiff(user, {
          name: values.name,
          phoneNumber: values.phone,
          address: values.address,
        });

        if (Object.keys(update).length === 0) {
          setEditOpen(false);
          return;
        }

        const saved = await updateCustomerProfile(update);
        dispatch(setUser({ ...user, ...saved }));
        toast.success("Profile updated.");
        setEditOpen(false);
      } catch (e) {
        setSaveError(
          e instanceof Error ? e.message : "Could not save your profile",
        );
      } finally {
        setSavingProfile(false);
      }
    },
    [dispatch, savingProfile, user],
  );

  return (
    <div className="flex min-h-screen flex-col">
      <CustomerDashboardHeader
        firstName={user?.firstName}
        lastName={user?.lastName}
        activeNav="profile"
      />

      <main className="customer-panel-bg flex-1 px-4 py-5 md:px-5">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3">
          <CustomerPanelCard
            title="My profile"
            icon={
              <Icon
                name="User"
                className="size-4 shrink-0 text-black"
                aria-hidden
              />
            }
            headerAction={
              <button
                type="button"
                className="flex items-center gap-1 font-dm-sans text-[10px] font-semibold leading-[15px] text-orange-amber"
                style={{ fontVariationSettings: "'opsz' 14" }}
                onClick={() => {
                  setSaveError(null);
                  setEditOpen(true);
                }}
              >
                <Icon
                  name="Pencil"
                  className="size-3 shrink-0"
                  aria-hidden
                />
                Edit
              </button>
            }
          >
            <div className="flex flex-col items-center gap-4">
              <CustomerAvatar
                size="lg"
                firstName={user?.firstName}
                lastName={user?.lastName}
              />
              <div className="text-center">
                <p className="font-inter text-base font-bold leading-6 text-warm-ink">
                  {displayName}
                </p>
                <p
                  className="mt-1 font-dm-sans text-[11px] font-normal leading-[16.5px] text-warm-gray"
                  style={{ fontVariationSettings: "'opsz' 9" }}
                >
                  Solar customer
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <ProfileContactField
                icon={
                  <Icon
                    name="Mail"
                    className="size-3 shrink-0 text-warm-gray"
                    aria-hidden
                  />
                }
                label="Email"
                value={email}
              />
              <ProfileContactField
                icon={
                  <Icon
                    name="Phone"
                    className="size-3 shrink-0 text-warm-gray"
                    aria-hidden
                  />
                }
                label="Phone"
                value={phone}
              />
              <ProfileContactField
                icon={
                  <Icon
                    name="Mail"
                    className="size-3 shrink-0 text-warm-gray"
                    aria-hidden
                  />
                }
                label="Address"
                value={address}
              />
            </div>
          </CustomerPanelCard>

          <CustomerPanelCard
            title="Account details"
            icon={
              <Icon
                name="Shield"
                className="size-4 shrink-0 text-black"
                aria-hidden
              />
            }
          >
            <div className="flex flex-col gap-3">
              {accountCreated ? (
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span
                    className="font-dm-sans text-warm-gray"
                    style={{ fontVariationSettings: "'opsz' 9" }}
                  >
                    Account created
                  </span>
                  <span
                    className="font-dm-sans font-medium text-warm-ink"
                    style={{ fontVariationSettings: "'opsz' 14" }}
                  >
                    {accountCreated}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-2 text-xs">
                <span
                  className="font-dm-sans text-warm-gray"
                  style={{ fontVariationSettings: "'opsz' 9" }}
                >
                  Account status
                </span>
                <StatusBadge>Active</StatusBadge>
              </div>
            </div>

            <div className="mt-4 border-t customer-cream-card-border pt-4">
              <p
                className="font-dm-sans text-[9px] font-normal uppercase leading-[13.5px] tracking-[0.3px] text-warm-gray"
                style={{ fontVariationSettings: "'opsz' 9" }}
              >
                Platform
              </p>
              <div className="mt-2">
                <ProfileEntityRow
                  initialsOverride="ES"
                  title="Easylink Solar"
                  subtitle="Powered by Easylink Designer"
                  avatarVariant="gradient"
                />
              </div>
            </div>
          </CustomerPanelCard>

          <CustomerPanelCard
            title="Documents"
            icon={
              <Icon
                name="FileText"
                className="size-4 shrink-0 text-black"
                aria-hidden
              />
            }
          >
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="relative min-h-0 flex-1">
                  <div
                    className="customer-cream-scroll flex h-full min-h-[7.5rem] max-h-[min(220px,36vh)] flex-col gap-3 overflow-y-auto overscroll-y-contain pr-1 lg:max-h-none"
                    role="region"
                    aria-label="Shared documents"
                  >
                    {documentsLoading ? (
                      <p
                        className="font-dm-sans text-[11px] font-normal leading-[16.5px] text-warm-gray"
                        style={{ fontVariationSettings: "'opsz' 9" }}
                      >
                        Loading documents…
                      </p>
                    ) : documentsError ? (
                      <p
                        className="font-dm-sans text-[11px] font-normal leading-[16.5px] text-red-600"
                        style={{ fontVariationSettings: "'opsz' 9" }}
                      >
                        {documentsError}
                      </p>
                    ) : documents.length > 0 ? (
                      documents.map((doc) => (
                        <ProfileDocumentRow
                          key={doc.id}
                          name={doc.fileName}
                          sizeLabel={formatDocumentSize(doc.sizeBytes)}
                          url={doc.url}
                        />
                      ))
                    ) : (
                      <p
                        className="font-dm-sans text-[11px] font-normal leading-[16.5px] text-warm-gray"
                        style={{ fontVariationSettings: "'opsz' 9" }}
                      >
                        No documents shared yet.
                      </p>
                    )}
                  </div>
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-[var(--color-cream-50)] to-transparent"
                    aria-hidden
                  />
                </div>
              </div>
            </div>
          </CustomerPanelCard>
        </div>
      </main>

      <CustomerEditProfileModal
        open={editOpen}
        initial={editInitial}
        saving={savingProfile}
        error={saveError}
        onClose={() => {
          if (!savingProfile) setEditOpen(false);
        }}
        onSubmit={handleSaveProfile}
      />
    </div>
  );
}
