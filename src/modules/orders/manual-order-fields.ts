/**
 * Field length limits for the admin manual-order form, shared by the form control and the
 * server schema in `manual-order.ts` so the two can never drift. Kept in its own module with
 * no server-only imports so the client form can read it without pulling in `db`.
 */
export const manualOrderFieldLimits = { name: 100, phone: 11, postalCode: 10, addressLine: 500, notes: 2000 } as const;
