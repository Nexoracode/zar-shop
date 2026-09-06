/*
 * A second check on an uploaded file's real type, past the browser-supplied `file.type`.
 *
 * The MIME the form sends is trivially spoofable — a rename or a crafted request is enough — so
 * every upload path (`/api/media`, ticket attachments, return attachments) also sniffs the first
 * bytes of the buffer it is about to store and rejects anything whose signature does not match
 * the declared type. Only the formats the upload allowlists appear here.
 */

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/** ISO base-media containers (mp4, m4v, mov) all carry `ftyp` at byte 4. */
function isIsoBaseMedia(bytes: Uint8Array) {
  return startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4);
}

/** QuickTime files can also lead with one of these top-level atoms at byte 4. */
function isQuickTimeAtom(bytes: Uint8Array) {
  return ["moov", "mdat", "wide", "free", "skip", "pnot"].some((atom) =>
    startsWith(bytes, [...atom].map((character) => character.charCodeAt(0)), 4),
  );
}

const matchers: Record<string, (bytes: Uint8Array) => boolean> = {
  "image/jpeg": (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]),
  "image/png": (bytes) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/gif": (bytes) => startsWith(bytes, [0x47, 0x49, 0x46, 0x38]),
  "image/webp": (bytes) => startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8),
  "application/pdf": (bytes) => startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]),
  "video/mp4": (bytes) => isIsoBaseMedia(bytes),
  "video/webm": (bytes) => startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3]),
  "video/quicktime": (bytes) => isIsoBaseMedia(bytes) || isQuickTimeAtom(bytes),
};

/**
 * `true` when `bytes` begins with a signature consistent with `mimeType`. An unknown `mimeType`
 * returns `false` — the caller has already checked it against an allowlist, so anything not
 * covered here should not have reached this point.
 */
export function bufferMatchesMimeType(bytes: Uint8Array, mimeType: string) {
  return matchers[mimeType]?.(bytes) ?? false;
}
