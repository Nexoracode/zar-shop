import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { getStorefrontProductFeed } from "@/modules/products/storefront-feed";
import { storefrontProductFeedQuerySchema } from "@/modules/products/storefront-feed-contract";
import { getGeneralStoreSettings, isStorefrontAvailable } from "@/modules/settings/general-settings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const [settings, user] = await Promise.all([getGeneralStoreSettings(), getCurrentUser()]);
    if (!isStorefrontAvailable(settings, user?.role)) {
      return NextResponse.json({ message: "فروشگاه موقتاً در دسترس نیست." }, { status: 503 });
    }

    const url = new URL(request.url);
    const query = storefrontProductFeedQuerySchema.parse({
      sort: url.searchParams.get("sort") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
    });
    const feed = await getStorefrontProductFeed(query);
    return NextResponse.json(feed, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
