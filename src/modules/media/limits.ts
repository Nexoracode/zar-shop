/**
 * Maximum length of each media metadata field.
 *
 * The API routes validate against these and the details panel passes them to its inputs, so the
 * limit the reader can type and the limit the server accepts are the same number.
 */
export const mediaFieldLimits = { title: 191, alt: 191, caption: 300, description: 5000 } as const;
