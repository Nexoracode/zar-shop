"use client";

import { toast } from "@heroui/react";
import { ContentFormDialog, ContentSaveError } from "@/components/content-form-dialog";
import { productListConfigSchema, productListLayoutMeta, productListLayouts, productListSourceLabels, productListSources, type ProductListConfig } from "@/modules/page-builder/product-lists";
import type { ContentField } from "@/modules/page-builder/section-settings";
import { pageSectionLimits } from "@/modules/settings/settings-limits";

export type CategoryOption = { id: string; name: string };

/**
 * The edit form of a product list: its title, look, where its products come from (and which category, for that
 * source) and how many it shows. `listId` is the section id of the list being edited (a built-in one or one that was
 * added); `onSaved` gets the configuration that was saved.
 */
export function ProductListDialog({ listId, initial, categoryOptions, local = false, onSaved, onClose }: { listId: string; initial: ProductListConfig; categoryOptions: CategoryOption[]; /** The list only exists in the page builder's draft: confirming just hands the configuration back, nothing is sent. */ local?: boolean; onSaved: (config: ProductListConfig) => void; onClose: () => void }) {
  const fields: ContentField[] = [
    { name: "title", kind: "text", label: "عنوان بخش", maxLength: pageSectionLimits.title },
    { name: "description", kind: "richtext", label: "توضیحات بخش", maxLength: pageSectionLimits.description, hint: "اختیاری؛ اگر بنویسید، زیر عنوان نمایش داده می‌شود." },
    { name: "layout", kind: "select", label: "ظاهر لیست", options: productListLayouts.map((layout) => ({ value: layout, label: productListLayoutMeta[layout].label })) },
    { name: "source", kind: "select", label: "منبع محصولات", options: productListSources.map((source) => ({ value: source, label: productListSourceLabels[source] })) },
    { name: "categoryId", kind: "select", label: "دسته‌بندی", placeholder: "انتخاب دسته‌بندی", searchable: true, options: categoryOptions.map((category) => ({ value: category.id, label: category.name })), visibleWhen: (values) => values.source === "CATEGORY" },
    { name: "limit", kind: "number", label: "تعداد نمایش", max: pageSectionLimits.productListMax, hint: `حداکثر ${pageSectionLimits.productListMax.toLocaleString("fa-IR")} محصول` },
  ];

  async function save(config: unknown) {
    if (local) return;
    const response = await fetch("/api/admin/settings/product-lists", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: listId, config }) });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new ContentSaveError(result?.message ?? "ذخیره لیست محصولات انجام نشد.", result?.issues);
    toast.success("لیست محصولات ذخیره شد");
  }

  return (
    <ContentFormDialog
      title="ویرایش لیست محصولات"
      ariaLabel="ویرایش لیست محصولات"
      idPrefix={`builder-list-${listId.replace(/[^A-Za-z0-9-]/g, "")}`}
      fields={fields}
      initial={{ title: initial.title, description: initial.description, layout: initial.layout, source: initial.source, categoryId: initial.categoryId ?? "", limit: String(initial.limit) }}
      schema={productListConfigSchema}
      toInput={(values) => ({ layout: values.layout, title: values.title, description: values.description, source: values.source, categoryId: values.source === "CATEGORY" && values.categoryId ? values.categoryId : null, limit: values.limit === "" ? Number.NaN : Number(values.limit) })}
      save={save}
      onSaved={(config) => onSaved(config as ProductListConfig)}
      onClose={onClose}
    />
  );
}
