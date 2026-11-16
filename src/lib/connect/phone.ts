/**
 * An Australian number as E.164, for the Amazon Connect softphone, which
 * dials nothing else. Accepts what agents type or paste: "0412 345 678",
 * "(02) 9163 8128", "61412345678", "+61 412 345 678". Returns null when it is
 * not a full Australian number, so the dialler can say so before ringing out.
 */
export function toAuE164(raw: string): string | null {
  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (trimmed.startsWith("+")) {
    if (!digits.startsWith("61")) return null;
    digits = digits.slice(2);
  } else if (digits.startsWith("61") && digits.length === 11) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  } else {
    return null;
  }
  // Mobiles (4), geographic (2, 3, 7, 8): nine digits after the country code.
  // 13/1300/1800 numbers cannot be dialled as +61 from Connect, so they are refused.
  if (!/^[23478]\d{8}$/.test(digits)) return null;
  return `+61${digits}`;
}
