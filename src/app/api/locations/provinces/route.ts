import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { db } from "@/lib/db";
import { ensureIranLocations, iranLocationSource } from "@/modules/locations/service";

export async function GET() {
  try {
    const sync = await ensureIranLocations();
    const items = await db.province.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
    return NextResponse.json({ items, meta: { syncedAt: sync.syncedAt.toISOString(), source: iranLocationSource.name } }, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
  } catch (error) { return apiError(error); }
}
