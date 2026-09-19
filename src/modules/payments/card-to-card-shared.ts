import { z } from "zod";
import { CARD_NUMBER_LENGTH, isValidCardNumber, isValidSheba, normalizeCardNumber, normalizeSheba } from "@/modules/account/bank-card";

/*
 * Everything about card-to-card payment that both the server and the browser need: the provider
 * id stored on `Payment.provider`, the field limits, the receipt file rules and the schema the
 * "payment details" form is validated with. Kept free of `@/lib/db` so a client component can
 * import it without dragging Prisma into the bundle — same split as `payments/limits.ts`.
 */

/** Stored on `Payment.provider`, and the id the storefront offers this method under. */
export const CARD_TO_CARD_PROVIDER = "card_to_card";

export const cardToCardLimits = {
  holderName: 120,
  bankName: 80,
  trackingCodeMin: 4,
  trackingCodeMax: 30,
  rejectionReasonMax: 500,
  maxReceiptSize: 5 * 1024 * 1024,
} as const;

/** Extension by MIME type — a receipt is a photo or screenshot of the bank app's confirmation. */
export const cardToCardReceiptExtensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

/** `accept` attribute value for the file picker. */
export const cardToCardReceiptAccept = Object.keys(cardToCardReceiptExtensions).join(",");

/** The page a customer completes a card-to-card payment on. */
export const cardToCardPagePath = (orderId: string) => `/checkout/card-to-card/${orderId}`;

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/**
 * Banks word the tracking code differently (some numeric, some with letters), so it is kept as
 * letters and digits: Persian/Arabic digits turned into Latin ones, everything else dropped.
 */
export function normalizeTrackingCode(raw: string) {
  return (raw ?? "")
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_INDIC_DIGITS.indexOf(digit)))
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, cardToCardLimits.trackingCodeMax);
}

export const cardTransferDetailsSchema = z.object({
  sourceCardNumber: z.string().transform(normalizeCardNumber).refine(isValidCardNumber, `شماره کارت مبدأ باید ${CARD_NUMBER_LENGTH.toLocaleString("fa-IR")} رقم و معتبر باشد.`),
  trackingCode: z.string().transform(normalizeTrackingCode).pipe(z.string()
    .min(cardToCardLimits.trackingCodeMin, `کد رهگیری باید حداقل ${cardToCardLimits.trackingCodeMin.toLocaleString("fa-IR")} حرف یا رقم باشد.`)
    .max(cardToCardLimits.trackingCodeMax, `کد رهگیری نباید بیشتر از ${cardToCardLimits.trackingCodeMax.toLocaleString("fa-IR")} حرف یا رقم باشد.`)),
});

export type CardTransferDetails = z.infer<typeof cardTransferDetailsSchema>;

/** The receipt check the browser and the server both run; `null` means the file is acceptable. */
export function receiptFileProblem(file: { type: string; size: number }): string | null {
  if (!cardToCardReceiptExtensions[file.type]) return "فقط تصویر رسید با فرمت JPG، PNG یا WEBP قابل ارسال است.";
  if (file.size <= 0) return "فایل انتخاب‌شده خالی است.";
  if (file.size > cardToCardLimits.maxReceiptSize) return `حجم تصویر رسید باید کمتر از ${(cardToCardLimits.maxReceiptSize / 1024 / 1024).toLocaleString("fa-IR")} مگابایت باشد.`;
  return null;
}

export const cardTransferReviewSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({
    action: z.literal("reject"),
    reason: z.string().trim().min(3, "دلیل رد را وارد کنید تا مشتری بداند چه چیزی را باید اصلاح کند.").max(cardToCardLimits.rejectionReasonMax),
  }),
]);

/** What the admin sees for one transfer: the proof plus enough of the order to judge it. */
export type AdminCardTransfer = {
  paymentId: string;
  status: "INITIATED" | "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "REFUNDED";
  amount: string;
  submittedAt: string | null;
  receipt: { url: string; name: string | null } | null;
  sourceCardNumber: string | null;
  trackingCode: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
};

/*
 * The store's own destination card for card-to-card payments. Stored as digits only (the card as
 * 16, the شبا as the 24 after "IR"); the storefront groups them for display. Turning the method on
 * without a holder and a valid card is refused here, so checkout never offers a transfer the
 * customer could not complete.
 */
export const cardToCardSettingsSchema = z.object({
  cardToCardEnabled: z.boolean(),
  cardToCardHolderName: z.string().trim().max(cardToCardLimits.holderName, `نام صاحب کارت نباید بیشتر از ${cardToCardLimits.holderName.toLocaleString("fa-IR")} نویسه باشد.`),
  cardToCardCardNumber: z.string().transform(normalizeCardNumber),
  cardToCardSheba: z.string().transform(normalizeSheba),
  cardToCardBankName: z.string().trim().max(cardToCardLimits.bankName, `نام بانک نباید بیشتر از ${cardToCardLimits.bankName.toLocaleString("fa-IR")} نویسه باشد.`),
}).superRefine((settings, context) => {
  if (settings.cardToCardCardNumber && !isValidCardNumber(settings.cardToCardCardNumber)) {
    context.addIssue({ code: "custom", path: ["cardToCardCardNumber"], message: "شماره کارت باید ۱۶ رقم و معتبر باشد." });
  }
  if (settings.cardToCardSheba && !isValidSheba(settings.cardToCardSheba)) {
    context.addIssue({ code: "custom", path: ["cardToCardSheba"], message: "شماره شبا معتبر نیست." });
  }
  if (!settings.cardToCardEnabled) return;
  if (!settings.cardToCardHolderName) context.addIssue({ code: "custom", path: ["cardToCardHolderName"], message: "برای فعال‌سازی کارت‌به‌کارت، نام صاحب کارت را وارد کنید." });
  if (!settings.cardToCardCardNumber) context.addIssue({ code: "custom", path: ["cardToCardCardNumber"], message: "برای فعال‌سازی کارت‌به‌کارت، شماره کارت را وارد کنید." });
});

export type CardToCardSettings = z.infer<typeof cardToCardSettingsSchema>;
