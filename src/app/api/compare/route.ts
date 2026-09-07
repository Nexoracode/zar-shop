import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { getComparison } from "@/modules/compare/service";

export const dynamic = "force-dynamic";

/** `GET /api/compare?ids=a,b,c` — the side-by-side data for the compare page. Public. */
export async function GET(request: Request) {
  try {
    const ids = (new URL(request.url).searchParams.get("ids") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    return NextResponse.json(await getComparison(ids));
  } catch (error) {
    return apiError(error);
  }
}
