"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { Images, Tag, Trash2 } from "lucide-react";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { brandFieldLimits, brandSchema } from "@/modules/brands/schemas";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import type { MediaChoice } from "@/components/media-library";
import { BpButton, BpInput, BpSwitch } from "./ui";

type FieldErrors = Record<string, string>;

export type EditableBrand = {
  id: string;
  name: string;
  slug: string;
  logo: MediaChoice | null;
  isActive: boolean;
  featured: boolean;
  sortOrder: number;
};

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="bp-frame min-w-0 p-[18px]">
      <strong className="block text-[15px] font-bold">{title}</strong>
      {description && <p className="bp-muted mb-0 mt-1 text-[12px] leading-6">{description}</p>}
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  );
}

export function BlueprintBrandForm({ brand }: { brand?: EditableBrand }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState(brand?.name ?? "");
  const [slug, setSlug] = useState(brand?.slug ?? "");
  const [logo, setLogo] = useState<MediaChoice | null>(brand?.logo ?? null);
  const [isActive, setIsActive] = useState(brand?.isActive ?? true);
  const [featured, setFeatured] = useState(brand?.featured ?? false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  function clearError(field: string) {
    setErrors((current) => (current[field] ? { ...current, [field]: undefined as unknown as string } : current));
  }

  async function submit() {
    const body = { name, slug, logoId: logo?.id ?? null, isActive, featured, sortOrder: brand?.sortOrder ?? 0 };
    const validation = brandSchema.safeParse(body);
    if (!validation.success) {
      const found: FieldErrors = {};
      for (const issue of validation.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (field && !found[field]) found[field] = issue.message;
      }
      setErrors(found);
      const first = Object.keys(found)[0];
      if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"], [data-field="${first}"]`)?.focus();
      return;
    }
    setLoading(true);
    try {
      await requestJson(brand ? `/api/brands/${brand.id}` : "/api/brands", {
        method: brand ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      }, { fallbackMessage: "ذخیره برند انجام نشد." });
      toast.success(brand ? "تغییرات برند ذخیره شد" : "برند جدید ثبت شد");
      router.push("/admin/brands");
      router.refresh();
    } catch (reason) {
      toast.danger("ذخیره برند انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form ref={formRef} noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }} className="grid gap-2">
        <Panel title="اطلاعات برند">
          <div className="grid gap-3 sm:grid-cols-2">
            <BpInput name="name" label="نام برند" required maxLength={brandFieldLimits.name} value={name} error={errors.name} placeholder="مثلاً سامسونگ" onChange={(event) => { setName(event.target.value); clearError("name"); }} />
            <BpInput name="slug" label="نشانی انگلیسی (Slug)" required dir="ltr" maxLength={brandFieldLimits.slug} value={slug} error={errors.slug} hint="فقط حروف کوچک انگلیسی، رقم و خط تیره" placeholder="samsung" onChange={(event) => { setSlug(event.target.value); clearError("slug"); }} />
          </div>

          <div>
            <span className="bp-muted mb-1.5 block text-[12px] font-bold">لوگوی برند</span>
            <div className="flex items-center gap-3">
              {logo
                ? <span className="relative h-14 w-14 shrink-0 overflow-hidden border border-[var(--bp-divider)] bg-white"><Image src={logo.url} alt={logo.title} fill sizes="56px" className="object-contain p-1.5" /></span>
                : <span className="grid h-14 w-14 shrink-0 place-items-center border border-[var(--bp-divider)] text-[var(--bp-muted)]"><Tag size={20} /></span>}
              <BpButton type="button" size="sm" className="gap-2" onClick={() => setPickerOpen(true)}><Images size={14} />{logo ? "تغییر لوگو" : "انتخاب از گالری"}</BpButton>
              {logo && <BpButton type="button" isIconOnly size="sm" variant="ghost" aria-label="حذف لوگو" className="text-[var(--bp-danger)]" onClick={() => setLogo(null)}><Trash2 size={14} /></BpButton>}
            </div>
          </div>

          <div className="grid gap-2 border-t border-[var(--bp-divider)] pt-3">
            <BpSwitch isSelected={isActive} onChange={setIsActive}>فعال</BpSwitch>
            <BpSwitch isSelected={featured} onChange={setFeatured}>نمایش در «محبوب‌ترین برندها»ی صفحه اصلی</BpSwitch>
          </div>
        </Panel>

        <div className="flex items-center gap-2">
          <BpButton type="submit" variant="primary" isPending={loading}>{brand ? "ذخیره تغییرات" : "ثبت برند"}</BpButton>
          <Link href="/admin/brands" className="bp-btn bp-btn-secondary">انصراف</Link>
        </div>
      </form>

      <MediaPickerDialog open={pickerOpen} scope="PRODUCT_BRAND" allowedTypes={["IMAGE"]} selected={logo ? [logo] : []} onClose={() => setPickerOpen(false)} onConfirm={(items) => setLogo(items[0] ?? null)} />
    </>
  );
}
