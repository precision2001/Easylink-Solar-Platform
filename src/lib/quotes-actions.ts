/** Allowed [action] segments for the quote proxies (server-safe, no React). */
export const STAFF_QUOTE_ACTIONS = ["send", "reprice", "payment-link", "withdraw", "revise"] as const;
export const CUSTOMER_QUOTE_ACTIONS = ["viewed", "accept", "decline", "deposit-checkout"] as const;

export type StaffQuoteAction = (typeof STAFF_QUOTE_ACTIONS)[number];
export type CustomerQuoteAction = (typeof CUSTOMER_QUOTE_ACTIONS)[number];

export function isAllowedQuoteAction<T extends string>(list: readonly T[], action: string): action is T {
  return (list as readonly string[]).includes(action);
}
