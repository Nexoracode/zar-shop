import Link from "next/link";
import { Headset, Plus } from "lucide-react";
import { AccountEmptyState } from "@/components/account-page-ui";
import { db } from "@/lib/db";
import { requireUser } from "@/modules/auth/session";
import { listForUser } from "@/modules/tickets/service";
import { serializeTicketSummary } from "@/modules/tickets/admin";
import { ticketStatusLabels, ticketStatusTones } from "@/modules/admin/labels";
import { StatusBadge } from "@/components/status-badge";
import { formatRelativeFa } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AccountTicketsPage() {
  const user = await requireUser();
  const tickets = await listForUser(db, user.id);
  const items = tickets.map(serializeTicketSummary);

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm" dir="rtl">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
        <Headset size={19} className="text-[var(--brand-primary)]" />
        <h1 className="m-0 text-base font-bold">تیکت‌های من</h1>
        <Link href="/account/tickets/new" className="mr-auto inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-bold text-[var(--brand-primary-foreground)]">
          <Plus size={15} />تیکت جدید
        </Link>
      </div>

      {items.length === 0 ? (
        <AccountEmptyState embedded title="تیکتی ندارید" description="سؤال یا مشکلی دارید؟ یک تیکت جدید برای پشتیبانی ثبت کنید." href="/account/tickets/new" linkLabel="ثبت تیکت جدید" />
      ) : (
        <ul className="m-0 list-none p-0">
          {items.map((ticket) => (
            <li key={ticket.id} className="border-b border-[var(--border)] last:border-b-0">
              <Link href={`/account/tickets/${ticket.id}`} className="flex items-center gap-3 px-5 py-4 transition hover:bg-[var(--surface-secondary)]">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[13px] font-bold text-[var(--brand-primary)]">
                  <Headset size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <strong className={`block truncate text-sm ${ticket.status === "ANSWERED" ? "font-extrabold" : "font-bold"}`}>{ticket.subject}</strong>
                  <span className="mt-1 block truncate text-[11px] text-[var(--muted)]">
                    {ticket.lastMessage
                      ? `${ticket.lastMessage.fromCustomer ? "" : "پشتیبانی: "}${ticket.lastMessage.body.trim() || "پیوست فایل"}`
                      : "بدون پیام"}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-[var(--muted)]">{formatRelativeFa(ticket.updatedAt)}</span>
                </div>
                <StatusBadge tone={ticketStatusTones[ticket.status as keyof typeof ticketStatusTones]} className="shrink-0">
                  {ticketStatusLabels[ticket.status as keyof typeof ticketStatusLabels]}
                </StatusBadge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
