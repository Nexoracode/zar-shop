"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { ListChecks } from "lucide-react";
import { AdminPageHeader } from "@/components/admin-ui";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import type { CategoryAttributeGroup, ProductAttributeValue } from "@/modules/products/attributes";
import { BlueprintProductAttributes } from "./product-attributes-panel";
import { BpButton, BpLinkButton } from "./ui";

type Props = {
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

export function BlueprintProductAttributesForm({ productId, productName, productSku, categoryId, categoryName, initialGroups, initialAttributes }: Props) {
  const router = useRouter();
  const [groups, setGroups] = useState(initialGroups);
  const [values, setValues] = useState(initialAttributes);
  const [groupsSnapshot, setGroupsSnapshot] = useState(() => JSON.stringify(initialGroups));
  const [valuesSnapshot, setValuesSnapshot] = useState(() => JSON.stringify(initialAttributes));
  const [saving, setSaving] = useState(false);

  const definitions = groups.flatMap((group) => group.attributes);
  const completedIds = new Set(values.filter((item) => item.values.some((value) => value.trim())).map((item) => item.attributeId));
  const completedCount = definitions.filter((attribute) => completedIds.has(attribute.id)).length;
  const importantCount = definitions.filter((attribute) => attribute.important && completedIds.has(attribute.id)).length;
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

  return (
    <>
      <AdminPageHeader
        flush
        eyebrow={`محصول ${productSku}`}
        title={`ویژگی‌های «${productName}»`}
        description="مقادیر توصیفی این محصول را بر اساس ساختار ویژگی‌های دسته‌بندی تکمیل کنید."
        backHref="/admin/product-attributes"
        backLabel="بازگشت به ویژگی‌های محصولات"
      />

      {!categoryId ? (
        <div className="mt-2">
          <Notice
            title="این محصول دسته‌بندی ندارد"
            description="ویژگی‌های توصیفی از ساختار دستهٔ محصول خوانده می‌شوند. ابتدا از فرم محصول یک دسته‌بندی انتخاب و ذخیره کنید."
            href={`/admin/products/${productId}/edit`}
            cta="ویرایش محصول"
          />
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            {[{ label: "کل ویژگی‌ها", value: definitions.length }, { label: "تکمیل‌شده", value: completedCount }, { label: "مهم و تکمیل‌شده", value: importantCount }].map((item) => (
              <div key={item.label} className="bp-frame p-3">
                <strong className="block text-lg font-bold">{item.value.toLocaleString("fa-IR")}</strong>
                <span className="bp-muted mt-1 block text-[11px]">{item.label}</span>
              </div>
            ))}
          </div>

          <Panel>
            <BlueprintProductAttributes
              categoryName={categoryName ?? "بدون دسته‌بندی"}
              groups={groups}
              values={values}
              onGroupsChange={setGroups}
              onValuesChange={setValues}
            />
          </Panel>

          <div className="bp-frame flex items-center justify-between gap-3 p-4">
            <span className="bp-muted text-[12px]">
              {dirty ? "تغییرات ذخیره‌نشده دارید." : `${completedCount.toLocaleString("fa-IR")} ویژگی از ${definitions.length.toLocaleString("fa-IR")} ویژگی تکمیل شده است.`}
            </span>
            <BpButton type="button" variant="primary" isPending={saving} disabled={!dirty} onClick={() => void save()}>ذخیره ویژگی‌ها</BpButton>
          </div>
        </div>
      )}
    </>
  );
}
