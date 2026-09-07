import { Wallet } from "lucide-react";
import { AccountEmptyState } from "@/components/account-page-ui";
import { AlertDescription, AlertRoot } from "@/components/hero";
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
  success: { status: "success" as const, text: "پرداخت موفق بود و اعتبار به کیف پول شما اضافه شد." },
  cancelled: { status: "warning" as const, text: "پرداخت لغو شد؛ مبلغی از حساب شما کسر نشده است." },
  missing: { status: "danger" as const, text: "اطلاعات پرداخت پیدا نشد." },
  review: { status: "warning" as const, text: "پرداخت در درگاه تأیید شده و ثبت نهایی آن در حال بررسی خودکار است؛ کمی بعد موجودی به‌روزرسانی می‌شود." },
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
      {topupMessage && <AlertRoot status={topupMessage.status}><AlertDescription>{topupMessage.text}</AlertDescription></AlertRoot>}

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
