import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { auditRequestContext } from "@/modules/audit/request-context";
import { getPermittedActor } from "@/modules/auth/session";
import { getGoldPrice } from "@/modules/gold/gold-price.service";
import { getStoreIndustry } from "@/modules/settings/store-settings";

export async function POST(request: Request) {
  try {
    const actor = await getPermittedActor("catalog:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    if ((await getStoreIndustry()) !== "GOLD") return NextResponse.json({ message: "این بخش فقط برای فروشگاه طلا در دسترس است." }, { status: 404 });

    const price = await getGoldPrice({ force: true });
    await db.auditLog.create({
      data: {
        actorId: actor.id,
        action: "GOLD_PRICE_REFRESH",
        entityType: "GoldPrice",
        entityId: price.id,
        ...auditRequestContext(request, { source: price.source, pricePerGram18: price.pricePerGram18.toString() }),
      },
    });
    return NextResponse.json({ pricePerGram18: price.pricePerGram18.toString(), source: price.source, fetchedAt: price.fetchedAt.toISOString() });
  } catch (error) {
    return apiError(error);
  }
}
