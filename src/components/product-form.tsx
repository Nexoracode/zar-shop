"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProductForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const body = {
      sku: f.get("sku"), name: f.get("name"), slug: f.get("slug"), description: f.get("description"),
      purity: Number(f.get("purity")), weightGrams: Number(f.get("weightGrams")),
      makingFeeType: f.get("makingFeeType"), makingFeeValue: Number(f.get("makingFeeValue")),
      profitPercent: Number(f.get("profitPercent")), taxPercent: Number(f.get("taxPercent")),
      stock: Number(f.get("stock")), status: f.get("status"), featured: f.get("featured") === "on",
    };
    const response = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) { setError(result.message ?? "ثبت ناموفق بود."); setLoading(false); return; }
    router.push("/admin/products");
    router.refresh();
  }

  const fieldClass = "w-full border border-[#e7e6e2] rounded-sm bg-white px-[13px] py-3 outline-none focus:border-[#b5904c] focus:shadow-[0_0_0_3px_rgba(181,144,76,0.1)]";
  const labelClass = "text-[#4b5160] text-[0.84rem] font-bold";

  return (
    <form className="grid gap-4 rounded-[4px] border border-[#e7e6e2] bg-white p-4 sm:p-[22px]" onSubmit={submit}>
      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
        <div className="grid gap-[7px]">
          <label htmlFor="productName" className={labelClass}>نام محصول</label>
          <input id="productName" name="name" required className={fieldClass} />
        </div>
        <div className="grid gap-[7px]">
          <label htmlFor="productSku" className={labelClass}>کد کالا</label>
          <input id="productSku" name="sku" dir="ltr" required className={fieldClass} />
        </div>
      </div>

      <div className="grid gap-[7px]">
        <label htmlFor="productSlug" className={labelClass}>نشانی انگلیسی</label>
        <input id="productSlug" name="slug" dir="ltr" pattern="[a-z0-9-]+" required className={fieldClass} />
      </div>

      <div className="grid gap-[7px]">
        <label htmlFor="productDescription" className={labelClass}>توضیحات</label>
        <textarea id="productDescription" name="description" rows={4} className={fieldClass} />
      </div>

      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
        <div className="grid gap-[7px]">
          <label htmlFor="productWeight" className={labelClass}>وزن (گرم)</label>
          <input id="productWeight" name="weightGrams" type="number" step="0.001" min="0.001" required className={fieldClass} />
        </div>
        <div className="grid gap-[7px]">
          <label htmlFor="productPurity" className={labelClass}>عیار</label>
          <input id="productPurity" name="purity" type="number" defaultValue="750" required className={fieldClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
        <div className="grid gap-[7px]">
          <label htmlFor="makingFeeType" className={labelClass}>نوع اجرت</label>
          <select id="makingFeeType" name="makingFeeType" className={fieldClass}>
            <option value="PERCENT">درصدی</option>
            <option value="FIXED">مبلغ ثابت</option>
          </select>
        </div>
        <div className="grid gap-[7px]">
          <label htmlFor="makingFeeValue" className={labelClass}>مقدار اجرت</label>
          <input id="makingFeeValue" name="makingFeeValue" type="number" defaultValue="10" min="0" required className={fieldClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
        <div className="grid gap-[7px]">
          <label htmlFor="profitPercent" className={labelClass}>درصد سود</label>
          <input id="profitPercent" name="profitPercent" type="number" defaultValue="7" min="0" required className={fieldClass} />
        </div>
        <div className="grid gap-[7px]">
          <label htmlFor="taxPercent" className={labelClass}>درصد مالیات</label>
          <input id="taxPercent" name="taxPercent" type="number" defaultValue="10" min="0" required className={fieldClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
        <div className="grid gap-[7px]">
          <label htmlFor="productStock" className={labelClass}>موجودی</label>
          <input id="productStock" name="stock" type="number" defaultValue="1" min="0" required className={fieldClass} />
        </div>
        <div className="grid gap-[7px]">
          <label htmlFor="productStatus" className={labelClass}>وضعیت</label>
          <select id="productStatus" name="status" className={fieldClass}>
            <option value="DRAFT">پیش‌نویس</option>
            <option value="ACTIVE">منتشرشده</option>
            <option value="ARCHIVED">بایگانی</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-[0.84rem] cursor-pointer">
        <input name="featured" type="checkbox" className="w-4 h-4" />
        نمایش در محصولات ویژه
      </label>

      {error && <div className="text-[#a33b32] bg-[#fff0ed] px-3 py-[10px] text-[0.86rem]">{error}</div>}

      <button
        className="min-h-[46px] px-6 py-[9px] inline-flex items-center justify-center bg-[#1c3155] text-white border border-[#1c3155] rounded-sm transition-all hover:-translate-y-[2px] hover:shadow-[0_8px_20px_rgba(20,35,61,0.12)] disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={loading}
      >
        {loading ? "در حال ثبت..." : "ثبت محصول"}
      </button>
    </form>
  );
}
