import sanitizeHtml from "sanitize-html";
import { isRichTextEmpty } from "@/modules/page-builder/rich-text";

const color = [/^#[0-9a-f]{3,8}$/i, /^rgb(a)?\([\d\s,.%]+\)$/i];

/**
 * Cleans the HTML of a section description down to what the builder's editor can produce: paragraphs and line breaks,
 * bold/italic/underline/strikethrough, text and highlight colors, and links to http(s), mail or phone. Anything else —
 * scripts, event attributes, images, other styles — is dropped. Empty markup becomes the empty string.
 */
export function sanitizeSectionDescription(value: string | null | undefined) {
  if (!value) return "";
  const clean = sanitizeHtml(value, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "strike", "span", "mark", "a"],
    allowedAttributes: { a: ["href", "target", "rel"], span: ["style"], mark: ["style", "data-color"] },
    allowedStyles: { span: { color }, mark: { "background-color": color } },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: (_tagName, attributes) => ({ tagName: "a", attribs: { href: attributes.href ?? "", rel: "noopener noreferrer", target: "_blank" } }),
    },
  });
  return isRichTextEmpty(clean) ? "" : clean;
}
