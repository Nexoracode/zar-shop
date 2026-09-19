import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { getPermittedActor } from "@/modules/auth/session";
import { FarazApiError } from "@/modules/communications/faraz-client";
import { inspectFarazAccount } from "@/modules/communications/sms-account";
import { getStoredFarazCredentials } from "@/modules/communications/sms-config";
import { smsProviderFieldLimits } from "@/modules/communications/limits";

// POST rather than GET because the key being tested may be one typed into the form and not yet
// saved — it must never travel in a query string. A blank key means "the saved one".
const inspectInputSchema = z.object({ apiKey: z.string().trim().max(smsProviderFieldLimits.apiKey).optional() });

export async function POST(request: Request) {
  try {
    if (!await getPermittedActor("settings:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = inspectInputSchema.parse(await request.json().catch(() => ({})));
    const apiKey = input.apiKey || (await getStoredFarazCredentials())?.apiKey;
    if (!apiKey) return NextResponse.json({ message: "ابتدا API Key فراز اس‌ام‌اس را وارد کنید." }, { status: 422 });
    try {
      return NextResponse.json(await inspectFarazAccount(apiKey));
    } catch (error) {
      if (error instanceof FarazApiError) return NextResponse.json({ message: error.message }, { status: 422 });
      throw error;
    }
  } catch (error) { return apiError(error); }
}
