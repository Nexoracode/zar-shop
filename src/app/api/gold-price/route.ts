import { NextResponse } from "next/server";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";

export async function GET() {
  const price = await getGoldPriceForDisplay();
  if (!price) {
    return NextResponse.json(
      { message: "نرخ لحظه‌ای طلا موقتاً در دسترس نیست." },
      { status: 503 },
    );
  }
  return NextResponse.json({
    pricePerGram18: price.pricePerGram18.toString(),
    currency: price.currency,
    source: price.source,
    fetchedAt: price.fetchedAt,
  });
}
