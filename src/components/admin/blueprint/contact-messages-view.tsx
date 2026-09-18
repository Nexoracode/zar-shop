import type { ContactMessage } from "@generated/prisma/client";
import Link from "next/link";
import { CalendarDays, Eye, Mail, MessageCircle, Phone, User } from "lucide-react";
import { AdminStatusBadge } from "@/components/admin-ui";
import { AdminBulkCheckbox, AdminBulkEditor, AdminBulkTr } from "@/components/admin-bulk-editor";
import { AdminColumn, AdminColumnSettingsButton, AdminColumnVisibility } from "@/components/admin-column-visibility";
import { AdminColumnFilter } from "@/components/admin-column-filter";
import { AdminGenericBulkEditButton } from "@/components/admin-generic-bulk-edit";
import { AdminPagination } from "@/components/admin-pagination";
import type { resolveAdminPagination } from "@/lib/admin-pagination";
import { formatDateTime } from "@/lib/format";
import { BpLinkButton, BpTable, BpTd, BpTh } from "./ui";

const CONTACT_MESSAGES_TABLE_ID = "contactMessages";

const contactMessageColumns = [
  { id: "subject", label: "موضوع و پیام" },
  { id: "sender", label: "فرستنده" },
  { id: "date", label: "تاریخ" },
  { id: "status", label: "وضعیت" },
];

export function BlueprintContactMessagesView({ messages, pagination, initialHiddenColumns, status }: { messages: ContactMessage[]; pagination: ReturnType<typeof resolveAdminPagination>; initialHiddenColumns: string[]; status: string }) {
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
            <div className="mt-3"><BpLinkButton href={`/admin/contact-messages/${item.id}`} size="sm" className="gap-1.5"><Eye size={14} />بررسی پیام</BpLinkButton></div>
          </article>
        ))}
      </div>

      <AdminColumnVisibility tableId={CONTACT_MESSAGES_TABLE_ID} columns={contactMessageColumns} initialHidden={initialHiddenColumns}>
        <AdminBulkEditor
          entity="contactMessages"
          entityLabel="پیام"
          ids={messages.map((item) => item.id)}
          actions={[]}
          desktopClassName="hidden lg:block"
          beforeSelectAll={<AdminColumnSettingsButton />}
          extraAction={<AdminGenericBulkEditButton entity="contactMessages" entityLabel="پیام" changeTypes={[{ value: "resolved", label: "وضعیت بررسی", options: [{ value: "resolved:on", label: "بررسی‌شده" }, { value: "resolved:off", label: "بررسی‌نشده" }] }]} />}
        >
          <BpTable ariaLabel="فهرست پیام‌های تماس" minWidth={900}>
            <thead>
              <tr>
                <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
                <AdminColumn id="subject"><BpTh>موضوع و پیام</BpTh></AdminColumn>
                <AdminColumn id="sender"><BpTh>فرستنده</BpTh></AdminColumn>
                <AdminColumn id="date"><BpTh>تاریخ</BpTh></AdminColumn>
                <AdminColumn id="status"><BpTh><span className="inline-flex items-center">وضعیت<AdminColumnFilter path="/admin/contact-messages" ariaLabel="فیلتر وضعیت" groups={[{ name: "status", label: "وضعیت", value: status, options: [{ value: "", label: "همه پیام‌ها" }, { value: "open", label: "بررسی‌نشده" }, { value: "resolved", label: "بررسی‌شده" }] }]} /></span></BpTh></AdminColumn>
                <BpTh className="text-center">عملیات</BpTh>
              </tr>
            </thead>
            <tbody>
              {messages.map((item) => (
                <AdminBulkTr key={item.id} id={item.id}>
                  <BpTd className="w-10 text-center"><AdminBulkCheckbox id={item.id} label={`انتخاب پیام ${item.subject}`} /></BpTd>
                  <AdminColumn id="subject">
                    <BpTd className="max-w-[280px]">
                      <div className="min-w-0">
                        <div className="truncate font-bold" title={item.subject}>{item.subject}</div>
                        <p className="bp-muted m-0 mt-1 line-clamp-2 text-[11px] leading-5">{item.message}</p>
                      </div>
                    </BpTd>
                  </AdminColumn>
                  <AdminColumn id="sender">
                    <BpTd>
                      <div className="min-w-0">
                        <span className="flex items-center gap-1.5 font-bold"><MessageCircle size={12} />{item.name}</span>
                        <span dir="ltr" className="bp-muted mt-1 block truncate text-[11px]">{item.email}</span>
                        {item.phone && <span dir="ltr" className="bp-muted mt-0.5 block text-[11px]">{item.phone}</span>}
                      </div>
                    </BpTd>
                  </AdminColumn>
                  <AdminColumn id="date"><BpTd className="text-[12px]">{formatDateTime(item.createdAt)}</BpTd></AdminColumn>
                  <AdminColumn id="status"><BpTd><AdminStatusBadge tone={item.isResolved ? "success" : "warning"}>{item.isResolved ? "بررسی‌شده" : "بررسی‌نشده"}</AdminStatusBadge></BpTd></AdminColumn>
                  <BpTd className="text-center"><Link href={`/admin/contact-messages/${item.id}`} title="بررسی پیام" aria-label="مشاهده و مدیریت پیام" className="bp-btn bp-btn-ghost bp-btn-icon bp-btn-sm"><Eye size={15} strokeWidth={1.5} /></Link></BpTd>
                </AdminBulkTr>
              ))}
            </tbody>
          </BpTable>
        </AdminBulkEditor>
      </AdminColumnVisibility>
      <AdminPagination page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.totalItems} totalPages={pagination.totalPages} />
    </>
  );
}
