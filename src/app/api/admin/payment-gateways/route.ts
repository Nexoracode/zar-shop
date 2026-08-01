import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { gatewayConfigInputSchema, getPublicGatewayConfigs, encryptGatewayCredential, maskGatewayCredential } from "@/modules/payments/gateway-config";
import { gatewayProviders } from "@/modules/payments/gateway-providers";

async function requireGatewayAdmin() {
  const actor = await getCurrentUser();
  return actor?.role === "ADMIN" ? actor : null;
}

export async function GET() {
  if (!await requireGatewayAdmin()) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  return NextResponse.json(await getPublicGatewayConfigs());
}

export async function POST(request: Request) {
  try {
    const actor = await requireGatewayAdmin();
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = gatewayConfigInputSchema.parse(await request.json());
    const provider = gatewayProviders.find((item) => item.id === input.provider)!;
    await db.$transaction(async (transaction) => {
      const config = await transaction.paymentGatewayConfig.upsert({
        where: { provider: input.provider },
        create: { provider: input.provider, displayName: provider.name, credentialEncrypted: encryptGatewayCredential(input.credential), credentialMasked: maskGatewayCredential(input.credential), isSandbox: input.isSandbox },
        update: { displayName: provider.name, credentialEncrypted: encryptGatewayCredential(input.credential), credentialMasked: maskGatewayCredential(input.credential), isSandbox: input.isSandbox },
      });
      await transaction.auditLog.create({ data: { actorId: actor.id, action: "PAYMENT_GATEWAY_CONFIG_UPSERT", entityType: "PaymentGatewayConfig", entityId: config.id, metadata: { provider: input.provider, isSandbox: input.isSandbox } } });
    });
    return NextResponse.json(await getPublicGatewayConfigs(), { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireGatewayAdmin();
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const provider = gatewayConfigInputSchema.shape.provider.parse(new URL(request.url).searchParams.get("provider"));
    const existing = await db.paymentGatewayConfig.findUnique({ where: { provider } });
    if (!existing) return NextResponse.json({ message: "درگاه پیدا نشد." }, { status: 404 });
    await db.$transaction(async (transaction) => {
      await transaction.paymentGatewayConfig.delete({ where: { provider } });
      await transaction.auditLog.create({ data: { actorId: actor.id, action: "PAYMENT_GATEWAY_CONFIG_DELETE", entityType: "PaymentGatewayConfig", entityId: existing.id, metadata: { provider } } });
    });
    return NextResponse.json(await getPublicGatewayConfigs());
  } catch (error) { return apiError(error); }
}
