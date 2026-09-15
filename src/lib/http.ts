import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** The origin the current request actually arrived on (scheme + host), not the fixed `APP_URL`
 *  env var — needed for anything that must round-trip back to whichever domain the shopper is
 *  on (a payment gateway callback, for instance), since a deployment can be reachable from more
 *  than one host (including a local tunnel while testing). `Origin` is preferred when present:
 *  it is set by the browser itself on state-changing requests and — unlike `Host` — some simple
 *  tunnels/proxies forward it unchanged even while rewriting `Host` to their own local target
 *  and never adding `X-Forwarded-Host`. Falls back to the header chain `generateMetadata`'s
 *  `baseUrl` already uses for plain navigations (which carry no `Origin`). */
export function getRequestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const { protocol, host } = new URL(origin);
      if (protocol === "http:" || protocol === "https:") return `${protocol}//${host}`;
    } catch {
      // Malformed Origin header — fall through to the host-based resolution below.
    }
  }
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
