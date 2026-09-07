import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { getComparePickerProducts } from "@/modules/compare/service";

export const dynamic = "force-dynamic";

/** `GET /api/compare/pick?q=&categoryId=&exclude=a,b` — products for the compare picker modal. */
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const exclude = (params.get("exclude") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
    return NextResponse.json(await getComparePickerProducts({
      q: params.get("q") ?? undefined,
      categoryId: params.get("categoryId") || null,
      excludeIds: exclude,
    }));
  } catch (error) {
    return apiError(error);
  }
}
