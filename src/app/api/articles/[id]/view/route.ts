import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

/** Anonymous page-view beacon, fire-and-forget — always 204, even if the article no longer exists. */
export async function POST(_request: Request, context: Context) {
  const { id } = await context.params;
  await db.article.updateMany({ where: { id, status: "PUBLISHED" }, data: { viewCount: { increment: 1 } } });
  return new NextResponse(null, { status: 204 });
}
