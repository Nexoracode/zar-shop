"use client";

import Link from "next/link";
import { Eye, Headset } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from "@/components/admin-ui";
import { AdminListFilters } from "@/components/admin-list-filters";
import { AdminPagination } from "@/components/admin-pagination";
import { AdminBulkCheckbox, AdminBulkEditor, AdminBulkTr } from "@/components/admin-bulk-editor";
import { ticketStatusLabels, ticketStatusTones, userRoleLabels } from "@/modules/admin/labels";
import { formatPersianDateTime, BpTable, BpTd, BpTh } from "./ui";

type TicketSummary = {
  id: string;
  subject: string;
  status: "OPEN" | "ANSWERED" | "CLOSED";
  category: { id: string; name: string } | null;
  product: { id: string; name: string; slug: string } | null;
  customerName: string;
  agentName: string | null;
  agentRole: string | null;
  messageCount: number;
  updatedAt: string;
};

type Props = {
  tickets: TicketSummary[];
  categories: { id: string; name: string }[];
  query: string;
  status: string;
  mine: boolean;
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
};

export function BlueprintTicketsView({ tickets, categories, query, status, mine, pagination }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <AdminPageHeader flush title="تیکت‌های پشتیبانی" description="پرسش‌ها و مشکلات مطرح‌شدهٔ کاربران را پاسخ دهید و وضعیت آن‌ها را مدیریت کنید." />

      <section className="bp-frame relative p-4">
        <AdminListFilters
          path="/admin/tickets"
          query={query}
          queryLabel="جستجوی تیکت"
          queryPlaceholder="موضوع، نام یا شمارهٔ تماس کاربر"
          filters={[
            { name: "status", label: "وضعیت", value: status, options: [{ value: "", label: "همه وضعیت‌ها" }, ...Object.entries(ticketStatusLabels).map(([value, label]) => ({ value, label }))] },
            { name: "categoryId", label: "موضوع", value: "", options: [{ value: "", label: "همه موضوعات" }, ...categories.map((category) => ({ value: category.id, label: category.name }))] },
            { name: "mine", label: "صف", value: mine ? "true" : "", options: [{ value: "", label: "همهٔ تیکت‌ها" }, { value: "true", label: "فقط تیکت‌های من" }] },
          ]}
        />
      </section>

      <section className="bp-frame relative">
        {!tickets.length ? (
          <AdminEmptyState title="تیکتی پیدا نشد" description={query || status || mine ? "فیلترها را تغییر دهید و دوباره جستجو کنید." : "هنوز تیکتی از سمت کاربران ثبت نشده است."} />
        ) : (
          <>
            <div className="md:hidden">
              {tickets.map((ticket) => (
                <Link key={ticket.id} href={`/admin/tickets/${ticket.id}`} className="flex flex-col gap-2.5 border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
                  <div className="flex items-center gap-2">
                    <Headset size={15} className="text-[var(--bp-muted)]" />
                    <strong className="min-w-0 flex-1 truncate text-sm">{ticket.subject}</strong>
                    <AdminStatusBadge tone={ticketStatusTones[ticket.status]}>{ticketStatusLabels[ticket.status]}</AdminStatusBadge>
                  </div>
                  <span className="bp-muted text-[11px]">{ticket.customerName}{ticket.category ? ` · ${ticket.category.name}` : ""}</span>
                  <span className="bp-muted text-[11px]">{ticket.agentName ? `پشتیبان: ${ticket.agentName}` : "بدون پشتیبان"} · {formatPersianDateTime(ticket.updatedAt)}</span>
                </Link>
              ))}
            </div>

            <AdminBulkEditor entity="tickets" entityLabel="تیکت" ids={tickets.map((ticket) => ticket.id)} actions={[{ value: "status:CLOSED", label: "بستن تیکت‌های انتخاب‌شده" }]}>
              <BpTable ariaLabel="فهرست تیکت‌ها" minWidth={900}>
                <thead>
                  <tr>
                    <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
                    <BpTh>موضوع و کاربر</BpTh>
                    <BpTh>دسته</BpTh>
                    <BpTh>پشتیبان</BpTh>
                    <BpTh>پیام‌ها</BpTh>
                    <BpTh>وضعیت</BpTh>
                    <BpTh>آخرین بروزرسانی</BpTh>
                    <BpTh className="text-center">عملیات</BpTh>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <AdminBulkTr key={ticket.id} id={ticket.id}>
                      <BpTd className="w-10 text-center"><AdminBulkCheckbox id={ticket.id} label={`انتخاب تیکت ${ticket.subject}`} /></BpTd>
                      <BpTd className="max-w-[260px]">
                        <div className="min-w-0">
                          <span className="block truncate font-bold" title={ticket.subject}>{ticket.subject}</span>
                          <span className="bp-muted block truncate text-[11px]">{ticket.customerName}</span>
                        </div>
                      </BpTd>
                      <BpTd className="text-[12px]">{ticket.category?.name ?? "—"}</BpTd>
                      <BpTd className="text-[12px]">
                        {ticket.agentName ? (
                          <>
                            <span className="block font-bold">{ticket.agentName}</span>
                            {ticket.agentRole && <span className="bp-muted block text-[10px]">{userRoleLabels[ticket.agentRole as keyof typeof userRoleLabels]}</span>}
                          </>
                        ) : <span className="bp-muted">بدون پشتیبان</span>}
                      </BpTd>
                      <BpTd className="text-[12px]">{ticket.messageCount.toLocaleString("fa-IR")}</BpTd>
                      <BpTd><AdminStatusBadge tone={ticketStatusTones[ticket.status]}>{ticketStatusLabels[ticket.status]}</AdminStatusBadge></BpTd>
                      <BpTd className="bp-muted whitespace-nowrap text-[12px]">{formatPersianDateTime(ticket.updatedAt)}</BpTd>
                      <BpTd>
                        <div className="flex items-center justify-center">
                          <Link href={`/admin/tickets/${ticket.id}`} aria-label={`مشاهده تیکت ${ticket.subject}`} title="مشاهده گفتگو" className="bp-btn bp-btn-ghost bp-btn-icon bp-btn-sm"><Eye size={14} /></Link>
                        </div>
                      </BpTd>
                    </AdminBulkTr>
                  ))}
                </tbody>
              </BpTable>
            </AdminBulkEditor>
            <AdminPagination page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.totalItems} totalPages={pagination.totalPages} />
          </>
        )}
      </section>
    </div>
  );
}
