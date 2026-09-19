export type TooltipLine =
  | { kind: "title" | "text"; text: string }
  | { kind: "pair"; label: string; value: string };

const MAX_LINES = 12;
/** "برچسب: مقدار" — the label is whatever precedes the first colon, kept short so a sentence with a colon is not split. */
const LABELLED = /^([^:：]{1,32}?)\s*[:：]\s*(.+)$/;
/** "از ۱۴۰۵/۰۶/۲۸" and "تا ۱۴۰۵/۰۷/۰۱" read as a label and its value, like the discount window does. */
const RANGE = /^(از|تا)\s+(.+)$/;
const ONLY_DIGITS = /^[\d۰-۹٠-٩\s]+$/;

/**
 * Turns the text of a `title`/`data-bp-tip` attribute into lines the tooltip can lay out: a heading,
 * plain lines and label/value rows. A single line is always plain text — it is a sentence, and
 * splitting "نتیجه: موفق" into a lone row would only make it look odd. From two lines up, a first
 * line that is not itself a row becomes the heading, and lines shaped like "برچسب: مقدار" become
 * rows (a clock time such as "۱۵:۳۰" is never mistaken for one).
 */
export function parseTooltipText(raw: string): TooltipLine[] {
  const rows = raw.split(/\r?\n/).map((row) => row.trim()).filter(Boolean).slice(0, MAX_LINES);
  if (rows.length < 2) return rows.map((text) => ({ kind: "text", text }));

  return rows.map((row, index): TooltipLine => {
    const range = RANGE.exec(row);
    if (range) return { kind: "pair", label: range[1], value: range[2] };
    const labelled = LABELLED.exec(row);
    if (labelled && !ONLY_DIGITS.test(labelled[1])) return { kind: "pair", label: labelled[1], value: labelled[2] };
    return { kind: index === 0 ? "title" : "text", text: row };
  });
}
