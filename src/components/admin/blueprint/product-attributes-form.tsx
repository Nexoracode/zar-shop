"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { ListChecks, SlidersHorizontal } from "lucide-react";
import { AdminPageHeader } from "@/components/admin-ui";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import type { CategoryAttributeGroup, ProductAttributeValue } from "@/modules/products/attributes";
import { BlueprintProductAttributes } from "./product-attributes-panel";
import { BpButton, BpLinkButton } from "./ui";

type EditorProps = {
  productId: string;
  productName: string;
  productSku: string;
  categoryId: string | null;
  categoryName: string | null;
  initialGroups: CategoryAttributeGroup[];
  initialAttributes: ProductAttributeValue[];
};

function Panel({ children }: { children: React.ReactNode }) {
  return <section className="bp-frame relative p-[18px]">{children}</section>;
}

function Notice({ title, description, href, cta }: { title: string; description: string; href: string; cta: string }) {
  return (
    <Panel>
      <div className="grid justify-items-center gap-3 py-6 text-center">
        <ListChecks size={30} className="text-[var(--bp-muted)]" aria-hidden />
        <strong className="text-sm">{title}</strong>
        <p className="bp-muted m-0 max-w-sm text-[12px] leading-6">{description}</p>
        <BpLinkButton href={href} variant="primary" size="sm" className="mt-1">{cta}</BpLinkButton>
      </div>
    </Panel>
  );
}

/** Page wrapper for the standalone route `/admin/products/[id]/attributes`. */
export function BlueprintProductAttributesForm(props: EditorProps) {
  return (
    <>
      <AdminPageHeader
        flush
        title={`ویژگی‌های «${props.productName}»`}
        description="مقادیر توصیفی این محصول را بر اساس ساختار ویژگی‌های دسته‌بندی تکمیل کنید."
        backHref="/admin/product-attributes"
        backLabel="بازگشت به ویژگی‌های محصولات"
      />
      <div className="mt-2">
        <ProductAttributeValuesEditor {...props} />
      </div>
    </>
  );
}

/** The editor body, usable both on its own route and embedded in the picker page. */
export function ProductAttributeValuesEditor({ productId, productName, productSku, categoryId, categoryName, initialGroups, initialAttributes }: EditorProps) {
  const router = useRouter();
  const [groups, setGroups] = useState(initialGroups);
  const [values, setValues] = useState(initialAttributes);
  const [groupsSnapshot, setGroupsSnapshot] = useState(() => JSON.stringify(initialGroups));
  const [valuesSnapshot, setValuesSnapshot] = useState(() => JSON.stringify(initialAttributes));
  const [saving, setSaving] = useState(false);

  const groupsChanged = JSON.stringify(groups) !== groupsSnapshot;
  const dirty = groupsChanged || JSON.stringify(values) !== valuesSnapshot;

  async function save() {
    if (saving || !categoryId) return;
    setSaving(true);
    try {
      if (groupsChanged) {
        const cleaned = groups
          .map((group) => ({ ...group, attributes: group.attributes.filter((attribute) => attribute.name.trim()) }))
          .filter((group) => group.name.trim() && group.attributes.length);
        const groupResult = await requestJson<{ groups: CategoryAttributeGroup[] }>(`/api/categories/${categoryId}/attributes`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleaned),
        }, { fallbackMessage: "ذخیره ساختار ویژگی‌های دسته انجام نشد." });
        setGroups(groupResult.groups);
        setGroupsSnapshot(JSON.stringify(groupResult.groups));
      }
      const result = await requestJson<{ attributes?: ProductAttributeValue[] }>(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attributes: values }),
      }, { fallbackMessage: "ذخیره ویژگی‌های محصول انجام نشد." });
      const nextValues = Array.isArray(result.attributes) ? result.attributes : values;
      setValues(nextValues);
      setValuesSnapshot(JSON.stringify(nextValues));
      toast.success("ویژگی‌های محصول ذخیره شد", { description: "مقادیر جدید در صفحهٔ محصول قابل نمایش هستند." });
      router.refresh();
    } catch (reason) {
      toast.danger("ذخیره ویژگی‌ها انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setSaving(false);
    }
  }

  if (!categoryId) {
    return (
      <Notice
        title="این محصول دسته‌بندی ندارد"
        description="ویژگی‌های توصیفی از ساختار دستهٔ محصول خوانده می‌شوند. ابتدا از فرم محصول یک دسته‌بندی انتخاب و ذخیره کنید."
        href={`/admin/products/${productId}/edit`}
        cta="ویرایش محصول"
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <section className="bp-frame relative grid gap-3 p-[18px]">
        <div className="flex items-center gap-2 border-b border-[var(--bp-divider)] pb-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center border border-[var(--bp-divider)] text-[var(--bp-muted)]"><SlidersHorizontal size={15} /></span>
          <div className="min-w-0">
            <strong className="block truncate text-[13px]">ویژگی‌های «{productName}»</strong>
            <span className="bp-muted block truncate text-[11px]"><span dir="ltr" className="font-mono">{productSku}</span> · از دستهٔ «{categoryName ?? "بدون دسته‌بندی"}»</span>
          </div>
        </div>
        <BlueprintProductAttributes
          categoryName={categoryName ?? "بدون دسته‌بندی"}
          groups={groups}
          values={values}
          onGroupsChange={setGroups}
          onValuesChange={setValues}
        />
      </section>

      <div className="bp-frame flex items-center justify-between gap-3 p-4">
        <span className="bp-muted text-[12px]">{dirty ? "تغییرات ذخیره‌نشده دارید." : "همهٔ تغییرات ذخیره شده است."}</span>
        <BpButton type="button" variant="primary" isPending={saving} disabled={!dirty} onClick={() => void save()}>ذخیره ویژگی‌ها</BpButton>
      </div>
    </div>
  );
}
