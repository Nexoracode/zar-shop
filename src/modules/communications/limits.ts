/*
 * Field limits for the communication settings and the SMS providers.
 *
 * Separate from the services that use them: those import `@/lib/db`, and a form only needs the
 * numbers. See `settings/settings-limits.ts` for the same split.
 */

export const communicationFieldLimits = { adminPhone: 20, template: 500 } as const;

export const smsFieldLimits = { message: 500, phone: 11 } as const;

export const smsProviderFieldLimits = { apiKey: 500, username: 191, password: 500, senderNumber: 20 } as const;
