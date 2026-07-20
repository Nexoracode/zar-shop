import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function apiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { message: "اطلاعات ارسال‌شده معتبر نیست.", issues: error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  console.error(error);
  return NextResponse.json({ message: "خطای داخلی رخ داد." }, { status: 500 });
}
