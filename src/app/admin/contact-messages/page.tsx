import type { Prisma } from "@generated/prisma/client";
import { AdminEmptyState, AdminPageHeader, AdminPanel } from "@/components/admin-ui";
import { AdminListFilters } from "@/components/admin-list-filters";
import { resolveAdminPagination } from "@/lib/admin-pagination";
import { parseAdminPaginationRequest } from "@/lib/admin-pagination-server";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { BlueprintContactMessagesView } from "@/components/admin/blueprint/contact-messages-view";

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

  return (
    <>
      <AdminPageHeader eyebrow="ارتباط با فروشگاه" title="پیام‌های تماس" description="پیام‌های ارسالی مشتریان از فرم تماس با ما را بررسی و پیگیری کنید." />

      {openCount > 0 && <div className="mb-5"><AdminPanel className="flex items-center gap-2 p-4 text-xs font-bold text-[var(--warning)]">{openCount.toLocaleString("fa-IR")} پیام هنوز بررسی نشده است.</AdminPanel></div>}

      <AdminPanel className="mb-5 p-4 sm:p-5">
        <AdminListFilters path="/admin/contact-messages" query={q} queryLabel="جستجوی پیام" queryPlaceholder="نام، ایمیل یا متن پیام" filters={[{ name: "status", label: "وضعیت", value: status ?? "", options: [{ value: "", label: "همه پیام‌ها" }, { value: "open", label: "بررسی‌نشده" }, { value: "resolved", label: "بررسی‌شده" }] }]} />
      </AdminPanel>

      <AdminPanel>
        {!messages.length
          ? <AdminEmptyState title="پیامی پیدا نشد" description="هنوز پیامی از فرم تماس با ما ثبت نشده یا فیلترهای انتخاب‌شده نتیجه‌ای ندارند." />
          : <BlueprintContactMessagesView messages={messages} pagination={pagination} />}
      </AdminPanel>
    </>
  );
}
