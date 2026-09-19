import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { gatewayProviderSchema, type GatewayProviderId } from "@/modules/payments/gateway-providers";
import { gatewayFieldLimits } from "@/modules/payments/limits";

export const gatewayConfigInputSchema = z.object({
  provider: gatewayProviderSchema,
  credential: z.string().trim().min(4).max(gatewayFieldLimits.credential),
  isSandbox: z.boolean().default(false),
});

/**
 * Editing an already-registered gateway: the credential is only replaced when a new one is sent
 * (the stored one is encrypted and never shown, so leaving it blank keeps it), and the sandbox flag
 * is only touched when sent. At least one of the two must be present.
 */
export const gatewayConfigUpdateSchema = z.object({
  provider: gatewayProviderSchema,
  credential: z.string().trim().min(4, "شناسه اتصال باید حداقل ۴ نویسه باشد.").max(gatewayFieldLimits.credential).optional(),
  isSandbox: z.boolean().optional(),
}).refine((value) => value.credential !== undefined || value.isSandbox !== undefined, "تغییری برای ذخیره ارسال نشده است.");

export type PublicGatewayConfig = {
  id: string;
  provider: GatewayProviderId;
  displayName: string;
  credentialMasked: string;
  isSandbox: boolean;
  isActive: boolean;
  updatedAt: string;
};

function encryptionKey() {
  return createHash("sha256").update(`${env.AUTH_SECRET}:payment-gateway-config:v1`).digest();
}

export function encryptGatewayCredential(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptGatewayCredential(envelope: string) {
  const [version, iv, tag, encrypted] = envelope.split(".");
  if (version !== "v1" || !iv || !tag || !encrypted) throw new Error("Invalid payment gateway credential envelope");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

export function maskGatewayCredential(value: string) {
  const visible = value.slice(-4);
  return `${"•".repeat(Math.min(12, Math.max(4, value.length - 4)))}${visible}`;
}

export async function getPublicGatewayConfigs(): Promise<PublicGatewayConfig[]> {
  const configs = await db.paymentGatewayConfig.findMany({ orderBy: { updatedAt: "desc" } });
  return configs.map((config) => ({ id: config.id, provider: gatewayProviderSchema.parse(config.provider), displayName: config.displayName, credentialMasked: config.credentialMasked, isSandbox: config.isSandbox, isActive: config.isActive, updatedAt: config.updatedAt.toISOString() }));
}
