import Link from "next/link";
import { Undo2 } from "lucide-react";
import { AccountEmptyState } from "@/components/account-page-ui";
import { formatDate, formatRelativeFa } from "@/lib/format";
import { requireUser } from "@/modules/auth/session";
import { returnStatusLabels, returnStatusTones } from "@/modules/admin/labels";
import { listUserReturns } from "@/modules/orders/returns";

export const dynamic = "force-dynamic";

const toneClass: Record<string, string> = {
  neutral: "bg-slate-100 text-slate-600",
  info: "bg-sky-50 text-sky-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-rose-50 text-rose-700",
  gold: "bg-amber-50 text-amber-800",
};

export default async function AccountReturnsPage() {
  const user = await requireUser();
  const returns = await listUserReturns(user.id);

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm" dir="rtl">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
        <Undo2 size={19} className="text-[var(--brand-primary)]" />
        <h1 className="m-0 text-base font-bold">مرجوعی‌ها</h1>
      </div>

      {returns.length === 0 ? (
        <AccountEmptyState
          embedded
          title="درخواست مرجوعی ندارید"
          description="برای سفارش‌های تحویل‌شده و داخل مهلت مرجوعی، از صفحهٔ جزئیات همان سفارش می‌توانید درخواست مرجوعی ثبت کنید."
          href="/account/orders"
          linkLabel="مشاهده سفارش‌ها"
        />
      ) : (
        <ul className="m-0 list-none p-0">
          {returns.map((request) => (
            <li key={request.id} className="border-b border-[var(--border)] p-5 last:border-b-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Link href={`/account/orders/${request.order.id}`} className="text-sm font-bold text-[var(--brand-primary)] hover:underline">
                  سفارش <span dir="ltr">{request.order.orderNumber}</span>
                </Link>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClass[returnStatusTones[request.status]]}`}>
                  {returnStatusLabels[request.status]}
                </span>
                <span className="mr-auto text-[11px] text-[var(--muted)]">ثبت {formatRelativeFa(request.createdAt)}</span>
              </div>

              <ul className="m-0 mt-3 grid list-none gap-1 p-0">
                {request.items.map((item) => (
                  <li key={item.id} className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate text-[var(--foreground)]">{item.orderItem.name}</span>
                    <span className="shrink-0 text-[var(--muted)]">{item.quantity.toLocaleString("fa-IR")} عدد</span>
                  </li>
                ))}
              </ul>

              <p className="m-0 mt-3 whitespace-pre-wrap break-words rounded-lg bg-[var(--surface-secondary)] p-3 text-xs leading-6 text-[var(--muted)]">
                <span className="font-bold text-[var(--foreground)]">دلیل شما: </span>{request.reason}
              </p>

              {request.adminNote && (
                <p className="m-0 mt-2 whitespace-pre-wrap break-words rounded-lg border border-[var(--border)] p-3 text-xs leading-6">
                  <span className="font-bold">پاسخ فروشگاه: </span>{request.adminNote}
                </p>
              )}

              {request.resolvedAt && (
                <span className="mt-2 block text-[10px] text-[var(--muted)]">رسیدگی‌شده در {formatDate(request.resolvedAt)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
