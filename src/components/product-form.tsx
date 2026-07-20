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
      sku: f.get("sku"),
      name: f.get("name"),
      slug: f.get("slug"),
      description: f.get("description"),
      purity: Number(f.get("purity")),
      weightGrams: Number(f.get("weightGrams")),
      makingFeeType: f.get("makingFeeType"),
      makingFeeValue: Number(f.get("makingFeeValue")),
      profitPercent: Number(f.get("profitPercent")),
      taxPercent: Number(f.get("taxPercent")),
      stock: Number(f.get("stock")),
      status: f.get("status"),
      featured: f.get("featured") === "on",
    };

    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();

    if (!response.ok) {
      setError(result.message ?? "ثبت ناموفق بود.");
      setLoading(false);
      return;
    }

    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form className="form card-body card" onSubmit={submit}>
      <div className="form-row">
        <div className="field">
          <label htmlFor="productName">نام محصول</label>
          <input id="productName" name="name" required />
        </div>
        <div className="field">
          <label htmlFor="productSku">کد کالا</label>
          <input id="productSku" name="sku" dir="ltr" required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="productSlug">نشانی انگلیسی</label>
        <input id="productSlug" name="slug" dir="ltr" pattern="[a-z0-9-]+" required />
      </div>
      <div className="field">
        <label htmlFor="productDescription">توضیحات</label>
        <textarea id="productDescription" name="description" rows={4} />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="productWeight">وزن (گرم)</label>
          <input id="productWeight" name="weightGrams" type="number" step="0.001" min="0.001" required />
        </div>
        <div className="field">
          <label htmlFor="productPurity">عیار</label>
          <input id="productPurity" name="purity" type="number" defaultValue="750" required />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="makingFeeType">نوع اجرت</label>
          <select id="makingFeeType" name="makingFeeType">
            <option value="PERCENT">درصدی</option>
            <option value="FIXED">مبلغ ثابت</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="makingFeeValue">مقدار اجرت</label>
          <input id="makingFeeValue" name="makingFeeValue" type="number" defaultValue="10" min="0" required />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="profitPercent">درصد سود</label>
          <input id="profitPercent" name="profitPercent" type="number" defaultValue="7" min="0" required />
        </div>
        <div className="field">
          <label htmlFor="taxPercent">درصد مالیات</label>
          <input id="taxPercent" name="taxPercent" type="number" defaultValue="10" min="0" required />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="productStock">موجودی</label>
          <input id="productStock" name="stock" type="number" defaultValue="1" min="0" required />
        </div>
        <div className="field">
          <label htmlFor="productStatus">وضعیت</label>
          <select id="productStatus" name="status">
            <option value="DRAFT">پیش‌نویس</option>
            <option value="ACTIVE">منتشرشده</option>
            <option value="ARCHIVED">بایگانی</option>
          </select>
        </div>
      </div>
      <label>
        <input name="featured" type="checkbox" /> نمایش در محصولات ویژه
      </label>
      {error && <div className="error">{error}</div>}
      <button className="btn btn-primary" disabled={loading}>
        {loading ? "در حال ثبت..." : "ثبت محصول"}
      </button>
    </form>
  );
}
