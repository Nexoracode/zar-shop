import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { brandSchema } from "@/modules/brands/schemas";
import { hasPermission } from "@/modules/auth/permissions";
import { auditRequestContext } from "@/modules/audit/request-context";

const brandInclude = {
  logo: true,
  _count: { select: { products: true } },
} as const;

async function validateLogo(logoId?: string | null) {
  if (!logoId) return null;
  const logo = await db.mediaAsset.findUnique({ where: { id: logoId }, select: { type: true, scope: true } });
  if (!logo || logo.type !== "IMAGE" || logo.scope !== "PRODUCT_BRAND") return "لوگوی برند معتبر نیست.";
  return null;
}

export async function GET(request: Request) {
  const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "true";
  if (includeInactive) {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  }

  const brands = await db.brand.findMany({
    where: includeInactive ? undefined : { isActive: true },
    include: brandInclude,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ items: brands });
}

export async function POST(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });

    const input = brandSchema.parse(await request.json());
    const logoError = await validateLogo(input.logoId);
    if (logoError) return NextResponse.json({ message: logoError }, { status: 422 });

    const brand = await db.$transaction(async (tx) => {
      const created = await tx.brand.create({ data: input, include: brandInclude });
      await tx.auditLog.create({ data: { actorId: actor!.id, action: "BRAND_CREATE", entityType: "Brand", entityId: created.id, ...auditRequestContext(request, { name: created.name, slug: created.slug }) } });
      return created;
    });
    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ message: "این نشانی برند قبلاً استفاده شده است." }, { status: 409 });
    }
    return apiError(error);
  }
}
