import { notFound } from "next/navigation";
import { Wallet } from "lucide-react";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin-ui";
import { AdminReadOnlyTableToolbar } from "@/components/admin-table-refresh";
import { BpKicker } from "@/components/admin/blueprint/ui/card";
import { BpTable, BpTd, BpTh } from "@/components/admin/blueprint/ui/table";
import { BpTag } from "@/components/admin/blueprint/ui/tag";
import { WalletAdjustForm } from "@/components/admin/blueprint/wallet-adjust-form";
import { db } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
import { requirePermission } from "@/modules/auth/session";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { ensureWallet } from "@/modules/wallet/wallet";
import type { WalletTransactionType } from "@generated/prisma/enums";

const typeLabels: Record<WalletTransactionType, string> = {
  REFERRAL_REWARD: "پاداش دعوت دوست",
  REFERRAL_BONUS: "هدیهٔ ثبت‌نام با کد معرف",
  ORDER_PAYMENT: "پرداخت سفارش",
  ORDER_REFUND: "بازگشت اعتبار سفارش",
  ADMIN_CREDIT: "افزایش دستی (پشتیبانی)",
  ADMIN_DEBIT: "کاهش دستی (پشتیبانی)",
};

type Context = { params: Promise<{ id: string }> };

export default async function AdminUserWalletPage({ params }: Context) {
  await requirePermission("users:manage");
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id }, select: { id: true, firstName: true, lastName: true, phone: true, isGuest: true } });
  if (!user || user.isGuest) notFound();

  const [wallet, generalSettings] = await Promise.all([ensureWallet(db, user.id), getGeneralStoreSettings()]);
  const currency = generalSettings.currency;
  const transactions = await db.walletTransaction.findMany({ where: { walletId: wallet.id }, orderBy: { createdAt: "desc" }, take: 100 });
  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.phone || "کاربر بدون نام";

  return (
    <>
      <AdminPageHeader
        eyebrow="مدیریت مشتریان"
        title={`کیف پول «${fullName}»`}
        description="موجودی، تعدیل دستی اعتبار و تاریخچهٔ تراکنش‌های کیف پول این کاربر."
        backHref="/admin/users"
        backLabel="بازگشت به کاربران"
      />

      <div className="grid items-start gap-2 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="grid content-start gap-2">
          <section className="bp-frame relative p-[18px]">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center border border-[var(--bp-divider)] text-[var(--bp-accent)]"><Wallet size={19} /></span>
              <div>
                <BpKicker>موجودی فعلی</BpKicker>
                <strong className="mt-1 block text-[22px] font-bold tracking-[-0.02em]">{formatMoney(wallet.balance.toString(), currency)}</strong>
              </div>
            </div>
          </section>
          <WalletAdjustForm userId={user.id} />
        </div>

        <section className="bp-frame relative overflow-hidden">
          <AdminReadOnlyTableToolbar label="تاریخچهٔ کیف پول" description="این فهرست فقط برای مشاهده است؛ برای تغییر موجودی از فرم تعدیل استفاده کنید." />
          {transactions.length ? (
            <BpTable ariaLabel="تراکنش‌های کیف پول" minWidth={640}>
              <thead>
                <tr>
                  <BpTh className="w-10">#</BpTh>
                  <BpTh>نوع</BpTh>
                  <BpTh>مبلغ</BpTh>
                  <BpTh>موجودی پس از تراکنش</BpTh>
                  <BpTh>توضیح</BpTh>
                  <BpTh>زمان</BpTh>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction, index) => {
                  const isCredit = Number(transaction.amount) >= 0;
                  return (
                    <tr key={transaction.id}>
                      <BpTd className="bp-muted">{(index + 1).toLocaleString("fa-IR")}</BpTd>
                      <BpTd><BpTag tone={isCredit ? "success" : "warning"}>{typeLabels[transaction.type]}</BpTag></BpTd>
                      <BpTd className={`whitespace-nowrap font-bold ${isCredit ? "text-[var(--bp-success)]" : "text-[var(--bp-danger)]"}`}>
                        {isCredit ? "+" : "−"} {formatMoney(Math.abs(Number(transaction.amount)), currency)}
                      </BpTd>
                      <BpTd className="whitespace-nowrap">{formatMoney(transaction.balanceAfter.toString(), currency)}</BpTd>
                      <BpTd className="bp-muted max-w-[220px] truncate" title={transaction.description}>{transaction.description}</BpTd>
                      <BpTd className="bp-muted whitespace-nowrap text-[12px]">{formatDateTime(transaction.createdAt)}</BpTd>
                    </tr>
                  );
                })}
              </tbody>
            </BpTable>
          ) : (
            <AdminEmptyState title="تراکنشی ثبت نشده است" description="هنوز هیچ اعتباری به کیف پول این کاربر افزوده یا از آن کسر نشده است." />
          )}
        </section>
      </div>
    </>
  );
}
