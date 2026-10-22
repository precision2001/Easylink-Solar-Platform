"use client";

import Link from "next/link";

/**
 * Matches the Easylink Designer "Installer trade accounts" mock
 * (DistTeam.dc.html) — the installer companies that hold their own account and
 * buy kit at trade price, and the boundary around what such an account reaches.
 *
 * Sample data: this app has no trade-account system. The page is read-only in
 * the mock too — there are no controls to port, only the permission boundary
 * the design is documenting.
 */

const SUN = "#F68A0A";
const SUN_INK = "#3B1D00";

/** [background, foreground] */
const LINKED: [string, string] = ["#DCFCE7", "#166534"];
const INVITED: [string, string] = ["#DBEAFE", "#1E40AF"];

type Account = {
  name: string;
  who: string;
  access: string;
  status: string;
  tone: [string, string];
};

const ACCOUNTS: Account[] = [
  {
    name: "Solarman",
    who: "Emmanuel · Owner · 4 people",
    access:
      "Offers for your jobs · kit orders up to $5,000 without approval · messages on shared jobs",
    status: "Linked",
    tone: LINKED,
  },
  {
    name: "[Electrical contractor]",
    who: "Licensed electrician · 1 person",
    access: "Battery offers only · kit orders need approval",
    status: "Linked",
    tone: LINKED,
  },
  {
    name: "[Builder]",
    who: "Licensed builder",
    access: "Roof and structural work orders · no kit ordering",
    status: "Linked",
    tone: LINKED,
  },
  {
    name: "[QLD partner]",
    who: "Invited 3 Oct",
    access: "Nothing until checks pass",
    status: "Invite sent",
    tone: INVITED,
  },
];

const CAN = [
  "See offers you send them and accept or decline",
  "See design, SLD, kit and customer contact on jobs they accept",
  "Order kit for those jobs at trade price",
  "Message your team on those jobs",
  "See their payouts and your rates card",
];

const CANT = [
  "See EasyLink’s cost prices or margins",
  "See other customers, leads or quotes",
  "See other installers",
  "Change job prices or the rates card",
  "Contact customers outside a job they hold",
];

const BTN =
  "inline-flex h-11 items-center whitespace-nowrap rounded-[10px] px-4 text-[14px] font-semibold";

export function MasterDistTeam() {
  return (
    <div className="flex min-h-full flex-col text-[#0F172A]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Supply &amp; ordering <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Installer trade accounts</span>
        </nav>
        <span className="rounded-full bg-[#DBEAFE] px-2.5 py-[3px] text-[12px] font-bold text-[#1E40AF]">
          Sample data
        </span>
      </header>

      <div className="flex w-full max-w-[1400px] flex-col gap-[18px] px-8 pb-14 pt-6">
        <div className="flex flex-wrap items-end gap-3.5">
          <div className="min-w-0 flex-grow">
            <h1 className="m-0 font-source-sans text-[28px] font-bold">
              Installer trade accounts
            </h1>
            <p className="mb-0 mt-1 text-[13px] text-[#5B6B80]">
              Installer companies keep their own account and buy kit for their jobs at trade price.
              Set what each one can order here.
            </p>
          </div>
          <Link href="/master/pricing-stock" className={`${BTN} border border-[#CBD5E1] bg-white`}>
            Trade price list
          </Link>
          <Link
            href="/master/installers"
            className={`${BTN} px-[18px] font-bold`}
            style={{ background: SUN, color: SUN_INK }}
          >
            Link an installer
          </Link>
        </div>

        <section
          aria-label="Staff moved"
          className="flex flex-wrap items-center gap-2.5 rounded-[14px] border border-[#DBEAFE] bg-[#EFF6FF] px-[18px] py-3.5 text-[13px] text-[#1E3A8A]"
        >
          <span className="flex-[1_1_360px]">
            <strong>Looking for EasyLink staff?</strong> Staff sign-ins, roles, order limits and
            two-factor are managed in Admin › Staff &amp; roles, so there&rsquo;s one place for who
            can do what.
          </span>
          {/* Admin › Staff & roles isn't built yet. */}
          <span title="Not built yet" className="cursor-help font-bold text-[#1565C0]">
            Open Staff &amp; roles
          </span>
        </section>

        <section
          aria-label="Linked installers"
          className="flex flex-col gap-2.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <h2 className="m-0 text-[16px] font-bold">Installer companies with trade accounts</h2>
          {ACCOUNTS.map((a) => (
            <div
              key={a.name}
              className="flex flex-wrap items-center gap-3 border-b border-[#EEF2F6] py-3"
            >
              <span className="flex flex-[1_1_220px] flex-col">
                <strong className="text-[14px]">{a.name}</strong>
                <span className="text-[12px] text-[#5B6B80]">{a.who}</span>
              </span>
              <span className="flex-[2_1_320px] text-[13px] text-[#334155]">{a.access}</span>
              <span
                className="whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-bold"
                style={{ background: a.tone[0], color: a.tone[1] }}
              >
                {a.status}
              </span>
            </div>
          ))}
        </section>

        <section
          aria-label="What linked installers can see"
          className="flex flex-col gap-2.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <h2 className="m-0 text-[16px] font-bold">What a trade account can see and do</h2>
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}
          >
            <div className="flex flex-col gap-1.5 rounded-[12px] bg-[#F0FDF4] p-3.5 text-[13px]">
              <strong className="text-[#166534]">Can</strong>
              {CAN.map((c) => (
                <span key={c}>&#10003; {c}</span>
              ))}
            </div>
            <div className="flex flex-col gap-1.5 rounded-[12px] bg-[#FEF2F2] p-3.5 text-[13px]">
              <strong className="text-[#991B1B]">Can&rsquo;t</strong>
              {CANT.map((c) => (
                <span key={c}>&ndash; {c}</span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
