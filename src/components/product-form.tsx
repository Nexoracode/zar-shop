"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import type { MediaChoice } from "@/components/media-library";

type EditableProduct = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  purity: number;
  weightGrams: number;
  makingFeeType: string;
  makingFeeValue: number;
  profitPercent: number;
  taxPercent: number;
  stock: number;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  featured: boolean;
  media: MediaChoice[];
};

export function ProductForm({ categories = [], product }: { categories?: Array<{ id: string; name: string; parentName: string | null }>; product?: EditableProduct }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaChoice[]>(product?.media ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const body = {
      sku: f.get("sku"), name: f.get("name"), slug: f.get("slug"), description: f.get("description"), categoryId: f.get("categoryId") || null,
      purity: Number(f.get("purity")), weightGrams: Number(f.get("weightGrams")),
      makingFeeType: f.get("makingFeeType"), makingFeeValue: Number(f.get("makingFeeValue")),
      profitPercent: Number(f.get("profitPercent")), taxPercent: Number(f.get("taxPercent")),
      stock: Number(f.get("stock")), status: f.get("status"), featured: f.get("featured") === "on",
      mediaIds: selectedMedia.map((media) => media.id),
    };
    const response = await fetch(product ? `/api/products/${product.id}` : "/api/products", { method: product ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => null);
    if (!response.ok) { setError(result?.message ?? "ذخیره محصول ناموفق بود."); setLoading(false); return; }
    router.push("/admin/products");
    router.refresh();
  }

  const fieldClass = "w-full border border-[#e7e6e2] rounded-sm bg-white px-[13px] py-3 outline-none focus:border-[#b5904c] focus:shadow-[0_0_0_3px_rgba(181,144,76,0.1)]";
  const labelClass = "text-[#4b5160] text-[0.84rem] font-bold";

  return (
    <>
    <form className="grid gap-4 rounded-[4px] border border-[#e7e6e2] bg-white p-4 sm:p-[22px]" onSubmit={submit}>
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3"><span className={labelClass}>رسانه‌های محصول</span><span className="text-xs text-[#747982]">اولین مورد، تصویر اصلی است</span></div>
        {selectedMedia.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{selectedMedia.map((media, index) => <div key={media.id} className="relative overflow-hidden border border-[#e7e6e2] bg-[#f5f3ee]"><div className="relative aspect-square">{media.type === "IMAGE" ? <Image src={media.url} alt={media.title} fill sizes="160px" className="object-cover" /> : <video src={media.url} muted className="h-full w-full bg-black object-cover" />}</div><span className="absolute right-2 top-2 rounded-full bg-[#1c3155] px-2 py-1 text-[0.65rem] text-white">{index === 0 ? "اصلی" : (index + 1).toLocaleString("fa-IR")}</span><button type="button" onClick={() => setSelectedMedia((current) => current.filter((item) => item.id !== media.id))} className="w-full bg-white px-2 py-2 text-xs text-[#a33b32]">حذف از انتخاب</button></div>)}</div> : <div className="border border-dashed border-[#d9d4cb] py-8 text-center text-xs text-[#747982]">تصویر یا ویدیویی انتخاب نشده است.</div>}
        <button type="button" onClick={() => setPickerOpen(true)} className="min-h-11 border border-[#b5904c] px-4 text-sm text-[#785b27]">انتخاب از گالری محصولات</button>
      </div>

      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
        <div className="grid gap-[7px]">
          <label htmlFor="productName" className={labelClass}>نام محصول</label>
          <input id="productName" name="name" required defaultValue={product?.name} className={fieldClass} />
        </div>
        <div className="grid gap-[7px]">
          <label htmlFor="productSku" className={labelClass}>کد کالا</label>
          <input id="productSku" name="sku" dir="ltr" required defaultValue={product?.sku} className={fieldClass} />
        </div>
      </div>

      <div className="grid gap-[7px]">
        <label htmlFor="productSlug" className={labelClass}>نشانی انگلیسی</label>
        <input id="productSlug" name="slug" dir="ltr" pattern="[a-z0-9-]+" required defaultValue={product?.slug} className={fieldClass} />
      </div>

      <div className="grid gap-[7px]">
        <label htmlFor="productDescription" className={labelClass}>توضیحات</label>
        <textarea id="productDescription" name="description" rows={4} defaultValue={product?.description} className={fieldClass} />
      </div>

      <div className="grid gap-[7px]">
        <label htmlFor="productCategory" className={labelClass}>دسته‌بندی</label>
        <select id="productCategory" name="categoryId" className={fieldClass} defaultValue={product?.categoryId ?? ""}>
          <option value="">بدون دسته‌بندی</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.parentName ? `${category.parentName} ← ` : ""}{category.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
        <div className="grid gap-[7px]">
          <label htmlFor="productWeight" className={labelClass}>وزن (گرم)</label>
          <input id="productWeight" name="weightGrams" type="number" step="0.001" min="0.001" required defaultValue={product?.weightGrams} className={fieldClass} />
        </div>
        <div className="grid gap-[7px]">
          <label htmlFor="productPurity" className={labelClass}>عیار</label>
          <input id="productPurity" name="purity" type="number" defaultValue={product?.purity ?? 750} required className={fieldClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
        <div className="grid gap-[7px]">
          <label htmlFor="makingFeeType" className={labelClass}>نوع اجرت</label>
          <select id="makingFeeType" name="makingFeeType" defaultValue={product?.makingFeeType ?? "PERCENT"} className={fieldClass}>
            <option value="PERCENT">درصدی</option>
            <option value="FIXED">مبلغ ثابت</option>
          </select>
        </div>
        <div className="grid gap-[7px]">
          <label htmlFor="makingFeeValue" className={labelClass}>مقدار اجرت</label>
          <input id="makingFeeValue" name="makingFeeValue" type="number" step="0.001" defaultValue={product?.makingFeeValue ?? 10} min="0" required className={fieldClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
        <div className="grid gap-[7px]">
          <label htmlFor="profitPercent" className={labelClass}>درصد سود</label>
          <input id="profitPercent" name="profitPercent" type="number" step="0.01" defaultValue={product?.profitPercent ?? 7} min="0" required className={fieldClass} />
        </div>
        <div className="grid gap-[7px]">
          <label htmlFor="taxPercent" className={labelClass}>درصد مالیات</label>
          <input id="taxPercent" name="taxPercent" type="number" step="0.01" defaultValue={product?.taxPercent ?? 10} min="0" required className={fieldClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
        <div className="grid gap-[7px]">
          <label htmlFor="productStock" className={labelClass}>موجودی</label>
          <input id="productStock" name="stock" type="number" defaultValue={product?.stock ?? 1} min="0" required className={fieldClass} />
        </div>
        <div className="grid gap-[7px]">
          <label htmlFor="productStatus" className={labelClass}>وضعیت</label>
          <select id="productStatus" name="status" defaultValue={product?.status ?? "DRAFT"} className={fieldClass}>
            <option value="DRAFT">پیش‌نویس</option>
            <option value="ACTIVE">منتشرشده</option>
            <option value="ARCHIVED">بایگانی</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-[0.84rem] cursor-pointer">
        <input name="featured" type="checkbox" defaultChecked={product?.featured} className="w-4 h-4" />
        نمایش در محصولات ویژه
      </label>

      {error && <div className="text-[#a33b32] bg-[#fff0ed] px-3 py-[10px] text-[0.86rem]">{error}</div>}

      <button
        className="min-h-[46px] px-6 py-[9px] inline-flex items-center justify-center bg-[#1c3155] text-white border border-[#1c3155] rounded-sm transition-all hover:-translate-y-[2px] hover:shadow-[0_8px_20px_rgba(20,35,61,0.12)] disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={loading}
      >
        {loading ? "در حال ذخیره..." : product ? "ذخیره تغییرات محصول" : "ثبت محصول"}
      </button>
    </form>
    <MediaPickerDialog open={pickerOpen} scope="PRODUCT" multiple selected={selectedMedia} onClose={() => setPickerOpen(false)} onConfirm={setSelectedMedia} />
    </>
  );
}
