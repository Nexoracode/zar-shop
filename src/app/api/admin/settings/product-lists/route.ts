import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { auditRequestContext } from "@/modules/audit/request-context";
import { getPermittedActor } from "@/modules/auth/session";
import { parseStoredDisplay } from "@/modules/page-builder/display-parts";
import { isBuiltInProductListId, isProductListId, newProductListId, productListConfigSchema, pruneDisplayForList, resolveProductLists, type ProductListConfig } from "@/modules/page-builder/product-lists";
import { getStoreIndustry, STORE_SETTING_ID } from "@/modules/settings/store-settings";

// The product lists of the homepage (see modules/page-builder/product-lists.ts): POST adds one, PATCH edits one. A list
// is stored in `StoreSetting.pageSectionSettings.PRODUCT_LISTS` under its section id; the other sections' stored
// settings are kept as they are.

async function categoryProblem(config: ProductListConfig) {
  if (config.source !== "CATEGORY" || !config.categoryId) return null;
  const category = await db.category.findFirst({ where: { id: config.categoryId, isActive: true }, select: { id: true } });
  return category ? null : NextResponse.json({ message: "دسته‌بندی انتخاب‌شده معتبر نیست.", issues: { categoryId: ["دسته‌بندی انتخاب‌شده معتبر نیست."] } }, { status: 422 });
}

async function storeList(id: string, config: ProductListConfig, actor: { id: string }, request: Request, action: "PRODUCT_LIST_CREATE" | "PRODUCT_LIST_UPDATE") {
  const industry = await getStoreIndustry();
  await db.$transaction(async (transaction) => {
    const current = await transaction.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select: { pageSectionSettings: true, pageDisplaySettings: true } });
    const stored = current?.pageSectionSettings && typeof current.pageSectionSettings === "object" && !Array.isArray(current.pageSectionSettings) ? current.pageSectionSettings : {};
    const lists = "PRODUCT_LISTS" in stored && stored.PRODUCT_LISTS && typeof stored.PRODUCT_LISTS === "object" && !Array.isArray(stored.PRODUCT_LISTS) ? stored.PRODUCT_LISTS : {};
    const next = { ...stored, PRODUCT_LISTS: { ...lists, [id]: config } };
    // A new layout may not have the parts an earlier one had switched off; drop those switches with it.
    const display = parseStoredDisplay(current?.pageDisplaySettings);
    const prunedDisplay = pruneDisplayForList(display, id, config, industry);
    await transaction.storeSetting.upsert({
      where: { id: STORE_SETTING_ID },
      create: { id: STORE_SETTING_ID, pageSectionSettings: next, pageDisplaySettings: prunedDisplay },
      update: { pageSectionSettings: next, pageDisplaySettings: prunedDisplay },
    });
    await transaction.auditLog.create({
      data: { actorId: actor.id, action, entityType: "StoreSetting", entityId: STORE_SETTING_ID, ...auditRequestContext(request, { sectionId: id, layout: config.layout, source: config.source }) },
    });
  });
  // { expire: 0 } because the admin sees the result on the page right away. The homepage settings are tagged too:
  // the layout's list of sections is derived from the stored product lists.
  revalidateTag("settings:page-sections", { expire: 0 });
  revalidateTag("settings:homepage", { expire: 0 });
  revalidateTag("settings:page-display", { expire: 0 });
}

export async function POST(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const config = productListConfigSchema.parse(await request.json());
    const problem = await categoryProblem(config);
    if (problem) return problem;
    const id = newProductListId(crypto.randomUUID());
    await storeList(id, config, actor, request, "PRODUCT_LIST_CREATE");
    return NextResponse.json({ id });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id, config } = z.object({ id: z.string().min(1).max(100), config: productListConfigSchema }).parse(await request.json());
    // Only a list that exists can be edited: one of this store's built-in ones or one that was added.
    const current = await db.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select: { pageSectionSettings: true } });
    const known = resolveProductLists(current?.pageSectionSettings, await getStoreIndustry());
    if (!(isBuiltInProductListId(id) || isProductListId(id)) || !known[id]) return NextResponse.json({ message: "این لیست محصولات وجود ندارد." }, { status: 404 });
    const problem = await categoryProblem(config);
    if (problem) return problem;
    await storeList(id, config, actor, request, "PRODUCT_LIST_UPDATE");
    return NextResponse.json({ id });
  } catch (error) {
    return apiError(error);
  }
}
