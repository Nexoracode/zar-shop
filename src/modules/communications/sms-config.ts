import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { smsProviderSchema, type SmsProviderId } from "@/modules/communications/sms-providers";

/** The non-secret part of a Faraz config: which registered pattern carries login codes, and which of its variables get what. */
export type SmsOtpSettings = { patternCode: string; codeVariable: string; nameVariable: string | null };
export type PublicSmsProviderConfig = { id: string; provider: SmsProviderId; displayName: string; credentialMasked: string; senderNumber: string; isActive: boolean; sendSupported: boolean; otp: SmsOtpSettings | null; updatedAt: string };

function key() { return createHash("sha256").update(`${env.AUTH_SECRET}:sms-provider-config:v1`).digest(); }

export function encryptSmsCredentials(value: unknown) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSmsCredentials(value: string): unknown {
  const [version, iv, tag, encrypted] = value.split(".");
  if (version !== "v1" || !iv || !tag || !encrypted) throw new Error("Invalid SMS credential envelope");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8"));
}

export function maskSmsCredential(value: string) { return `${"•".repeat(Math.min(12, Math.max(4, value.length - 4)))}${value.slice(-4)}`; }

const farazCredentialsSchema = z.object({
  apiKey: z.string().min(1),
  otpPatternCode: z.string().min(1).optional(),
  otpCodeVariable: z.string().min(1).optional(),
  otpNameVariable: z.string().min(1).optional(),
});

function otpSettingsOf(credentials: z.infer<typeof farazCredentialsSchema>): SmsOtpSettings | null {
  if (!credentials.otpPatternCode || !credentials.otpCodeVariable) return null;
  return { patternCode: credentials.otpPatternCode, codeVariable: credentials.otpCodeVariable, nameVariable: credentials.otpNameVariable ?? null };
}

export async function getPublicSmsProviderConfigs(): Promise<PublicSmsProviderConfig[]> {
  const configs = await db.smsProviderConfig.findMany({ orderBy: { updatedAt: "desc" } });
  return configs.map((config) => {
    let otp: SmsOtpSettings | null = null;
    if (config.provider === "FARAZ_SMS") {
      // An envelope that no longer decrypts (rotated AUTH_SECRET) must not break the whole list.
      try { otp = otpSettingsOf(farazCredentialsSchema.parse(decryptSmsCredentials(config.credentialsEncrypted))); } catch { otp = null; }
    }
    return { id: config.id, provider: smsProviderSchema.parse(config.provider), displayName: config.displayName, credentialMasked: config.credentialMasked, senderNumber: config.senderNumber, isActive: config.isActive, sendSupported: config.provider === "FARAZ_SMS", otp, updatedAt: config.updatedAt.toISOString() };
  });
}

// `isActive` defaults to true so the original "activate this provider" call shape keeps working;
// passing `false` switches the provider off (leaving no active provider) instead.
export const activeProviderInputSchema = z.object({ provider: smsProviderSchema, isActive: z.boolean().default(true) });

/** The saved Faraz config with its decrypted key, whether or not it is the active provider — the admin panel verifies and tests it before activation. */
export async function getStoredFarazCredentials() {
  const provider = await db.smsProviderConfig.findUnique({ where: { provider: "FARAZ_SMS" } });
  if (!provider) return null;
  const credentials = farazCredentialsSchema.parse(decryptSmsCredentials(provider.credentialsEncrypted));
  return { id: provider.id, isActive: provider.isActive, apiKey: credentials.apiKey, senderNumber: provider.senderNumber, otp: otpSettingsOf(credentials) };
}

// Patterns, balance and other Faraz SMS API calls all need the same active-provider API key —
// centralized here so callers don't duplicate the lookup + decrypt + credential-shape check.
export async function getActiveFarazProvider() {
  const provider = await db.smsProviderConfig.findFirst({ where: { isActive: true, provider: "FARAZ_SMS" } });
  if (!provider) return null;
  const credentials = farazCredentialsSchema.parse(decryptSmsCredentials(provider.credentialsEncrypted));
  return { id: provider.id, apiKey: credentials.apiKey, senderNumber: provider.senderNumber, otp: otpSettingsOf(credentials) };
}
