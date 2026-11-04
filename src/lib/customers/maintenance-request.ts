/**
 * "Request a maintenance quote" from the customer portal. There is no
 * maintenance-contract backend yet, so the request goes through the same
 * public contact-lead route as the website's "Send us a message" form
 * (`/api/contact` → backend `/leads/contact`), which stores a Lead and emails
 * sales. The backend schema only accepts the contact-form fields, so the plan,
 * timing and notes travel inside `message`, headed so sales can tell it apart.
 */

export const MAINTENANCE_REQUEST_HEADING = "Maintenance plan request — customer portal";

export const MAINTENANCE_PLANS = [
  {
    key: "check",
    title: "One-off check-up",
    summary: "A single visit to clean, test and report. Good if it has been a while.",
    includes: ["Panel clean", "Inverter and battery health check", "Electrical safety inspection", "Written report"],
  },
  {
    key: "annual",
    title: "Yearly care",
    summary: "One full service every year, booked for you so it never slips.",
    includes: ["Everything in a check-up", "Yearly reminder and booking", "Report you can keep for warranty claims"],
  },
  {
    key: "twice",
    title: "Twice-yearly care",
    summary: "Two visits a year for dusty, coastal, rural or tree-lined homes.",
    includes: ["Everything in yearly care", "Extra clean before summer", "Early warning on falling output"],
  },
] as const;

export type MaintenancePlanKey = (typeof MAINTENANCE_PLANS)[number]["key"];

export const MAINTENANCE_TIMING_OPTIONS = [
  { value: "asap", label: "As soon as possible" },
  { value: "month", label: "Within the next month" },
  { value: "season", label: "Before summer" },
  { value: "flexible", label: "I'm flexible" },
] as const;

export type MaintenanceTiming = (typeof MAINTENANCE_TIMING_OPTIONS)[number]["value"];

export type MaintenanceRequestForm = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  plan: MaintenancePlanKey;
  timing: MaintenanceTiming;
  notes: string;
  consent: boolean;
};

export type MaintenanceRequestErrors = Partial<Record<keyof MaintenanceRequestForm, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateMaintenanceRequest(form: MaintenanceRequestForm): MaintenanceRequestErrors {
  const errors: MaintenanceRequestErrors = {};
  if (!form.firstName.trim()) errors.firstName = "Enter your first name.";
  if (!form.lastName.trim()) errors.lastName = "Enter your last name.";
  if (!EMAIL_RE.test(form.email.trim())) errors.email = "Enter an email address like name@example.com.";
  const digits = form.phone.replace(/\D/g, "");
  if (!digits) errors.phone = "Enter a phone number so we can book a time.";
  else if (digits.length < 8 || digits.length > 15) errors.phone = "Enter a valid phone number.";
  if (form.notes.length > 2000) errors.notes = "Keep notes under 2,000 characters.";
  if (!form.consent) errors.consent = "Tick the box so we can contact you about this request.";
  return errors;
}

/** Body for `/api/contact`, the same shape the website contact form sends. */
export function buildMaintenanceLeadPayload(form: MaintenanceRequestForm) {
  const plan = MAINTENANCE_PLANS.find((p) => p.key === form.plan);
  const timing = MAINTENANCE_TIMING_OPTIONS.find((t) => t.value === form.timing);
  const lines = [
    MAINTENANCE_REQUEST_HEADING,
    `Plan of interest: ${plan?.title ?? form.plan}`,
    `Preferred timing: ${timing?.label ?? form.timing}`,
    `Phone: ${form.phone.trim()}`,
  ];
  if (form.address.trim()) lines.push(`Property: ${form.address.trim()}`);
  if (form.notes.trim()) lines.push("", "Notes from the customer:", form.notes.trim());
  lines.push("", "The customer agreed to be contacted about this request.");

  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim(),
    mobile: form.phone.trim(),
    address: form.address.trim(),
    message: lines.join("\n"),
  };
}

export async function submitMaintenanceRequest(form: MaintenanceRequestForm, fetcher: typeof fetch = fetch): Promise<string> {
  const res = await fetcher("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildMaintenanceLeadPayload(form)),
  });
  const json = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) throw new Error(json.message || "We couldn't send your request. Please try again.");
  return json.message || "Thanks, we've received your request.";
}
