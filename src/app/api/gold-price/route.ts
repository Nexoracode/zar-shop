import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { getGoldPrice } from "@/modules/gold/gold-price.service";

export async function GET() {
  try {
    const price = await getGoldPrice();
    return NextResponse.json({
      pricePerGram18: price.pricePerGram18.toString(),
      currency: price.currency,
      source: price.source,
      fetchedAt: price.fetchedAt,
    });
  } catch (error) { return apiError(error); }
}
