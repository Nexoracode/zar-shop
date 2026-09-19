import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/modules/auth/constants";
import { getSeoRuleSets } from "@/modules/seo/rules";

// Proxy (Next 16's renamed Middleware) runs on the Node.js runtime, so the SEO rule lookup
// below can hit Prisma. Two jobs:
//   1. Auth guard for /account and /admin (unchanged behaviour).
//   2. Apply admin-managed technical-SEO rules to storefront requests: 301 redirects, 410
//      gone pages, and `X-Robots-Tag` / canonical `Link` response headers.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isGuarded =
    pathname.startsWith("/account") || (pathname.startsWith("/admin") && pathname !== "/admin/login");

  if (isGuarded && !request.cookies.has(SESSION_COOKIE)) {
    // Staff sign in on their own page; the customer login can't open the panel any more.
    if (pathname.startsWith("/admin")) return NextResponse.redirect(new URL("/admin/login", request.url));
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  // SEO rules only apply to public storefront routes.
  const skipSeo =
    isGuarded ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    pathname === "/favicon.ico" ||
    /\.[a-z0-9]+$/i.test(pathname);
  if (skipSeo) return NextResponse.next();

  const key = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  // A rules lookup failure (DB blip) must never take the storefront down — fall through.
  const rules = await getSeoRuleSets().catch(() => null);
  if (!rules) return NextResponse.next();

  const redirectTo = rules.redirects.get(key);
  if (redirectTo) {
    const destination = /^https?:\/\//i.test(redirectTo) ? redirectTo : new URL(redirectTo, request.url);
    return NextResponse.redirect(destination, 301);
  }

  if (rules.gone.has(key)) {
    return new NextResponse(null, { status: 410, headers: { "X-Robots-Tag": "noindex" } });
  }

  const response = NextResponse.next();
  if (rules.noindex.has(key)) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  const canonical = rules.canonical.get(key);
  if (canonical) {
    const absolute = /^https?:\/\//i.test(canonical) ? canonical : new URL(canonical, request.url).toString();
    response.headers.set("Link", `<${absolute}>; rel="canonical"`);
  }
  return response;
}

export const config = {
  // Broad enough for the SEO rules to reach any storefront route; `/api`, `/_next` and files
  // with an extension are excluded here and the function also guards against them.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
