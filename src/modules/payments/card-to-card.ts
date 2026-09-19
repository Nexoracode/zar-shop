import { db } from "@/lib/db";
import { auditRequestContext } from "@/modules/audit/request-context";
import { sendAutomatedSms } from "@/modules/communications/sms-service";
import { deleteStoredMedia, uploadMediaToFtp } from "@/modules/media/ftp-storage";
import { bufferMatchesMimeType } from "@/modules/media/file-signature";
import { mediaFileSlug } from "@/modules/media/filename";
import { notifyCardTransferReviewed } from "@/modules/notifications/card-payment-notifications";
import { notifyNextPurchaseRewards } from "@/modules/notifications/promotion-notifications";
import { notifyWalletCredited } from "@/modules/notifications/wallet-notifications";
import { expirePendingOrders } from "@/modules/orders/expiration";
import {
  CARD_TO_CARD_PROVIDER,
  cardToCardPagePath,
  cardToCardReceiptExtensions,
  receiptFileProblem,
  type CardTransferDetails,
} from "@/modules/payments/card-to-card-shared";
import { finalizeVerifiedPayment, PaymentAmountMismatchError, type PaymentFinalizationResult } from "@/modules/payments/payment-finalization";
import { getCheckoutPaymentMethods } from "@/modules/payments/storefront-methods";
import { getOrderSettings, orderExpiresAt } from "@/modules/settings/order-settings";

/*
 * Card-to-card payment. The customer transfers the amount to the store's own card and then proves
 * it, either with a receipt image or with the source card + tracking code. The proof is stored on
 * a `Payment` row that stays `PENDING` until an admin looks at it:
 *
 *   INITIATED  chosen at checkout, nothing sent yet
 *   PENDING    proof submitted, waiting for an admin (the order must not expire meanwhile —
 *              `expirePendingOrders` skips it)
 *   SUCCESS    approved: settled through `finalizeVerifiedPayment`, exactly like a gateway payment
 *   FAILED     rejected with a reason; the order stays payable and a fresh attempt may be sent
 */

export class CardTransferError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = "CardTransferError";
  }
}

/** Which of an order's payments count as a card-to-card attempt still in play. */
const OPEN_STATUSES = ["INITIATED", "PENDING"] as const;

/** The order's own payable state, shared by "start" and "submit": pending, unexpired, not already settled. */
async function loadPayableOrder(orderId: string, userId: string) {
  await expirePendingOrders();
  const order = await db.order.findFirst({
    where: { id: orderId, userId },
    include: { payments: { orderBy: { createdAt: "desc" } }, user: { select: { phone: true } } },
  });
  if (!order) throw new CardTransferError("سفارش پیدا نشد.", 404);
  if (order.status !== "PENDING_PAYMENT" || order.expirationHandledAt) throw new CardTransferError("این سفارش دیگر در انتظار پرداخت نیست.", 409);
  const settings = await getOrderSettings();
  if (settings.orderExpirationEnabled && order.expiresAt && order.expiresAt.getTime() <= Date.now()) {
    throw new CardTransferError("مهلت پرداخت این سفارش به پایان رسیده است.", 409);
  }
  // The wallet share is captured at checkout; only a settled *gateway or transfer* payment closes the order here.
  if (order.payments.some((payment) => payment.provider !== "wallet" && (payment.status === "SUCCESS" || payment.status === "REFUNDED"))) {
    throw new CardTransferError("پرداخت این سفارش قبلاً تعیین تکلیف شده است.", 409);
  }
  return { order, settings };
}

async function assertMethodOffered() {
  const methods = await getCheckoutPaymentMethods();
  if (!methods.some((method) => method.id === CARD_TO_CARD_PROVIDER)) throw new CardTransferError("پرداخت کارت‌به‌کارت در حال حاضر در دسترس نیست.", 422);
}

/**
 * Picks card-to-card for an existing pending order (the "resume payment" path). Reuses the attempt
 * already open for the order, so choosing it twice never piles up payment rows.
 */
export async function beginCardToCardPayment(input: { orderId: string; userId: string; origin: string }) {
  await assertMethodOffered();
  const { order, settings } = await loadPayableOrder(input.orderId, input.userId);
  const open = order.payments.find((payment) => payment.provider === CARD_TO_CARD_PROVIDER && (OPEN_STATUSES as readonly string[]).includes(payment.status));
  if (!open) {
    await db.$transaction(async (transaction) => {
      await transaction.payment.create({
        data: { orderId: order.id, provider: CARD_TO_CARD_PROVIDER, amount: order.total.minus(order.walletAmount), status: "INITIATED", returnOrigin: input.origin },
      });
      if (settings.orderExpirationStart === "PAYMENT_STARTED_AT" && !order.expiresAt) {
        await transaction.order.update({ where: { id: order.id }, data: { expiresAt: orderExpiresAt(settings, new Date()) } });
      }
    });
  }
  return { redirectUrl: cardToCardPagePath(order.id), reused: Boolean(open) };
}

export type UploadedReceipt = { originalName: string; storageKey: string; url: string; mimeType: string; sizeBytes: number };

async function uploadReceipt(file: File): Promise<UploadedReceipt> {
  const problem = receiptFileProblem(file);
  if (problem) throw new CardTransferError(problem, 422);
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!bufferMatchesMimeType(buffer, file.type)) throw new CardTransferError("محتوای فایل با نوع اعلام‌شده‌اش هم‌خوان نیست.", 422);
  const storageKey = `zar-shop/receipts/${mediaFileSlug(file.name, cardToCardReceiptExtensions[file.type])}`;
  const url = await uploadMediaToFtp(buffer, storageKey);
  return { originalName: file.name.slice(0, 191), storageKey, url, mimeType: file.type, sizeBytes: file.size };
}

/**
 * Stores the customer's proof and hands the payment to the admin queue. Exactly one of `receipt`
 * and `details` must be given. The file goes up before the transaction and is deleted again if the
 * transaction does not commit, so a failed submit leaves nothing behind in storage.
 */
export async function submitCardTransferProof(input: { orderId: string; userId: string; origin: string; receipt: File | null; details: CardTransferDetails | null }) {
  if (Boolean(input.receipt) === Boolean(input.details)) throw new CardTransferError("رسید پرداخت یا اطلاعات پرداخت را (فقط یکی از دو مورد) ارسال کنید.", 422);
  await assertMethodOffered();
  const { order } = await loadPayableOrder(input.orderId, input.userId);
  if (order.payments.some((payment) => payment.provider === CARD_TO_CARD_PROVIDER && payment.status === "PENDING")) {
    throw new CardTransferError("پرداخت شما قبلاً ثبت شده و در انتظار تأیید فروشگاه است.", 409);
  }
  if (input.details) {
    const duplicate = await db.cardTransferProof.findFirst({
      where: { trackingCode: input.details.trackingCode, payment: { status: { in: ["PENDING", "SUCCESS"] } } },
      select: { id: true },
    });
    if (duplicate) throw new CardTransferError("این کد رهگیری قبلاً ثبت شده است؛ کد رهگیری تراکنش خودتان را وارد کنید.", 409);
  }

  const uploaded = input.receipt ? await uploadReceipt(input.receipt) : null;
  try {
    return await db.$transaction(async (transaction) => {
      const open = order.payments.find((payment) => payment.provider === CARD_TO_CARD_PROVIDER && payment.status === "INITIATED");
      const payment = open ?? await transaction.payment.create({
        data: { orderId: order.id, provider: CARD_TO_CARD_PROVIDER, amount: order.total.minus(order.walletAmount), status: "INITIATED", returnOrigin: input.origin },
      });
      // The claim is what stops two quick submits (double click, two tabs) from both creating a proof.
      const claimed = await transaction.payment.updateMany({ where: { id: payment.id, status: "INITIATED" }, data: { status: "PENDING" } });
      if (claimed.count !== 1) throw new CardTransferError("پرداخت شما قبلاً ثبت شده و در انتظار تأیید فروشگاه است.", 409);
      await transaction.cardTransferProof.create({
        data: {
          paymentId: payment.id,
          ...(uploaded
            ? { receiptUrl: uploaded.url, receiptStorageKey: uploaded.storageKey, receiptMimeType: uploaded.mimeType, receiptSizeBytes: uploaded.sizeBytes, receiptOriginalName: uploaded.originalName }
            : { sourceCardNumber: input.details!.sourceCardNumber, trackingCode: input.details!.trackingCode }),
        },
      });
      return { paymentId: payment.id };
    });
  } catch (error) {
    if (uploaded) await deleteStoredMedia(uploaded.storageKey, uploaded.url).catch(() => undefined);
    throw error;
  }
}

type ReviewInput =
  | { orderId: string; paymentId: string; actorId: string; request: Request; decision: "approve" }
  | { orderId: string; paymentId: string; actorId: string; request: Request; decision: "reject"; reason: string };

export async function reviewCardTransfer(input: ReviewInput) {
  if (input.decision === "approve") return approveCardTransfer(input);
  return rejectCardTransfer(input);
}

async function approveCardTransfer(input: Extract<ReviewInput, { decision: "approve" }>) {
  let result: PaymentFinalizationResult;
  try {
    result = await db.$transaction(async (transaction) => {
      const payment = await transaction.payment.findFirst({
        where: { id: input.paymentId, orderId: input.orderId, provider: CARD_TO_CARD_PROVIDER },
        include: { cardTransferProof: { select: { id: true } }, order: { select: { orderNumber: true } } },
      });
      if (!payment || !payment.cardTransferProof) throw new CardTransferError("این پرداخت پیدا نشد.", 404);
      if (payment.status !== "PENDING") throw new CardTransferError("این پرداخت دیگر در انتظار تأیید نیست.", 409);
      // Same settlement path as a gateway payment: amount check, inventory, PAID, invoice, rewards.
      const finalized = await finalizeVerifiedPayment(transaction, payment.id, `CTC-${payment.id}`);
      await transaction.cardTransferProof.update({ where: { id: payment.cardTransferProof.id }, data: { reviewedAt: new Date(), reviewedById: input.actorId, rejectionReason: null } });
      await transaction.auditLog.create({
        data: {
          actorId: input.actorId,
          action: "CARD_TO_CARD_PAYMENT_APPROVED",
          entityType: "Order",
          entityId: input.orderId,
          ...auditRequestContext(input.request, { orderNumber: payment.order.orderNumber, paymentId: payment.id, amount: payment.amount.toString() }),
        },
      });
      return finalized;
    });
  } catch (error) {
    if (error instanceof PaymentAmountMismatchError) throw new CardTransferError("مبلغ این پرداخت با مبلغ سفارش مطابقت ندارد؛ سفارش را بررسی کنید.", 409);
    if (error instanceof Error && error.message === "Order can no longer be paid") throw new CardTransferError("وضعیت سفارش تغییر کرده و دیگر قابل پرداخت نیست.", 409);
    throw error;
  }

  // Everything below is a courtesy to the customer; the payment is already settled.
  if (!result.alreadyCompleted) {
    try { await sendAutomatedSms("paymentSuccess", result.phone, { orderNumber: result.orderNumber }); } catch (error) { console.error("[sms] Payment-success notification failed.", error); }
    try { await notifyCardTransferReviewed(db, { userId: result.userId, orderId: result.orderId, orderNumber: result.orderNumber, approved: true }); } catch (error) { console.error("[notifications] Card-transfer approval notification failed.", error); }
    try { await notifyNextPurchaseRewards(db, { userId: result.userId, isGuest: result.userIsGuest, rewards: result.rewards }); } catch (error) { console.error("[notifications] Next-purchase reward notification failed.", error); }
    if (result.referralPayout) {
      const { referrerId, refereeId, referrerReward, refereeReward } = result.referralPayout;
      try {
        await notifyWalletCredited(db, { userId: referrerId, amount: referrerReward, reason: "پاداش دعوت دوست", dedupeKey: `referral-reward:${refereeId}` });
        await notifyWalletCredited(db, { userId: refereeId, amount: refereeReward, reason: "هدیهٔ ثبت‌نام با کد معرف", dedupeKey: `referral-bonus:${refereeId}` });
      } catch (error) { console.error("[notifications] Referral reward notification failed.", error); }
    }
  }
  return { status: "approved" as const, inventoryWarning: result.inventoryWarning };
}

async function rejectCardTransfer(input: Extract<ReviewInput, { decision: "reject" }>) {
  const settings = await getOrderSettings();
  const { orderNumber, userId } = await db.$transaction(async (transaction) => {
    const payment = await transaction.payment.findFirst({
      where: { id: input.paymentId, orderId: input.orderId, provider: CARD_TO_CARD_PROVIDER },
      include: { cardTransferProof: { select: { id: true } }, order: { select: { orderNumber: true, userId: true } } },
    });
    if (!payment || !payment.cardTransferProof) throw new CardTransferError("این پرداخت پیدا نشد.", 404);
    const claimed = await transaction.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "FAILED" } });
    if (claimed.count !== 1) throw new CardTransferError("این پرداخت دیگر در انتظار تأیید نیست.", 409);
    await transaction.cardTransferProof.update({ where: { id: payment.cardTransferProof.id }, data: { reviewedAt: new Date(), reviewedById: input.actorId, rejectionReason: input.reason } });
    // The review may have taken longer than the payment window; the customer gets a fresh one to send a corrected proof.
    await transaction.order.updateMany({ where: { id: input.orderId, status: "PENDING_PAYMENT" }, data: { expiresAt: orderExpiresAt(settings, new Date()) } });
    await transaction.auditLog.create({
      data: {
        actorId: input.actorId,
        action: "CARD_TO_CARD_PAYMENT_REJECTED",
        entityType: "Order",
        entityId: input.orderId,
        ...auditRequestContext(input.request, { orderNumber: payment.order.orderNumber, paymentId: payment.id, amount: payment.amount.toString(), reason: input.reason }),
      },
    });
    return { orderNumber: payment.order.orderNumber, userId: payment.order.userId };
  });
  try { await notifyCardTransferReviewed(db, { userId, orderId: input.orderId, orderNumber, approved: false, reason: input.reason }); } catch (error) { console.error("[notifications] Card-transfer rejection notification failed.", error); }
  return { status: "rejected" as const };
}
