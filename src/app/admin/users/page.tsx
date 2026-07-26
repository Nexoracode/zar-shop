import type { Prisma } from "@generated/prisma/client";
import Link from "next/link";
import { UserRole, UserStatus } from "@generated/prisma/enums";
import { AdminEmptyState, AdminPageHeader, AdminPanel, AdminStatusBadge, adminFieldClass } from "@/components/admin-ui";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { userRoleLabels, userStatusLabels, userStatusTones } from "@/modules/admin/labels";
import { HeroSelectField } from "@/components/hero-select-field";
import {
  Button,
  Input,
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
type SearchParams = Promise<{ q?: string; status?: string; role?: string }>;

const roles = Object.values(UserRole);
const statuses = Object.values(UserStatus);

export default async function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const role = roles.includes(params.role as UserRole) ? params.role as UserRole : undefined;
  const status = statuses.includes(params.status as UserStatus) ? params.status as UserStatus : undefined;
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
  const users = await db.user.findMany({
    where,
    include: { _count: { select: { orders: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const cell = "border-b border-slate-100 px-5 py-4 text-sm text-slate-600";

  return (
    <>
      <AdminPageHeader eyebrow="مدیریت مشتریان" title="کاربران" description="اطلاعات تماس، نقش، وضعیت حساب و سابقه سفارش کاربران را بررسی کنید." />

      <AdminPanel className="mb-5 p-4 sm:p-5">
        <form method="get" action="/admin/users" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto] lg:items-end">
          <label className="grid gap-1.5 text-xs font-bold text-slate-600">
            جست‌وجوی کاربر
            <Input name="q" defaultValue={query} fullWidth variant="secondary" className={adminFieldClass} placeholder="نام، ایمیل یا شماره موبایل" />
          </label>
          <HeroSelectField name="role" label="نقش کاربر" defaultValue={role ?? ""} options={[{ value: "", label: "همه نقش‌ها" }, ...roles.map((item) => ({ value: item, label: userRoleLabels[item] }))]} />
          <HeroSelectField name="status" label="وضعیت حساب" defaultValue={status ?? ""} options={[{ value: "", label: "همه وضعیت‌ها" }, ...statuses.map((item) => ({ value: item, label: userStatusLabels[item] }))]} />
          <div className="flex gap-2">
            <Button type="submit" variant="primary" className="min-h-12 flex-1 bg-[#172b4d] px-5 text-sm font-bold text-white lg:flex-none">اعمال فیلتر</Button>
            {(query || role || status) && <Link href="/admin/users" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-500 hover:bg-slate-50">پاک‌کردن</Link>}
          </div>
        </form>
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
                    <div className="flex flex-wrap items-center gap-2"><AdminStatusBadge tone={user.role === "ADMIN" ? "gold" : user.role === "OPERATOR" ? "info" : "neutral"}>{userRoleLabels[user.role]}</AdminStatusBadge><span className="text-xs text-slate-500" dir="ltr">{user.phone ?? "شماره ثبت نشده"}</span></div>
                    <dl className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs">
                      <div><dt className="text-slate-400">تعداد سفارش</dt><dd className="mt-1 font-bold text-slate-700">{user._count.orders.toLocaleString("fa-IR")}</dd></div>
                      <div><dt className="text-slate-400">تاریخ عضویت</dt><dd className="mt-1 font-bold text-slate-700">{formatDate(user.createdAt)}</dd></div>
                    </dl>
                  </article>
                );
              })}
            </div>

            <Table className="hidden md:block"><TableScrollContainer><TableContent aria-label="فهرست کاربران" className="w-full min-w-[820px]"><TableHeader>{["کاربر", "تماس", "نقش", "سفارش‌ها", "وضعیت", "عضویت"].map((head, index) => <TableColumn id={head} isRowHeader={index === 0} className="bg-slate-50/70 px-5 py-4 text-right text-xs font-bold text-slate-500" key={head}>{head}</TableColumn>)}</TableHeader><TableBody>{users.map((user: UserRow) => {
                  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "کاربر بدون نام";
                  return (
                    <TableRow id={user.id} key={user.id} className="transition hover:bg-slate-50/60">
                      <TableCell className={cell}><strong className="block text-slate-700">{fullName}</strong><span className="text-xs text-slate-400">{user.email}</span></TableCell>
                      <TableCell className={cell}><span dir="ltr">{user.phone ?? "—"}</span></TableCell>
                      <TableCell className={cell}><AdminStatusBadge tone={user.role === "ADMIN" ? "gold" : user.role === "OPERATOR" ? "info" : "neutral"}>{userRoleLabels[user.role]}</AdminStatusBadge></TableCell>
                      <TableCell className={cell}>{user._count.orders.toLocaleString("fa-IR")}</TableCell>
                      <TableCell className={cell}><AdminStatusBadge tone={userStatusTones[user.status]}>{userStatusLabels[user.status]}</AdminStatusBadge></TableCell>
                      <TableCell className={cell}>{formatDate(user.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}</TableBody></TableContent></TableScrollContainer></Table>
          </>
        )}
      </AdminPanel>
    </>
  );
}
