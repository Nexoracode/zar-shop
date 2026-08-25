import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { gatewayProviderSchema, type GatewayProviderId } from "@/modules/payments/gateway-providers";

/** See `authFieldLimits`: one number per field, shared by the form control and the schema. */
export const gatewayFieldLimits = { credential: 500 } as const;

export const gatewayConfigInputSchema = z.object({
  provider: gatewayProviderSchema,
  credential: z.string().trim().min(4).max(gatewayFieldLimits.credential),
  isSandbox: z.boolean().default(false),
});

export type PublicGatewayConfig = {
  id: string;
  provider: GatewayProviderId;
  displayName: string;
  credentialMasked: string;
  isSandbox: boolean;
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
  return configs.map((config) => ({ id: config.id, provider: gatewayProviderSchema.parse(config.provider), displayName: config.displayName, credentialMasked: config.credentialMasked, isSandbox: config.isSandbox, updatedAt: config.updatedAt.toISOString() }));
}
