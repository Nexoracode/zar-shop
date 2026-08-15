export function normalizeSearchText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[\u200C\u200D]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("fa-IR");
}

export function includesNormalizedText(textValue: string, inputValue: string) {
  const query = normalizeSearchText(inputValue);

  return query.length === 0 || normalizeSearchText(textValue).includes(query);
}
