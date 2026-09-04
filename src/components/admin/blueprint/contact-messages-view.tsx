import type { ContactMessage } from "@generated/prisma/client";
import { CalendarDays, Mail, MessageCircle, Phone, User } from "lucide-react";
import { AdminStatusBadge } from "@/components/admin-ui";
import { AdminBulkCheckbox, AdminBulkEditor, AdminBulkTr } from "@/components/admin-bulk-editor";
import { AdminPagination } from "@/components/admin-pagination";
import type { resolveAdminPagination } from "@/lib/admin-pagination";
import { formatDateTime } from "@/lib/format";
import { BpTable, BpTd, BpTh } from "./ui";
import { BlueprintContactMessageResolveToggle } from "./contact-message-resolve-toggle";

export function BlueprintContactMessagesView({ messages, pagination }: { messages: ContactMessage[]; pagination: ReturnType<typeof resolveAdminPagination> }) {
  return (
    <>
      <div className="divide-y divide-[var(--bp-row-line)] lg:hidden">
        {messages.map((item) => (
          <article key={item.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <strong className="block truncate text-[13px]">{item.subject}</strong>
                <span className="bp-muted mt-1 flex items-center gap-1.5 text-[11px]"><User size={12} />{item.name}</span>
              </div>
              <AdminStatusBadge tone={item.isResolved ? "success" : "warning"}>{item.isResolved ? "بررسی‌شده" : "بررسی‌نشده"}</AdminStatusBadge>
            </div>
            <p className="bp-muted mt-3 text-[12px] leading-6">{item.message}</p>
            <div className="bp-muted mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
              <span dir="ltr" className="flex items-center gap-1"><Mail size={12} />{item.email}</span>
              {item.phone && <span dir="ltr" className="flex items-center gap-1"><Phone size={12} />{item.phone}</span>}
              <span className="flex items-center gap-1"><CalendarDays size={12} />{formatDateTime(item.createdAt)}</span>
            </div>
            <div className="mt-3"><BlueprintContactMessageResolveToggle id={item.id} isResolved={item.isResolved} /></div>
          </article>
        ))}
      </div>

      <AdminBulkEditor entity="contactMessages" entityLabel="پیام" ids={messages.map((item) => item.id)} actions={[{ value: "resolved:on", label: "علامت‌گذاری به‌عنوان بررسی‌شده" }, { value: "resolved:off", label: "علامت‌گذاری به‌عنوان بررسی‌نشده" }]} desktopClassName="hidden lg:block">
        <BpTable ariaLabel="فهرست پیام‌های تماس" minWidth={900}>
          <thead>
            <tr>
              <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
              <BpTh>موضوع و پیام</BpTh>
              <BpTh>فرستنده</BpTh>
              <BpTh>تاریخ</BpTh>
              <BpTh>وضعیت</BpTh>
              <BpTh className="text-center">عملیات</BpTh>
            </tr>
          </thead>
          <tbody>
            {messages.map((item) => (
              <AdminBulkTr key={item.id} id={item.id}>
                <BpTd className="w-10 text-center"><AdminBulkCheckbox id={item.id} label={`انتخاب پیام ${item.subject}`} /></BpTd>
                <BpTd className="max-w-[280px]">
                  <div className="min-w-0">
                    <div className="truncate font-bold" title={item.subject}>{item.subject}</div>
                    <p className="bp-muted m-0 mt-1 line-clamp-2 text-[11px] leading-5">{item.message}</p>
                  </div>
                </BpTd>
                <BpTd>
                  <div className="min-w-0">
                    <span className="flex items-center gap-1.5 font-bold"><MessageCircle size={12} />{item.name}</span>
                    <span dir="ltr" className="bp-muted mt-1 block truncate text-[11px]">{item.email}</span>
                    {item.phone && <span dir="ltr" className="bp-muted mt-0.5 block text-[11px]">{item.phone}</span>}
                  </div>
                </BpTd>
                <BpTd className="text-[12px]">{formatDateTime(item.createdAt)}</BpTd>
                <BpTd><AdminStatusBadge tone={item.isResolved ? "success" : "warning"}>{item.isResolved ? "بررسی‌شده" : "بررسی‌نشده"}</AdminStatusBadge></BpTd>
                <BpTd className="text-center"><BlueprintContactMessageResolveToggle id={item.id} isResolved={item.isResolved} /></BpTd>
              </AdminBulkTr>
            ))}
          </tbody>
        </BpTable>
      </AdminBulkEditor>
      <AdminPagination page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.totalItems} totalPages={pagination.totalPages} />
    </>
  );
}
