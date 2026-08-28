import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { auditRequestContext } from "@/modules/audit/request-context";
import { tehranDateEnd, tehranDateStart } from "@/modules/products/discount";

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ واردشده معتبر نیست.");
const dateTimeSchema = z.string().datetime({ offset: true }).or(z.string().datetime());
const boundarySchema = z.union([dateOnlySchema, dateTimeSchema], "تاریخ و ساعت واردشده معتبر نیست.");

const bodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "دست‌کم یک محصول را انتخاب کنید.").max(50, "حداکثر ۵۰ محصول در هر ویرایش گروهی قابل انتخاب است."),
  type: z.enum(["price", "stock", "discount", "scheduledDiscount", "removeDiscount"], "نوع تغییر را انتخاب کنید."),
  method: z.enum(["set", "increase", "decrease"]).optional(),
  unit: z.enum(["PERCENT", "FIXED"]).optional(),
  // Every type but removeDiscount needs an amount — that one only ever clears fields, so it is
  // the sole type allowed to leave this out.
  value: z.coerce.number("مقدار را وارد کنید.").positive("مقدار باید بیشتر از صفر باشد.").max(999999999999999999, "مقدار واردشده بیش از حد مجاز است.").optional(),
  startsAt: boundarySchema.nullable().optional(),
  endsAt: boundarySchema.nullable().optional(),
}).superRefine((data, context) => {
  if (data.type !== "removeDiscount" && data.value === undefined) {
    context.addIssue({ code: "custom", path: ["value"], message: "مقدار را وارد کنید." });
  }
});

type Row = {
  kind: "product" | "variant";
  id: string;
  storeIndustry: "GOLD" | "GENERAL";
  price: number | null;
  stock: number;
  hasDiscount: boolean;
};

/**
 * Groups a bulk change into one editable list: a product with no combinations of its own is the
 * row, a product with combinations hands the change to every one of them instead — the base
 * product's own price/stock stay untouched once it has variants, since those are what checkout
 * actually reads.
 */
function rowsFor(product: Awaited<ReturnType<typeof loadProducts>>[number]): Row[] {
  if (product.variants.length > 0) {
    return product.variants.map((variant) => ({
      kind: "variant",
      id: variant.id,
      storeIndustry: product.storeIndustry,
      price: variant.price !== null ? Number(variant.price) : null,
      stock: variant.stock,
      hasDiscount: variant.discountType !== null,
    }));
  }
  return [{
    kind: "product",
    id: product.id,
    storeIndustry: product.storeIndustry,
    price: product.fixedPrice !== null ? Number(product.fixedPrice) : null,
    stock: product.stock,
    hasDiscount: product.discountType !== null,
  }];
}

function loadProducts(ids: string[]) {
  return db.product.findMany({ where: { id: { in: ids } }, include: { variants: true } });
}

export async function POST(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "اطلاعات ویرایش گروهی معتبر نیست." }, { status: 422 });
    const { ids, type, method, unit, value, startsAt, endsAt } = parsed.data;
    const uniqueIds = [...new Set(ids)];
    // Guaranteed defined here for every type but removeDiscount, which never reads it — the
    // schema's own superRefine already rejected a missing value for the others.
    const amount = value ?? 0;

    if ((type === "price" || type === "stock") && !method) return NextResponse.json({ message: "روش تغییر را انتخاب کنید." }, { status: 422 });
    if ((type === "discount" || type === "scheduledDiscount") && !unit) return NextResponse.json({ message: "واحد تخفیف را انتخاب کنید." }, { status: 422 });
    if (unit === "PERCENT" && amount > 100) return NextResponse.json({ message: "درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد." }, { status: 422 });

    let windowStart: Date | null = null;
    let windowEnd: Date | null = null;
    if (type === "scheduledDiscount") {
      if (!startsAt || !endsAt) return NextResponse.json({ message: "بازه زمانی تخفیف را کامل کنید." }, { status: 422 });
      windowStart = tehranDateStart(startsAt);
      windowEnd = tehranDateEnd(endsAt);
      if (windowStart && windowEnd && windowEnd < windowStart) return NextResponse.json({ message: "پایان تخفیف باید بعد از شروع آن باشد." }, { status: 422 });
    }

    const products = await loadProducts(uniqueIds);
    if (!products.length) return NextResponse.json({ message: "محصولی برای ویرایش پیدا نشد." }, { status: 404 });

    const productUpdates: { id: string; data: Record<string, unknown> }[] = [];
    const variantUpdates: { id: string; data: Record<string, unknown> }[] = [];
    let skipped = 0;

    for (const product of products) {
      for (const row of rowsFor(product)) {
        const data: Record<string, unknown> = {};
        if (type === "price") {
          // Gold-industry rows price themselves from weight and the day's rate, not a stored
          // number, so a direct price change has nothing to act on there.
          if (row.storeIndustry === "GOLD" || row.price === null) { skipped += 1; continue; }
          const next = method === "set" ? amount : method === "increase" ? row.price + amount : Math.max(1, row.price - amount);
          data[row.kind === "product" ? "fixedPrice" : "price"] = Math.round(next);
        } else if (type === "stock") {
          const change = Math.trunc(amount);
          data.stock = method === "set" ? change : method === "increase" ? row.stock + change : Math.max(0, row.stock - change);
        } else if (type === "removeDiscount") {
          // Nothing to clear on a row that has no discount to begin with.
          if (!row.hasDiscount) { skipped += 1; continue; }
          data.discountType = null;
          data.discountValue = null;
          data.discountStartsAt = null;
          data.discountEndsAt = null;
        } else if (type === "discount") {
          // Only the amount changes here — a row with no discount at all has nothing to attach a
          // bare value to. One that already has a window (or a windowless «فروش ویژه») keeps it
          // exactly as it was, since this branch never touches the date fields either way.
          if (!row.hasDiscount) { skipped += 1; continue; }
          data.discountType = unit;
          data.discountValue = amount;
        } else {
          data.discountType = unit;
          data.discountValue = amount;
          data.discountStartsAt = windowStart;
          data.discountEndsAt = windowEnd;
        }
        if (row.kind === "product") productUpdates.push({ id: row.id, data });
        else variantUpdates.push({ id: row.id, data });
      }
    }

    if (!productUpdates.length && !variantUpdates.length) {
      return NextResponse.json({ message: "هیچ‌کدام از موارد انتخاب‌شده شرایط این تغییر را ندارند." }, { status: 409 });
    }

    await db.$transaction(async (tx) => {
      for (const update of productUpdates) await tx.product.update({ where: { id: update.id }, data: update.data });
      for (const update of variantUpdates) await tx.productVariant.update({ where: { id: update.id }, data: update.data });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "PRODUCT_BULK_EDIT", entityType: "Product", ...auditRequestContext(request, {
        type, method, unit, value, startsAt, endsAt,
        requestedIds: uniqueIds,
        updated: productUpdates.length + variantUpdates.length,
        skipped,
      }) } });
    });

    return NextResponse.json({ updated: productUpdates.length + variantUpdates.length, skipped });
  } catch (error) { return apiError(error); }
}
