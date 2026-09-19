import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { isValidVisitorId, newVisitorId, recordVisit, trackPayloadSchema, VISITOR_COOKIE, VISITOR_COOKIE_MAX_AGE_S } from "@/modules/analytics/tracking";

// Anonymous storefront traffic beacon (see components/site-tracker.tsx). It never fails loudly —
// a tracking hiccup must not surface to a shopper — and honours "Do Not Track" by not counting.
export async function POST(request: Request) {
  if (request.headers.get("dnt") === "1") return new NextResponse(null, { status: 204 });

  const payload = trackPayloadSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return new NextResponse(null, { status: 204 });

  const cookieHeader = request.headers.get("cookie") ?? "";
  const existing = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${VISITOR_COOKIE}=`))?.slice(VISITOR_COOKIE.length + 1);
  const visitorId = isValidVisitorId(existing) ? existing : newVisitorId();

  try {
    await recordVisit({ visitorId, payload: payload.data, userAgent: request.headers.get("user-agent"), ownHost: request.headers.get("host") });
  } catch (error) {
    console.error("[analytics] Could not record a visit.", error);
  }

  const response = new NextResponse(null, { status: 204 });
  if (visitorId !== existing) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.APP_URL.startsWith("https://"),
      path: "/",
      maxAge: VISITOR_COOKIE_MAX_AGE_S,
    });
  }
  return response;
}
