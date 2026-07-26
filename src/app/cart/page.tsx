import Link from "next/link";
import { AlertDescription, AlertRoot, Card, ChipLabel, ChipRoot, Table, TableBody, TableCell, TableColumn, TableContent, TableHeader, TableRow, TableScrollContainer } from "@/components/hero";
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
          <ChipRoot variant="soft" className="bg-[#efe5d1] text-[#785b27]"><ChipLabel>نرخ مبنا: {rate === null ? "موقتاً در دسترس نیست" : formatMoney(rate)}</ChipLabel></ChipRoot>
        </div>

        {!items.length ? (
          <Card variant="secondary" className="py-12 text-center border border-[#e7e6e2] bg-white text-[#747982]">
            سبد خرید خالی است.
            <br />
            <Link href="/products" className="min-h-[46px] mt-4 px-6 py-[9px] inline-flex items-center justify-center border border-[#17233b] rounded-sm transition-all hover:-translate-y-[2px]">
              مشاهده محصولات
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px] xl:gap-[30px]">
            {/* Table */}
            <Table><TableScrollContainer><TableContent aria-label="اقلام سبد خرید" className="w-full min-w-[700px]"><TableHeader>{["محصول", "تعداد", "وزن", "مبلغ"].map((h, index) => <TableColumn id={h} key={h} isRowHeader={index === 0} className="bg-[#f8f7f4] px-4 py-[14px] text-right text-[0.82rem] text-[#747982]">{h}</TableColumn>)}</TableHeader><TableBody>
                  {items.map((item) => {
                    const p = item.product;
                    const amount = getItemAmount(item);
                    return (
                      <TableRow id={p.id} key={p.id}>
                        <TableCell className="px-4 py-[14px]"><strong>{p.name}</strong><br /><span className="text-[#747982] text-[0.82rem]">{p.sku}</span></TableCell>
                        <TableCell className="px-4 py-[14px]">{item.quantity}</TableCell>
                        <TableCell className="px-4 py-[14px]">{Number(p.weightGrams)} گرم</TableCell>
                        <TableCell className="px-4 py-[14px]">
                          {amount === null ? "قیمت موقتاً نامشخص" : formatMoney(amount * item.quantity)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow id="total">
                    <TableCell className="px-4 py-[14px]"><strong>جمع کل</strong></TableCell>
                    <TableCell className="px-4 py-[14px]">—</TableCell><TableCell className="px-4 py-[14px]">—</TableCell>
                    <TableCell className="px-4 py-[14px]"><strong>
                      {total === null ? "قابل محاسبه نیست" : formatMoney(total)}
                    </strong></TableCell>
                  </TableRow>
                </TableBody></TableContent></TableScrollContainer></Table>
            {rate === null ? (
              <AlertRoot status="warning" className="self-start"><AlertDescription>نرخ لحظه‌ای طلا موقتاً در دسترس نیست. سبد خرید شما حفظ شده است و پس از برقراری سرویس می‌توانید پرداخت را ادامه دهید.</AlertDescription></AlertRoot>
            ) : (
              <CheckoutForm />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
