"use client";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { forwardRef, useImperativeHandle, useState } from "react";
import { DESIGNS_REGISTER_STEP } from "@/utils/constant";
import { useAppSelector } from "@/lib/store/hooks";

type RegisterFormState = {
  name: string;
  email: string;
  phone: string;
  /** Unticked by default: marketing reminders need opt-in under the Spam Act. */
  marketingConsent: boolean;
};

export type DesignsRegisterStepValue = RegisterFormState;

export type DesignsRegisterStepHandle = {
  getValues: () => DesignsRegisterStepValue;
};

/**
 * Figma 3:4109 — intro panel + contact form for the Register step.
 */
export const DesignsRegisterStepContent = forwardRef<
  DesignsRegisterStepHandle,
  {
    /**
     * Set when editing a saved design. Comes from the URL rather than auth
     * state so the server and client agree — a Redux-derived flag would change
     * between the server HTML and the first client render and break hydration.
     */
    lockEmail?: boolean;
  }
>(function DesignsRegisterStepContent({ lockEmail = false }, ref) {
  const defaults = DESIGNS_REGISTER_STEP.defaultValues;
  // Seed from the store so an existing design shows its customer details.
  // A brand-new design starts genuinely empty — `defaults` below are shown
  // as placeholder hint text only, never as real pre-filled values.
  const stored = useAppSelector((s) => s.designProposal.customer);
  const [name, setName] = useState<string>(stored.name || "");
  const [email, setEmail] = useState<string>(stored.email || "");
  const [phone, setPhone] = useState<string>(stored.phoneNumber || "");
  const [marketingConsent, setMarketingConsent] = useState<boolean>(
    stored.marketingConsent === true,
  );

  useImperativeHandle(ref, () => ({
    getValues: () => ({ name, email, phone, marketingConsent }),
  }));

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-[1446px] flex-col justify-center px-4 py-6 sm:px-8 sm:py-8 lg:px-[81px] lg:py-8">
      <div className="mx-auto grid w-full max-w-[1278px] grid-cols-1 gap-5 lg:grid-cols-[591fr_649fr] lg:items-stretch lg:gap-[58px]">
        <div className="flex w-full min-w-0 items-center rounded-[46px] border-[3px] border-design-accent-cyan bg-linear-to-r from-yellow-lemon to-orange-amber px-6 py-8 shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)] sm:px-10 sm:py-10 lg:h-full lg:px-[46px] lg:py-[56px]">
          <div className="mx-auto flex w-full max-w-[498px] flex-col items-center gap-6 text-center sm:gap-[30px]">
            <div className="flex flex-col items-center gap-[23px]">
              <h2
                className="w-full font-source-sans text-[clamp(28px,4.8vw,40px)] font-bold capitalize leading-[1.05] text-white"
                style={{ letterSpacing: "0.248px" }}
              >
                {DESIGNS_REGISTER_STEP.title}
              </h2>
              <p
                className="font-source-sans text-[clamp(20px,2.5vw,22px)] font-normal capitalize leading-[1.35] text-black"
                style={{ letterSpacing: "0.248px" }}
              >
                {DESIGNS_REGISTER_STEP.summaryLines[0]}
                <br />
                {DESIGNS_REGISTER_STEP.summaryLines[1]}
              </p>
            </div>
            <p
              className="font-source-sans text-[clamp(18px,2.3vw,20px)] font-normal capitalize leading-[1.45] text-black"
              style={{ letterSpacing: "0.248px" }}
            >
              {DESIGNS_REGISTER_STEP.description}
            </p>
          </div>
        </div>

        <div className="designs-border-gradient w-full min-w-0 rounded-[28px] p-[3px] shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)] lg:h-full">
          <div className="flex h-full min-h-0 w-full items-center rounded-[25px] bg-[linear-gradient(135deg,rgba(48,54,71,0.98)_0%,rgba(33,36,47,0.98)_100%)] px-5 py-8 backdrop-blur-[17.8px] sm:px-8 sm:py-10 lg:px-[71px]">
            <form
              className="flex w-full flex-col gap-[26px]"
              onSubmit={(e) => e.preventDefault()}
            >
              {DESIGNS_REGISTER_STEP.fields.map((field) => {
                // Email is the account login, and the profile API deliberately
                // will not change it — so show it locked rather than accepting
                // an edit we would silently discard.
                const emailLocked = field.id === "email" && lockEmail;

                return (
                  <label key={field.id} className="flex flex-col gap-[8px]">
                    <span className="font-inter text-[15.531px] font-semibold leading-[22.188px] tracking-[-0.1668px] text-white">
                      {field.label}
                    </span>
                    <input
                      type={field.type}
                      value={field.id === "name" ? name : email}
                      placeholder={
                        field.id === "name" ? defaults.name : defaults.email
                      }
                      readOnly={emailLocked}
                      aria-describedby={
                        emailLocked ? "designs-email-locked" : undefined
                      }
                      data-clarity-mask="true"
                      onChange={(event) =>
                        field.id === "name"
                          ? setName(event.target.value)
                          : setEmail(event.target.value)
                      }
                      className={`h-[55.529px] rounded-[11.094px] border border-yellow-lemon bg-transparent px-[17.75px] font-inter text-[17.75px] leading-normal tracking-[-0.3467px] text-white outline-none transition focus:border-yellow-lemon focus:ring-2 focus:ring-yellow-lemon/20 placeholder:text-white/70 ${
                        emailLocked ? "cursor-not-allowed opacity-70" : ""
                      }`}
                    />
                    {emailLocked ? (
                      <span
                        id="designs-email-locked"
                        className="font-inter text-[12px] leading-normal text-white/60"
                      >
                        This is your sign-in email. Contact support to change it.
                      </span>
                    ) : null}
                  </label>
                );
              })}

              <label className="flex flex-col gap-[8px]">
                <span className="font-inter text-[15.531px] font-semibold leading-[22.188px] tracking-[-0.1668px] text-white">
                  {DESIGNS_REGISTER_STEP.phoneLabel}
                </span>
                <PhoneInput
                  country={DESIGNS_REGISTER_STEP.phoneCountry}
                  value={phone}
                  onChange={(value) => setPhone(value)}
                  countryCodeEditable={false}
                  enableSearch={false}
                  placeholder={DESIGNS_REGISTER_STEP.phonePlaceholder}
                  containerClass="designs-phone-field"
                  inputClass="designs-phone-control"
                  buttonClass="designs-phone-button"
                  dropdownClass="designs-phone-dropdown"
                  specialLabel=""
                  inputProps={{ "data-clarity-mask": "true" }}
                />
              </label>

              {/* Wording is versioned: change MARKETING_CONSENT_VERSION in
                  lib/designs/capture.ts whenever this text changes. */}
              <label className="flex items-start gap-3 text-left">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(event) => setMarketingConsent(event.target.checked)}
                  className="mt-[3px] size-[18px] shrink-0 accent-yellow-lemon"
                />
                <span className="font-inter text-[14px] leading-[20px] text-white/85">
                  Send me tips, rebate updates and offers about my design by
                  email and SMS. You can unsubscribe at any time.
                </span>
              </label>

              {/* Privacy Act collection notice (APP 5). Link the full privacy
                  policy here once that page exists. */}
              <p className="font-inter text-[12px] leading-[18px] text-white/60">
                EasyLink Solar uses these details to save your design, email
                you a link to it, and contact you about your quote. We share
                them with the installer who quotes your system and with the
                providers that run our website, email and analytics, some of
                which store data overseas. Prices are estimates until a site
                visit.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
});
