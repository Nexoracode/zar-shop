import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { addressPatchSchema } from "@/modules/account/schemas";
import { resolveLocation, serializeAddress } from "@/modules/account/addresses";
import { ensureIranLocations } from "@/modules/locations/service";

const include = { provinceRef: true, cityRef: true } as const;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "ابتدا وارد حساب شوید." }, { status: 401 });
    const { id } = await context.params;
    const input = addressPatchSchema.parse(await request.json());
    const existing = await db.address.findFirst({ where: { id, userId: user.id, type: "SHIPPING" } });
    if (!existing) return NextResponse.json({ message: "نشانی پیدا نشد." }, { status: 404 });
    if (input.action === "update") await ensureIranLocations();
    const address = await db.$transaction(async (transaction) => {
      if (input.action === "set-default") {
        await transaction.address.updateMany({ where: { userId: user.id, type: "SHIPPING", id: { not: id } }, data: { isDefault: false } });
        return transaction.address.update({ where: { id }, data: { isDefault: true, lastUsedAt: new Date() }, include });
      }
      const location = await resolveLocation(transaction, input.data.provinceId, input.data.cityId);
      if (!location) throw new Error("استان و شهر انتخاب‌شده معتبر نیست.");
      const makeDefault = input.data.isDefault || existing.isDefault;
      if (makeDefault) await transaction.address.updateMany({ where: { userId: user.id, type: "SHIPPING", id: { not: id } }, data: { isDefault: false } });
      return transaction.address.update({ where: { id }, data: { ...input.data, isDefault: makeDefault, province: location.province.name, city: location.city.name }, include });
    });
    return NextResponse.json({ item: serializeAddress(address) });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("استان")) return NextResponse.json({ message: error.message }, { status: 422 });
    return apiError(error);
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "ابتدا وارد حساب شوید." }, { status: 401 });
    const { id } = await context.params;
    const existing = await db.address.findFirst({ where: { id, userId: user.id, type: "SHIPPING" } });
    if (!existing) return NextResponse.json({ message: "نشانی پیدا نشد." }, { status: 404 });
    await db.$transaction(async (transaction) => {
      await transaction.address.delete({ where: { id } });
      if (existing.isDefault) {
        const next = await transaction.address.findFirst({ where: { userId: user.id, type: "SHIPPING" }, orderBy: [{ lastUsedAt: "desc" }, { createdAt: "desc" }] });
        if (next) await transaction.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
