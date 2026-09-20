import { formatMoney } from "@/lib/format";
import type { FreeShippingReason } from "@/modules/shipping/free-shipping";

/** The line under a free shipping row that says what made it free. */
export function FreeShippingNote({ reason, currency }: { reason: FreeShippingReason | null | undefined; currency: "IRR" | "IRT" }) {
  if (!reason) return null;
  const text = reason.kind === "PICKUP" ? "چون سفارش را حضوری از فروشگاه تحویل می‌گیرید"
    : reason.kind === "THRESHOLD" ? `چون مبلغ خرید شما به ${formatMoney(reason.threshold, currency)} یا بیشتر رسیده است`
      : reason.kind === "PROMOTION" ? `به‌خاطر «${reason.title}»`
        : reason.kind === "METHOD" ? `چون روش ارسال «${reason.title}» رایگان است`
          : "چون فروشگاه برای این سفارش هزینهٔ ارسالی در نظر نگرفته است";
  return <div className="-mt-1.5 flex justify-end text-[11px] leading-5 text-[var(--success)]">ارسال رایگان شد؛ {text}</div>;
}
