import type { Prisma } from "@generated/prisma/client";
import { CalendarDays, Mail, MessageCircle, Phone, User } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminPanel, AdminStatusBadge } from "@/components/admin-ui";
import { AdminListFilters } from "@/components/admin-list-filters";
import { AdminBulkCheckbox, AdminBulkEditor } from "@/components/admin-bulk-editor";
import { AdminPagination } from "@/components/admin-pagination";
import { ContactMessageResolveToggle } from "@/components/contact-message-resolve-toggle";
import { Table, TableBody, TableCell, TableColumn, TableContent, TableHeader, TableRow, TruncatedTextTooltip } from "@/components/hero";
import { resolveAdminPagination } from "@/lib/admin-pagination";
import { parseAdminPaginationRequest } from "@/lib/admin-pagination-server";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { requirePermission } from "@/modules/auth/session";

type SearchParams = Promise<{ q?: string; status?: string; page?: string; pageSize?: string }>;

export default async function AdminContactMessagesPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("orders:manage");
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status === "resolved" || params.status === "open" ? params.status : undefined;
  const { requestedPage, pageSize } = await parseAdminPaginationRequest(params);
  const where: Prisma.ContactMessageWhereInput = {
    ...(status ? { isResolved: status === "resolved" } : {}),
    ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { subject: { contains: q } }, { message: { contains: q } }] } : {}),
  };
  const [filteredTotal, openCount] = await Promise.all([
    db.contactMessage.count({ where }),
    db.contactMessage.count({ where: { isResolved: false } }),
  ]);
  const pagination = resolveAdminPagination(filteredTotal, requestedPage, pageSize);
  const messages = await db.contactMessage.findMany({ where, orderBy: [{ isResolved: "asc" }, { createdAt: "desc" }], skip: pagination.skip, take: pagination.pageSize });
  const cell = "border-b border-slate-100 px-4 py-4 align-top text-sm text-slate-600";

  return (
    <>
      <AdminPageHeader eyebrow="ارتباط با فروشگاه" title="پیام‌های تماس" description="پیام‌های ارسالی مشتریان از فرم تماس با ما را بررسی و پیگیری کنید." />

      {openCount > 0 && <div className="mb-5"><AdminPanel className="flex items-center gap-2 p-4 text-xs font-bold text-amber-700">{openCount.toLocaleString("fa-IR")} پیام هنوز بررسی نشده است.</AdminPanel></div>}

      <AdminPanel className="mb-5 p-4 sm:p-5">
        <AdminListFilters path="/admin/contact-messages" query={q} queryLabel="جستجوی پیام" queryPlaceholder="نام، ایمیل یا متن پیام" filters={[{ name: "status", label: "وضعیت", value: status ?? "", options: [{ value: "", label: "همه پیام‌ها" }, { value: "open", label: "بررسی‌نشده" }, { value: "resolved", label: "بررسی‌شده" }] }]} />
      </AdminPanel>

      <AdminPanel>
        {!messages.length ? <AdminEmptyState title="پیامی پیدا نشد" description="هنوز پیامی از فرم تماس با ما ثبت نشده یا فیلترهای انتخاب‌شده نتیجه‌ای ندارند." /> : (
          <>
            <div className="divide-y divide-slate-100 lg:hidden">{messages.map((item) => (
              <article key={item.id} className="p-4">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="block truncate text-sm text-slate-800">{item.subject}</strong><span className="mt-1 flex items-center gap-1.5 text-xs text-slate-400"><User size={12} />{item.name}</span></div><AdminStatusBadge tone={item.isResolved ? "success" : "warning"}>{item.isResolved ? "بررسی‌شده" : "بررسی‌نشده"}</AdminStatusBadge></div>
                <p className="mt-3 text-xs leading-6 text-slate-600">{item.message}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400"><span dir="ltr" className="flex items-center gap-1"><Mail size={12} />{item.email}</span>{item.phone && <span dir="ltr" className="flex items-center gap-1"><Phone size={12} />{item.phone}</span>}<span className="flex items-center gap-1"><CalendarDays size={12} />{formatDateTime(item.createdAt)}</span></div>
                <div className="mt-3"><ContactMessageResolveToggle id={item.id} isResolved={item.isResolved} /></div>
              </article>
            ))}</div>
            <AdminBulkEditor entity="contactMessages" entityLabel="پیام" ids={messages.map((item) => item.id)} actions={[{ value: "resolved:on", label: "علامت‌گذاری به‌عنوان بررسی‌شده" }, { value: "resolved:off", label: "علامت‌گذاری به‌عنوان بررسی‌نشده" }]} desktopClassName="hidden lg:block">
              <Table><TableContent aria-label="فهرست پیام‌های تماس" className="w-full table-fixed">
                <TableHeader>
                  <TableColumn id="select" className="w-[5%] bg-slate-50/70 px-3 py-4 text-center"><span className="sr-only">انتخاب</span></TableColumn>
                  <TableColumn id="subject" isRowHeader className="w-[30%] bg-slate-50/70 px-4 py-4 text-right text-xs font-bold text-slate-500">موضوع و پیام</TableColumn>
                  <TableColumn id="sender" className="w-[22%] bg-slate-50/70 px-4 py-4 text-right text-xs font-bold text-slate-500">فرستنده</TableColumn>
                  <TableColumn id="date" className="w-[15%] bg-slate-50/70 px-4 py-4 text-right text-xs font-bold text-slate-500">تاریخ</TableColumn>
                  <TableColumn id="status" className="w-[13%] bg-slate-50/70 px-4 py-4 text-right text-xs font-bold text-slate-500">وضعیت</TableColumn>
                  <TableColumn id="action" className="w-[15%] bg-slate-50/70 px-4 py-4 text-center text-xs font-bold text-slate-500">عملیات</TableColumn>
                </TableHeader>
                <TableBody>{messages.map((item) => (
                  <TableRow id={item.id} key={item.id} className="transition hover:bg-slate-50/60">
                    <TableCell className={`${cell} text-center`}><AdminBulkCheckbox id={item.id} label={`انتخاب پیام ${item.subject}`} /></TableCell>
                    <TableCell className={cell}><TruncatedTextTooltip text={item.subject} className="font-bold text-slate-800" /><p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500">{item.message}</p></TableCell>
                    <TableCell className={cell}><div className="min-w-0"><span className="flex items-center gap-1.5 font-bold text-slate-700"><MessageCircle size={12} />{item.name}</span><span dir="ltr" className="mt-1 block truncate text-[11px] text-slate-400">{item.email}</span>{item.phone && <span dir="ltr" className="mt-0.5 block text-[11px] text-slate-400">{item.phone}</span>}</div></TableCell>
                    <TableCell className={`${cell} text-xs`}>{formatDateTime(item.createdAt)}</TableCell>
                    <TableCell className={cell}><AdminStatusBadge tone={item.isResolved ? "success" : "warning"}>{item.isResolved ? "بررسی‌شده" : "بررسی‌نشده"}</AdminStatusBadge></TableCell>
                    <TableCell className={`${cell} text-center`}><ContactMessageResolveToggle id={item.id} isResolved={item.isResolved} /></TableCell>
                  </TableRow>
                ))}</TableBody>
              </TableContent></Table>
            </AdminBulkEditor>
            <AdminPagination {...pagination} />
          </>
        )}
      </AdminPanel>
    </>
  );
}
