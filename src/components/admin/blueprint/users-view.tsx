import Link from "next/link";
import { Wallet } from "lucide-react";
import type { Prisma } from "@generated/prisma/client";
import { AdminStatusBadge } from "@/components/admin-ui";
import { AdminBulkCheckbox, AdminBulkEditor, AdminBulkTr } from "@/components/admin-bulk-editor";
import { AdminPagination } from "@/components/admin-pagination";
import type { resolveAdminPagination } from "@/lib/admin-pagination";
import { formatDate } from "@/lib/format";
import { userStatusLabels, userStatusTones } from "@/modules/admin/labels";
import type { UserRole } from "@generated/prisma/enums";
import { BpTable, BpTd, BpTh } from "./ui";
import { BlueprintUserRoleSelect } from "./user-role-select";

type UserRow = Prisma.UserGetPayload<{ include: { _count: { select: { orders: true } } } }>;

export function BlueprintUsersView({ users, pagination, actorId, actorRole, assignableRoles, walletEnabled }: {
  users: UserRow[];
  pagination: ReturnType<typeof resolveAdminPagination>;
  actorId: string;
  actorRole: UserRole;
  assignableRoles: UserRole[];
  walletEnabled: boolean;
}) {
  return (
    <>
      <div className="md:hidden">
        {users.map((user) => {
          const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "کاربر بدون نام";
          return (
            <article key={user.id} className="flex flex-col gap-3 border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block truncate text-[13px]">{fullName}</strong>
                  <span className="bp-muted mt-0.5 block truncate text-[11px]">{user.email ?? "ایمیل ثبت نشده"}</span>
                </div>
                <AdminStatusBadge tone={userStatusTones[user.status]}>{userStatusLabels[user.status]}</AdminStatusBadge>
              </div>
              <div className="grid gap-2">
                <BlueprintUserRoleSelect userId={user.id} value={user.role} roles={user.role === "ADMIN" && actorRole !== "ADMIN" ? ["ADMIN"] : assignableRoles} disabled={user.id === actorId || (user.role === "ADMIN" && actorRole !== "ADMIN")} />
                <span className="bp-muted text-[11px]" dir="ltr">{user.phone ?? "شماره ثبت نشده"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 border border-[var(--bp-divider)] p-3 text-[11px]">
                <div><span className="bp-muted block">تعداد سفارش</span><strong className="mt-1 block">{user._count.orders.toLocaleString("fa-IR")}</strong></div>
                <div><span className="bp-muted block">تاریخ عضویت</span><strong className="mt-1 block">{formatDate(user.createdAt)}</strong></div>
              </div>
              {walletEnabled && !user.isGuest && (
                <Link href={`/admin/users/${user.id}/wallet`} className="bp-btn bp-btn-secondary bp-btn-sm w-full gap-2"><Wallet size={14} />کیف پول</Link>
              )}
            </article>
          );
        })}
      </div>

      <AdminBulkEditor entity="users" entityLabel="کاربر" ids={users.filter((user) => user.id !== actorId && user.role !== "ADMIN").map((user) => user.id)} actions={[{ value: "status:ACTIVE", label: "فعال‌کردن حساب‌ها" }, { value: "status:SUSPENDED", label: "تعلیق حساب‌ها" }]}>
        <BpTable ariaLabel="فهرست کاربران" minWidth={900}>
          <thead>
            <tr>
              <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
              <BpTh className="w-10">#</BpTh>
              <BpTh>کاربر</BpTh>
              <BpTh>تماس</BpTh>
              <BpTh>نقش</BpTh>
              <BpTh>سفارش‌ها</BpTh>
              <BpTh>وضعیت</BpTh>
              <BpTh>عضویت</BpTh>
              {walletEnabled && <BpTh className="text-center">کیف پول</BpTh>}
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => {
              const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "کاربر بدون نام";
              // Self and other ADMIN accounts are never bulk-selectable — their checkbox is
              // disabled, so the row itself must not toggle selection on click either. A plain
              // `<tr>` for these skips that behavior instead of teaching `AdminBulkTr` about
              // per-row eligibility it has no other reason to know about.
              const selectable = user.id !== actorId && user.role !== "ADMIN";
              const cells = <>
                <BpTd className="w-10 text-center"><AdminBulkCheckbox id={user.id} label={`انتخاب کاربر ${fullName}`} disabled={!selectable} /></BpTd>
                <BpTd className="bp-muted">{(pagination.skip + index + 1).toLocaleString("fa-IR")}</BpTd>
                <BpTd className="max-w-[220px]">
                  <div className="min-w-0">
                    <div className="truncate font-bold" title={fullName}>{fullName}</div>
                    <div className="bp-muted truncate text-[11px]" dir="ltr" title={user.email ?? "ایمیل ثبت نشده"}>{user.email ?? "ایمیل ثبت نشده"}</div>
                  </div>
                </BpTd>
                <BpTd><span dir="ltr">{user.phone ?? "—"}</span></BpTd>
                <BpTd><BlueprintUserRoleSelect userId={user.id} value={user.role} roles={user.role === "ADMIN" && actorRole !== "ADMIN" ? ["ADMIN"] : assignableRoles} disabled={user.id === actorId || (user.role === "ADMIN" && actorRole !== "ADMIN")} /></BpTd>
                <BpTd>{user._count.orders.toLocaleString("fa-IR")}</BpTd>
                <BpTd><AdminStatusBadge tone={userStatusTones[user.status]}>{userStatusLabels[user.status]}</AdminStatusBadge></BpTd>
                <BpTd className="bp-muted">{formatDate(user.createdAt)}</BpTd>
                {walletEnabled && (
                  <BpTd className="text-center">
                    {user.isGuest ? <span className="bp-muted">—</span> : (
                      <Link href={`/admin/users/${user.id}/wallet`} aria-label={`کیف پول ${fullName}`} title="مدیریت کیف پول" className="bp-btn bp-btn-ghost bp-btn-icon bp-btn-sm"><Wallet size={15} strokeWidth={1.5} /></Link>
                    )}
                  </BpTd>
                )}
              </>;
              return selectable
                ? <AdminBulkTr key={user.id} id={user.id}>{cells}</AdminBulkTr>
                : <tr key={user.id}>{cells}</tr>;
            })}
          </tbody>
        </BpTable>
      </AdminBulkEditor>
      <AdminPagination page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.totalItems} totalPages={pagination.totalPages} />
    </>
  );
}
