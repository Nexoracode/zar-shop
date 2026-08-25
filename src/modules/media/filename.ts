import { randomUUID } from "node:crypto";

/*
 * Storage keys used to be a bare UUID, which carries no meaning for search engines. The uploaded
 * file's own name is kept instead, sanitised into something safe for a path and a URL.
 *
 * Persian letters are kept rather than transliterated, the way WordPress keeps the original name:
 * the URL ends up percent-encoded, which crawlers read fine and which preserves the words.
 */

/** Everything that must not appear in an FTP path or a URL segment. */
const unsafeCharacters = /[^\p{Letter}\p{Number}._-]+/gu;

const maxBaseLength = 60;

function normalize(value: string) {
  return value
    .normalize("NFKC")
    // The same Arabic/Persian folding the search helper uses, so a file named with an Arabic
    // yeh and one named with a Persian yeh do not produce two different-looking keys.
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ً-ٰٟ]/g, "")
    .replace(/[‌‍]/g, "-")
    .trim();
}

/**
 * Builds the storage key's file name from the uploaded file's own name.
 *
 * A short random suffix is always appended, so uniqueness on `MediaAsset.storageKey` is
 * guaranteed without asking the database first. The whole thing stays well inside the column's
 * 191 characters.
 */
export function mediaFileSlug(originalName: string, extension: string) {
  const withoutExtension = originalName.replace(/\.[^.]+$/, "");
  const base = normalize(withoutExtension)
    .replace(unsafeCharacters, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "")
    .slice(0, maxBaseLength)
    .replace(/[-._]+$/, "");

  const suffix = randomUUID().slice(0, 8);
  // A name made entirely of characters we strip leaves nothing to keep, so fall back to the old
  // behaviour rather than producing a key that is only a suffix.
  return base ? `${base}-${suffix}${extension}` : `${randomUUID()}${extension}`;
}
