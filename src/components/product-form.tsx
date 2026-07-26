"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronRight, Images, Info, PackageCheck, Save, Sparkles, Tag, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import type { MediaChoice } from "@/components/media-library";
import { adminFieldClass, adminLabelClass } from "@/components/admin-ui";

type EditableProduct = {
  id: string; sku: string; name: string; slug: string; description: string; categoryId: string; purity: number; weightGrams: number;
  makingFeeType: string; makingFeeValue: number; profitPercent: number; taxPercent: number; stock: number;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED"; featured: boolean; media: MediaChoice[];
};

type Props = { categories?: Array<{ id: string; name: string; parentName: string | null }>; product?: EditableProduct };

export function ProductForm({ categories = [], product }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaChoice[]>(product?.media ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);

  function moveMedia(index: number, offset: number) {
    setSelectedMedia((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const body = {
      sku: form.get("sku"), name: form.get("name"), slug: form.get("slug"), description: form.get("description"), categoryId: form.get("categoryId") || null,
      purity: Number(form.get("purity")), weightGrams: Number(form.get("weightGrams")), makingFeeType: form.get("makingFeeType"), makingFeeValue: Number(form.get("makingFeeValue")),
      profitPercent: Number(form.get("profitPercent")), taxPercent: Number(form.get("taxPercent")), stock: Number(form.get("stock")), status: form.get("status"),
      featured: form.get("featured") === "on", mediaIds: selectedMedia.map((media) => media.id),
    };
    try {
      const response = await fetch(product ? `/api/products/${product.id}` : "/api/products", { method: product ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره محصول ناموفق بود.");
      router.push("/admin/products");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ارتباط با سرور برقرار نشد.");
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-5">
          <FormSection icon={<Images size={18} />} title="گالری محصول" description="اولین رسانه به‌عنوان تصویر اصلی محصول نمایش داده می‌شود.">
            {selectedMedia.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{selectedMedia.map((media, index) => <article key={media.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"><div className="relative aspect-square">{media.type === "IMAGE" ? <Image src={media.url} alt={media.title} fill sizes="180px" className="object-cover" /> : <video src={media.url} muted className="h-full w-full bg-black object-cover" />}<span className={`absolute right-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-bold text-white ${index === 0 ? "bg-[#b5904c]" : "bg-slate-900/70"}`}>{index === 0 ? "تصویر اصلی" : `ردیف ${(index + 1).toLocaleString("fa-IR")}`}</span></div><div className="flex items-center justify-between gap-1 p-2"><button type="button" disabled={index === 0} onClick={() => moveMedia(index, -1)} aria-label="انتقال به قبل" className="grid h-8 w-8 place-items-center rounded-lg bg-white text-slate-500 disabled:opacity-30"><ArrowUp size={14} /></button><button type="button" onClick={() => setSelectedMedia((current) => current.filter((item) => item.id !== media.id))} className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-white text-[11px] font-bold text-rose-600"><X size={13} />حذف</button><button type="button" disabled={index === selectedMedia.length - 1} onClick={() => moveMedia(index, 1)} aria-label="انتقال به بعد" className="grid h-8 w-8 place-items-center rounded-lg bg-white text-slate-500 disabled:opacity-30"><ArrowDown size={14} /></button></div></article>)}</div> : <button type="button" onClick={() => setPickerOpen(true)} className="grid min-h-32 w-full place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 text-center text-sm font-bold text-slate-600 hover:border-[#b5904c] hover:text-[#785b27]"><span><Images className="mx-auto mb-2" size={24} />هنوز رسانه‌ای انتخاب نشده است.</span></button>}
            <button type="button" onClick={() => setPickerOpen(true)} className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d8c29a] bg-[#fbf7ef] px-5 text-sm font-bold text-[#846325]"><Images size={17} />انتخاب از گالری</button>
          </FormSection>

          <FormSection icon={<Info size={18} />} title="اطلاعات پایه" description="مشخصات اصلی که در صفحه محصول نمایش داده می‌شود.">
            <div className="grid gap-4 sm:grid-cols-2"><Field label="نام محصول"><input name="name" required defaultValue={product?.name} className={adminFieldClass} /></Field><Field label="کد کالا"><input name="sku" dir="ltr" required defaultValue={product?.sku} className={`${adminFieldClass} text-left`} /></Field></div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="نشانی انگلیسی"><input name="slug" dir="ltr" pattern="[a-z0-9-]+" required defaultValue={product?.slug} placeholder="minimal-gold-ring" className={`${adminFieldClass} text-left`} /></Field><Field label="دسته‌بندی"><select name="categoryId" defaultValue={product?.categoryId ?? ""} className={adminFieldClass}><option value="">بدون دسته‌بندی</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.parentName ? `${category.parentName} ← ` : ""}{category.name}</option>)}</select></Field></div>
            <label className={`${adminLabelClass} mt-4`}>توضیحات محصول<textarea name="description" rows={6} defaultValue={product?.description} className={adminFieldClass} /></label>
          </FormSection>

          <FormSection icon={<Tag size={18} />} title="مشخصات و قیمت‌گذاری" description="اعداد این بخش در محاسبه قیمت نهایی طلا استفاده می‌شوند.">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><Field label="وزن (گرم)"><input name="weightGrams" type="number" step="0.001" min="0.001" required defaultValue={product?.weightGrams} className={adminFieldClass} /></Field><Field label="عیار"><input name="purity" type="number" min="1" max="999" defaultValue={product?.purity ?? 750} required className={adminFieldClass} /></Field><Field label="نوع اجرت"><select name="makingFeeType" defaultValue={product?.makingFeeType ?? "PERCENT"} className={adminFieldClass}><option value="PERCENT">درصدی</option><option value="FIXED">مبلغ ثابت</option></select></Field><Field label="مقدار اجرت"><input name="makingFeeValue" type="number" step="0.001" defaultValue={product?.makingFeeValue ?? 10} min="0" required className={adminFieldClass} /></Field><Field label="درصد سود"><input name="profitPercent" type="number" step="0.01" defaultValue={product?.profitPercent ?? 7} min="0" required className={adminFieldClass} /></Field><Field label="درصد مالیات"><input name="taxPercent" type="number" step="0.01" defaultValue={product?.taxPercent ?? 10} min="0" required className={adminFieldClass} /></Field></div>
          </FormSection>
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-7">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.035)]"><div className="mb-4 flex items-center gap-2"><PackageCheck size={18} className="text-[#9a7434]" /><h2 className="m-0 text-base font-black">انتشار و موجودی</h2></div><div className="grid gap-4"><Field label="وضعیت محصول"><select name="status" defaultValue={product?.status ?? "DRAFT"} className={adminFieldClass}><option value="DRAFT">پیش‌نویس</option><option value="ACTIVE">منتشرشده</option><option value="ARCHIVED">بایگانی‌شده</option></select></Field><Field label="موجودی انبار"><input name="stock" type="number" defaultValue={product?.stock ?? 1} min="0" required className={adminFieldClass} /></Field><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3.5 text-sm font-bold text-slate-600"><input name="featured" type="checkbox" defaultChecked={product?.featured} className="h-4 w-4 accent-[#b5904c]" /><Sparkles size={17} className="text-[#b5904c]" />نمایش در محصولات ویژه</label></div></section>
          <section className="rounded-2xl border border-[#ead8b7] bg-[#fbf7ef] p-4 text-xs leading-6 text-[#785b27]"><strong className="mb-1 block">نکته انتشار</strong>برای انتشار بهتر، حداقل یک تصویر واضح، دسته‌بندی صحیح، وزن و موجودی محصول را تکمیل کنید.</section>
          {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
          <div className="grid gap-2"><button disabled={loading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#172b4d] px-5 text-sm font-bold text-white shadow-lg disabled:cursor-wait disabled:opacity-60"><Save size={17} />{loading ? "در حال ذخیره..." : product ? "ذخیره تغییرات" : "ثبت محصول"}</button><Link href="/admin/products" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600"><ChevronRight size={16} />بازگشت به محصولات</Link></div>
        </aside>
      </form>
      <MediaPickerDialog open={pickerOpen} scope="PRODUCT" multiple selected={selectedMedia} onClose={() => setPickerOpen(false)} onConfirm={setSelectedMedia} />
    </>
  );
}

function FormSection({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.035)] sm:p-6"><div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fbf7ef] text-[#9a7434]">{icon}</span><div><h2 className="m-0 text-base font-black text-slate-800">{title}</h2><p className="m-0 text-xs text-slate-400">{description}</p></div></div>{children}</section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className={adminLabelClass}>{label}{children}</label>;
}
