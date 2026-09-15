import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** The origin the current request actually arrived on (scheme + host), not the fixed `APP_URL`
 *  env var — needed for anything that must round-trip back to whichever domain the shopper is
 *  on (a payment gateway callback, for instance), since a deployment can be reachable from more
 *  than one host. Mirrors the header logic already used for `generateMetadata`'s `baseUrl`. */
export function getRequestOrigin(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
  const protocol = request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${protocol}://${host}`;
}

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
