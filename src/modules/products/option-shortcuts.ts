export type OptionValueShortcut = { value: string; weightGrams: string | null };

const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

function normalizeDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianIndex = persianDigits.indexOf(digit);
    return String(persianIndex >= 0 ? persianIndex : arabicDigits.indexOf(digit));
  });
}

export function parseOptionValueShortcut(input: string) {
  const values: OptionValueShortcut[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const rawPart of input.split(/[,،]/)) {
    const part = rawPart.trim();
    if (!part) continue;
    const separatorIndex = part.search(/[:：]/);
    const value = (separatorIndex < 0 ? part : part.slice(0, separatorIndex)).trim();
    const rawWeight = separatorIndex < 0 ? "" : part.slice(separatorIndex + 1).trim();
    const weightGrams = rawWeight ? normalizeDigits(rawWeight).replace(/[\/٫]/g, ".") : null;

    if (!value || (separatorIndex >= 0 && (!weightGrams || !/^\d{1,7}(\.\d{1,3})?$/.test(weightGrams)))) {
      invalid.push(part);
      continue;
    }
    if (!seen.has(value)) {
      seen.add(value);
      values.push({ value, weightGrams });
    }
  }

  return { values, invalid };
}
