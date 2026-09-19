import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CardToCardDestination } from "@/components/card-to-card-destination";
import { CardToCardProofForm } from "@/components/card-to-card-proof-form";
import { CardToCardReviewStatus, type SubmittedProof } from "@/components/card-to-card-review-status";
import { CardToCardSummary } from "@/components/card-to-card-summary";
import { CheckoutSteps } from "@/components/checkout-steps";
import { InlineAlert } from "@/components/inline-alert";
import { StandaloneTopBar } from "@/components/standalone-top-bar";
import { db } from "@/lib/db";
import { maskCardNumber } from "@/modules/account/bank-card";
import { requireUser } from "@/modules/auth/session";
import { expirePendingOrders } from "@/modules/orders/expiration";
import { CARD_TO_CARD_PROVIDER } from "@/modules/payments/card-to-card-shared";
import { cardToCardDestination, getCardToCardSettings } from "@/modules/settings/card-to-card-settings";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getOrderSettings } from "@/modules/settings/order-settings";

export const metadata: Metadata = { title: "پرداخت کارت‌به‌کارت" };

// Per-user, always live: it reflects the admin's decision the moment they make it.
export const instant = false;

export default async function CardToCardPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  await expirePendingOrders();
  const { id } = await params;
  const [order, settings, orderSettings, cardSettings] = await Promise.all([
    db.order.findFirst({
      where: { id, userId: user.id },
      include: {
        items: { select: { quantity: true } },
        payments: { where: { provider: CARD_TO_CARD_PROVIDER }, orderBy: { createdAt: "desc" }, include: { cardTransferProof: true } },
      },
    }),
    getGeneralStoreSettings(),
    getOrderSettings(),
    getCardToCardSettings(),
  ]);
  if (!order) notFound();

  // Once the order is past "waiting for payment" this page has nothing left to do: an approved
  // transfer lands on the order with the success banner, anything else on the plain order page.
  if (order.status !== "PENDING_PAYMENT") {
    redirect(`/account/orders/${order.id}${order.payments.some((payment) => payment.status === "SUCCESS") ? "?payment=success" : ""}`);
  }

  const underReview = order.payments.find((payment) => payment.status === "PENDING" && payment.cardTransferProof);
  const proof = underReview?.cardTransferProof ?? null;
  const latest = order.payments[0];
  const rejection = latest?.status === "FAILED" ? latest.cardTransferProof?.rejectionReason ?? null : null;
  const wasRejected = latest?.status === "FAILED" && Boolean(latest.cardTransferProof);
  const destination = cardToCardDestination(cardSettings);
  const amount = Number(order.total.minus(order.walletAmount));
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const submitted: SubmittedProof | null = proof
    ? proof.receiptUrl
      ? { kind: "receipt", url: proof.receiptUrl, name: proof.receiptOriginalName }
      : { kind: "details", sourceCard: maskCardNumber(proof.sourceCardNumber ?? ""), trackingCode: proof.trackingCode ?? "" }
    : null;

  return (
    <>
      <StandaloneTopBar backHref={underReview ? `/account/orders/${order.id}` : "/checkout"} backLabel={underReview ? "بازگشت به سفارش" : "بازگشت به روش‌های پرداخت"} />
      <main className="min-h-[calc(100dvh-4rem)] bg-[var(--background)] px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-[1280px]">
          <CheckoutSteps />
          <div className="mb-6">
            <h1 className="m-0 text-xl font-bold sm:text-2xl">پرداخت کارت‌به‌کارت</h1>
            <p className="mb-0 mt-2 text-sm text-[var(--muted)]">سفارش <b dir="ltr">{order.orderNumber}</b> ثبت شده؛ مبلغ را به کارت فروشگاه واریز و پرداخت را تأیید کنید.</p>
          </div>

          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]" dir="rtl">
            <div className="grid min-w-0 gap-5">
              {underReview && submitted && proof ? (
                <CardToCardReviewStatus orderId={order.id} submittedAt={proof.submittedAt.toISOString()} proof={submitted} />
              ) : destination ? (
                <>
                  {wasRejected && (
                    <InlineAlert status="danger">
                      <strong className="block">پرداخت قبلی شما تأیید نشد</strong>
                      {rejection ? <span className="mt-1 block">{rejection}</span> : null}
                      <span className="mt-1 block text-[var(--muted)]">پس از اصلاح، رسید یا اطلاعات پرداخت را دوباره ارسال کنید.</span>
                    </InlineAlert>
                  )}
                  <CardToCardDestination destination={destination} amount={amount} currency={settings.currency} />
                  <CardToCardProofForm orderId={order.id} />
                </>
              ) : (
                <InlineAlert status="warning" action={<Link href="/checkout" className="text-sm font-bold text-[var(--brand-primary)] hover:underline">انتخاب روش پرداخت دیگر</Link>}>
                  پرداخت کارت‌به‌کارت در حال حاضر در دسترس نیست. برای تکمیل سفارش، روش پرداخت دیگری را انتخاب کنید.
                </InlineAlert>
              )}
            </div>
            <CardToCardSummary
              orderNumber={order.orderNumber}
              itemCount={itemCount}
              total={Number(order.total)}
              walletApplied={Number(order.walletAmount)}
              amount={amount}
              currency={settings.currency}
              expiresAt={underReview ? null : order.expiresAt?.toISOString() ?? null}
              warningMinutes={orderSettings.orderWarningMinutes}
              canChangeMethod={!underReview}
            />
          </div>
        </div>
      </main>
    </>
  );
}
