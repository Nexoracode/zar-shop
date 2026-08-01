const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function toPersianDigits(value: string | number) {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

export function normalizeNumericValue(value: string, allowDecimal = true) {
  const latin = value
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[٬,\s]/g, "")
    .replace(/٫/g, ".");

  let normalized = "";
  let hasDecimal = false;
  for (const character of latin) {
    if (/\d/.test(character)) normalized += character;
    else if (allowDecimal && character === "." && !hasDecimal) {
      normalized += character;
      hasDecimal = true;
    } else if (character === "-" && normalized === "") normalized = "-";
  }
  return normalized;
}

export function formatPersianNumber(value: string, groupThousands = false) {
  if (!value) return "";
  const negative = value.startsWith("-") ? "-" : "";
  const unsigned = negative ? value.slice(1) : value;
  const [integer = "", decimal] = unsigned.split(".");
  const grouped = groupThousands ? integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : integer;
  return `${negative}${toPersianDigits(grouped)}${decimal === undefined ? "" : `.${toPersianDigits(decimal)}`}`;
}

const units = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
const teens = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"];
const tens = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
const hundreds = ["", "صد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];
const scales = ["", "هزار", "میلیون", "میلیارد", "تریلیون", "کوادریلیون", "کوینتیلیون"];

function threeDigitsToWords(value: number) {
  const parts: string[] = [];
  const hundred = Math.floor(value / 100);
  const remainder = value % 100;
  if (hundred) parts.push(hundreds[hundred]);
  if (remainder >= 10 && remainder < 20) parts.push(teens[remainder - 10]);
  else {
    const ten = Math.floor(remainder / 10);
    const unit = remainder % 10;
    if (ten) parts.push(tens[ten]);
    if (unit) parts.push(units[unit]);
  }
  return parts.join(" و ");
}

export function integerToPersianWords(value: string) {
  const normalized = normalizeNumericValue(value, false);
  if (!normalized || normalized === "-") return "";
  const isNegative = normalized.startsWith("-");
  const digits = (isNegative ? normalized.slice(1) : normalized).replace(/^0+(?=\d)/, "");
  if (!digits || /^0+$/.test(digits)) return "صفر";

  const chunks: string[] = [];
  for (let end = digits.length, scale = 0; end > 0; end -= 3, scale += 1) {
    const start = Math.max(0, end - 3);
    const chunk = Number(digits.slice(start, end));
    if (!chunk) continue;
    const words = threeDigitsToWords(chunk);
    chunks.unshift(scales[scale] ? `${words} ${scales[scale]}` : words);
  }
  const result = chunks.join(" و ");
  return isNegative ? `منفی ${result}` : result;
}

export function priceToPersianWords(value: string, currency = "ریال") {
  const integer = normalizeNumericValue(value).split(".")[0];
  const words = integerToPersianWords(integer);
  return words ? `${words} ${currency}` : "";
}

export function rialPriceToTomanWords(value: string) {
  const integer = normalizeNumericValue(value, true).split(".")[0];
  if (!integer || integer === "-") return "";
  const toman = (BigInt(integer) / 10n).toString();
  return priceToPersianWords(toman, "تومان");
}
