import { createHash, randomBytes } from "node:crypto";
import { hash as hashPassword } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import type { UserRole } from "@generated/prisma/enums";
import { SESSION_COOKIE } from "@/modules/auth/constants";
import { adminElevationActive, renewedAdminUntil, startAdminElevation } from "@/modules/auth/admin-elevation";
import { adminStartPath, hasPermission, isAdminRole, type AdminPermission } from "@/modules/auth/permissions";

export const SESSION_AGE_MS = 1000 * 60 * 60 * 24 * 14;

export const hashSessionToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function sessionIsUsable(session: { expiresAt: Date; user: { status: string } } | null, now = new Date()) {
  return Boolean(session && session.expiresAt > now && session.user.status === "ACTIVE");
}

// `Secure` must reflect whether the site is actually served over HTTPS, not just NODE_ENV: a
// production *build* (`next start`) opened over plain HTTP — e.g. testing on a phone via a LAN
// IP like http://192.168.x.x:3000 — still has NODE_ENV=production, so a cookie gated on that
// alone gets the Secure flag on a connection that isn't secure, and mobile browsers silently
// refuse to store it (the login API call succeeds, but the browser never keeps the session
// cookie, so every next request looks logged-out). APP_URL is this project's own source of
// truth for the site's real origin/protocol, so it isn't fooled by that mismatch.
const SESSION_COOKIE_SECURE = env.APP_URL.startsWith("https://");

/**
 * `elevated` opens the admin window (see admin-elevation.ts) and is only ever passed by the
 * dedicated /admin/login route. Every other sign-in — storefront password, OTP, password reset —
 * leaves it off, so a staff account signed in there is treated as a customer until it signs in to
 * the panel itself.
 */
export async function createSession(userId: string, options: { elevated?: boolean } = {}) {
  const token = randomBytes(32).toString("base64url");
  await db.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_AGE_MS),
      ...(options.elevated ? startAdminElevation() : {}),
    },
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: SESSION_COOKIE_SECURE,
    path: "/",
    maxAge: SESSION_AGE_MS / 1000,
  });
}

export async function createGuestSessionUser() {
  const passwordHash = await hashPassword(randomBytes(48).toString("base64url"), 12);
  const user = await db.user.create({
    data: {
      passwordHash,
      isGuest: true,
    },
  });
  await createSession(user.id);
  return user;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  store.delete(SESSION_COOKIE);
}

// A password reset or change is a signal the account may have been compromised, so every
// other active session (any device, any browser) is revoked along with it.
export async function destroyAllUserSessions(userId: string) {
  await db.session.deleteMany({ where: { userId } });
}

async function getSessionContext() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (!sessionIsUsable(session)) {
    await db.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  return { session, user: session.user, elevated: adminElevationActive(session) };
}

async function renewAdminElevation(session: { id: string; adminSince: Date | null; adminUntil: Date | null }) {
  const next = renewedAdminUntil(session);
  if (next) await db.session.update({ where: { id: session.id }, data: { adminUntil: next } });
}

/**
 * The signed-in user as the rest of the app must treat them. A staff account whose session has no
 * open admin window is reported as a CUSTOMER, so every role/permission check downstream (pages,
 * route handlers, the storefront header) denies admin power without each having to know about it.
 */
export async function getCurrentUser() {
  const context = await getSessionContext();
  if (!context) return null;
  if (isAdminRole(context.user.role) && !context.elevated) return { ...context.user, role: "CUSTOMER" as UserRole };
  return context.user;
}

/**
 * Extends the admin window for a panel that is still being used. Returns `false` when there is no
 * open window (expired, or a plain storefront session), so the panel can send the user to sign in.
 */
export async function keepAdminSessionAlive() {
  const context = await getSessionContext();
  if (!context || !isAdminRole(context.user.role) || !context.elevated) return false;
  await renewAdminElevation(context.session);
  return true;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(roles: UserRole[], loginPath = "/login") {
  const user = await getCurrentUser();
  if (!user) redirect(loginPath);
  if (!roles.includes(user.role)) redirect("/");
  return user;
}

// Staff sign in through their own page, not the customer-facing one — an unauthenticated visit
// to any /admin route lands there instead of /login. /admin/login sits outside the
// `(protected)` route group that admin/layout.tsx's own requireAdminUser() gate covers, so the
// login page itself never nests under that gate and can't redirect to itself. A staff account
// signed in on the storefront (no open admin window) is sent to that page too, not to "/".
export async function requireAdminUser() {
  const context = await getSessionContext();
  if (!context) redirect("/admin/login");
  if (!isAdminRole(context.user.role)) redirect("/");
  if (!context.elevated) redirect("/admin/login");
  await renewAdminElevation(context.session);
  return context.user;
}

export async function requirePermission(permission: AdminPermission) {
  const user = await requireAdminUser();
  if (!hasPermission(user.role, permission)) redirect(adminStartPath(user.role));
  return user;
}

/**
 * Route-handler counterpart of `requirePermission`. Returns the actor when it holds the
 * permission, otherwise `null` so the caller can answer with a 403 instead of redirecting.
 */
export async function getPermittedActor(permission: AdminPermission) {
  const actor = await getCurrentUser();
  return actor && hasPermission(actor.role, permission) ? actor : null;
}
