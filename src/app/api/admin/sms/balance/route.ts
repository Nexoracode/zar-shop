import { NextResponse } from "next/server";
import { getPermittedActor } from "@/modules/auth/session";
import { getSmsAccountBalance } from "@/modules/communications/sms-patterns";

export async function GET() {
  if (!await getPermittedActor("settings:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  try {
    return NextResponse.json({ balance: await getSmsAccountBalance() });
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "دریافت موجودی انجام نشد." }, { status: 422 }); }
}
