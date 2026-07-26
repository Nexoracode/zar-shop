import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
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
    getGoldPriceForDisplay(),
  ]);
  const items = (cart?.items ?? []) as CartItemRow[];
  const rate = gold ? Number(gold.pricePerGram18) : null;
  const getItemAmount = (item: CartItemRow) => {
    const p = item.product;
    if (p.fixedPrice) return Number(p.fixedPrice);
    if (rate === null) return null;
    return calculateProductPrice({ goldPricePerGram18: rate, weightGrams: Number(p.weightGrams), purity: p.purity, makingFeeType: p.makingFeeType, makingFeeValue: Number(p.makingFeeValue), profitPercent: Number(p.profitPercent), taxPercent: Number(p.taxPercent) }).total;
  };
  const itemAmounts = items.map(getItemAmount);
  const total = itemAmounts.some((amount) => amount === null)
    ? null
    : itemAmounts.reduce<number>((sum, amount, index) => sum + Number(amount) * items[index].quantity, 0);

  return (
    <main className="px-5 py-12 sm:px-6 sm:py-[86px]">
      <div className="mx-auto w-full max-w-[1240px]">
        {/* Panel head */}
        <div className="flex justify-between items-center gap-5 mb-6">
          <div>
            <span className="inline-block text-[#785b27] text-[0.78rem] font-bold tracking-[0.03em] mb-[5px]">خرید امن</span>
            <h1 className="mt-0 mb-0">سبد خرید</h1>
          </div>
          <span className="inline-block px-[11px] py-[5px] bg-[#efe5d1] text-[#785b27] text-[0.78rem] rounded-sm">
            نرخ مبنا: {rate === null ? "موقتاً در دسترس نیست" : formatMoney(rate)}
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px] xl:gap-[30px]">
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
                    const amount = getItemAmount(item);
                    return (
                      <tr key={p.id}>
                        <td className="px-4 py-[14px] border-b border-[#e7e6e2]"><strong>{p.name}</strong><br /><span className="text-[#747982] text-[0.82rem]">{p.sku}</span></td>
                        <td className="px-4 py-[14px] border-b border-[#e7e6e2]">{item.quantity}</td>
                        <td className="px-4 py-[14px] border-b border-[#e7e6e2]">{Number(p.weightGrams)} گرم</td>
                        <td className="px-4 py-[14px] border-b border-[#e7e6e2]">
                          {amount === null ? "قیمت موقتاً نامشخص" : formatMoney(amount * item.quantity)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td colSpan={3} className="px-4 py-[14px] border-b border-[#e7e6e2]"><strong>جمع کل</strong></td>
                    <td className="px-4 py-[14px] border-b border-[#e7e6e2]"><strong>
                      {total === null ? "قابل محاسبه نیست" : formatMoney(total)}
                    </strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
            {rate === null ? (
              <div className="self-start border border-[#e7c9a8] bg-[#fff8ed] p-[22px] text-[#785b27] text-[0.88rem] leading-8">
                نرخ لحظه‌ای طلا موقتاً در دسترس نیست. سبد خرید شما حفظ شده است و پس از برقراری سرویس می‌توانید پرداخت را ادامه دهید.
              </div>
            ) : (
              <CheckoutForm />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
