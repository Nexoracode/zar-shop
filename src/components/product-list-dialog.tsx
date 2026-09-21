"use client";

import { ContentFormDialog } from "@/components/content-form-dialog";
import type { MediaChoice } from "@/components/media-library";
import { productListConfigSchema, productListLayoutMeta, productListLayouts, productListSourceLabels, productListSources, type ProductListConfig } from "@/modules/page-builder/product-lists";
import type { ContentField } from "@/modules/page-builder/section-settings";
import { pageSectionLimits } from "@/modules/settings/settings-limits";

export type CategoryOption = { id: string; name: string };

/**
 * The edit form of a product list: its title, look, where its products come from (and which category, for that
 * source) and how many it shows. `listId` is the section id of the list being edited (a built-in one or one that was
 * added); `onSaved` gets the configuration that was entered — it goes into the page builder's draft, nothing is sent to
 * the server from here.
 */
export function ProductListDialog({ listId, initial, categoryOptions, onSaved, onClose }: { listId: string; initial: ProductListConfig; categoryOptions: CategoryOption[]; onSaved: (config: ProductListConfig) => void; onClose: () => void }) {
  const fields: ContentField[] = [
    { name: "title", kind: "text", label: "عنوان بخش", maxLength: pageSectionLimits.title },
    { name: "description", kind: "richtext", label: "توضیحات بخش", maxLength: pageSectionLimits.description },
    { name: "moreLabel", kind: "text", label: "متن دکمه‌ی نمایش بیشتر", maxLength: pageSectionLimits.moreLabel },
    { name: "layout", kind: "select", label: "ظاهر لیست", options: productListLayouts.map((layout) => ({ value: layout, label: productListLayoutMeta[layout].label })) },
    { name: "source", kind: "select", label: "منبع محصولات", options: productListSources.map((source) => ({ value: source, label: productListSourceLabels[source] })) },
    { name: "categoryId", kind: "select", label: "دسته‌بندی", placeholder: "انتخاب دسته‌بندی", searchable: true, options: categoryOptions.map((category) => ({ value: category.id, label: category.name })), visibleWhen: (values) => values.source === "CATEGORY" },
    { name: "banner", kind: "image", label: "تصویر بنر", hint: "اختیاری؛ بدون آن، اولین محصول به‌جای بنر نشان داده می‌شود.", visibleWhen: (values) => values.layout === "FEATURE_SLIDER" },
    { name: "bannerHref", kind: "text", label: "لینک بنر (اختیاری)", maxLength: 500, optional: true, visibleWhen: (values) => values.layout === "FEATURE_SLIDER" },
    { name: "limit", kind: "number", label: "تعداد نمایش", max: pageSectionLimits.productListMax, hint: `حداکثر ${pageSectionLimits.productListMax.toLocaleString("fa-IR")} محصول` },
  ];

  return (
    <ContentFormDialog
      title="ویرایش لیست محصولات"
      ariaLabel="ویرایش لیست محصولات"
      idPrefix={`builder-list-${listId.replace(/[^A-Za-z0-9-]/g, "")}`}
      fields={fields}
      initial={{ title: initial.title, description: initial.description, moreLabel: initial.moreLabel, bannerHref: initial.banner?.href ?? "", layout: initial.layout, source: initial.source, categoryId: initial.categoryId ?? "", limit: String(initial.limit) }}
      initialImages={{ banner: initial.banner ? ({ id: initial.banner.mediaId, title: initial.banner.alt ?? "بنر", alt: initial.banner.alt, url: initial.banner.url, type: "IMAGE" } satisfies MediaChoice) : null }}
      schema={productListConfigSchema}
      toInput={(values, images) => ({ layout: values.layout, title: values.title, description: values.description, moreLabel: values.moreLabel, banner: values.layout === "FEATURE_SLIDER" && images.banner ? { mediaId: images.banner.id, url: images.banner.url, alt: images.banner.alt ?? null, href: values.bannerHref.trim() } : null, source: values.source, categoryId: values.source === "CATEGORY" && values.categoryId ? values.categoryId : null, limit: values.limit === "" ? Number.NaN : Number(values.limit) })}
      save={async () => undefined}
      onSaved={(config) => onSaved(config as ProductListConfig)}
      onClose={onClose}
    />
  );
}
