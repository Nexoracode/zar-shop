import Link from "next/link";
import { db } from "@/lib/db";
import type { Prisma } from "@generated/prisma/client";

type ProductRow = Prisma.ProductGetPayload<{ include: { category: true } }>;

export default async function AdminProducts() {
  const products = await db.product.findMany({ orderBy: { updatedAt: "desc" }, include: { category: true } });

  return (
    <>
      <div className="flex justify-between items-center gap-5 mb-6">
        <div>
          <h1 className="mt-0 mb-0">محصولات</h1>
          <span className="text-[#747982] text-[0.82rem]">ثبت، انتشار و کنترل موجودی</span>
        </div>
        <Link className="min-h-[46px] px-6 py-[9px] inline-flex items-center justify-center bg-[#1c3155] text-white border border-[#1c3155] rounded-sm transition-all hover:-translate-y-[2px]" href="/admin/products/new">
          محصول جدید
        </Link>
      </div>

      <div className="border border-[#e7e6e2] bg-white overflow-x-auto">
        <table className="w-full border-collapse min-w-[700px]">
          <thead>
            <tr>
              {["محصول", "کد", "وزن", "موجودی", "وضعیت"].map((h) => (
                <th key={h} className="px-4 py-[14px] text-right border-b border-[#e7e6e2] text-[#747982] text-[0.82rem] bg-[#f8f7f4]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p: ProductRow) => (
              <tr key={p.id}>
                <td className="px-4 py-[14px] border-b border-[#e7e6e2]">
                  <strong>{p.name}</strong><br />
                  <span className="text-[#747982] text-[0.82rem]">{p.category?.name ?? "بدون دسته"}</span>
                </td>
                <td className="px-4 py-[14px] border-b border-[#e7e6e2]" dir="ltr">{p.sku}</td>
                <td className="px-4 py-[14px] border-b border-[#e7e6e2]">{Number(p.weightGrams)} گرم</td>
                <td className="px-4 py-[14px] border-b border-[#e7e6e2]">{p.stock}</td>
                <td className="px-4 py-[14px] border-b border-[#e7e6e2]">
                  <span className="inline-block px-[11px] py-[5px] bg-[#efe5d1] text-[#785b27] text-[0.78rem] rounded-sm">{p.status}</span>
                </td>
              </tr>
            ))}
            {!products.length && (
              <tr><td colSpan={5} className="py-12 text-center text-[#747982]">محصولی ثبت نشده است.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
