import QRCode from "qrcode";

// Deliberately NOT marked `server-only`: every function here takes its
// inputs as plain parameters and never reads `process.env` itself, so
// there is no secret embedded in this module to guard (unlike
// lib/supabase/server.ts's service-role client). The actual boundary -
// PAYNOW_NUMBER is only ever read in the order success page, a Server
// Component that never bundles `process.env` reads to the client - lives
// at the call site, not here. Keeping this module pure/parameter-driven
// (rather than reaching into process.env itself) also keeps it directly
// unit-testable outside Next's build pipeline, where the real
// `server-only` package always throws (it's a build-time-only guard, not
// a runtime-safe no-op under a plain Node/test runner).

const PAYNOW_GUID = "SG.PAYNOW";
const MERCHANT_CATEGORY_CODE = "0000"; // unspecified, per EMVCo spec
const TRANSACTION_CURRENCY_SGD = "702"; // ISO 4217 numeric code for SGD
const COUNTRY_CODE = "SG";
const MERCHANT_CITY = "Singapore";
const MERCHANT_NAME = "One Crunch Lady";

export interface PayNowQrInput {
  /** The exact order total (e.g. orders.total_price), used as the fixed transaction amount. */
  amount: number;
  /** Human-facing order_ref (e.g. "OCL-2609-0001"), carried as the bill/reference number. */
  reference: string;
  /** Raw PAYNOW_NUMBER env value. Normalized internally; never trust its format. */
  mobileNumber: string;
}

/**
 * Normalizes a Singapore mobile number into the "+65XXXXXXXX" form the
 * PayNow proxy field expects. Mirrors the shape validated by
 * lib/validations/order.ts's singaporePhoneRegex. Returns null (rather
 * than throwing) when the input doesn't look like a valid SG mobile
 * number, so a misconfigured PAYNOW_NUMBER degrades to "no QR rendered"
 * instead of a broken success page.
 */
function normalizeSingaporeMobile(raw: string): string | null {
  const digitsAndPlus = raw.replace(/[^\d+]/g, "");

  if (/^\+65[89]\d{7}$/.test(digitsAndPlus)) {
    return digitsAndPlus;
  }
  if (/^65[89]\d{7}$/.test(digitsAndPlus)) {
    return `+${digitsAndPlus}`;
  }
  if (/^[89]\d{7}$/.test(digitsAndPlus)) {
    return `+65${digitsAndPlus}`;
  }
  return null;
}

/** TLV (tag-length-value) encoder per the EMVCo QR Code spec: 2-digit tag, 2-digit length, then the value. */
function tlv(tag: string, value: string): string {
  return `${tag}${value.length.toString().padStart(2, "0")}${value}`;
}

/**
 * CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF, no reflect, xorout 0x0000).
 * Known-answer check: crc16CcittFalse("123456789") === "29B1" - this is
 * the standard published test vector for this exact CRC variant.
 * This is the checksum algorithm the EMVCo QR spec mandates for tag 63.
 */
export function crc16CcittFalse(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i += 1) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Builds a dynamic (fixed-amount) Singapore PayNow EMVCo QR payload string.
 *
 * Field reference (EMVCo QR Code Specification for Payment Systems, with
 * the PayNow-specific Merchant Account Information template defined by
 * the Association of Banks in Singapore / SGQR):
 *   00  Payload Format Indicator          "01"
 *   01  Point of Initiation Method        "12" (dynamic / fixed amount)
 *   26  Merchant Account Information (PayNow template)
 *         00  Globally Unique Identifier  "SG.PAYNOW"
 *         01  Proxy Type                  "0" (mobile number)
 *         02  Proxy Value                 "+65XXXXXXXX"
 *         03  Amount Editable             "0" (not editable - amount is fixed)
 *   52  Merchant Category Code            "0000" (unspecified)
 *   53  Transaction Currency              "702" (SGD, ISO 4217 numeric)
 *   54  Transaction Amount                e.g. "12.50"
 *   58  Country Code                      "SG"
 *   59  Merchant Name
 *   60  Merchant City                     "Singapore"
 *   62  Additional Data Field Template
 *         01  Bill Number                 the order_ref
 *   63  CRC                               CRC-16/CCITT-FALSE, computed last
 *
 * Returns null if `mobileNumber` (PAYNOW_NUMBER) doesn't normalize to a
 * valid SG mobile number, or `amount` isn't a positive finite number -
 * callers should fall back to the plain-text PayNow number display
 * rather than rendering a broken QR.
 *
 * IMPORTANT: this payload is built strictly to the documented EMVCo/SGQR
 * field spec and the CRC is checksum-verified against the standard
 * CRC-16/CCITT-FALSE test vector (see lib/paynow.test.ts), but it has NOT
 * been scanned against a real banking app. Test-scan it with DBS/OCBC/UOB
 * before relying on it with real customers - some banking apps have
 * historically been inconsistent about honoring the "amount not editable"
 * and reference/bill-number fields for person-to-person PayNow proxies.
 */
export function buildPayNowQrPayload({
  amount,
  reference,
  mobileNumber,
}: PayNowQrInput): string | null {
  const normalizedMobile = normalizeSingaporeMobile(mobileNumber);
  if (!normalizedMobile) {
    return null;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const merchantName = MERCHANT_NAME.slice(0, 25);
  const billReference = reference.slice(0, 25);

  const merchantAccountInfo =
    tlv("00", PAYNOW_GUID) + tlv("01", "0") + tlv("02", normalizedMobile) + tlv("03", "0");

  const additionalData = tlv("01", billReference);

  const payloadWithoutCrc =
    tlv("00", "01") +
    tlv("01", "12") +
    tlv("26", merchantAccountInfo) +
    tlv("52", MERCHANT_CATEGORY_CODE) +
    tlv("53", TRANSACTION_CURRENCY_SGD) +
    tlv("54", amount.toFixed(2)) +
    tlv("58", COUNTRY_CODE) +
    tlv("59", merchantName) +
    tlv("60", MERCHANT_CITY) +
    tlv("62", additionalData) +
    "6304"; // CRC tag + length prefix, included in the checksum input

  return payloadWithoutCrc + crc16CcittFalse(payloadWithoutCrc);
}

/**
 * Renders a PayNow QR payload as an inline SVG markup string, server-side.
 * The caller is responsible for treating the result as trusted markup
 * (it comes only from the `qrcode` library, never from user input) if
 * injecting it directly into a Server Component.
 */
export async function renderPayNowQrSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
  });
}
