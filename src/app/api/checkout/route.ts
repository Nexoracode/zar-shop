import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { getGoldPrice } from "@/modules/gold/gold-price.service";
import { calculateProductPrice } from "@/modules/products/pricing";
import { getPaymentProvider } from "@/modules/payments/payment-provider";
import type { Prisma } from "@generated/prisma/client";

type ItemWithProduct = Prisma.CartItemGetPayload<{ include: { product: true } }>;
type PriceParts = ReturnType<typeof calculateProductPrice>;
type CheckoutLine = { item: ItemWithProduct; p: ItemWithProduct["product"]; parts: PriceParts; unitPrice: number; total: number };

const addressSchema = z.object({
  recipient: z.string().min(3).max(150),
  phone: z.string().regex(/^09\d{9}$/),
  province: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  postalCode: z.string().min(5).max(20),
  addressLine: z.string().min(10).max(1000),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "ابتدا وارد حساب شوید." }, { status: 401 });
    const address = addressSchema.parse(await request.json());
    const [cart, gold] = await Promise.all([
      db.cart.findUnique({ where: { userId: user.id }, include: { items: { include: { product: true } } } }),
      getGoldPrice({ force: true }),
    ]);
    if (!cart?.items.length) return NextResponse.json({ message: "سبد خرید خالی است." }, { status: 409 });
    const rate = Number(gold.pricePerGram18);
    const lines: CheckoutLine[] = cart.items.map((item: ItemWithProduct) => {
      const p = item.product;
      if (p.status !== "ACTIVE" || p.stock < item.quantity) throw new Error(`موجودی ${p.name} کافی نیست.`);
      const parts = calculateProductPrice({
        goldPricePerGram18: rate,
        weightGrams: Number(p.weightGrams),
        purity: p.purity,
        makingFeeType: p.makingFeeType,
        makingFeeValue: Number(p.makingFeeValue),
        profitPercent: Number(p.profitPercent),
        taxPercent: Number(p.taxPercent),
      });
      const unitPrice = p.fixedPrice ? Number(p.fixedPrice) : parts.total;
      return { item, p, parts, unitPrice, total: unitPrice * item.quantity };
    });
    const total = lines.reduce((sum: number, line: CheckoutLine) => sum + line.total, 0);
    const order = await db.order.create({
      data: {
        orderNumber: `Z${Date.now()}`,
        userId: user.id,
        goldPriceSnapshot: rate,
        subtotal: total,
        total,
        shippingAddress: address,
        items: {
          create: lines.map(({ item, p, parts, unitPrice, total: lineTotal }: CheckoutLine) => ({
            productId: p.id, sku: p.sku, name: p.name, quantity: item.quantity,
            weightGrams: p.weightGrams, purity: p.purity, makingFee: parts.makingFee,
            profit: parts.profit, tax: parts.tax, unitPrice, total: lineTotal,
          })),
        },
      },
    });
    const paymentRequest = await getPaymentProvider().request({
      amount: total,
      orderId: order.id,
      callbackUrl: `${env.APP_URL}/api/payment/callback`,
    });
    await db.payment.create({
      data: { orderId: order.id, provider: env.PAYMENT_PROVIDER, authority: paymentRequest.authority, amount: total, status: "PENDING" },
    });
    return NextResponse.json({ redirectUrl: paymentRequest.redirectUrl });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("موجودی")) return NextResponse.json({ message: error.message }, { status: 409 });
    return apiError(error);
  }
}
