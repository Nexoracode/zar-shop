/**
 * Length limits for the return-request and admin-note fields. Kept in their own module (no `db`
 * import) so both the server schema in `returns.ts` and the client-side forms can read the same
 * numbers — the same split as `src/modules/tickets/limits.ts`.
 */
export const returnLimits = {
  /** Customer's free-text reason for the return. */
  reasonMin: 10,
  reasonMax: 1000,
  /** Admin's internal note on the decision. */
  adminNoteMax: 1000,
} as const;
