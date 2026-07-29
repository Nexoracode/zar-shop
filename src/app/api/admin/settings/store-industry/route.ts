import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/modules/auth/session";
import { isAdminRole } from "@/modules/auth/permissions";

const schema = z.object({ industry: z.enum(["GOLD", "GENERAL"]) });

export async function PATCH(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !isAdminRole(actor.role)) {
      return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    }
    const { industry } = schema.parse(await request.json());
    const setting = await db.$transaction(async (transaction) => {
      const saved = await transaction.storeSetting.upsert({
        where: { id: "main" },
        create: { id: "main", industry },
        update: { industry },
        select: { industry: true, updatedAt: true },
      });
      await transaction.auditLog.create({
        data: { actorId: actor.id, action: "STORE_INDUSTRY_UPDATE", entityType: "StoreSetting", entityId: "main" },
      });
      return saved;
    });
    return NextResponse.json(setting);
  } catch (error) {
    return apiError(error);
  }
}
