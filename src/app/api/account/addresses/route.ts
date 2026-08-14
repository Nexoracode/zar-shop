import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { addressInputSchema } from "@/modules/account/schemas";
import { resolveLocation, serializeAddress } from "@/modules/account/addresses";
import { ensureIranLocations } from "@/modules/locations/service";

const include = { provinceRef: true, cityRef: true } as const;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "ابتدا وارد حساب شوید." }, { status: 401 });
  const addresses = await db.address.findMany({ where: { userId: user.id, type: "SHIPPING" }, include, orderBy: [{ isDefault: "desc" }, { lastUsedAt: "desc" }, { createdAt: "desc" }] });
  return NextResponse.json({ items: addresses.map(serializeAddress) });
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "ابتدا وارد حساب شوید." }, { status: 401 });
    await ensureIranLocations();
    const input = addressInputSchema.parse(await request.json());
    const address = await db.$transaction(async (transaction) => {
      const count = await transaction.address.count({ where: { userId: user.id, type: "SHIPPING" } });
      if (count >= 10) throw new Error("حداکثر ۱۰ نشانی می‌توانید ثبت کنید.");
      const location = await resolveLocation(transaction, input.provinceId, input.cityId);
      if (!location) throw new Error("استان و شهر انتخاب‌شده معتبر نیست.");
      const makeDefault = input.isDefault || count === 0;
      if (makeDefault) await transaction.address.updateMany({ where: { userId: user.id, type: "SHIPPING" }, data: { isDefault: false } });
      return transaction.address.create({ data: { ...input, userId: user.id, type: "SHIPPING", province: location.province.name, city: location.city.name, isDefault: makeDefault }, include });
    });
    return NextResponse.json({ item: serializeAddress(address) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith("حداکثر") || error.message.startsWith("استان"))) return NextResponse.json({ message: error.message }, { status: 422 });
    return apiError(error);
  }
}
