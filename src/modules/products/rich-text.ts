import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "strike", "del", "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "blockquote", "pre", "code", "hr", "a", "img", "span", "mark", "sub", "sup",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "colgroup", "col", "div",
];

export function sanitizeProductDescription(value: string | null | undefined) {
  if (!value) return "";
  return sanitizeHtml(value, {
    allowedTags,
    allowedAttributes: {
      a: ["href", "target", "rel", "title"],
      img: ["src", "alt", "title", "width", "height"],
      table: ["class"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
      "*": ["style"],
    },
    allowedStyles: {
      "*": { "text-align": [/^(left|right|center|justify)$/] },
      span: {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgb(a)?\([\d\s,.%]+\)$/i],
        "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgb(a)?\([\d\s,.%]+\)$/i],
        "font-family": [/^[\w\s,'"-]{1,100}$/],
        "font-size": [/^\d+(\.\d+)?(px|rem|em|%)$/],
        "line-height": [/^\d+(\.\d+)?$/],
      },
      mark: { "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgb(a)?\([\d\s,.%]+\)$/i] },
      img: {
        width: [/^\d+(\.\d+)?(px|%)$/],
        height: [/^\d+(\.\d+)?px$/, /^auto$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https"] },
    transformTags: {
      a: (_tagName, attributes) => ({ tagName: "a", attribs: { ...attributes, rel: "noopener noreferrer", ...(attributes.target === "_blank" ? { target: "_blank" } : {}) } }),
    },
  });
}
