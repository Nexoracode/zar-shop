import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { db } from "@/lib/db";
import { ensureIranLocations } from "@/modules/locations/service";

const querySchema = z.object({ provinceId: z.string().cuid() });

export async function GET(request: Request) {
  try {
    await ensureIranLocations();
    const { provinceId } = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const items = await db.city.findMany({ where: { provinceId, isActive: true, province: { isActive: true } }, orderBy: { name: "asc" }, select: { id: true, name: true } });
    return NextResponse.json({ items }, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
  } catch (error) { return apiError(error); }
}
