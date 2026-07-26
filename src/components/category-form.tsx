"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert, Button, Card, Checkbox, Input, TextArea } from "@heroui/react";
import { ChevronRight, FolderTree, ImageIcon, Save, Sparkles, X } from "lucide-react";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import type { MediaChoice } from "@/components/media-library";
import { HeroSelectField } from "@/components/hero-select-field";
import { adminFieldClass, adminLabelClass } from "@/components/admin-ui";

type CategoryOption = { id: string; name: string; parentName: string | null };
type EditableCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string;
  image: MediaChoice | null;
  sortOrder: number;
  isActive: boolean;
  featured: boolean;
};

export function CategoryForm({ categories, category }: { categories: CategoryOption[]; category?: EditableCategory }) {
  const router = useRouter();
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [parentId, setParentId] = useState(category?.parentId ?? "");
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [featured, setFeatured] = useState(category?.featured ?? false);
  const [selectedImage, setSelectedImage] = useState<MediaChoice[]>(category?.image ? [category.image] : []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(category ? `/api/categories/${category.id}` : "/api/categories", {
        method: category ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          description: description || null,
          parentId: parentId || null,
          imageId: selectedImage[0]?.id ?? null,
          sortOrder: Number(sortOrder),
          isActive,
          featured,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره دسته‌بندی ناموفق بود.");
      router.push("/admin/categories");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ارتباط با سرور برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid content-start gap-6">
        <Card variant="secondary" className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <Card.Content className="p-4 sm:p-6">
            <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fbf7ef] text-[#9a7434]"><FolderTree size={20} /></span>
              <div><h2 className="m-0 text-base font-black text-slate-800">اطلاعات دسته‌بندی</h2><p className="m-0 text-xs text-slate-400">نام، نشانی و ساختار سلسله‌مراتبی دسته را مشخص کنید.</p></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={adminLabelClass}>نام دسته<Input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} fullWidth variant="secondary" className={adminFieldClass} /></label>
              <label className={adminLabelClass}>نشانی انگلیسی<Input required dir="ltr" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={(event) => setSlug(event.target.value)} fullWidth variant="secondary" className={adminFieldClass} placeholder="women-rings" /></label>
            </div>
            <label className={`${adminLabelClass} mt-4`}>توضیحات<TextArea rows={5} value={description} onChange={(event) => setDescription(event.target.value)} fullWidth variant="secondary" className={adminFieldClass} /></label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <HeroSelectField name="parentId" label="دسته والد" value={parentId} onValueChange={setParentId} options={[{ value: "", label: "بدون والد (دسته اصلی)" }, ...categories.filter((item) => item.id !== category?.id).map((item) => ({ value: item.id, label: `${item.parentName ? `${item.parentName} ← ` : ""}${item.name}` }))]} />
              <label className={adminLabelClass}>ترتیب نمایش<Input type="number" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} fullWidth variant="secondary" className={adminFieldClass} /></label>
            </div>
          </Card.Content>
        </Card>

        <Card variant="secondary" className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <Card.Content className="p-4 sm:p-6">
            <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fbf7ef] text-[#9a7434]"><ImageIcon size={20} /></span>
              <div><h2 className="m-0 text-base font-black text-slate-800">تصویر شاخص</h2><p className="m-0 text-xs text-slate-400">این تصویر در صفحه اصلی و فهرست دسته‌ها نمایش داده می‌شود.</p></div>
            </div>
            {selectedImage[0] ? (
              <div className="relative aspect-[16/7] overflow-hidden rounded-2xl bg-slate-100">
                <Image src={selectedImage[0].url} alt={selectedImage[0].title} fill sizes="(max-width: 1024px) 100vw, 700px" className="object-cover" />
                <Button type="button" size="sm" variant="danger-soft" onPress={() => setSelectedImage([])} className="absolute left-3 top-3 gap-1 bg-white/95 font-bold shadow"><X size={14} />حذف انتخاب</Button>
              </div>
            ) : (
              <Button type="button" variant="secondary" onPress={() => setPickerOpen(true)} className="flex min-h-44 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500 transition hover:border-[#b5904c] hover:bg-[#fffcf7]">
                <span><ImageIcon className="mx-auto mb-3 text-[#b5904c]" size={30} />تصویر شاخصی انتخاب نشده است.<small className="mt-1 block font-normal text-slate-400">برای انتخاب، گالری دسته‌بندی را باز کنید.</small></span>
              </Button>
            )}
            <Button type="button" variant="secondary" onPress={() => setPickerOpen(true)} className="mt-3 min-h-11 w-full border border-[#d9c394] bg-[#fffaf0] text-sm font-bold text-[#785b27]">انتخاب از گالری</Button>
          </Card.Content>
        </Card>
      </div>

      <aside className="grid content-start gap-4 xl:sticky xl:top-6">
        <Card variant="secondary" className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <Card.Content className="p-5">
            <div className="mb-4 flex items-center gap-2"><Sparkles size={18} className="text-[#9a7434]" /><h2 className="m-0 text-base font-black text-slate-800">انتشار</h2></div>
            <div className="grid gap-3">
              <Checkbox isSelected={isActive} onChange={setIsActive} className="rounded-xl border border-slate-200 p-3.5 text-sm font-bold text-slate-600">دسته فعال باشد</Checkbox>
              <Checkbox isSelected={featured} onChange={setFeatured} className="rounded-xl border border-slate-200 p-3.5 text-sm font-bold text-slate-600">نمایش در صفحه اصلی</Checkbox>
            </div>
          </Card.Content>
        </Card>
        {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
        <Button type="submit" isDisabled={loading} variant="primary" fullWidth className="min-h-12 gap-2 bg-[#172b4d] text-sm font-bold text-white shadow-lg"><Save size={17} />{loading ? "در حال ذخیره..." : category ? "ذخیره تغییرات" : "ثبت دسته‌بندی"}</Button>
        <Link href="/admin/categories" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600"><ChevronRight size={16} />بازگشت به دسته‌بندی‌ها</Link>
      </aside>

      <MediaPickerDialog open={pickerOpen} scope="CATEGORY" selected={selectedImage} onClose={() => setPickerOpen(false)} onConfirm={setSelectedImage} />
    </form>
  );
}
