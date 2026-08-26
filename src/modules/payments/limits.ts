/*
 * Payment gateway field limits. Kept out of `gateway-config.ts`, which imports `@/lib/db` and the
 * node crypto used for credential envelopes — neither belongs in a browser bundle.
 */

export const gatewayFieldLimits = { credential: 500 } as const;
