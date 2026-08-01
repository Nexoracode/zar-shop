import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";

const schema = z.object({ smsMarketingConsent: z.boolean() });
export async function PATCH(request: Request) { try { const user = await getCurrentUser(); if (!user) return NextResponse.json({ message: "ابتدا وارد حساب شوید." }, { status: 401 }); const input = schema.parse(await request.json()); await db.user.update({ where: { id: user.id }, data: input }); return NextResponse.json(input); } catch (error) { return apiError(error); } }
