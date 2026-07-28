import type { Prisma } from "@generated/prisma/client";
import { UserRole, UserStatus } from "@generated/prisma/enums";
import { AdminEmptyState, AdminPageHeader, AdminPanel, AdminStatusBadge } from "@/components/admin-ui";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { userRoleLabels, userStatusLabels, userStatusTones } from "@/modules/admin/labels";
import { AdminListFilters } from "@/components/admin-list-filters";
import { AdminPagination } from "@/components/admin-pagination";
import { parseAdminPagination, resolveAdminPagination } from "@/lib/admin-pagination";
import { requirePermission } from "@/modules/auth/session";
import { UserRoleSelect } from "@/components/user-role-select";
import { AdminBulkCheckbox, AdminBulkEditor } from "@/components/admin-bulk-editor";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableContent,
  TableHeader,
  TableRow,
  TableScrollContainer,
} from "@/components/hero";

type UserRow = Prisma.UserGetPayload<{ include: { _count: { select: { orders: true } } } }>;
type SearchParams = Promise<{ q?: string; status?: string; role?: string; page?: string; pageSize?: string }>;

const roles = Object.values(UserRole);
const statuses = Object.values(UserStatus);

export default async function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  const actor = await requirePermission("users:manage");
  const assignableRoles = actor.role === "ADMIN" ? roles : roles.filter((item) => item !== "ADMIN");
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const role = roles.includes(params.role as UserRole) ? params.role as UserRole : undefined;
  const status = statuses.includes(params.status as UserStatus) ? params.status as UserStatus : undefined;
  const { requestedPage, pageSize } = parseAdminPagination(params);
  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
    ...(query ? { OR: [
      { firstName: { contains: query } },
      { lastName: { contains: query } },
      { email: { contains: query } },
      { phone: { contains: query } },
    ] } : {}),
  };
  const filteredTotal = await db.user.count({ where });
  const pagination = resolveAdminPagination(filteredTotal, requestedPage, pageSize);
  const users = await db.user.findMany({
    where,
    include: { _count: { select: { orders: true } } },
    orderBy: { createdAt: "desc" },
    skip: pagination.skip,
    take: pagination.pageSize,
  });
  const cell = "border-b border-slate-100 px-5 py-4 text-sm text-slate-600";

  return (
    <>
      <AdminPageHeader eyebrow="مدیریت مشتریان" title="کاربران" description="اطلاعات تماس، نقش، وضعیت حساب و سابقه سفارش کاربران را بررسی کنید." />

      <AdminPanel className="mb-5 p-4 sm:p-5">
        <AdminListFilters path="/admin/users" query={query} queryLabel="جست‌وجوی کاربر" queryPlaceholder="نام، ایمیل یا شماره موبایل" filters={[{ name: "role", label: "نقش کاربر", value: role ?? "", options: [{ value: "", label: "همه نقش‌ها" }, ...roles.map((item) => ({ value: item, label: userRoleLabels[item] }))] }, { name: "status", label: "وضعیت حساب", value: status ?? "", options: [{ value: "", label: "همه وضعیت‌ها" }, ...statuses.map((item) => ({ value: item, label: userStatusLabels[item] }))] }]} />
      </AdminPanel>

      <AdminPanel>
        {!users.length ? (
          <AdminEmptyState title="کاربری پیدا نشد" description={query || role || status ? "فیلترها را تغییر دهید و دوباره جست‌وجو کنید." : "هنوز کاربری در فروشگاه ثبت نشده است."} />
        ) : (
          <>
            <div className="divide-y divide-slate-100 md:hidden">
              {users.map((user: UserRow) => {
                const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "کاربر بدون نام";
                return (
                  <article key={user.id} className="space-y-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><strong className="block truncate text-sm text-[#17233b]">{fullName}</strong><span className="block truncate text-xs text-slate-400">{user.email}</span></div>
                      <AdminStatusBadge tone={userStatusTones[user.status]}>{userStatusLabels[user.status]}</AdminStatusBadge>
                    </div>
                    <div className="grid gap-2"><UserRoleSelect userId={user.id} value={user.role} roles={user.role === "ADMIN" && actor.role !== "ADMIN" ? ["ADMIN"] : assignableRoles} disabled={user.id === actor.id || (user.role === "ADMIN" && actor.role !== "ADMIN")} /><span className="text-xs text-slate-500" dir="ltr">{user.phone ?? "شماره ثبت نشده"}</span></div>
                    <dl className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs">
                      <div><dt className="text-slate-400">تعداد سفارش</dt><dd className="mt-1 font-bold text-slate-700">{user._count.orders.toLocaleString("fa-IR")}</dd></div>
                      <div><dt className="text-slate-400">تاریخ عضویت</dt><dd className="mt-1 font-bold text-slate-700">{formatDate(user.createdAt)}</dd></div>
                    </dl>
                  </article>
                );
              })}
            </div>

            <AdminBulkEditor entity="users" entityLabel="کاربر" ids={users.filter((user) => user.id !== actor.id && user.role !== "ADMIN").map((user) => user.id)} actions={[{ value: "status:ACTIVE", label: "فعال‌کردن حساب‌ها" }, { value: "status:SUSPENDED", label: "تعلیق حساب‌ها" }]}><Table><TableScrollContainer><TableContent aria-label="فهرست کاربران" className="w-full min-w-[900px]"><TableHeader><TableColumn id="select" className="w-12 bg-slate-50/70 px-4 py-4 text-center"><span className="sr-only">انتخاب</span></TableColumn>{["ردیف", "کاربر", "تماس", "نقش", "سفارش‌ها", "وضعیت", "عضویت"].map((head, index) => <TableColumn id={head} isRowHeader={index === 1} className="bg-slate-50/70 px-5 py-4 text-right text-xs font-bold text-slate-500" key={head}>{head}</TableColumn>)}</TableHeader><TableBody>{users.map((user: UserRow, index) => {
                  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "کاربر بدون نام";
                  return (
                    <TableRow id={user.id} key={user.id} className="transition hover:bg-slate-50/60">
                      <TableCell className={`${cell} w-12 text-center`}><AdminBulkCheckbox id={user.id} label={`انتخاب کاربر ${fullName}`} disabled={user.id === actor.id || user.role === "ADMIN"} /></TableCell>
                      <TableCell className={`${cell} w-16 font-bold text-slate-400`}>{(pagination.skip + index + 1).toLocaleString("fa-IR")}</TableCell>
                      <TableCell className={cell}><strong className="block text-slate-700">{fullName}</strong><span className="text-xs text-slate-400">{user.email}</span></TableCell>
                      <TableCell className={cell}><span dir="ltr">{user.phone ?? "—"}</span></TableCell>
                      <TableCell className={cell}><UserRoleSelect userId={user.id} value={user.role} roles={user.role === "ADMIN" && actor.role !== "ADMIN" ? ["ADMIN"] : assignableRoles} disabled={user.id === actor.id || (user.role === "ADMIN" && actor.role !== "ADMIN")} /></TableCell>
                      <TableCell className={cell}>{user._count.orders.toLocaleString("fa-IR")}</TableCell>
                      <TableCell className={cell}><AdminStatusBadge tone={userStatusTones[user.status]}>{userStatusLabels[user.status]}</AdminStatusBadge></TableCell>
                      <TableCell className={cell}>{formatDate(user.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}</TableBody></TableContent></TableScrollContainer></Table></AdminBulkEditor>
            <AdminPagination {...pagination} />
          </>
        )}
      </AdminPanel>
    </>
  );
}
