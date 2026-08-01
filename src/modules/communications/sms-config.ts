import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { smsProviderSchema, type SmsProviderId } from "@/modules/communications/sms-providers";

export type PublicSmsProviderConfig = { id: string; provider: SmsProviderId; displayName: string; credentialMasked: string; senderNumber: string; isActive: boolean; sendSupported: boolean; updatedAt: string };

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

export async function getPublicSmsProviderConfigs(): Promise<PublicSmsProviderConfig[]> {
  const configs = await db.smsProviderConfig.findMany({ orderBy: { updatedAt: "desc" } });
  return configs.map((config) => ({ id: config.id, provider: smsProviderSchema.parse(config.provider), displayName: config.displayName, credentialMasked: config.credentialMasked, senderNumber: config.senderNumber, isActive: config.isActive, sendSupported: config.provider === "FARAZ_SMS", updatedAt: config.updatedAt.toISOString() }));
}

export const activeProviderInputSchema = z.object({ provider: smsProviderSchema });
