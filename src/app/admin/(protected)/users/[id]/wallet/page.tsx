import { notFound } from "next/navigation";
import { Wallet } from "lucide-react";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin-ui";
import { AdminColumn, AdminColumnSettingsButton, AdminColumnVisibility } from "@/components/admin-column-visibility";
import { AdminColumnFilter } from "@/components/admin-column-filter";
import { AdminReadOnlyTableToolbar } from "@/components/admin-table-refresh";
import { AdminClearFilters } from "@/components/admin-clear-filters";
import { BpKicker } from "@/components/admin/blueprint/ui/card";
import { BpTable, BpTd, BpTh } from "@/components/admin/blueprint/ui/table";
import { BpTag } from "@/components/admin/blueprint/ui/tag";
import { WalletAdjustForm } from "@/components/admin/blueprint/wallet-adjust-form";
import { readHiddenColumns } from "@/lib/admin-column-visibility-server";
import { db } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
import { requirePermission } from "@/modules/auth/session";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { ensureWallet } from "@/modules/wallet/wallet";
import type { WalletTransactionType } from "@generated/prisma/enums";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const typeLabels: Record<WalletTransactionType, string> = {
  REFERRAL_REWARD: "پاداش دعوت دوست",
  REFERRAL_BONUS: "هدیهٔ ثبت‌نام با کد معرف",
  ORDER_PAYMENT: "پرداخت سفارش",
  ORDER_REFUND: "بازگشت اعتبار سفارش",
  ADMIN_CREDIT: "افزایش دستی (پشتیبانی)",
  ADMIN_DEBIT: "کاهش دستی (پشتیبانی)",
  TOPUP: "افزایش اعتبار از درگاه",
};

type Context = { params: Promise<{ id: string }>; searchParams: Promise<{ type?: string }> };

const WALLET_TABLE_ID = "walletTransactions";

const walletColumns = [
  { id: "type", label: "نوع" },
  { id: "amount", label: "مبلغ" },
  { id: "balanceAfter", label: "موجودی پس از تراکنش" },
  { id: "description", label: "توضیح" },
  { id: "createdAt", label: "زمان" },
];

export default async function AdminUserWalletPage({ params, searchParams }: Context) {
  await requirePermission("users:manage");
  const { id } = await params;
  const query = await searchParams;
  const type = Object.keys(typeLabels).includes(query.type ?? "") ? (query.type as WalletTransactionType) : undefined;
  const user = await db.user.findUnique({ where: { id }, select: { id: true, firstName: true, lastName: true, phone: true, isGuest: true } });
  if (!user || user.isGuest) notFound();

  const [wallet, generalSettings, initialHiddenColumns] = await Promise.all([ensureWallet(db, user.id), getGeneralStoreSettings(), readHiddenColumns(WALLET_TABLE_ID)]);
  const currency = generalSettings.currency;
  const transactions = await db.walletTransaction.findMany({ where: { walletId: wallet.id, ...(type ? { type } : {}) }, orderBy: { createdAt: "desc" }, take: 100 });
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
          <AdminColumnVisibility tableId={WALLET_TABLE_ID} columns={walletColumns} initialHidden={initialHiddenColumns}>
          <AdminReadOnlyTableToolbar label="تاریخچهٔ کیف پول" description="این فهرست فقط برای مشاهده است؛ برای تغییر موجودی از فرم تعدیل استفاده کنید." leading={<AdminColumnSettingsButton />} />
          {transactions.length ? (
            <BpTable ariaLabel="تراکنش‌های کیف پول" minWidth={640}>
              <thead>
                <tr>
                  <BpTh className="w-10">#</BpTh>
                  <AdminColumn id="type"><BpTh><span className="inline-flex items-center">نوع<AdminColumnFilter path={`/admin/users/${user.id}/wallet`} ariaLabel="فیلتر نوع تراکنش" groups={[{ name: "type", label: "نوع تراکنش", value: type ?? "", options: [{ value: "", label: "همه انواع" }, ...Object.entries(typeLabels).map(([value, label]) => ({ value, label }))] }]} /></span></BpTh></AdminColumn>
                  <AdminColumn id="amount"><BpTh>مبلغ</BpTh></AdminColumn>
                  <AdminColumn id="balanceAfter"><BpTh>موجودی پس از تراکنش</BpTh></AdminColumn>
                  <AdminColumn id="description"><BpTh>توضیح</BpTh></AdminColumn>
                  <AdminColumn id="createdAt"><BpTh>زمان</BpTh></AdminColumn>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction, index) => {
                  const isCredit = Number(transaction.amount) >= 0;
                  return (
                    <tr key={transaction.id}>
                      <BpTd className="bp-muted">{(index + 1).toLocaleString("fa-IR")}</BpTd>
                      <AdminColumn id="type"><BpTd><BpTag tone={isCredit ? "success" : "warning"}>{typeLabels[transaction.type]}</BpTag></BpTd></AdminColumn>
                      <AdminColumn id="amount">
                        <BpTd className={`whitespace-nowrap font-bold ${isCredit ? "text-[var(--bp-success)]" : "text-[var(--bp-danger)]"}`}>
                          {isCredit ? "+" : "−"} {formatMoney(Math.abs(Number(transaction.amount)), currency)}
                        </BpTd>
                      </AdminColumn>
                      <AdminColumn id="balanceAfter"><BpTd className="whitespace-nowrap">{formatMoney(transaction.balanceAfter.toString(), currency)}</BpTd></AdminColumn>
                      <AdminColumn id="description"><BpTd className="bp-muted max-w-[220px] truncate" title={transaction.description}>{transaction.description}</BpTd></AdminColumn>
                      <AdminColumn id="createdAt"><BpTd className="bp-muted whitespace-nowrap text-[12px]">{formatDateTime(transaction.createdAt)}</BpTd></AdminColumn>
                    </tr>
                  );
                })}
              </tbody>
            </BpTable>
          ) : (
            <AdminEmptyState title="تراکنشی پیدا نشد" description={type ? "فیلتر را تغییر دهید و دوباره جستجو کنید." : "هنوز هیچ اعتباری به کیف پول این کاربر افزوده یا از آن کسر نشده است."} action={type ? <AdminClearFilters href={`/admin/users/${user.id}/wallet`} /> : undefined} />
          )}
          </AdminColumnVisibility>
        </section>
      </div>
    </>
  );
}
