import { normalizeNumericValue } from "@/lib/persian-numbers";

/*
 * Iranian bank-card and IBAN (شبا) helpers — pure, so the form and the schema validate the same
 * way. A card is stored as 16 plain digits; a شبا as the 24 digits after the "IR".
 */

export const CARD_NUMBER_LENGTH = 16;
export const SHEBA_DIGITS_LENGTH = 24;

/** Persian/Arabic digits → latin, then everything that is not a digit removed. */
export function normalizeCardNumber(raw: string): string {
  return normalizeNumericValue(raw ?? "", false).replace(/\D/g, "").slice(0, CARD_NUMBER_LENGTH);
}

/** Drops an "IR" prefix, spaces and separators; keeps the (up to 24) digits. */
export function normalizeSheba(raw: string): string {
  return normalizeNumericValue(raw ?? "", false)
    .replace(/[iI][rR]/g, "")
    .replace(/\D/g, "")
    .slice(0, SHEBA_DIGITS_LENGTH);
}

/** Luhn (mod-10) check — every valid card PAN satisfies it. */
export function passesLuhn(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let value = digits.charCodeAt(i) - 48;
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }
  return sum % 10 === 0;
}

export function isValidCardNumber(raw: string): boolean {
  const pan = normalizeCardNumber(raw);
  return pan.length === CARD_NUMBER_LENGTH && passesLuhn(pan);
}

/** ISO 7064 mod-97 over "IR" + the 24 digits, with "IR27" rotated to the end as "182700". */
export function isValidSheba(raw: string): boolean {
  const digits = normalizeSheba(raw);
  if (digits.length !== SHEBA_DIGITS_LENGTH) return false;
  const rearranged = `${digits}1827`; // IR -> 18 27
  let remainder = 0;
  for (const char of rearranged) remainder = (remainder * 10 + (char.charCodeAt(0) - 48)) % 97;
  return remainder === 1;
}

/** Common Iranian card BINs (first 6 digits) → bank name. Not exhaustive; returns null otherwise. */
const bankByBin: Record<string, string> = {
  "603799": "بانک ملی ایران",
  "589210": "بانک سپه",
  "627648": "بانک توسعه صادرات",
  "627961": "بانک صنعت و معدن",
  "603770": "بانک کشاورزی",
  "628023": "بانک مسکن",
  "627760": "پست بانک ایران",
  "502908": "بانک توسعه تعاون",
  "627412": "بانک اقتصاد نوین",
  "622106": "بانک پارسیان",
  "627884": "بانک پارسیان",
  "639194": "بانک پارسیان",
  "502229": "بانک پاسارگاد",
  "639347": "بانک پاسارگاد",
  "627488": "بانک کارآفرین",
  "502910": "بانک کارآفرین",
  "621986": "بانک سامان",
  "639346": "بانک سینا",
  "639607": "بانک سرمایه",
  "636214": "بانک تات",
  "502806": "بانک شهر",
  "504172": "بانک شهر",
  "603769": "بانک صادرات ایران",
  "610433": "بانک ملت",
  "991975": "بانک ملت",
  "589463": "بانک رفاه کارگران",
  "627381": "بانک انصار",
  "639370": "بانک مهر اقتصاد",
  "505785": "بانک ایران‌زمین",
  "636949": "بانک حکمت ایرانیان",
  "606373": "بانک قرض‌الحسنه مهر ایران",
  "628157": "مؤسسه اعتباری توسعه",
  "606256": "مؤسسه اعتباری ملل",
  "628158": "مؤسسه اعتباری کوثر",
};

export function detectBankName(raw: string): string | null {
  const pan = normalizeCardNumber(raw);
  return pan.length >= 6 ? bankByBin[pan.slice(0, 6)] ?? null : null;
}

/** `6037 9911 2233 4455` — grouped for display, never for storage. */
export function formatCardNumber(pan: string): string {
  return (pan.match(/.{1,4}/g) ?? [pan]).join(" ");
}

/** `6037 99•• •••• 4455` — for anywhere the full PAN should not be shown. */
export function maskCardNumber(pan: string): string {
  const clean = normalizeCardNumber(pan);
  if (clean.length !== CARD_NUMBER_LENGTH) return formatCardNumber(clean);
  return formatCardNumber(`${clean.slice(0, 6)}${"•".repeat(6)}${clean.slice(12)}`);
}

/** `IR## #### #### #### #### #### ##` */
export function formatSheba(digits: string): string {
  const clean = normalizeSheba(digits);
  return `IR${clean}`.replace(/(.{4})/g, "$1 ").trim();
}
