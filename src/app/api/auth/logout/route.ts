import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditRequestContext } from "@/modules/audit/request-context";
import { isAdminRole } from "@/modules/auth/permissions";
import { destroySession, getCurrentUser } from "@/modules/auth/session";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (actor && isAdminRole(actor.role)) await db.auditLog.create({ data: { actorId: actor.id, action: "ADMIN_LOGOUT", entityType: "Session", entityId: actor.id, ...auditRequestContext(request) } });
  await destroySession();
  return NextResponse.redirect(new URL("/", request.url), 303);
}
