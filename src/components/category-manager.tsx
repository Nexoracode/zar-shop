"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import type { MediaChoice } from "@/components/media-library";

type CategoryItem = {
  id: string; name: string; slug: string; description: string | null; parentId: string | null; parentName: string | null;
  imageId: string | null; imageUrl: string | null; isActive: boolean; featured: boolean; sortOrder: number; productsCount: number; childrenCount: number;
};
type FormState = { name: string; slug: string; description: string; parentId: string; sortOrder: string; isActive: boolean; featured: boolean };

const emptyForm: FormState = { name: "", slug: "", description: "", parentId: "", sortOrder: "0", isActive: true, featured: false };
const fieldClass = "w-full rounded-sm border border-[#e7e6e2] bg-white px-3 py-2.5 outline-none focus:border-[#b5904c] focus:ring-2 focus:ring-[#b5904c]/10";
const labelClass = "grid gap-1.5 text-xs font-bold text-[#4b5160]";

export function CategoryManager({ initialCategories }: { initialCategories: CategoryItem[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [selectedImage, setSelectedImage] = useState<MediaChoice[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function edit(category: CategoryItem) {
    setEditingId(category.id);
    setForm({ name: category.name, slug: category.slug, description: category.description ?? "", parentId: category.parentId ?? "", sortOrder: String(category.sortOrder), isActive: category.isActive, featured: category.featured });
    setSelectedImage(category.imageId && category.imageUrl ? [{ id: category.imageId, title: category.name, url: category.imageUrl, type: "IMAGE" }] : []);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() { setEditingId(null); setForm(emptyForm); setSelectedImage([]); setMessage(""); }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setMessage("");
    const response = await fetch(editingId ? `/api/categories/${editingId}` : "/api/categories", {
      method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, parentId: form.parentId || null, imageId: selectedImage[0]?.id ?? null, description: form.description || null, sortOrder: Number(form.sortOrder) }),
    });
    const result = response.status === 204 ? null : await response.json();
    setLoading(false);
    if (!response.ok) { setMessage(result?.message ?? "ذخیره دسته‌بندی ناموفق بود."); return; }
    reset(); router.refresh();
  }

  async function remove(category: CategoryItem) {
    if (!window.confirm(`دسته «${category.name}» حذف شود؟`)) return;
    setMessage("");
    const response = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
    if (!response.ok) { const result = await response.json(); setMessage(result.message ?? "حذف دسته‌بندی ناموفق بود."); return; }
    if (editingId === category.id) reset();
    router.refresh();
  }

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <form onSubmit={submit} className="self-start rounded-sm border border-[#e7e6e2] bg-white p-4 sm:p-5 xl:sticky xl:top-[172px]">
          <div className="mb-5 flex items-center justify-between"><h2 className="m-0 text-lg">{editingId ? "ویرایش دسته" : "دسته جدید"}</h2>{editingId && <button type="button" onClick={reset} className="text-xs text-[#785b27]">انصراف</button>}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>نام دسته<input required minLength={2} className={fieldClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className={labelClass}>نشانی انگلیسی<input required dir="ltr" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className={fieldClass} value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} /></label>
          </div>
          <label className={`${labelClass} mt-4`}>توضیحات<textarea rows={3} className={fieldClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>دسته والد<select className={fieldClass} value={form.parentId} onChange={(event) => setForm({ ...form, parentId: event.target.value })}><option value="">بدون والد (دسته اصلی)</option>{initialCategories.filter((category) => category.id !== editingId).map((category) => <option key={category.id} value={category.id}>{category.parentName ? `${category.parentName} ← ` : ""}{category.name}</option>)}</select></label>
            <label className={labelClass}>ترتیب نمایش<input type="number" className={fieldClass} value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} /></label>
          </div>

          <div className="mt-4 grid gap-2">
            <span className="text-xs font-bold text-[#4b5160]">تصویر شاخص</span>
            {selectedImage[0] ? <div className="relative aspect-[2/1] overflow-hidden bg-[#f5f5f3]"><Image src={selectedImage[0].url} alt={selectedImage[0].title} fill className="object-cover" /><button type="button" onClick={() => setSelectedImage([])} className="absolute left-2 top-2 bg-white/90 px-3 py-1.5 text-xs text-[#a33b32] shadow">حذف انتخاب</button></div> : <div className="border border-dashed border-[#d9d4cb] py-8 text-center text-xs text-[#747982]">تصویری انتخاب نشده است.</div>}
            <button type="button" onClick={() => setPickerOpen(true)} className="min-h-11 border border-[#b5904c] px-4 text-sm text-[#785b27]">انتخاب از گالری دسته‌بندی</button>
          </div>

          <div className="mt-4 flex flex-wrap gap-5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> فعال</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} /> نمایش در صفحه اصلی</label></div>
          {message && <div className="mt-4 bg-[#fff0ed] px-3 py-2 text-sm text-[#a33b32]">{message}</div>}
          <button disabled={loading} className="mt-5 min-h-11 w-full bg-[#1c3155] px-5 text-sm text-white disabled:opacity-60">{loading ? "در حال ذخیره..." : editingId ? "ذخیره تغییرات" : "ثبت دسته‌بندی"}</button>
        </form>

        <div className="overflow-hidden border border-[#e7e6e2] bg-white">
          {initialCategories.length ? initialCategories.map((category) => (
            <article key={category.id} className="flex flex-col gap-3 border-b border-[#e7e6e2] p-4 last:border-0 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3"><div className="relative h-14 w-14 shrink-0 overflow-hidden bg-[#f0ede7]">{category.imageUrl && <Image src={category.imageUrl} alt={category.name} fill className="object-cover" />}</div><div className="min-w-0"><strong className="block truncate">{category.name}</strong><span className="block text-xs text-[#747982]">{category.parentName ? `زیرمجموعه ${category.parentName}` : "دسته اصلی"} · {category.productsCount.toLocaleString("fa-IR")} محصول · {category.childrenCount.toLocaleString("fa-IR")} زیردسته</span><code className="text-[0.68rem] text-[#9a6e2d]">{category.slug}</code></div></div>
              <div className="flex flex-wrap items-center gap-2"><span className={`rounded-sm px-2 py-1 text-[0.68rem] ${category.isActive ? "bg-[#eaf7ee] text-[#28603a]" : "bg-[#f1f1ef] text-[#747982]"}`}>{category.isActive ? "فعال" : "غیرفعال"}</span>{category.featured && <span className="rounded-sm bg-[#efe5d1] px-2 py-1 text-[0.68rem] text-[#785b27]">صفحه اصلی</span>}<button type="button" onClick={() => edit(category)} className="px-2 py-1 text-xs text-[#1c3155]">ویرایش</button><button type="button" onClick={() => void remove(category)} className="px-2 py-1 text-xs text-[#a33b32]">حذف</button></div>
            </article>
          )) : <div className="py-14 text-center text-sm text-[#747982]">هنوز دسته‌ای ثبت نشده است.</div>}
        </div>
      </div>
      <MediaPickerDialog open={pickerOpen} scope="CATEGORY" selected={selectedImage} onClose={() => setPickerOpen(false)} onConfirm={setSelectedImage} />
    </>
  );
}
