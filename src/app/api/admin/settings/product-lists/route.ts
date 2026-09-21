import { NextResponse } from "next/server";
import type { Prisma } from "@generated/prisma/client";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { auditRequestContext } from "@/modules/audit/request-context";
import { getPermittedActor } from "@/modules/auth/session";
import { sanitizeSectionDescription } from "@/modules/page-builder/rich-text-sanitize";
import { parseStoredDisplay } from "@/modules/page-builder/display-parts";
import { addDraftSectionId, readDraftSectionIds } from "@/modules/page-builder/draft-sections";
import { isBuiltInProductListId, isProductListId, newProductListId, productListConfigSchema, pruneDisplayForList, resolveProductLists, type ProductListConfig } from "@/modules/page-builder/product-lists";
import { getStoreIndustry, STORE_SETTING_ID } from "@/modules/settings/store-settings";

// The product lists of the homepage (see modules/page-builder/product-lists.ts): POST adds one (as a draft, see
// modules/page-builder/draft-sections.ts), PATCH edits one. A list is stored in `StoreSetting.pageSectionSettings.PRODUCT_LISTS` under its section id; the other sections' stored
// settings are kept as they are.

// The description is HTML from the browser: only what the editor can produce is kept.
function clean(config: ProductListConfig): ProductListConfig {
  return { ...config, description: sanitizeSectionDescription(config.description) };
}

// The banner's picture must be an image of the homepage library; its address and alt text are taken from there.
async function withBanner(config: ProductListConfig): Promise<{ config: ProductListConfig } | { problem: NextResponse }> {
  if (!config.banner) return { config: { ...config, banner: null } };
  const media = await db.mediaAsset.findFirst({ where: { id: config.banner.mediaId, scope: "HOMEPAGE", type: "IMAGE" }, select: { id: true, url: true, alt: true, title: true } });
  if (!media) return { problem: NextResponse.json({ message: "تصویر انتخاب‌شده برای بنر معتبر نیست.", issues: { banner: ["تصویر انتخاب‌شده برای بنر معتبر نیست."] } }, { status: 422 }) };
  return { config: { ...config, banner: { ...config.banner, mediaId: media.id, url: media.url, alt: media.alt ?? media.title ?? null } } };
}

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
    const updated = { ...stored, PRODUCT_LISTS: { ...lists, [id]: config } };
    // A new list is a draft until a layout that contains it is saved; the visitors don't see it before that.
    const next = action === "PRODUCT_LIST_CREATE" ? (addDraftSectionId(updated, id) as Prisma.InputJsonObject) : updated;
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
    const body = await request.json();
    const prepared = await withBanner(clean(productListConfigSchema.parse(body)));
    if ("problem" in prepared) return prepared.problem;
    const config = prepared.config;
    const problem = await categoryProblem(config);
    if (problem) return problem;
    // The page builder creates a list under the id it already gave it in its draft; saving again after a failed
    // attempt finds the draft it made and overwrites it.
    const requestedId = typeof body?.id === "string" ? body.id : null;
    if (requestedId) {
      const current = await db.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select: { pageSectionSettings: true } });
      if (!isProductListId(requestedId)) return NextResponse.json({ message: "شناسه لیست محصولات معتبر نیست." }, { status: 422 });
      if (requestedId in resolveProductLists(current?.pageSectionSettings, await getStoreIndustry()) && !readDraftSectionIds(current?.pageSectionSettings).includes(requestedId)) {
        return NextResponse.json({ message: "این لیست محصولات قبلاً ثبت شده است." }, { status: 409 });
      }
    }
    const id = requestedId ?? newProductListId(crypto.randomUUID());
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
    const { id, config: submitted } = z.object({ id: z.string().min(1).max(100), config: productListConfigSchema }).parse(await request.json());
    const prepared = await withBanner(clean(submitted));
    if ("problem" in prepared) return prepared.problem;
    const config = prepared.config;
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
