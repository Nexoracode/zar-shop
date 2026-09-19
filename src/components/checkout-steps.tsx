import { CreditCard, MapPin, ShoppingCart } from "lucide-react";

// This row's three labels + two dividers don't fit a narrow phone at full size; scrolling
// horizontally within the row itself (rather than letting it force the whole page wider) keeps
// document.documentElement.scrollWidth matching the real viewport width, same fix pattern as
// account-sidebar.tsx and referral-share.tsx.
export function CheckoutSteps() {
  return <div className="scrollbar-hide -mx-4 mb-7 flex items-center justify-center gap-2 overflow-x-auto px-4 text-xs sm:gap-4 sm:text-sm" aria-label="مراحل خرید"><span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[var(--muted)]"><ShoppingCart size={18} />سبد خرید</span><span className="h-px w-8 shrink-0 bg-[var(--border)] sm:w-16" /><strong className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[var(--brand-primary)]"><MapPin size={18} />ارسال و پرداخت</strong><span className="h-px w-8 shrink-0 bg-[var(--border)] sm:w-16" /><span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[var(--muted)]"><CreditCard size={18} />تکمیل خرید</span></div>;
}
