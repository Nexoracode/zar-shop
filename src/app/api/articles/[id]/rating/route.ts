import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/modules/auth/session";
import { articleRatingSchema } from "@/modules/articles/schemas";
import { rateArticle } from "@/modules/articles/service";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user || user.isGuest) return NextResponse.json({ message: "برای ثبت امتیاز ابتدا وارد حساب کاربری شوید." }, { status: 401 });
    const { id } = await context.params;
    const article = await db.article.findFirst({ where: { id, status: "PUBLISHED" }, select: { id: true } });
    if (!article) return NextResponse.json({ message: "مقاله پیدا نشد." }, { status: 404 });

    const { value } = articleRatingSchema.parse(await request.json());
    const result = await rateArticle(id, user.id, value);
    return NextResponse.json({ average: result.average, count: result.count, own: value });
  } catch (error) {
    return apiError(error);
  }
}
