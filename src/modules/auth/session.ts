import { createHash, randomBytes } from "node:crypto";
import { hash as hashPassword } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { UserRole } from "@generated/prisma/enums";
import { SESSION_COOKIE } from "@/modules/auth/constants";
import { adminRoles, adminStartPath, hasPermission, type AdminPermission } from "@/modules/auth/permissions";

export const SESSION_AGE_MS = 1000 * 60 * 60 * 24 * 14;

export const hashSessionToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function sessionIsUsable(session: { expiresAt: Date; user: { status: string } } | null, now = new Date()) {
  return Boolean(session && session.expiresAt > now && session.user.status === "ACTIVE");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await db.session.create({
    data: { tokenHash: hashSessionToken(token), userId, expiresAt: new Date(Date.now() + SESSION_AGE_MS) },
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_AGE_MS / 1000,
  });
}

export async function createGuestSessionUser() {
  const marker = randomBytes(18).toString("hex");
  const passwordHash = await hashPassword(randomBytes(48).toString("base64url"), 12);
  const user = await db.user.create({
    data: {
      email: `guest-${marker}@guest.local`,
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

export async function getCurrentUser() {
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
  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(roles: UserRole[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}

export async function requireAdminUser() {
  return requireRole(adminRoles);
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
