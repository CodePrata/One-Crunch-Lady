export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * A customer phone as stored on an order ("91234567" or "+6591234567",
 * see orderSchema) in wa.me form: digits only, with the 65 country code.
 * Returns null for anything that isn't an 8-digit Singapore number.
 */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) {
    return null;
  }
  const digits = phone.replace(/\D/g, "");
  if (/^[89]\d{7}$/.test(digits)) {
    return `65${digits}`;
  }
  if (/^65[89]\d{7}$/.test(digits)) {
    return digits;
  }
  return null;
}
