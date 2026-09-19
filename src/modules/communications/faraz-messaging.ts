import { farazRequest } from "@/modules/communications/faraz-client";

/*
 * Faraz SMS send endpoints. Recipients take the local leading zero (09xxxxxxxxx) and
 * `line_number` must be digits only, so both are normalized here rather than trusted from callers.
 */

// Phone numbers arrive in whatever form a customer typed them, including Persian/Arabic digits
// and +98 / 0098 prefixes. Returns null when the result is not a valid Iranian mobile.
export function normalizeIranPhone(value: string) {
  const digits = value.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/\D/g, "");
  const local = digits.startsWith("0098") ? digits.slice(4) : digits.startsWith("98") ? digits.slice(2) : digits.startsWith("0") ? digits.slice(1) : digits;
  return /^9\d{9}$/.test(local) ? `0${local}` : null;
}

function lineNumberOf(value: string) { return value.replace(/\D/g, ""); }

/** Free-text send. Faraz holds every non-pattern message for operator approval, so it is not instant. */
export function sendFarazSimpleSms(apiKey: string, lineNumber: string, recipients: string[], text: string) {
  return farazRequest(apiKey, "POST", "/ws/v1/sms/simple", { text, line_number: lineNumberOf(lineNumber), recipients, number_format: "english" });
}

/**
 * Registered-pattern send — instant and never queued, which is what carriers require for
 * verification codes. `attributes` maps the pattern's own variable names to values.
 */
export function sendFarazPatternSms(apiKey: string, input: { patternCode: string; lineNumber: string; recipient: string; attributes: Record<string, string> }) {
  return farazRequest(apiKey, "POST", "/ws/v1/sms/pattern", { code: input.patternCode, recipient: input.recipient, line_number: lineNumberOf(input.lineNumber), number_format: "english", attributes: input.attributes });
}

/** A sample goes only to the account owner's own number: a cheap end-to-end check of key + line. */
export function sendFarazSampleSms(apiKey: string, lineNumber: string, text: string) {
  return farazRequest(apiKey, "POST", "/ws/v1/sms/sample", { text, line_number: lineNumberOf(lineNumber), number_format: "english" });
}
