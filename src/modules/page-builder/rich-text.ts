// The little rich text the page builder lets a section carry (a description under a title): bold, italic, underline,
// strikethrough, text and highlight colors and links, as HTML. This module is pure so forms and schemas can measure
// it; the server-side cleaning of the HTML is in `rich-text-sanitize.ts`.

const entities: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

/** The text the reader sees: tags dropped, common entities decoded. The length limits are on this, not on the markup. */
export function richTextPlainText(html: string) {
  return html.replace(/<[^>]*>/g, "").replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (entity) => entities[entity] ?? entity);
}

export function richTextPlainLength(html: string) {
  return richTextPlainText(html).length;
}

/** Markup with no visible text (an empty paragraph, a lone line break) counts as no description at all. */
export function isRichTextEmpty(html: string) {
  return richTextPlainText(html).trim().length === 0;
}
