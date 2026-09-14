export type ArticleTocSection = { id: string; heading: string };

const H2_PATTERN = /<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi;

/**
 * Builds a table of contents from an article's already-sanitized HTML by locating every `<h2>`
 * and injecting a sequential anchor id (`s0`, `s1`, ...) into its opening tag. Runs at render
 * time, never at write time — `sanitizeProductDescription` strips `id` attributes on save, so an
 * id set in the editor could never survive storage anyway.
 */
export function extractTableOfContents(html: string): { html: string; sections: ArticleTocSection[] } {
  const sections: ArticleTocSection[] = [];
  let index = 0;
  const rewritten = html.replace(H2_PATTERN, (match, attrs: string, inner: string) => {
    const heading = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!heading) return match;
    const id = `s${index}`;
    sections.push({ id, heading });
    index += 1;
    return `<h2${attrs} id="${id}">${inner}</h2>`;
  });
  return { html: rewritten, sections };
}
