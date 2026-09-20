import { NextResponse } from "next/server";
import { z } from "zod";
import { ProductStatus } from "@generated/prisma/enums";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { auditRequestContext } from "@/modules/audit/request-context";
import { tehranDateEnd, tehranDateStart } from "@/modules/products/discount";
import { syncProductMirror } from "@/modules/products/variant-write";
import { revalidateSitemap } from "@/modules/seo/revalidate";

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ واردشده معتبر نیست.");
const dateTimeSchema = z.string().datetime({ offset: true }).or(z.string().datetime());
const boundarySchema = z.union([dateOnlySchema, dateTimeSchema], "تاریخ و ساعت واردشده معتبر نیست.");

const bodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "دست‌کم یک محصول را انتخاب کنید.").max(50, "حداکثر ۵۰ محصول در هر ویرایش گروهی قابل انتخاب است."),
  type: z.enum(["price", "stock", "discount", "scheduledDiscount", "removeDiscount", "status", "category"], "نوع تغییر را انتخاب کنید."),
  method: z.enum(["set", "increase", "decrease"]).optional(),
  unit: z.enum(["PERCENT", "FIXED"]).optional(),
  // Every type but removeDiscount, status and category needs an amount — none of those ever
  // reads one, so they are the only types allowed to leave this out.
  value: z.coerce.number("مقدار را وارد کنید.").min(0, "مقدار نمی‌تواند منفی باشد.").max(999999999999999999, "مقدار واردشده بیش از حد مجاز است.").optional(),
  startsAt: boundarySchema.nullable().optional(),
  endsAt: boundarySchema.nullable().optional(),
  status: z.enum(Object.values(ProductStatus) as [ProductStatus, ...ProductStatus[]]).optional(),
  // `null` clears the category; a non-empty id assigns one. Distinct from `undefined` (not sent
  // at all), which only ever happens for a `type` other than "category".
  categoryId: z.string().min(1).nullable().optional(),
}).superRefine((data, context) => {
  if (data.type !== "removeDiscount" && data.type !== "status" && data.type !== "category" && data.value === undefined) {
    context.addIssue({ code: "custom", path: ["value"], message: "مقدار را وارد کنید." });
  }
  // Zero is meaningful only as "set the stock to 0"; anywhere else an amount has to be above zero.
  if (data.value === 0 && !(data.type === "stock" && data.method === "set")) {
    context.addIssue({ code: "custom", path: ["value"], message: "مقدار باید بیشتر از صفر باشد." });
  }
  if (data.type === "status" && !data.status) {
    context.addIssue({ code: "custom", path: ["status"], message: "وضعیت محصول را انتخاب کنید." });
  }
  if (data.type === "category" && data.categoryId === undefined) {
    context.addIssue({ code: "custom", path: ["categoryId"], message: "دسته‌بندی را انتخاب کنید." });
  }
});

type Row = {
  /** The variant the change lands on. */
  id: string;
  productId: string;
  storeIndustry: "GOLD" | "GENERAL";
  price: number | null;
  stock: number;
  hasDiscount: boolean;
};

/**
 * A bulk change lands on the variants: what is sold is always a variant — a product without
 * options has a single default one — so price, stock and discounts are changed there, and the
 * product's own mirror columns are rewritten from them afterwards.
 */
function rowsFor(product: Awaited<ReturnType<typeof loadProducts>>[number]): Row[] {
  return product.variants.map((variant) => ({
    id: variant.id,
    productId: product.id,
    storeIndustry: product.storeIndustry,
    price: variant.price !== null ? Number(variant.price) : null,
    stock: variant.stock,
    hasDiscount: variant.discountType !== null,
  }));
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
    const { ids, type, method, unit, value, startsAt, endsAt, status, categoryId } = parsed.data;
    const uniqueIds = [...new Set(ids)];
    // Guaranteed defined here for every type but removeDiscount, status and category, none of
    // which read it — the schema's own superRefine already rejected a missing value for the
    // others.
    const amount = value ?? 0;

    if ((type === "price" || type === "stock") && !method) return NextResponse.json({ message: "روش تغییر را انتخاب کنید." }, { status: 422 });
    if ((type === "discount" || type === "scheduledDiscount") && !unit) return NextResponse.json({ message: "واحد تخفیف را انتخاب کنید." }, { status: 422 });
    if (unit === "PERCENT" && amount > 100) return NextResponse.json({ message: "درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد." }, { status: 422 });
    if (type === "status" && !status) return NextResponse.json({ message: "وضعیت محصول را انتخاب کنید." }, { status: 422 });
    if (type === "category" && categoryId) {
      const categoryExists = await db.category.findUnique({ where: { id: categoryId }, select: { id: true } });
      if (!categoryExists) return NextResponse.json({ message: "دسته‌بندی انتخاب‌شده پیدا نشد." }, { status: 404 });
    }

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
    const variantUpdates: { id: string; productId: string; data: Record<string, unknown> }[] = [];
    let skipped = 0;

    // Status and category live only on the product, never a variant, so these bypass `rowsFor`
    // entirely — a product still gets exactly one update, unlike every other type here.
    if (type === "status") {
      for (const product of products) productUpdates.push({ id: product.id, data: { status } });
    } else if (type === "category") {
      for (const product of products) productUpdates.push({ id: product.id, data: { categoryId: categoryId ?? null } });
    } else for (const product of products) {
      for (const row of rowsFor(product)) {
        const data: Record<string, unknown> = {};
        if (type === "price") {
          // Gold-industry rows price themselves from weight and the day's rate, not a stored
          // number, so a direct price change has nothing to act on there.
          if (row.storeIndustry === "GOLD" || row.price === null) { skipped += 1; continue; }
          const next = method === "set" ? amount : method === "increase" ? row.price + amount : Math.max(1, row.price - amount);
          data.price = Math.round(next);
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
        variantUpdates.push({ id: row.id, productId: row.productId, data });
      }
    }

    if (!productUpdates.length && !variantUpdates.length) {
      return NextResponse.json({ message: "هیچ‌کدام از موارد انتخاب‌شده شرایط این تغییر را ندارند." }, { status: 409 });
    }

    await db.$transaction(async (tx) => {
      for (const update of productUpdates) await tx.product.update({ where: { id: update.id }, data: update.data });
      for (const update of variantUpdates) await tx.productVariant.update({ where: { id: update.id }, data: update.data });
      // The product's mirror (total stock, display price and discount) follows its variants.
      for (const productId of new Set(variantUpdates.map((update) => update.productId))) await syncProductMirror(tx, productId);
      await tx.auditLog.create({ data: { actorId: actor.id, action: "PRODUCT_BULK_EDIT", entityType: "Product", ...auditRequestContext(request, {
        type, method, unit, value, startsAt, endsAt, status, categoryId,
        requestedIds: uniqueIds,
        updated: productUpdates.length + variantUpdates.length,
        skipped,
      }) } });
    });

    revalidateSitemap();
    return NextResponse.json({ updated: productUpdates.length + variantUpdates.length, skipped });
  } catch (error) { return apiError(error); }
}
