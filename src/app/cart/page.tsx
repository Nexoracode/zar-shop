import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { getGoldPrice } from "@/modules/gold/gold-price.service";
import { calculateProductPrice } from "@/modules/products/pricing";
import { formatMoney } from "@/lib/format";
import { CheckoutForm } from "@/components/checkout-form";
import type { Prisma } from "@generated/prisma/client";

type CartItemRow = Prisma.CartItemGetPayload<{ include: { product: true } }>;

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const user = await requireUser();
  const [cart, gold] = await Promise.all([
    db.cart.findUnique({ where: { userId: user.id }, include: { items: { include: { product: true } } } }),
    getGoldPrice(),
  ]);
  const items = (cart?.items ?? []) as CartItemRow[];
  const rate = Number(gold.pricePerGram18);
  const total = items.reduce((sum, item) => {
    const p = item.product;
    const amount = p.fixedPrice
      ? Number(p.fixedPrice)
      : calculateProductPrice({ goldPricePerGram18: rate, weightGrams: Number(p.weightGrams), purity: p.purity, makingFeeType: p.makingFeeType, makingFeeValue: Number(p.makingFeeValue), profitPercent: Number(p.profitPercent), taxPercent: Number(p.taxPercent) }).total;
    return sum + amount * item.quantity;
  }, 0);

  return (
    <main className="py-[86px]">
      <div className="w-[min(1240px,calc(100%-40px))] mx-auto">
        {/* Panel head */}
        <div className="flex justify-between items-center gap-5 mb-6">
          <div>
            <span className="inline-block text-[#785b27] text-[0.78rem] font-bold tracking-[0.03em] mb-[5px]">خرید امن</span>
            <h1 className="mt-0 mb-0">سبد خرید</h1>
          </div>
          <span className="inline-block px-[11px] py-[5px] bg-[#efe5d1] text-[#785b27] text-[0.78rem] rounded-sm">
            نرخ مبنا: {formatMoney(rate)}
          </span>
        </div>

        {!items.length ? (
          <div className="py-12 text-center border border-[#e7e6e2] bg-white text-[#747982]">
            سبد خرید خالی است.
            <br />
            <Link href="/products" className="min-h-[46px] mt-4 px-6 py-[9px] inline-flex items-center justify-center border border-[#17233b] rounded-sm transition-all hover:-translate-y-[2px]">
              مشاهده محصولات
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_420px] gap-[30px] max-[760px]:grid-cols-1">
            {/* Table */}
            <div className="border border-[#e7e6e2] bg-white overflow-x-auto">
              <table className="w-full border-collapse min-w-[700px]">
                <thead>
                  <tr>
                    {["محصول", "تعداد", "وزن", "مبلغ"].map((h) => (
                      <th key={h} className="px-4 py-[14px] text-right border-b border-[#e7e6e2] text-[#747982] text-[0.82rem] bg-[#f8f7f4]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const p = item.product;
                    const amount = p.fixedPrice
                      ? Number(p.fixedPrice)
                      : calculateProductPrice({ goldPricePerGram18: rate, weightGrams: Number(p.weightGrams), purity: p.purity, makingFeeType: p.makingFeeType, makingFeeValue: Number(p.makingFeeValue), profitPercent: Number(p.profitPercent), taxPercent: Number(p.taxPercent) }).total;
                    return (
                      <tr key={p.id}>
                        <td className="px-4 py-[14px] border-b border-[#e7e6e2]"><strong>{p.name}</strong><br /><span className="text-[#747982] text-[0.82rem]">{p.sku}</span></td>
                        <td className="px-4 py-[14px] border-b border-[#e7e6e2]">{item.quantity}</td>
                        <td className="px-4 py-[14px] border-b border-[#e7e6e2]">{Number(p.weightGrams)} گرم</td>
                        <td className="px-4 py-[14px] border-b border-[#e7e6e2]">{formatMoney(amount * item.quantity)}</td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td colSpan={3} className="px-4 py-[14px] border-b border-[#e7e6e2]"><strong>جمع کل</strong></td>
                    <td className="px-4 py-[14px] border-b border-[#e7e6e2]"><strong>{formatMoney(total)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <CheckoutForm />
          </div>
        )}
      </div>
    </main>
  );
}
