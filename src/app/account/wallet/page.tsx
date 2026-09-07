import { Wallet } from "lucide-react";
import { AccountEmptyState, AccountNotice } from "@/components/account-page-ui";
import { WalletTopupForm } from "@/components/wallet-topup-form";
import { db } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
import { requireUser } from "@/modules/auth/session";
import { getStorefrontPaymentMethods } from "@/modules/payments/storefront-methods";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getWalletSettings } from "@/modules/settings/wallet-settings";
import { ensureWallet } from "@/modules/wallet/wallet";
import type { WalletTransactionType } from "@generated/prisma/enums";

const typeLabels: Record<WalletTransactionType, string> = {
  REFERRAL_REWARD: "پاداش دعوت دوست",
  REFERRAL_BONUS: "هدیهٔ ثبت‌نام با کد معرف",
  ORDER_PAYMENT: "پرداخت سفارش",
  ORDER_REFUND: "بازگشت اعتبار سفارش",
  ADMIN_CREDIT: "افزایش اعتبار توسط پشتیبانی",
  ADMIN_DEBIT: "کاهش اعتبار توسط پشتیبانی",
  TOPUP: "افزایش اعتبار از درگاه پرداخت",
};

const topupMessages = {
  success: { tone: "success" as const, title: "پرداخت موفق بود", text: "مبلغ افزایش اعتبار به کیف پول شما اضافه شد." },
  cancelled: { tone: "warning" as const, title: "پرداخت ناتمام ماند", text: "این افزایش اعتبار کامل نشد. اگر مبلغی از حساب شما کسر شده باشد، طبق روال درگاه پرداخت به‌صورت خودکار و حداکثر تا ۷۲ ساعت به حسابتان برمی‌گردد." },
  missing: { tone: "danger" as const, title: "اطلاعات پرداخت پیدا نشد", text: "درخواست افزایش اعتبار متناظر با این پرداخت پیدا نشد. اگر مبلغی کسر شده است، با پشتیبانی تماس بگیرید." },
  review: { tone: "info" as const, title: "در حال بررسی پرداخت", text: "پرداخت شما در درگاه ثبت شده و تأیید نهایی آن به‌صورت خودکار در حال انجام است؛ تا چند دقیقهٔ دیگر موجودی کیف پول به‌روزرسانی می‌شود. لطفاً دوباره پرداخت نکنید." },
};

export default async function AccountWalletPage({ searchParams }: { searchParams: Promise<{ topup?: string }> }) {
  const user = await requireUser();
  const [wallet, generalSettings, walletSettings, paymentMethods] = await Promise.all([
    ensureWallet(db, user.id),
    getGeneralStoreSettings(),
    getWalletSettings(),
    getStorefrontPaymentMethods(),
  ]);
  const currency = generalSettings.currency;
  const topupMessage = topupMessages[(await searchParams).topup as keyof typeof topupMessages];
  const canTopup = walletSettings.walletEnabled && walletSettings.walletTopupEnabled && paymentMethods.length > 0;
  const transactions = await db.walletTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <>
      {topupMessage && <AccountNotice tone={topupMessage.tone} title={topupMessage.title}>{topupMessage.text}</AccountNotice>}

      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <div className="flex items-center gap-4 p-5 sm:p-6">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
            <Wallet size={24} />
          </span>
          <div className="min-w-0">
            <span className="block text-xs text-[var(--muted)]">موجودی کیف پول</span>
            <strong className="mt-1 block text-2xl font-bold">{formatMoney(wallet.balance.toString(), currency)}</strong>
          </div>
        </div>
        <p className="m-0 border-t border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-[11px] leading-6 text-[var(--muted)] sm:px-6">
          اعتبار کیف پول فقط برای خرید در همین فروشگاه استفاده می‌شود و قابل برداشت به حساب بانکی نیست.
          {walletSettings.walletCheckoutEnabled ? " هنگام تسویه‌حساب می‌توانید از این اعتبار استفاده کنید." : ""}
        </p>
      </section>

      {canTopup && (
        <section aria-labelledby="wallet-topup" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
          <h2 id="wallet-topup" className="m-0 mb-4 text-base font-bold">افزایش اعتبار</h2>
          <WalletTopupForm
            min={walletSettings.walletMinTopup}
            max={walletSettings.walletMaxTopup}
            currency={currency}
            methods={paymentMethods.map((method) => ({ id: method.id, name: method.name }))}
          />
        </section>
      )}

      <section aria-labelledby="wallet-history">
        <h2 id="wallet-history" className="mb-3 mt-2 text-base font-bold">تاریخچهٔ تراکنش‌ها</h2>
        {transactions.length === 0 ? (
          <AccountEmptyState
            title="هنوز تراکنشی ثبت نشده است"
            description="هر افزایش یا کاهش اعتبار کیف پول شما در این بخش ثبت می‌شود."
          />
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {transactions.map((transaction) => {
              const isCredit = Number(transaction.amount) >= 0;
              return (
                <li
                  key={transaction.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                >
                  <div className="min-w-0">
                    <strong className="block text-sm font-bold">{typeLabels[transaction.type]}</strong>
                    <span className="block text-[11px] text-[var(--muted)]">{transaction.description}</span>
                  </div>
                  <div className="text-left">
                    <strong className={`block text-sm font-bold ${isCredit ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                      {isCredit ? "+" : "−"} {formatMoney(Math.abs(Number(transaction.amount)), currency)}
                    </strong>
                    <span className="block text-[11px] text-[var(--muted)]">
                      {formatDateTime(transaction.createdAt)} · موجودی: {formatMoney(transaction.balanceAfter.toString(), currency)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
