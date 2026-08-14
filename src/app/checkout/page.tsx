import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, CreditCard, MapPin, ShoppingCart } from "lucide-react";
import { AlertDescription, AlertRoot } from "@/components/hero";
import { CheckoutForm } from "@/components/checkout-form";
import { requireUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { calculateProductPrice } from "@/modules/products/pricing";
import { calculateDiscountedPrice } from "@/modules/products/discount";
import { getSelectedOptionPrice, getSelectedOptionWeight } from "@/modules/products/options";
import { baseShippingFee, getCommerceSettings } from "@/modules/settings/commerce-settings";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { resolveCheckoutPromotions } from "@/modules/promotions/service";
import { getStorefrontPaymentMethods } from "@/modules/payments/storefront-methods";
import { serializeAddress } from "@/modules/account/addresses";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await requireUser();
  const [cart, gold, settings, commerceSettings, paymentMethods, addresses] = await Promise.all([
    db.cart.findUnique({ where: { userId: user.id }, include: { items: { include: { product: { include: { options: true } } } } } }),
    getGoldPriceForDisplay(),
    getGeneralStoreSettings(),
    getCommerceSettings(),
    getStorefrontPaymentMethods(),
    db.address.findMany({ where: { userId: user.id, type: "SHIPPING" }, orderBy: [{ isDefault: "desc" }, { lastUsedAt: "desc" }, { createdAt: "desc" }], include: { provinceRef: true, cityRef: true } }),
  ]);
  if (!cart?.items.length) redirect("/cart");
  const items = cart.items.filter((item) => item.product.storeIndustry === settings.industry);
  if (!items.length) redirect("/cart");
  const needsGoldRate = items.some((item) => item.product.storeIndustry === "GOLD" && item.product.fixedPrice === null);
  const rate = gold?.pricePerGram18 ?? null;

  if (needsGoldRate && rate === null) return <main className="px-4 py-12 sm:px-6"><div className="mx-auto max-w-3xl"><AlertRoot status="warning"><AlertDescription>نرخ لحظه‌ای طلا موقتاً در دسترس نیست. سفارش شما ثبت نشده و سبد خرید محفوظ است.</AlertDescription></AlertRoot><Link href="/cart" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--brand-primary)]"><ChevronRight size={17} />بازگشت به سبد خرید</Link></div></main>;

  const prices = items.map((item) => {
    const product = item.product;
    const selectedWeight = getSelectedOptionWeight(product.options, item.selectedOptions, product.weightGrams);
    const original = product.storeIndustry === "GENERAL" ? getSelectedOptionPrice(product.options, item.selectedOptions, Number(product.fixedPrice ?? 0)) : product.fixedPrice ? Number(product.fixedPrice) : calculateProductPrice({ goldPricePerGram18: rate!, weightGrams: selectedWeight, purity: product.purity, makingFeeType: product.makingFeeType, makingFeeValue: product.makingFeeValue, profitPercent: product.profitPercent, taxPercent: product.taxPercent }).total;
    const pricing = calculateDiscountedPrice(original, product);
    return { quantity: item.quantity, original: pricing.originalPrice, final: pricing.finalPrice };
  });
  const subtotal = prices.reduce((sum, item) => sum + item.original * item.quantity, 0);
  const merchandiseAmount = prices.reduce((sum, item) => sum + item.final * item.quantity, 0);
  const productDiscount = subtotal - merchandiseAmount;
  const deliveryMethod = commerceSettings.insuredShippingEnabled ? "INSURED_SHIPPING" : "STORE_PICKUP";
  const shippingFee = baseShippingFee(commerceSettings, merchandiseAmount, deliveryMethod);
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
  const promotions = await resolveCheckoutPromotions(db, { userId: user.id, merchandiseAmount, shippingFee, city: defaultAddress?.cityRef?.name ?? defaultAddress?.city ?? "" });
  const shipping = Math.max(0, shippingFee - promotions.shippingDiscount);
  const initialQuote = { subtotal, productDiscount, merchandiseAmount, promotionDiscount: promotions.promotionDiscount, shipping, shippingDiscount: promotions.shippingDiscount, total: merchandiseAmount - promotions.promotionDiscount + shipping, applications: promotions.applications.map((item) => ({ title: item.title, code: item.code, discountAmount: item.discountAmount, shippingDiscount: item.shippingDiscount })) };
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <main className="bg-[var(--background)] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-[1280px]">
        <Link href="/cart" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)] transition hover:text-[var(--brand-primary)]"><ChevronRight size={17} />بازگشت به سبد خرید</Link>
        <div className="mb-7 flex items-center justify-center gap-2 text-xs sm:gap-4 sm:text-sm" aria-label="مراحل خرید"><span className="flex items-center gap-2 text-[var(--muted)]"><ShoppingCart size={18} />سبد خرید</span><span className="h-px w-8 bg-[var(--border)] sm:w-16" /><strong className="flex items-center gap-2 text-[var(--brand-primary)]"><MapPin size={18} />ارسال و پرداخت</strong><span className="h-px w-8 bg-[var(--border)] sm:w-16" /><span className="flex items-center gap-2 text-[var(--muted)]"><CreditCard size={18} />تکمیل خرید</span></div>
        <div className="mb-6"><h1 className="m-0 text-xl font-black sm:text-2xl">تکمیل سفارش</h1><p className="mb-0 mt-2 text-sm text-[var(--muted)]">نشانی، شیوه تحویل، تخفیف و روش پرداخت را بررسی کنید.</p></div>
        <CheckoutForm settings={commerceSettings} paymentMethods={paymentMethods} currency={settings.currency} itemCount={itemCount} initialQuote={initialQuote} initialAddresses={addresses.map(serializeAddress)} user={{ firstName: user.firstName, lastName: user.lastName, phone: user.phone }} />
      </div>
    </main>
  );
}
