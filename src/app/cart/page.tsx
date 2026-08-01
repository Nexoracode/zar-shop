import Link from "next/link";
import { AlertDescription, AlertRoot, Card, ChipLabel, ChipRoot, Table, TableBody, TableCell, TableColumn, TableContent, TableHeader, TableRow, TableScrollContainer } from "@/components/hero";
import { requireUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { calculateProductPrice } from "@/modules/products/pricing";
import { formatMoney } from "@/lib/format";
import { CheckoutForm } from "@/components/checkout-form";
import type { Prisma } from "@generated/prisma/client";
import { getSelectedOptionPrice, getSelectedOptionWeight, optionEntries } from "@/modules/products/options";
import { calculateDiscountedPrice } from "@/modules/products/discount";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { baseShippingFee, getCommerceSettings } from "@/modules/settings/commerce-settings";

type CartItemRow = Prisma.CartItemGetPayload<{ include: { product: { include: { options: true } } } }>;

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const user = await requireUser();
  const [cart, gold, settings, commerceSettings] = await Promise.all([
    db.cart.findUnique({ where: { userId: user.id }, include: { items: { include: { product: { include: { options: true } } } } } }),
    getGoldPriceForDisplay(),
    getGeneralStoreSettings(),
    getCommerceSettings(),
  ]);
  const items = (cart?.items ?? []) as CartItemRow[];
  const rate = gold ? Number(gold.pricePerGram18) : null;
  const hasGoldItems = items.some((item) => item.product.storeIndustry === "GOLD");
  const getItemPricing = (item: CartItemRow) => {
    const p = item.product;
    const selectedWeight = getSelectedOptionWeight(p.options, item.selectedOptions, Number(p.weightGrams));
    const baseAmount = p.storeIndustry === "GENERAL"
      ? getSelectedOptionPrice(p.options, item.selectedOptions, Number(p.fixedPrice ?? 0))
      : p.fixedPrice ? Number(p.fixedPrice) : rate === null ? null : calculateProductPrice({ goldPricePerGram18: rate, weightGrams: selectedWeight, purity: p.purity, makingFeeType: p.makingFeeType, makingFeeValue: Number(p.makingFeeValue), profitPercent: Number(p.profitPercent), taxPercent: Number(p.taxPercent) }).total;
    return baseAmount === null ? null : calculateDiscountedPrice(baseAmount, p);
  };
  const getItemAmount = (item: CartItemRow) => getItemPricing(item)?.finalPrice ?? null;
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
            <span className="inline-block text-[var(--brand-accent)] text-[0.78rem] font-bold tracking-[0.03em] mb-[5px]">خرید امن</span>
            <h1 className="mt-0 mb-0">سبد خرید</h1>
          </div>
          {hasGoldItems && <ChipRoot variant="soft" className="bg-[#efe5d1] text-[#785b27]"><ChipLabel>نرخ مبنا: {rate === null ? "موقتاً در دسترس نیست" : formatMoney(rate, settings.currency)}</ChipLabel></ChipRoot>}
        </div>

        {!items.length ? (
          <Card variant="secondary" className="py-12 text-center border border-[#e7e6e2] bg-white text-[#747982]">
            سبد خرید خالی است.
            <br />
            <Link href="/products" className="min-h-[46px] mt-4 px-6 py-[9px] inline-flex items-center justify-center border border-[var(--brand-primary)] text-[var(--brand-primary)] rounded-sm transition-all hover:-translate-y-[2px]">
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
                    const pricing = getItemPricing(item);
                    const selectedWeight = getSelectedOptionWeight(p.options, item.selectedOptions, Number(p.weightGrams));
                    return (
                      <TableRow id={item.id} key={item.id}>
                        <TableCell className="px-4 py-[14px]"><strong>{p.name}</strong><br /><span className="text-[#747982] text-[0.82rem]">{p.sku}{optionEntries(item.selectedOptions).map(([name, value]) => ` · ${name}: ${value}`).join("")}</span></TableCell>
                        <TableCell className="px-4 py-[14px]">{item.quantity}</TableCell>
                        <TableCell className="px-4 py-[14px]">{p.storeIndustry === "GOLD" ? `${selectedWeight.toLocaleString("fa-IR", { maximumFractionDigits: 3 })} گرم` : "—"}</TableCell>
                        <TableCell className="px-4 py-[14px]">
                          {amount === null ? "قیمت موقتاً نامشخص" : <span>{pricing?.isActive && <small className="ml-2 text-slate-400 line-through">{formatMoney(pricing.originalPrice * item.quantity, settings.currency)}</small>}{formatMoney(amount * item.quantity, settings.currency)}</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow id="total">
                    <TableCell className="px-4 py-[14px]"><strong>جمع کل</strong></TableCell>
                    <TableCell className="px-4 py-[14px]">—</TableCell><TableCell className="px-4 py-[14px]">—</TableCell>
                    <TableCell className="px-4 py-[14px]"><strong>
                      {total === null ? "قابل محاسبه نیست" : formatMoney(total, settings.currency)}
                    </strong></TableCell>
                  </TableRow>
                </TableBody></TableContent></TableScrollContainer></Table>
            {total === null ? (
              <AlertRoot status="warning" className="self-start"><AlertDescription>نرخ لحظه‌ای طلا موقتاً در دسترس نیست. سبد خرید شما حفظ شده است و پس از برقراری سرویس می‌توانید پرداخت را ادامه دهید.</AlertDescription></AlertRoot>
            ) : (
              <div className="grid self-start gap-3"><Card variant="secondary" className="rounded-xl border border-[var(--brand-accent)]/20 bg-white p-3 text-xs text-[#606774]"><div className="flex justify-between gap-3"><span>{commerceSettings.calculateShippingAfterAddress ? "هزینه ارسال پس از دریافت نشانی محاسبه می‌شود" : "هزینه ارسال بیمه‌شده"}</span>{!commerceSettings.calculateShippingAfterAddress && commerceSettings.insuredShippingEnabled ? <strong>{formatMoney(baseShippingFee(commerceSettings, total, "INSURED_SHIPPING"), settings.currency)}</strong> : null}</div>{commerceSettings.freeShippingThreshold !== null && <p className="mb-0 mt-2 text-[11px] text-[var(--brand-accent)]">ارسال بیمه‌شده از مبلغ {formatMoney(commerceSettings.freeShippingThreshold, settings.currency)} رایگان است.</p>}<p className="mb-0 mt-2 text-[11px]">زمان آماده‌سازی: {commerceSettings.preparationDays.toLocaleString("fa-IR")} روز</p></Card><CheckoutForm settings={commerceSettings} /></div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
